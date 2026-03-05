//! JS bridge type definitions for WASM ↔ JavaScript interop.

/// Sort configuration from JS.
#[derive(serde::Deserialize)]
pub struct JsSortConfig {
    #[serde(rename = "columnIndex")]
    pub column_index: usize,
    pub direction: String,
}

/// Column filter from JS.
#[derive(serde::Deserialize)]
pub struct JsColumnFilter {
    #[serde(rename = "columnIndex")]
    pub column_index: usize,
    pub op: String,
    pub value: JsFilterValue,
}

/// Filter value (bool, number, or string).
#[derive(serde::Deserialize)]
#[serde(untagged)]
pub enum JsFilterValue {
    Bool(bool),
    Float64(f64),
    String(String),
}

/// Viewport configuration from JS.
#[derive(serde::Deserialize)]
pub struct JsViewport {
    pub width: f32,
    pub height: f32,
    #[serde(rename = "rowHeight")]
    pub row_height: f32,
    #[serde(rename = "headerHeight")]
    pub header_height: f32,
    #[serde(rename = "scrollTop")]
    pub scroll_top: f32,
    #[serde(rename = "lineHeight", default = "default_line_height")]
    pub line_height: f32,
    #[serde(rename = "headerRowCount", default = "default_header_row_count")]
    pub header_row_count: usize,
}

pub fn default_line_height() -> f32 {
    20.0
}

pub fn default_header_row_count() -> usize {
    1
}

/// Column layout from JS.
#[derive(serde::Deserialize)]
pub struct JsColumnLayout {
    #[serde(default)]
    pub width: f32,
    #[serde(rename = "flexGrow", default)]
    pub flex_grow: f32,
    #[serde(rename = "flexShrink", default)]
    pub flex_shrink: f32,
    #[serde(rename = "minWidth")]
    pub min_width: Option<f32>,
    #[serde(rename = "maxWidth")]
    pub max_width: Option<f32>,
    #[serde(default)]
    pub align: Option<String>,
    // New flex child properties
    #[serde(rename = "flexBasis")]
    pub flex_basis: Option<JsDimension>,
    #[serde(default)]
    pub height: Option<JsDimension>,
    #[serde(rename = "minHeight")]
    pub min_height: Option<JsDimension>,
    #[serde(rename = "maxHeight")]
    pub max_height: Option<JsDimension>,
    #[serde(rename = "alignSelf")]
    pub align_self: Option<String>,
    #[serde(default)]
    pub padding: Option<JsRect>,
    #[serde(default)]
    pub margin: Option<JsRect>,
    #[serde(default)]
    pub border: Option<JsRect>,
    #[serde(rename = "boxSizing")]
    pub box_sizing: Option<String>,
    #[serde(rename = "aspectRatio")]
    pub aspect_ratio: Option<f32>,
    #[serde(default)]
    pub position: Option<String>,
    #[serde(default)]
    pub inset: Option<JsRect>,
    // Grid child properties
    #[serde(rename = "gridRow")]
    pub grid_row: Option<JsGridLine>,
    #[serde(rename = "gridColumn")]
    pub grid_column: Option<JsGridLine>,
    #[serde(rename = "justifySelf")]
    pub justify_self: Option<String>,
}

/// Container layout from JS.
#[derive(serde::Deserialize)]
pub struct JsContainerLayout {
    #[serde(default)]
    pub display: Option<String>,
    #[serde(rename = "flexDirection")]
    pub flex_direction: Option<String>,
    #[serde(rename = "flexWrap")]
    pub flex_wrap: Option<String>,
    #[serde(default)]
    pub gap: Option<JsDimension>,
    #[serde(rename = "rowGap")]
    pub row_gap: Option<JsDimension>,
    #[serde(rename = "columnGap")]
    pub column_gap: Option<JsDimension>,
    #[serde(rename = "alignItems")]
    pub align_items: Option<String>,
    #[serde(rename = "alignContent")]
    pub align_content: Option<String>,
    #[serde(rename = "justifyContent")]
    pub justify_content: Option<String>,
    #[serde(rename = "overflowX")]
    pub overflow_x: Option<String>,
    #[serde(rename = "overflowY")]
    pub overflow_y: Option<String>,
    #[serde(rename = "scrollbarWidth")]
    pub scrollbar_width: Option<f32>,
    #[serde(default)]
    pub padding: Option<JsRect>,
    #[serde(default)]
    pub margin: Option<JsRect>,
    #[serde(default)]
    pub border: Option<JsRect>,
    // Grid container properties
    #[serde(rename = "gridTemplateRows")]
    pub grid_template_rows: Option<JsGridTrackList>,
    #[serde(rename = "gridTemplateColumns")]
    pub grid_template_columns: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoRows")]
    pub grid_auto_rows: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoColumns")]
    pub grid_auto_columns: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoFlow")]
    pub grid_auto_flow: Option<String>,
    #[serde(rename = "justifyItems")]
    pub justify_items: Option<String>,
}

/// A CSS dimension: number (px) or string ("50%", "auto").
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
pub enum JsDimension {
    Number(f32),
    Str(String),
}

/// A CSS rect with top/right/bottom/left.
#[derive(serde::Deserialize, Default)]
pub struct JsRect {
    #[serde(default)]
    pub top: Option<JsDimension>,
    #[serde(default)]
    pub right: Option<JsDimension>,
    #[serde(default)]
    pub bottom: Option<JsDimension>,
    #[serde(default)]
    pub left: Option<JsDimension>,
}

/// A CSS grid track size: number (px) or string ("1fr", "auto", "50%", "min-content", etc.).
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
pub enum JsGridTrackSize {
    Number(f32),
    Str(String),
}

/// A CSS grid track list: single value or array of values.
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
pub enum JsGridTrackList {
    Single(JsGridTrackSize),
    Array(Vec<JsGridTrackSize>),
}

/// A CSS grid placement: number (line) or string ("span 2", "auto").
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
pub enum JsGridPlacement {
    Number(i16),
    Str(String),
}

/// A CSS grid line: single placement or [start, end] pair.
#[derive(serde::Deserialize, Clone)]
#[serde(untagged)]
pub enum JsGridLine {
    Single(JsGridPlacement),
    Pair(Vec<JsGridPlacement>),
}
