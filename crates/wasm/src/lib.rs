// wasm_bindgen is incompatible with const fn
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::doc_markdown)]

use react_wasm_table_core::columnar_store::ColumnarStore;
use react_wasm_table_core::data_store::ColumnDef;
use react_wasm_table_core::layout::{
    Align, AlignValue, BoxSizingValue, ColumnLayout, ContainerLayout, DimensionValue, DisplayValue,
    FlexDirectionValue, FlexWrapValue, LayoutEngine, LengthAutoValue, LengthValue, OverflowValue,
    PositionValue, RectValue, Viewport,
};
use react_wasm_table_core::layout_buffer;
use react_wasm_table_core::sorting::{SortConfig, SortDirection};
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

    /// Return the number of cells in the last layout computation.
    #[wasm_bindgen(js_name = getLayoutCellCount)]
    pub fn get_layout_cell_count(&self) -> usize {
        self.layout_cell_count
    }

    // ── Column metadata ───────────────────────────────────────────────

    /// Set columns on the columnar store.
    #[wasm_bindgen(js_name = setColumnarColumns)]
    pub fn set_columnar_columns(&mut self, columns: JsValue) -> Result<(), JsError> {
        let columns: Vec<ColumnDef> = serde_wasm_bindgen::from_value(columns)?;
        self.columnar.set_columns(columns);
        Ok(())
    }

    /// Get Float64 column pointer info: [offset, length].
    /// Returns empty vec if column is not Float64.
    #[wasm_bindgen(js_name = getColumnFloat64Info)]
    pub fn get_column_float64_info(&self, col_idx: usize) -> Vec<usize> {
        self.columnar
            .get_float64_ptr(col_idx)
            .map_or_else(Vec::new, |(ptr, len)| vec![ptr as usize, len])
    }

    /// Get column type: 0=Float64, 1=String, 2=Bool, -1=invalid.
    #[wasm_bindgen(js_name = getColumnType)]
    pub fn get_column_type(&self, col_idx: usize) -> i32 {
        use react_wasm_table_core::columnar_store::ColumnType;
        match self.columnar.column_type(col_idx) {
            Some(ColumnType::Float64) => 0,
            Some(ColumnType::String) => 1,
            Some(ColumnType::Bool) => 2,
            None => -1,
        }
    }

    /// Get the columnar store generation.
    #[wasm_bindgen(js_name = getColumnarGeneration)]
    pub fn get_columnar_generation(&self) -> u64 {
        self.columnar.generation
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
    /// [cell_count, visible_start, visible_end, total_height, filtered_count, generation, total_count, visible_count]
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

        // 2. Compute virtual slice
        let total_count = self.columnar.row_count;
        let filtered_count = self.columnar.view_indices().len();
        let scroll_state = react_wasm_table_core::virtual_scroll::ScrollState {
            scroll_top,
            viewport_height: self.columnar.viewport_height(),
            row_height: self.columnar.row_height(),
            total_rows: filtered_count,
            overscan: self.columnar.overscan(),
        };
        let virtual_slice =
            react_wasm_table_core::virtual_scroll::compute_virtual_slice(&scroll_state);

        // 3. Parse viewport + columns + container for layout
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
        };

        let columns: Vec<ColumnLayout> = cols.into_iter().map(|c| convert_column(&c)).collect();

        // 4. Compute layout into buffer
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

        // 5. Return metadata
        Ok(vec![
            self.layout_cell_count as f64,
            virtual_slice.start_index as f64,
            virtual_slice.end_index as f64,
            virtual_slice.total_height,
            filtered_count as f64,
            self.columnar.generation as f64,
            total_count as f64,
            virtual_slice.visible_count as f64,
        ])
    }

    /// Return [pointer_offset, length] for the view indices buffer.
    #[wasm_bindgen(js_name = getColumnarViewIndicesInfo)]
    pub fn get_columnar_view_indices_info(&self) -> Vec<usize> {
        let indices = self.columnar.view_indices();
        vec![indices.as_ptr() as usize, indices.len()]
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
struct JsViewport {
    width: f32,
    height: f32,
    #[serde(rename = "rowHeight")]
    row_height: f32,
    #[serde(rename = "headerHeight")]
    header_height: f32,
    #[serde(rename = "scrollTop")]
    scroll_top: f32,
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

// ── Conversion helpers ───────────────────────────────────────────────

fn parse_dimension(d: &Option<JsDimension>) -> DimensionValue {
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

fn parse_length(d: &Option<JsDimension>) -> LengthValue {
    match d {
        None => LengthValue::Zero,
        Some(JsDimension::Number(v)) => LengthValue::Length(*v),
        Some(JsDimension::Str(s)) => {
            if let Some(pct) = s.strip_suffix('%') {
                pct.parse::<f32>()
                    .map_or(LengthValue::Zero, |v| LengthValue::Percent(v / 100.0))
            } else {
                s.parse::<f32>()
                    .map_or(LengthValue::Zero, LengthValue::Length)
            }
        }
    }
}

fn parse_length_auto(d: &Option<JsDimension>) -> LengthAutoValue {
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

fn parse_length_rect(r: &Option<JsRect>) -> RectValue<LengthValue> {
    match r {
        None => RectValue::default(),
        Some(r) => RectValue {
            top: parse_length(&r.top),
            right: parse_length(&r.right),
            bottom: parse_length(&r.bottom),
            left: parse_length(&r.left),
        },
    }
}

fn parse_length_auto_rect(r: &Option<JsRect>) -> RectValue<LengthAutoValue> {
    match r {
        None => RectValue::zero_auto(),
        Some(r) => RectValue {
            top: parse_length_auto(&r.top),
            right: parse_length_auto(&r.right),
            bottom: parse_length_auto(&r.bottom),
            left: parse_length_auto(&r.left),
        },
    }
}

fn parse_align_value(s: &Option<String>) -> Option<AlignValue> {
    s.as_deref().map(|v| match v {
        "start" => AlignValue::Start,
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
        flex_basis: parse_dimension(&c.flex_basis),
        height: parse_dimension(&c.height),
        min_height: parse_dimension(&c.min_height),
        max_height: parse_dimension(&c.max_height),
        align_self: parse_align_value(&c.align_self),
        padding: parse_length_rect(&c.padding),
        margin: parse_length_auto_rect(&c.margin),
        border: parse_length_rect(&c.border),
        box_sizing: match c.box_sizing.as_deref() {
            Some("content-box") => BoxSizingValue::ContentBox,
            _ => BoxSizingValue::BorderBox,
        },
        aspect_ratio: c.aspect_ratio,
        position: match c.position.as_deref() {
            Some("absolute") => PositionValue::Absolute,
            _ => PositionValue::Relative,
        },
        inset: parse_length_auto_rect(&c.inset),
    }
}

fn convert_container(c: &JsContainerLayout) -> ContainerLayout {
    ContainerLayout {
        display: match c.display.as_deref() {
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
        gap: parse_length(&c.gap),
        row_gap: c.row_gap.as_ref().map(|d| parse_length(&Some(d.clone()))),
        column_gap: c
            .column_gap
            .as_ref()
            .map(|d| parse_length(&Some(d.clone()))),
        align_items: parse_align_value(&c.align_items),
        align_content: parse_align_value(&c.align_content),
        justify_content: parse_align_value(&c.justify_content),
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
        padding: parse_length_rect(&c.padding),
        margin: parse_length_auto_rect(&c.margin),
        border: parse_length_rect(&c.border),
    }
}
