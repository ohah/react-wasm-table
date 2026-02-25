// wasm_bindgen is incompatible with const fn
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::doc_markdown)]

use react_wasm_table_core::columnar_store::ColumnarStore;
use react_wasm_table_core::data_store::ColumnDef;
use react_wasm_table_core::layout::{Align, ColumnLayout, LayoutEngine, Viewport};
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

        // 3. Parse viewport + columns for layout
        let vp: JsViewport = serde_wasm_bindgen::from_value(viewport_js)?;
        let cols: Vec<JsColumnLayout> = serde_wasm_bindgen::from_value(columns_js)?;

        let viewport = Viewport {
            width: vp.width,
            height: vp.height,
            row_height: vp.row_height,
            header_height: vp.header_height,
            scroll_top: vp.scroll_top,
        };

        let columns: Vec<ColumnLayout> = cols
            .into_iter()
            .map(|c| ColumnLayout {
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
            })
            .collect();

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
    width: f32,
    #[serde(rename = "flexGrow", default)]
    flex_grow: f32,
    #[serde(rename = "flexShrink", default)]
    flex_shrink: f32,
    #[serde(rename = "minWidth")]
    min_width: Option<f32>,
    #[serde(rename = "maxWidth")]
    max_width: Option<f32>,
    align: Option<String>,
}
