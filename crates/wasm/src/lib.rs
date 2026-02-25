// wasm_bindgen is incompatible with const fn
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::doc_markdown)]

use react_wasm_table_core::columnar_store::ColumnarStore;
use react_wasm_table_core::data_store::{ColumnDef, DataStore};
use react_wasm_table_core::filtering::{FilterCondition, FilterOperator};
use react_wasm_table_core::layout::{Align, ColumnLayout, LayoutEngine, Viewport};
use react_wasm_table_core::layout_buffer;
use react_wasm_table_core::sorting::{SortConfig, SortDirection};
use serde_json::Value;
use wasm_bindgen::prelude::*;

/// The main WASM-exposed table engine.
#[wasm_bindgen]
pub struct TableEngine {
    store: DataStore,
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
            store: DataStore::new(),
            layout: LayoutEngine::new(),
            layout_buf: Vec::new(),
            layout_cell_count: 0,
            columnar: ColumnarStore::new(),
        }
    }

    /// Compute layout into a flat f32 buffer (zero-copy path).
    /// JS reads the buffer via getLayoutBufferInfo() + Float32Array view.
    #[wasm_bindgen(js_name = computeLayoutBuffer)]
    pub fn compute_layout_buffer(
        &mut self,
        viewport_js: JsValue,
        columns_js: JsValue,
        visible_start: usize,
        visible_end: usize,
    ) -> Result<(), JsError> {
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

        let col_count = columns.len();
        let row_count = visible_end.saturating_sub(visible_start);
        let total_cells = col_count + row_count * col_count;
        let needed = layout_buffer::buf_len(total_cells);

        // Grow buffer if needed (never shrinks to avoid re-alloc thrashing)
        if self.layout_buf.len() < needed {
            self.layout_buf.resize(needed, 0.0);
        }

        self.layout_cell_count = self.layout.compute_into_buffer(
            &columns,
            &viewport,
            visible_start..visible_end,
            &mut self.layout_buf,
        );

        Ok(())
    }

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

    /// Set column definitions from a JS value.
    /// Expected: Array of { key: string, header: string, width?: number, sortable: boolean, filterable: boolean }
    #[wasm_bindgen(js_name = setColumns)]
    pub fn set_columns(&mut self, columns: JsValue) -> Result<(), JsError> {
        let columns: Vec<ColumnDef> = serde_wasm_bindgen::from_value(columns)?;
        self.store.set_columns(columns);
        Ok(())
    }

    /// Load data rows from a JS value.
    /// Expected: Array of Array of values (row-major)
    #[wasm_bindgen(js_name = setData)]
    pub fn set_data(&mut self, data: JsValue) -> Result<(), JsError> {
        let rows: Vec<Vec<Value>> = serde_wasm_bindgen::from_value(data)?;
        self.store.set_data(rows);
        Ok(())
    }

    /// Get total row count.
    #[wasm_bindgen(js_name = rowCount)]
    pub fn row_count(&self) -> usize {
        self.store.row_count()
    }

    /// Configure virtual scroll parameters.
    #[wasm_bindgen(js_name = setScrollConfig)]
    pub fn set_scroll_config(&mut self, row_height: f64, viewport_height: f64, overscan: usize) {
        self.store
            .set_scroll_config(row_height, viewport_height, overscan);
    }

    /// Set sort configuration from a JS value.
    /// Expected: Array of { columnIndex: number, direction: "Ascending" | "Descending" }
    #[wasm_bindgen(js_name = setSort)]
    pub fn set_sort(&mut self, configs: JsValue) -> Result<(), JsError> {
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
        self.store.set_sort(configs);
        Ok(())
    }

    /// Set filter conditions from a JS value.
    /// Expected: Array of { columnKey: string, operator: string, value: any }
    #[wasm_bindgen(js_name = setFilters)]
    pub fn set_filters(&mut self, conditions: JsValue) -> Result<(), JsError> {
        let conditions: Vec<JsFilterCondition> = serde_wasm_bindgen::from_value(conditions)?;
        let conditions: Vec<FilterCondition> = conditions
            .into_iter()
            .map(|c| FilterCondition {
                column_key: c.column_key,
                operator: parse_filter_operator(&c.operator),
                value: c.value,
            })
            .collect();
        self.store.set_filters(conditions);
        Ok(())
    }

    // ── Index-based query ──────────────────────────────────────────────

    /// Rebuild view indices (filter + sort on u32 index array).
    /// Call after data/sort/filter changes.
    #[wasm_bindgen(js_name = rebuildView)]
    pub fn rebuild_view(&mut self) {
        self.store.rebuild_view();
    }

    /// Index-based query: returns metadata as Float64Array.
    /// [total_count, filtered_count, start_index, end_index, offset_y, total_height, visible_count, generation]
    #[wasm_bindgen(js_name = queryIndexed)]
    pub fn query_indexed(&mut self, scroll_top: f64) -> Vec<f64> {
        let result = self.store.query_indexed(scroll_top);
        vec![
            result.total_count as f64,
            result.filtered_count as f64,
            result.virtual_slice.start_index as f64,
            result.virtual_slice.end_index as f64,
            result.virtual_slice.offset_y,
            result.virtual_slice.total_height,
            result.virtual_slice.visible_count as f64,
            self.store.generation() as f64,
        ]
    }

    /// Return [pointer_offset, length] for the view indices buffer.
    /// JS creates: `new Uint32Array(wasmMemory.buffer, offset, len)`
    #[wasm_bindgen(js_name = getViewIndicesInfo)]
    pub fn get_view_indices_info(&self) -> Vec<usize> {
        let indices = self.store.view_indices();
        vec![indices.as_ptr() as usize, indices.len()]
    }

    /// Get a cell value by original row index and column index.
    /// Returns the value via serde (used for visible cells only).
    #[wasm_bindgen(js_name = getCellValue)]
    pub fn get_cell_value(&self, row: usize, col: usize) -> JsValue {
        self.store
            .rows()
            .get(row)
            .and_then(|r| r.get(col))
            .map_or(JsValue::NULL, |v| {
                serde_wasm_bindgen::to_value(v).unwrap_or(JsValue::NULL)
            })
    }

    // ── Phase 4: Unified hot path ──────────────────────────────────────

    /// Single-call hot path: rebuild view + compute virtual slice + layout buffer.
    /// Returns metadata as Float64Array:
    /// [cell_count, visible_start, visible_end, total_height, filtered_count, generation, total_count, visible_count]
    #[wasm_bindgen(js_name = updateViewport)]
    pub fn update_viewport(
        &mut self,
        scroll_top: f64,
        viewport_js: JsValue,
        columns_js: JsValue,
    ) -> Result<Vec<f64>, JsError> {
        // 1. Rebuild view indices (filter + sort, skipped if not dirty)
        self.store.rebuild_view();

        // 2. Compute virtual slice
        let result = {
            let total_count = self.store.rows().len();
            let filtered_count = self.store.view_indices().len();
            let scroll_state = react_wasm_table_core::virtual_scroll::ScrollState {
                scroll_top,
                viewport_height: self.store_viewport_height(),
                row_height: self.store_row_height(),
                total_rows: filtered_count,
                overscan: self.store_overscan(),
            };
            let vs = react_wasm_table_core::virtual_scroll::compute_virtual_slice(&scroll_state);
            (total_count, filtered_count, vs)
        };
        let (total_count, filtered_count, virtual_slice) = result;

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
            self.store.generation() as f64,
            total_count as f64,
            virtual_slice.visible_count as f64,
        ])
    }

    // ── Phase 3: Columnar store ──────────────────────────────────────

    /// Ingest data into columnar format (called once per data change).
    #[wasm_bindgen(js_name = ingestColumnar)]
    pub fn ingest_columnar(&mut self, data: JsValue) -> Result<(), JsError> {
        let rows: Vec<Vec<Value>> = serde_wasm_bindgen::from_value(data)?;
        self.columnar.ingest_rows(&rows);
        Ok(())
    }

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
}

impl Default for TableEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[allow(dead_code)]
impl TableEngine {
    /// Access the layout engine (for testing).
    fn layout(&self) -> &LayoutEngine {
        &self.layout
    }

    fn store_row_height(&self) -> f64 {
        self.store.row_height()
    }

    fn store_viewport_height(&self) -> f64 {
        self.store.viewport_height()
    }

    fn store_overscan(&self) -> usize {
        self.store.overscan()
    }
}

#[derive(serde::Deserialize)]
struct JsSortConfig {
    #[serde(rename = "columnIndex")]
    column_index: usize,
    direction: String,
}

#[derive(serde::Deserialize)]
struct JsFilterCondition {
    #[serde(rename = "columnKey")]
    column_key: String,
    operator: String,
    value: Value,
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

fn parse_filter_operator(op: &str) -> FilterOperator {
    match op {
        "neq" | "notEquals" => FilterOperator::NotEquals,
        "contains" => FilterOperator::Contains,
        "gt" | "greaterThan" => FilterOperator::GreaterThan,
        "lt" | "lessThan" => FilterOperator::LessThan,
        "gte" | "greaterThanOrEqual" => FilterOperator::GreaterThanOrEqual,
        "lte" | "lessThanOrEqual" => FilterOperator::LessThanOrEqual,
        // "eq", "equals", and any unknown operator default to Equals
        _ => FilterOperator::Equals,
    }
}
