// wasm_bindgen is incompatible with const fn
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::doc_markdown)]

use react_wasm_table_core::columnar_store::ColumnarStore;
use react_wasm_table_core::layout::{
    Align, AlignValue, BoxSizingValue, ColumnLayout, ContainerLayout, DimensionValue, DisplayValue,
    FlexDirectionValue, FlexWrapValue, GridAutoFlowValue, GridLineValue, GridPlacementValue,
    LayoutEngine, LengthAutoValue, LengthValue, OverflowValue, PositionValue, RectValue,
    RepeatValue, TrackListItem, TrackSizeValue, Viewport,
};
use react_wasm_table_core::layout_buffer;
use react_wasm_table_core::types::{
    ColumnFilter, FilterOp, FilterValue, GlobalFilter, SortConfig, SortDirection,
};
use wasm_bindgen::prelude::*;

/// The main WASM-exposed table engine.
#[wasm_bindgen]
pub struct TableEngine {
    layout: LayoutEngine,
    layout_buf: Vec<f32>,
    layout_cell_count: usize,
    columnar: ColumnarStore,
}

#[wasm_bindgen]
impl TableEngine {
    /// Create a new `TableEngine` instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            layout: LayoutEngine::new(),
            layout_buf: Vec::new(),
            layout_cell_count: 0,
            columnar: ColumnarStore::new(),
        }
    }

    // ── Layout buffer ─────────────────────────────────────────────────

    /// Return [pointer_offset, f32_count] for the layout buffer.
    /// JS creates: `new Float32Array(wasmMemory.buffer, offset, len)`
    #[wasm_bindgen(js_name = getLayoutBufferInfo)]
    pub fn get_layout_buffer_info(&self) -> Vec<usize> {
        vec![
            self.layout_buf.as_ptr() as usize,
            self.layout_cell_count * layout_buffer::LAYOUT_STRIDE,
        ]
    }

    /// Get Float64 column pointer info: [offset, length].
    /// Returns empty vec if column is not Float64.
    #[wasm_bindgen(js_name = getColumnFloat64Info)]
    pub fn get_column_float64_info(&self, col_idx: usize) -> Vec<usize> {
        self.columnar
            .get_float64_ptr(col_idx)
            .map_or_else(Vec::new, |(ptr, len)| vec![ptr as usize, len])
    }

    // ── TypedArray direct ingestion (serde bypass) ────────────────────

    /// Initialize columnar store for direct TypedArray ingestion.
    #[wasm_bindgen(js_name = initColumnar)]
    pub fn init_columnar(&mut self, col_count: usize, row_count: usize) {
        self.columnar.init(col_count, row_count);
    }

    /// Ingest a Float64 column directly from a TypedArray (no serde).
    #[wasm_bindgen(js_name = ingestFloat64Column)]
    pub fn ingest_float64_column(&mut self, col_idx: usize, values: &[f64]) {
        self.columnar.set_column_float64(col_idx, values);
    }

    /// Ingest a Bool column as Float64 (0.0/1.0/NaN) directly.
    #[wasm_bindgen(js_name = ingestBoolColumn)]
    pub fn ingest_bool_column(&mut self, col_idx: usize, values: &[f64]) {
        self.columnar.set_column_bool(col_idx, values);
    }

    /// Ingest a String column: unique strings via JsValue + intern IDs via Uint32Array.
    #[wasm_bindgen(js_name = ingestStringColumn)]
    pub fn ingest_string_column(
        &mut self,
        col_idx: usize,
        unique_strings: JsValue,
        ids: &[u32],
    ) -> Result<(), JsError> {
        let unique: Vec<String> = serde_wasm_bindgen::from_value(unique_strings)?;
        self.columnar.set_column_strings(col_idx, &unique, ids);
        Ok(())
    }

    /// Finalize columnar ingestion (marks view dirty).
    #[wasm_bindgen(js_name = finalizeColumnar)]
    pub fn finalize_columnar(&mut self) {
        self.columnar.finalize();
    }

    // ── Hot path ──────────────────────────────────────────────────────

    /// Set sort configuration on the columnar store.
    #[wasm_bindgen(js_name = setColumnarSort)]
    pub fn set_columnar_sort(&mut self, configs: JsValue) -> Result<(), JsError> {
        let configs: Vec<JsSortConfig> = serde_wasm_bindgen::from_value(configs)?;
        let configs: Vec<SortConfig> = configs
            .into_iter()
            .map(|c| SortConfig {
                column_index: c.column_index,
                direction: match c.direction.as_str() {
                    "Descending" | "desc" => SortDirection::Descending,
                    _ => SortDirection::Ascending,
                },
            })
            .collect();
        self.columnar.set_sort(configs);
        Ok(())
    }

    /// Set column filters on the columnar store.
    #[wasm_bindgen(js_name = setColumnarFilters)]
    pub fn set_columnar_filters(&mut self, filters: JsValue) -> Result<(), JsError> {
        let filters: Vec<JsColumnFilter> = serde_wasm_bindgen::from_value(filters)?;
        let filters: Vec<ColumnFilter> = filters
            .into_iter()
            .map(|f| ColumnFilter {
                column_index: f.column_index,
                op: match f.op.as_str() {
                    "neq" => FilterOp::Neq,
                    "gt" => FilterOp::Gt,
                    "gte" => FilterOp::Gte,
                    "lt" => FilterOp::Lt,
                    "lte" => FilterOp::Lte,
                    "contains" => FilterOp::Contains,
                    "startsWith" => FilterOp::StartsWith,
                    "endsWith" => FilterOp::EndsWith,
                    _ => FilterOp::Eq,
                },
                value: convert_filter_value(&f.value),
            })
            .collect();
        self.columnar.set_column_filters(filters);
        Ok(())
    }

    /// Set global filter on the columnar store.
    #[wasm_bindgen(js_name = setGlobalFilter)]
    pub fn set_global_filter(&mut self, query: Option<String>) {
        self.columnar
            .set_global_filter(query.map(|q| GlobalFilter { query: q }));
    }

    /// Set scroll configuration on the columnar store.
    #[wasm_bindgen(js_name = setColumnarScrollConfig)]
    pub fn set_columnar_scroll_config(
        &mut self,
        row_height: f64,
        viewport_height: f64,
        overscan: usize,
    ) {
        self.columnar
            .set_scroll_config(row_height, viewport_height, overscan);
    }

    /// Unified hot path: rebuild view + virtual slice + layout buffer.
    /// Returns metadata as Float64Array:
    /// [cell_count, visible_start, visible_end, total_height, filtered_count, generation, total_count, visible_count, effective_row_height]
    #[wasm_bindgen(js_name = updateViewportColumnar)]
    pub fn update_viewport_columnar(
        &mut self,
        scroll_top: f64,
        viewport_js: JsValue,
        columns_js: JsValue,
        container_js: JsValue,
    ) -> Result<Vec<f64>, JsError> {
        // 1. Rebuild view indices
        self.columnar.rebuild_view();

        log::debug!(
            "[wasm] updateViewport: scroll_top={:.1}, total_rows={}, filtered={}",
            scroll_top,
            self.columnar.row_count,
            self.columnar.view_indices().len(),
        );

        // 2. Parse viewport + columns + container BEFORE virtual scroll
        //    (needed to compute effective row height for column directions)
        let vp: JsViewport = serde_wasm_bindgen::from_value(viewport_js)?;
        let cols: Vec<JsColumnLayout> = serde_wasm_bindgen::from_value(columns_js)?;

        let container = if container_js.is_undefined() || container_js.is_null() {
            ContainerLayout::default()
        } else {
            let jc: JsContainerLayout = serde_wasm_bindgen::from_value(container_js)?;
            convert_container(&jc)
        };

        let viewport = Viewport {
            width: vp.width,
            height: vp.height,
            row_height: vp.row_height,
            header_height: vp.header_height,
            scroll_top: vp.scroll_top,
            line_height: vp.line_height,
        };

        let columns: Vec<ColumnLayout> = cols.into_iter().map(|c| convert_column(&c)).collect();

        // 3. Compute effective row height (may differ from nominal for column directions)
        let effective_row_height = self.layout.compute_effective_row_height(
            &columns,
            &container,
            viewport.width,
            viewport.row_height,
            viewport.line_height,
        ) as f64;

        // 4. Compute virtual slice using effective row height
        let total_count = self.columnar.row_count;
        let filtered_count = self.columnar.view_indices().len();
        let scroll_state = react_wasm_table_core::virtual_scroll::ScrollState {
            scroll_top,
            viewport_height: self.columnar.viewport_height(),
            row_height: effective_row_height,
            total_rows: filtered_count,
            overscan: self.columnar.overscan(),
        };
        let virtual_slice =
            react_wasm_table_core::virtual_scroll::compute_virtual_slice(&scroll_state);

        // 5. Compute layout into buffer
        let col_count = columns.len();
        let row_count = virtual_slice
            .end_index
            .saturating_sub(virtual_slice.start_index);
        let total_cells = col_count + row_count * col_count;
        let needed = layout_buffer::buf_len(total_cells);

        if self.layout_buf.len() < needed {
            self.layout_buf.resize(needed, 0.0);
        }

        self.layout_cell_count = self.layout.compute_into_buffer(
            &columns,
            &viewport,
            &container,
            virtual_slice.start_index..virtual_slice.end_index,
            &mut self.layout_buf,
        );

        // 6. Return metadata
        Ok(vec![
            self.layout_cell_count as f64,
            virtual_slice.start_index as f64,
            virtual_slice.end_index as f64,
            virtual_slice.total_height,
            filtered_count as f64,
            self.columnar.generation as f64,
            total_count as f64,
            virtual_slice.visible_count as f64,
            effective_row_height,
        ])
    }

    /// Return [pointer_offset, length] for the view indices buffer.
    #[wasm_bindgen(js_name = getColumnarViewIndicesInfo)]
    pub fn get_columnar_view_indices_info(&self) -> Vec<usize> {
        let indices = self.columnar.view_indices();
        vec![indices.as_ptr() as usize, indices.len()]
    }

    // ── Debug logging ──────────────────────────────────────────────

    /// Initialize console_log backend and enable Debug-level logging.
    #[cfg(feature = "debug-log")]
    #[wasm_bindgen(js_name = enableDebugLog)]
    pub fn enable_debug_log(&self) {
        console_log::init_with_level(log::Level::Debug).ok();
    }

    /// Disable all log output at runtime.
    #[cfg(feature = "debug-log")]
    #[wasm_bindgen(js_name = disableDebugLog)]
    pub fn disable_debug_log(&self) {
        log::set_max_level(log::LevelFilter::Off);
    }
}

impl Default for TableEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(serde::Deserialize)]
struct JsSortConfig {
    #[serde(rename = "columnIndex")]
    column_index: usize,
    direction: String,
}

#[derive(serde::Deserialize)]
struct JsColumnFilter {
    #[serde(rename = "columnIndex")]
    column_index: usize,
    op: String,
    value: JsFilterValue,
}

#[derive(serde::Deserialize)]
#[serde(untagged)]
enum JsFilterValue {
    Bool(bool),
    Float64(f64),
    String(String),
}

fn convert_filter_value(v: &JsFilterValue) -> FilterValue {
    match v {
        JsFilterValue::Bool(b) => FilterValue::Bool(*b),
        JsFilterValue::Float64(f) => FilterValue::Float64(*f),
        JsFilterValue::String(s) => FilterValue::String(s.clone()),
    }
}

#[derive(serde::Deserialize)]
struct JsViewport {
    width: f32,
    height: f32,
    #[serde(rename = "rowHeight")]
    row_height: f32,
    #[serde(rename = "headerHeight")]
    header_height: f32,
    #[serde(rename = "scrollTop")]
    scroll_top: f32,
    #[serde(rename = "lineHeight", default = "default_line_height")]
    line_height: f32,
}

fn default_line_height() -> f32 {
    20.0
}

#[derive(serde::Deserialize)]
struct JsColumnLayout {
    #[serde(default)]
    width: f32,
    #[serde(rename = "flexGrow", default)]
    flex_grow: f32,
    #[serde(rename = "flexShrink", default)]
    flex_shrink: f32,
    #[serde(rename = "minWidth")]
    min_width: Option<f32>,
    #[serde(rename = "maxWidth")]
    max_width: Option<f32>,
    #[serde(default)]
    align: Option<String>,
    // New flex child properties
    #[serde(rename = "flexBasis")]
    flex_basis: Option<JsDimension>,
    #[serde(default)]
    height: Option<JsDimension>,
    #[serde(rename = "minHeight")]
    min_height: Option<JsDimension>,
    #[serde(rename = "maxHeight")]
    max_height: Option<JsDimension>,
    #[serde(rename = "alignSelf")]
    align_self: Option<String>,
    #[serde(default)]
    padding: Option<JsRect>,
    #[serde(default)]
    margin: Option<JsRect>,
    #[serde(default)]
    border: Option<JsRect>,
    #[serde(rename = "boxSizing")]
    box_sizing: Option<String>,
    #[serde(rename = "aspectRatio")]
    aspect_ratio: Option<f32>,
    #[serde(default)]
    position: Option<String>,
    #[serde(default)]
    inset: Option<JsRect>,
    // Grid child properties
    #[serde(rename = "gridRow")]
    grid_row: Option<JsGridLine>,
    #[serde(rename = "gridColumn")]
    grid_column: Option<JsGridLine>,
    #[serde(rename = "justifySelf")]
    justify_self: Option<String>,
}

#[derive(serde::Deserialize)]
struct JsContainerLayout {
    #[serde(default)]
    display: Option<String>,
    #[serde(rename = "flexDirection")]
    flex_direction: Option<String>,
    #[serde(rename = "flexWrap")]
    flex_wrap: Option<String>,
    #[serde(default)]
    gap: Option<JsDimension>,
    #[serde(rename = "rowGap")]
    row_gap: Option<JsDimension>,
    #[serde(rename = "columnGap")]
    column_gap: Option<JsDimension>,
    #[serde(rename = "alignItems")]
    align_items: Option<String>,
    #[serde(rename = "alignContent")]
    align_content: Option<String>,
    #[serde(rename = "justifyContent")]
    justify_content: Option<String>,
    #[serde(rename = "overflowX")]
    overflow_x: Option<String>,
    #[serde(rename = "overflowY")]
    overflow_y: Option<String>,
    #[serde(rename = "scrollbarWidth")]
    scrollbar_width: Option<f32>,
    #[serde(default)]
    padding: Option<JsRect>,
    #[serde(default)]
    margin: Option<JsRect>,
    #[serde(default)]
    border: Option<JsRect>,
    // Grid container properties
    #[serde(rename = "gridTemplateRows")]
    grid_template_rows: Option<JsGridTrackList>,
    #[serde(rename = "gridTemplateColumns")]
    grid_template_columns: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoRows")]
    grid_auto_rows: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoColumns")]
    grid_auto_columns: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoFlow")]
    grid_auto_flow: Option<String>,
    #[serde(rename = "justifyItems")]
    justify_items: Option<String>,
}

/// A CSS dimension: number (px) or string ("50%", "auto").
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
enum JsDimension {
    Number(f32),
    Str(String),
}

/// A CSS rect with top/right/bottom/left.
#[derive(serde::Deserialize, Default)]
struct JsRect {
    #[serde(default)]
    top: Option<JsDimension>,
    #[serde(default)]
    right: Option<JsDimension>,
    #[serde(default)]
    bottom: Option<JsDimension>,
    #[serde(default)]
    left: Option<JsDimension>,
}

/// A CSS grid track size: number (px) or string ("1fr", "auto", "50%", "min-content", etc.).
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
enum JsGridTrackSize {
    Number(f32),
    Str(String),
}

/// A CSS grid track list: single value or array of values.
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
enum JsGridTrackList {
    Single(JsGridTrackSize),
    Array(Vec<JsGridTrackSize>),
}

/// A CSS grid placement: number (line) or string ("span 2", "auto").
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
enum JsGridPlacement {
    Number(i16),
    Str(String),
}

/// A CSS grid line: single placement or [start, end] pair.
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
enum JsGridLine {
    Single(JsGridPlacement),
    Pair(Vec<JsGridPlacement>),
}

// ── Conversion helpers ───────────────────────────────────────────────

fn parse_dimension(d: Option<&JsDimension>) -> DimensionValue {
    match d {
        None => DimensionValue::Auto,
        Some(JsDimension::Number(v)) => DimensionValue::Length(*v),
        Some(JsDimension::Str(s)) => {
            if s == "auto" {
                DimensionValue::Auto
            } else if let Some(pct) = s.strip_suffix('%') {
                pct.parse::<f32>()
                    .map_or(DimensionValue::Auto, |v| DimensionValue::Percent(v / 100.0))
            } else {
                s.parse::<f32>()
                    .map_or(DimensionValue::Auto, DimensionValue::Length)
            }
        }
    }
}

fn parse_length(d: Option<&JsDimension>) -> LengthValue {
    match d {
        None => LengthValue::Zero,
        Some(JsDimension::Number(v)) => LengthValue::Length(*v),
        Some(JsDimension::Str(s)) => s.strip_suffix('%').map_or_else(
            || {
                s.parse::<f32>()
                    .map_or(LengthValue::Zero, LengthValue::Length)
            },
            |pct| {
                pct.parse::<f32>()
                    .map_or(LengthValue::Zero, |v| LengthValue::Percent(v / 100.0))
            },
        ),
    }
}

fn parse_length_auto(d: Option<&JsDimension>) -> LengthAutoValue {
    match d {
        None => LengthAutoValue::Auto,
        Some(JsDimension::Number(v)) => LengthAutoValue::Length(*v),
        Some(JsDimension::Str(s)) => {
            if s == "auto" {
                LengthAutoValue::Auto
            } else if let Some(pct) = s.strip_suffix('%') {
                pct.parse::<f32>().map_or(LengthAutoValue::Auto, |v| {
                    LengthAutoValue::Percent(v / 100.0)
                })
            } else {
                s.parse::<f32>()
                    .map_or(LengthAutoValue::Auto, LengthAutoValue::Length)
            }
        }
    }
}

fn parse_length_rect(r: Option<&JsRect>) -> RectValue<LengthValue> {
    r.map_or_else(RectValue::default, |r| RectValue {
        top: parse_length(r.top.as_ref()),
        right: parse_length(r.right.as_ref()),
        bottom: parse_length(r.bottom.as_ref()),
        left: parse_length(r.left.as_ref()),
    })
}

fn parse_length_auto_rect(r: Option<&JsRect>) -> RectValue<LengthAutoValue> {
    r.map_or_else(RectValue::zero_auto, |r| RectValue {
        top: parse_length_auto(r.top.as_ref()),
        right: parse_length_auto(r.right.as_ref()),
        bottom: parse_length_auto(r.bottom.as_ref()),
        left: parse_length_auto(r.left.as_ref()),
    })
}

#[allow(clippy::single_option_map)]
fn parse_align_value(s: Option<&String>) -> Option<AlignValue> {
    s.map(|v| match v.as_str() {
        "end" => AlignValue::End,
        "flex-start" => AlignValue::FlexStart,
        "flex-end" => AlignValue::FlexEnd,
        "center" => AlignValue::Center,
        "baseline" => AlignValue::Baseline,
        "stretch" => AlignValue::Stretch,
        "space-between" => AlignValue::SpaceBetween,
        "space-evenly" => AlignValue::SpaceEvenly,
        "space-around" => AlignValue::SpaceAround,
        _ => AlignValue::Start,
    })
}

fn parse_grid_track_size(v: &JsGridTrackSize) -> TrackSizeValue {
    match v {
        JsGridTrackSize::Number(n) => TrackSizeValue::Length(*n),
        JsGridTrackSize::Str(s) => {
            let s = s.trim();
            if s == "auto" {
                TrackSizeValue::Auto
            } else if s == "min-content" {
                TrackSizeValue::MinContent
            } else if s == "max-content" {
                TrackSizeValue::MaxContent
            } else if let Some(fr) = s.strip_suffix("fr") {
                fr.trim()
                    .parse::<f32>()
                    .map_or(TrackSizeValue::Auto, TrackSizeValue::Fr)
            } else if let Some(pct) = s.strip_suffix('%') {
                pct.trim()
                    .parse::<f32>()
                    .map_or(TrackSizeValue::Auto, TrackSizeValue::Percent)
            } else if s.starts_with("minmax(") && s.ends_with(')') {
                let inner = &s[7..s.len() - 1];
                if let Some((min_s, max_s)) = inner.split_once(',') {
                    let min =
                        parse_grid_track_size(&JsGridTrackSize::Str(min_s.trim().to_string()));
                    let max =
                        parse_grid_track_size(&JsGridTrackSize::Str(max_s.trim().to_string()));
                    TrackSizeValue::MinMax(Box::new(min), Box::new(max))
                } else {
                    TrackSizeValue::Auto
                }
            } else if s.starts_with("fit-content(") && s.ends_with(')') {
                let inner = &s[12..s.len() - 1];
                inner.strip_suffix('%').map_or_else(
                    || {
                        inner
                            .trim()
                            .strip_suffix("px")
                            .unwrap_or_else(|| inner.trim())
                            .parse::<f32>()
                            .map_or(TrackSizeValue::Auto, TrackSizeValue::FitContentPx)
                    },
                    |pct| {
                        pct.trim()
                            .parse::<f32>()
                            .map_or(TrackSizeValue::Auto, TrackSizeValue::FitContentPercent)
                    },
                )
            } else {
                // Try parsing as px value (strip optional "px" suffix)
                s.strip_suffix("px")
                    .unwrap_or(s)
                    .parse::<f32>()
                    .map_or(TrackSizeValue::Auto, TrackSizeValue::Length)
            }
        }
    }
}

fn parse_grid_track_list_item(s: &str) -> TrackListItem {
    let s = s.trim();
    if s.starts_with("repeat(") && s.ends_with(')') {
        let inner = &s[7..s.len() - 1];
        if let Some((count_s, tracks_s)) = inner.split_once(',') {
            let count = match count_s.trim() {
                "auto-fill" => RepeatValue::AutoFill,
                "auto-fit" => RepeatValue::AutoFit,
                n => n
                    .parse::<u16>()
                    .map_or(RepeatValue::Count(1), RepeatValue::Count),
            };
            let tracks: Vec<TrackSizeValue> = tracks_s
                .split_whitespace()
                .map(|t| parse_grid_track_size(&JsGridTrackSize::Str(t.to_string())))
                .collect();
            TrackListItem::Repeat(count, tracks)
        } else {
            TrackListItem::Single(TrackSizeValue::Auto)
        }
    } else {
        TrackListItem::Single(parse_grid_track_size(&JsGridTrackSize::Str(s.to_string())))
    }
}

fn parse_grid_track_list(v: Option<&JsGridTrackList>) -> Vec<TrackListItem> {
    match v {
        None => Vec::new(),
        Some(JsGridTrackList::Single(t)) => {
            // A single string might contain space-separated values like "1fr 1fr 1fr"
            // or a repeat() function
            if let JsGridTrackSize::Str(s) = t {
                let s = s.trim();
                if s.contains(' ') {
                    // Space-separated track list — parse each token
                    // parse_space_separated_tracks handles parenthesized expressions
                    // (e.g. "minmax(100px, 1fr) 2fr 1fr") via paren-depth tracking.
                    return parse_space_separated_tracks(s);
                }
            }
            vec![TrackListItem::Single(parse_grid_track_size(t))]
        }
        Some(JsGridTrackList::Array(arr)) => arr
            .iter()
            .map(|t| {
                if let JsGridTrackSize::Str(s) = t {
                    let s = s.trim();
                    if s.starts_with("repeat(") {
                        return parse_grid_track_list_item(s);
                    }
                }
                TrackListItem::Single(parse_grid_track_size(t))
            })
            .collect(),
    }
}

fn parse_space_separated_tracks(s: &str) -> Vec<TrackListItem> {
    let mut items = Vec::new();
    let mut current = String::new();
    let mut paren_depth: u32 = 0;

    for ch in s.chars() {
        match ch {
            '(' => {
                paren_depth += 1;
                current.push(ch);
            }
            ')' => {
                paren_depth = paren_depth.saturating_sub(1);
                current.push(ch);
            }
            ' ' | '\t' if paren_depth == 0 => {
                let trimmed = current.trim().to_string();
                if !trimmed.is_empty() {
                    items.push(parse_grid_track_list_item(&trimmed));
                }
                current.clear();
            }
            _ => current.push(ch),
        }
    }
    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        items.push(parse_grid_track_list_item(&trimmed));
    }
    items
}

fn parse_auto_tracks(v: Option<&JsGridTrackList>) -> Vec<TrackSizeValue> {
    match v {
        None => Vec::new(),
        Some(JsGridTrackList::Single(t)) => vec![parse_grid_track_size(t)],
        Some(JsGridTrackList::Array(arr)) => arr.iter().map(parse_grid_track_size).collect(),
    }
}

fn parse_grid_placement(v: &JsGridPlacement) -> GridPlacementValue {
    match v {
        JsGridPlacement::Number(n) => GridPlacementValue::Line(*n),
        JsGridPlacement::Str(s) => {
            let s = s.trim();
            if s == "auto" {
                GridPlacementValue::Auto
            } else if let Some(span_s) = s.strip_prefix("span ") {
                span_s
                    .trim()
                    .parse::<u16>()
                    .map_or(GridPlacementValue::Auto, GridPlacementValue::Span)
            } else {
                s.parse::<i16>()
                    .map_or(GridPlacementValue::Auto, GridPlacementValue::Line)
            }
        }
    }
}

fn parse_grid_line(v: Option<&JsGridLine>) -> Option<GridLineValue> {
    match v {
        None => None,
        Some(JsGridLine::Single(p)) => Some(GridLineValue {
            start: parse_grid_placement(p),
            end: GridPlacementValue::Auto,
        }),
        Some(JsGridLine::Pair(arr)) => {
            let start = arr
                .first()
                .map_or(GridPlacementValue::Auto, parse_grid_placement);
            let end = arr
                .get(1)
                .map_or(GridPlacementValue::Auto, parse_grid_placement);
            Some(GridLineValue { start, end })
        }
    }
}

fn convert_column(c: &JsColumnLayout) -> ColumnLayout {
    ColumnLayout {
        width: c.width,
        flex_grow: c.flex_grow,
        flex_shrink: c.flex_shrink,
        min_width: c.min_width,
        max_width: c.max_width,
        align: match c.align.as_deref() {
            Some("center") => Align::Center,
            Some("right") => Align::Right,
            _ => Align::Left,
        },
        flex_basis: parse_dimension(c.flex_basis.as_ref()),
        height: parse_dimension(c.height.as_ref()),
        min_height: parse_dimension(c.min_height.as_ref()),
        max_height: parse_dimension(c.max_height.as_ref()),
        align_self: parse_align_value(c.align_self.as_ref()),
        padding: parse_length_rect(c.padding.as_ref()),
        margin: parse_length_auto_rect(c.margin.as_ref()),
        border: parse_length_rect(c.border.as_ref()),
        box_sizing: match c.box_sizing.as_deref() {
            Some("content-box") => BoxSizingValue::ContentBox,
            _ => BoxSizingValue::BorderBox,
        },
        aspect_ratio: c.aspect_ratio,
        position: match c.position.as_deref() {
            Some("absolute") => PositionValue::Absolute,
            _ => PositionValue::Relative,
        },
        inset: parse_length_auto_rect(c.inset.as_ref()),
        grid_row: parse_grid_line(c.grid_row.as_ref()),
        grid_column: parse_grid_line(c.grid_column.as_ref()),
        justify_self: parse_align_value(c.justify_self.as_ref()),
    }
}

fn convert_container(c: &JsContainerLayout) -> ContainerLayout {
    ContainerLayout {
        display: match c.display.as_deref() {
            Some("grid") => DisplayValue::Grid,
            Some("none") => DisplayValue::None,
            Some("block") => DisplayValue::Block,
            _ => DisplayValue::Flex,
        },
        flex_direction: match c.flex_direction.as_deref() {
            Some("column") => FlexDirectionValue::Column,
            Some("row-reverse") => FlexDirectionValue::RowReverse,
            Some("column-reverse") => FlexDirectionValue::ColumnReverse,
            _ => FlexDirectionValue::Row,
        },
        flex_wrap: match c.flex_wrap.as_deref() {
            Some("wrap") => FlexWrapValue::Wrap,
            Some("wrap-reverse") => FlexWrapValue::WrapReverse,
            _ => FlexWrapValue::NoWrap,
        },
        gap: parse_length(c.gap.as_ref()),
        row_gap: c.row_gap.as_ref().map(|d| parse_length(Some(d))),
        column_gap: c.column_gap.as_ref().map(|d| parse_length(Some(d))),
        align_items: parse_align_value(c.align_items.as_ref()),
        align_content: parse_align_value(c.align_content.as_ref()),
        justify_content: parse_align_value(c.justify_content.as_ref()),
        overflow_x: match c.overflow_x.as_deref() {
            Some("clip") => OverflowValue::Clip,
            Some("hidden") => OverflowValue::Hidden,
            Some("scroll") => OverflowValue::Scroll,
            _ => OverflowValue::Visible,
        },
        overflow_y: match c.overflow_y.as_deref() {
            Some("clip") => OverflowValue::Clip,
            Some("hidden") => OverflowValue::Hidden,
            Some("scroll") => OverflowValue::Scroll,
            _ => OverflowValue::Visible,
        },
        scrollbar_width: c.scrollbar_width.unwrap_or(0.0),
        padding: parse_length_rect(c.padding.as_ref()),
        margin: parse_length_auto_rect(c.margin.as_ref()),
        border: parse_length_rect(c.border.as_ref()),
        grid_template_rows: parse_grid_track_list(c.grid_template_rows.as_ref()),
        grid_template_columns: parse_grid_track_list(c.grid_template_columns.as_ref()),
        grid_auto_rows: parse_auto_tracks(c.grid_auto_rows.as_ref()),
        grid_auto_columns: parse_auto_tracks(c.grid_auto_columns.as_ref()),
        grid_auto_flow: match c.grid_auto_flow.as_deref() {
            Some("column") => GridAutoFlowValue::Column,
            Some("row dense") => GridAutoFlowValue::RowDense,
            Some("column dense") => GridAutoFlowValue::ColumnDense,
            _ => GridAutoFlowValue::Row,
        },
        justify_items: parse_align_value(c.justify_items.as_ref()),
    }
}
