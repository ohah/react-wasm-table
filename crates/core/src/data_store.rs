use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::filtering::{apply_filters, FilterCondition};
use crate::sorting::{apply_sort, SortConfig};
use crate::virtual_scroll::{compute_virtual_slice, ScrollState, VirtualSlice};

/// Column definition for the table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDef {
    pub key: String,
    pub header: String,
    pub width: Option<f64>,
    pub sortable: bool,
    pub filterable: bool,
}

/// The core data store that holds table data and manages operations.
#[derive(Debug)]
pub struct DataStore {
    columns: Vec<ColumnDef>,
    rows: Vec<Vec<Value>>,
    sort_configs: Vec<SortConfig>,
    filter_conditions: Vec<FilterCondition>,
    row_height: f64,
    viewport_height: f64,
    overscan: usize,
}

/// The result of a table query, containing visible rows and scroll metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableResult {
    pub rows: Vec<Vec<Value>>,
    pub total_count: usize,
    pub filtered_count: usize,
    pub virtual_slice: VirtualSlice,
}

impl DataStore {
    pub const fn new() -> Self {
        Self {
            columns: Vec::new(),
            rows: Vec::new(),
            sort_configs: Vec::new(),
            filter_conditions: Vec::new(),
            row_height: 40.0,
            viewport_height: 600.0,
            overscan: 5,
        }
    }

    /// Set column definitions.
    pub fn set_columns(&mut self, columns: Vec<ColumnDef>) {
        self.columns = columns;
    }

    /// Get column definitions.
    pub fn columns(&self) -> &[ColumnDef] {
        &self.columns
    }

    /// Load data rows into the store.
    pub fn set_data(&mut self, rows: Vec<Vec<Value>>) {
        self.rows = rows;
    }

    /// Get total row count.
    pub const fn row_count(&self) -> usize {
        self.rows.len()
    }

    /// Configure virtual scroll parameters.
    pub const fn set_scroll_config(
        &mut self,
        row_height: f64,
        viewport_height: f64,
        overscan: usize,
    ) {
        self.row_height = row_height;
        self.viewport_height = viewport_height;
        self.overscan = overscan;
    }

    /// Set sort configuration.
    pub fn set_sort(&mut self, configs: Vec<SortConfig>) {
        self.sort_configs = configs;
    }

    /// Set filter conditions.
    pub fn set_filters(&mut self, conditions: Vec<FilterCondition>) {
        self.filter_conditions = conditions;
    }

    /// Query the table: apply filters, sort, then compute virtual slice.
    pub fn query(&self, scroll_top: f64) -> TableResult {
        let total_count = self.rows.len();

        // Apply filters
        let filtered: Vec<&Vec<Value>> = if self.filter_conditions.is_empty() {
            self.rows.iter().collect()
        } else {
            apply_filters(&self.rows, &self.columns, &self.filter_conditions)
        };

        let filtered_count = filtered.len();

        // Apply sort
        let mut sorted: Vec<Vec<Value>> = filtered.into_iter().cloned().collect();
        if !self.sort_configs.is_empty() {
            apply_sort(&mut sorted, &self.columns, &self.sort_configs);
        }

        // Compute virtual slice
        let scroll_state = ScrollState {
            scroll_top,
            viewport_height: self.viewport_height,
            row_height: self.row_height,
            total_rows: filtered_count,
            overscan: self.overscan,
        };
        let virtual_slice = compute_virtual_slice(&scroll_state);

        // Extract visible rows
        let visible_rows =
            sorted[virtual_slice.start_index..virtual_slice.end_index.min(sorted.len())].to_vec();

        TableResult {
            rows: visible_rows,
            total_count,
            filtered_count,
            virtual_slice,
        }
    }
}

impl Default for DataStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_columns() -> Vec<ColumnDef> {
        vec![
            ColumnDef {
                key: "name".into(),
                header: "Name".into(),
                width: None,
                sortable: true,
                filterable: true,
            },
            ColumnDef {
                key: "age".into(),
                header: "Age".into(),
                width: None,
                sortable: true,
                filterable: true,
            },
        ]
    }

    fn sample_rows() -> Vec<Vec<Value>> {
        vec![
            vec![json!("Alice"), json!(30)],
            vec![json!("Bob"), json!(25)],
            vec![json!("Charlie"), json!(35)],
        ]
    }

    #[test]
    fn test_new_data_store() {
        let store = DataStore::new();
        assert_eq!(store.row_count(), 0);
    }

    #[test]
    fn test_set_data_and_query() {
        let mut store = DataStore::new();
        store.set_columns(sample_columns());
        store.set_data(sample_rows());
        store.set_scroll_config(40.0, 400.0, 5);

        let result = store.query(0.0);
        assert_eq!(result.total_count, 3);
        assert_eq!(result.filtered_count, 3);
        assert_eq!(result.rows.len(), 3);
    }

    #[test]
    fn test_query_with_sort() {
        let mut store = DataStore::new();
        store.set_columns(sample_columns());
        store.set_data(sample_rows());
        store.set_scroll_config(40.0, 400.0, 5);
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: crate::sorting::SortDirection::Ascending,
        }]);

        let result = store.query(0.0);
        // Bob (25) should be first
        assert_eq!(result.rows[0][0], json!("Bob"));
    }
}
