use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::filtering::{apply_filters, FilterCondition};
use crate::index_ops;
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
    // Index indirection (Phase 2)
    view_indices: Vec<u32>,
    view_dirty: bool,
    generation: u64,
}

/// The result of a table query, containing visible rows and scroll metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableResult {
    pub rows: Vec<Vec<Value>>,
    pub total_count: usize,
    pub filtered_count: usize,
    pub virtual_slice: VirtualSlice,
}

/// Result of an index-based query (no data copying).
#[derive(Debug, Clone)]
pub struct IndexedResult {
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
            view_indices: Vec::new(),
            view_dirty: true,
            generation: 0,
        }
    }

    /// Set column definitions.
    pub fn set_columns(&mut self, columns: Vec<ColumnDef>) {
        self.columns = columns;
        self.view_dirty = true;
    }

    /// Get column definitions.
    pub fn columns(&self) -> &[ColumnDef] {
        &self.columns
    }

    /// Load data rows into the store.
    pub fn set_data(&mut self, rows: Vec<Vec<Value>>) {
        self.rows = rows;
        self.view_dirty = true;
        self.generation += 1;
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
        self.view_dirty = true;
    }

    /// Set filter conditions.
    pub fn set_filters(&mut self, conditions: Vec<FilterCondition>) {
        self.filter_conditions = conditions;
        self.view_dirty = true;
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

    // ── Index-based API (Phase 2) ──────────────────────────────────────

    /// Rebuild the view index array: filter → sort (in-place on u32 indices).
    pub fn rebuild_view(&mut self) {
        if !self.view_dirty {
            return;
        }
        self.view_dirty = false;

        let all = index_ops::identity_indices(self.rows.len());
        let filtered =
            index_ops::filter_indices(&all, &self.rows, &self.columns, &self.filter_conditions);
        self.view_indices = filtered;
        if !self.sort_configs.is_empty() {
            index_ops::sort_indices(
                &mut self.view_indices,
                &self.rows,
                &self.columns,
                &self.sort_configs,
            );
        }
    }

    /// Query using index indirection — no data cloning.
    pub fn query_indexed(&mut self, scroll_top: f64) -> IndexedResult {
        self.rebuild_view();

        let total_count = self.rows.len();
        let filtered_count = self.view_indices.len();

        let scroll_state = ScrollState {
            scroll_top,
            viewport_height: self.viewport_height,
            row_height: self.row_height,
            total_rows: filtered_count,
            overscan: self.overscan,
        };
        let virtual_slice = compute_virtual_slice(&scroll_state);

        IndexedResult {
            total_count,
            filtered_count,
            virtual_slice,
        }
    }

    /// Get the view indices (valid after `rebuild_view` / `query_indexed`).
    pub fn view_indices(&self) -> &[u32] {
        &self.view_indices
    }

    /// Get a reference to the raw rows.
    pub fn rows(&self) -> &[Vec<Value>] {
        &self.rows
    }

    /// Get the current generation counter.
    pub const fn generation(&self) -> u64 {
        self.generation
    }

    /// Get scroll config values (for unified hot path).
    pub const fn row_height(&self) -> f64 {
        self.row_height
    }

    pub const fn viewport_height(&self) -> f64 {
        self.viewport_height
    }

    pub const fn overscan(&self) -> usize {
        self.overscan
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

    // ── Index-based query tests ──────────────────────────────────────

    #[test]
    fn test_query_indexed_basic() {
        let mut store = DataStore::new();
        store.set_columns(sample_columns());
        store.set_data(sample_rows());
        store.set_scroll_config(40.0, 400.0, 5);

        let result = store.query_indexed(0.0);
        assert_eq!(result.total_count, 3);
        assert_eq!(result.filtered_count, 3);
        assert_eq!(store.view_indices(), &[0, 1, 2]);
    }

    #[test]
    fn test_query_indexed_with_sort() {
        let mut store = DataStore::new();
        store.set_columns(sample_columns());
        store.set_data(sample_rows());
        store.set_scroll_config(40.0, 400.0, 5);
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: crate::sorting::SortDirection::Ascending,
        }]);

        let result = store.query_indexed(0.0);
        assert_eq!(result.filtered_count, 3);
        // Bob(25)=idx1, Alice(30)=idx0, Charlie(35)=idx2
        assert_eq!(store.view_indices(), &[1, 0, 2]);
    }

    #[test]
    fn test_query_indexed_with_filter() {
        let mut store = DataStore::new();
        store.set_columns(sample_columns());
        store.set_data(sample_rows());
        store.set_scroll_config(40.0, 400.0, 5);
        store.set_filters(vec![crate::filtering::FilterCondition {
            column_key: "age".into(),
            operator: crate::filtering::FilterOperator::GreaterThan,
            value: json!(28),
        }]);

        let result = store.query_indexed(0.0);
        assert_eq!(result.total_count, 3);
        assert_eq!(result.filtered_count, 2); // Alice(30), Charlie(35)
        assert_eq!(store.view_indices(), &[0, 2]);
    }

    #[test]
    fn test_generation_increments() {
        let mut store = DataStore::new();
        assert_eq!(store.generation(), 0);

        store.set_data(vec![]);
        assert_eq!(store.generation(), 1);

        store.set_data(vec![]);
        assert_eq!(store.generation(), 2);
    }

    #[test]
    fn test_rebuild_view_idempotent() {
        let mut store = DataStore::new();
        store.set_columns(sample_columns());
        store.set_data(sample_rows());
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: crate::sorting::SortDirection::Ascending,
        }]);

        store.rebuild_view();
        let first = store.view_indices().to_vec();
        store.rebuild_view(); // should be no-op
        let second = store.view_indices().to_vec();
        assert_eq!(first, second);
    }
}
