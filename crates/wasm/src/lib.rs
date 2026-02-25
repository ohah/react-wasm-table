// wasm_bindgen is incompatible with const fn
#![allow(clippy::missing_const_for_fn)]

use react_wasm_table_core::data_store::{ColumnDef, DataStore};
use react_wasm_table_core::filtering::{FilterCondition, FilterOperator};
use react_wasm_table_core::layout::{Align, ColumnLayout, LayoutEngine, Viewport};
use react_wasm_table_core::sorting::{SortConfig, SortDirection};
use serde_json::Value;
use wasm_bindgen::prelude::*;

/// The main WASM-exposed table engine.
#[wasm_bindgen]
pub struct TableEngine {
    store: DataStore,
    layout: LayoutEngine,
}

#[wasm_bindgen]
impl TableEngine {
    /// Create a new `TableEngine` instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            store: DataStore::new(),
            layout: LayoutEngine::new(),
        }
    }

    /// Compute layout for the current viewport. Returns cell positions as JSON.
    /// `viewport_js`: { width, height, rowHeight, headerHeight, scrollTop }
    /// `columns_js`: [{ width, flexGrow, flexShrink, minWidth?, maxWidth?, align }]
    /// `visible_start` / `visible_end`: visible row range
    #[wasm_bindgen(js_name = computeLayout)]
    pub fn compute_layout(
        &mut self,
        viewport_js: JsValue,
        columns_js: JsValue,
        visible_start: usize,
        visible_end: usize,
    ) -> Result<JsValue, JsError> {
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

        let mut header = self.layout.compute_header_layout(&columns, &viewport);
        let rows = self
            .layout
            .compute_rows_layout(&columns, &viewport, visible_start..visible_end);

        header.extend(rows);
        Ok(serde_wasm_bindgen::to_value(&header)?)
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

    /// Query the table and return visible rows + metadata.
    /// Returns a JS object: { rows, totalCount, filteredCount, virtualSlice }
    #[wasm_bindgen]
    pub fn query(&self, scroll_top: f64) -> Result<JsValue, JsError> {
        let result = self.store.query(scroll_top);
        Ok(serde_wasm_bindgen::to_value(&result)?)
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
