use std::collections::HashMap;

use crate::data_store::ColumnDef;
use crate::filtering::{FilterCondition, FilterOperator};
use crate::sorting::{SortConfig, SortDirection};
use serde_json::Value;

/// Column data type tag.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ColumnType {
    Float64,
    String,
    Bool,
}

/// Type-specific columnar data.
#[derive(Debug)]
pub enum ColumnData {
    /// Dense f64 array. NaN = null sentinel.
    Float64(Vec<f64>),
    /// String column: each row stores an intern ID, resolved via `StringInternTable`.
    Strings {
        ids: Vec<u32>,
        intern: StringInternTable,
    },
    /// Bool stored as f64: 0.0 = false, 1.0 = true, NaN = null.
    Bool(Vec<f64>),
}

/// Interned string table for efficient comparison and compact storage.
#[derive(Debug)]
pub struct StringInternTable {
    bytes: Vec<u8>,
    offsets: Vec<(u32, u32)>, // (byte_offset, byte_length) per intern ID
    lookup: HashMap<String, u32>,
}

impl StringInternTable {
    pub fn new() -> Self {
        Self {
            bytes: Vec::new(),
            offsets: Vec::new(),
            lookup: HashMap::new(),
        }
    }

    /// Intern a string, returning its ID.
    pub fn intern(&mut self, s: &str) -> u32 {
        if let Some(&id) = self.lookup.get(s) {
            return id;
        }
        let id = self.offsets.len() as u32;
        let start = self.bytes.len() as u32;
        self.bytes.extend_from_slice(s.as_bytes());
        let len = s.len() as u32;
        self.offsets.push((start, len));
        self.lookup.insert(s.to_string(), id);
        id
    }

    /// Resolve an intern ID to a string slice.
    pub fn resolve(&self, id: u32) -> &str {
        let (offset, len) = self.offsets[id as usize];
        std::str::from_utf8(&self.bytes[offset as usize..(offset + len) as usize])
            .expect("invalid UTF-8 in intern table")
    }

    pub const fn len(&self) -> usize {
        self.offsets.len()
    }

    pub const fn is_empty(&self) -> bool {
        self.offsets.is_empty()
    }
}

impl Default for StringInternTable {
    fn default() -> Self {
        Self::new()
    }
}

/// Columnar data store: one typed array per column.
#[derive(Debug)]
pub struct ColumnarStore {
    pub columns: Vec<ColumnDef>,
    pub data: Vec<ColumnData>,
    pub row_count: usize,
    pub generation: u64,
    // View management (mirrors DataStore's index indirection)
    view_indices: Vec<u32>,
    view_dirty: bool,
    sort_configs: Vec<SortConfig>,
    filter_conditions: Vec<FilterCondition>,
    row_height: f64,
    viewport_height: f64,
    overscan: usize,
}

impl ColumnarStore {
    pub const fn new() -> Self {
        Self {
            columns: Vec::new(),
            data: Vec::new(),
            row_count: 0,
            generation: 0,
            view_indices: Vec::new(),
            view_dirty: true,
            sort_configs: Vec::new(),
            filter_conditions: Vec::new(),
            row_height: 36.0,
            viewport_height: 600.0,
            overscan: 5,
        }
    }

    /// Set column definitions and clear data.
    pub fn set_columns(&mut self, columns: Vec<ColumnDef>) {
        self.columns = columns;
        self.data.clear();
        self.row_count = 0;
    }

    // ── Direct column setters (serde bypass) ──────────────────────────

    /// Initialize for direct column ingestion. Clears existing data.
    pub fn init(&mut self, col_count: usize, row_count: usize) {
        self.data = Vec::with_capacity(col_count);
        // Fill with empty Float64 columns as placeholders
        for _ in 0..col_count {
            self.data.push(ColumnData::Float64(Vec::new()));
        }
        self.row_count = row_count;
        self.generation += 1;
        self.view_dirty = true;
    }

    /// Set a Float64 column directly from a slice (no serde).
    pub fn set_column_float64(&mut self, col_idx: usize, values: &[f64]) {
        if col_idx < self.data.len() {
            self.data[col_idx] = ColumnData::Float64(values.to_vec());
        }
    }

    /// Set a Bool column directly from a slice (0.0/1.0/NaN, no serde).
    pub fn set_column_bool(&mut self, col_idx: usize, values: &[f64]) {
        if col_idx < self.data.len() {
            self.data[col_idx] = ColumnData::Bool(values.to_vec());
        }
    }

    /// Set a String column from pre-interned data (unique strings + ID array).
    pub fn set_column_strings(&mut self, col_idx: usize, unique: &[String], ids: &[u32]) {
        if col_idx < self.data.len() {
            let mut intern = StringInternTable::new();
            for s in unique {
                intern.intern(s);
            }
            self.data[col_idx] = ColumnData::Strings {
                ids: ids.to_vec(),
                intern,
            };
        }
    }

    /// Finalize after all columns are set. Marks view as dirty.
    pub const fn finalize(&mut self) {
        self.view_dirty = true;
    }

    // ── View management ───────────────────────────────────────────────

    /// Set sort configuration. Marks view dirty.
    pub fn set_sort(&mut self, configs: Vec<SortConfig>) {
        self.sort_configs = configs;
        self.view_dirty = true;
    }

    /// Set filter conditions. Marks view dirty.
    pub fn set_filters(&mut self, conditions: Vec<FilterCondition>) {
        self.filter_conditions = conditions;
        self.view_dirty = true;
    }

    /// Set scroll configuration.
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

    /// Rebuild the view index array: filter → sort (in-place on u32 indices).
    /// Skips if not dirty.
    pub fn rebuild_view(&mut self) {
        if !self.view_dirty {
            return;
        }
        self.view_dirty = false;

        let all: Vec<u32> = (0..self.row_count as u32).collect();
        let conditions = std::mem::take(&mut self.filter_conditions);
        let mut indices = filter_indices_columnar(&all, self, &conditions);
        self.filter_conditions = conditions;

        if !self.sort_configs.is_empty() {
            let configs = std::mem::take(&mut self.sort_configs);
            sort_indices_columnar(&mut indices, self, &configs);
            self.sort_configs = configs;
        }
        self.view_indices = indices;
    }

    /// Get the view indices (valid after `rebuild_view`).
    pub fn view_indices(&self) -> &[u32] {
        &self.view_indices
    }

    /// Get scroll config values.
    pub const fn row_height(&self) -> f64 {
        self.row_height
    }

    pub const fn viewport_height(&self) -> f64 {
        self.viewport_height
    }

    pub const fn overscan(&self) -> usize {
        self.overscan
    }

    /// Ingest row-major `serde_json::Value` data into columnar format.
    /// Auto-detects column type from first non-null value.
    pub fn ingest_rows(&mut self, rows: &[Vec<serde_json::Value>]) {
        let col_count = self.columns.len();
        let row_count = rows.len();
        self.row_count = row_count;
        self.generation += 1;

        // Detect column types from first non-null value
        let types: Vec<ColumnType> = (0..col_count)
            .map(|col_idx| detect_type(rows, col_idx))
            .collect();

        self.data = types
            .iter()
            .enumerate()
            .map(|(col_idx, col_type)| match col_type {
                ColumnType::Float64 => {
                    let mut values = Vec::with_capacity(row_count);
                    for row in rows {
                        let v = row.get(col_idx).and_then(Value::as_f64).unwrap_or(f64::NAN);
                        values.push(v);
                    }
                    ColumnData::Float64(values)
                }
                ColumnType::String => {
                    let mut intern = StringInternTable::new();
                    // Intern empty string as ID 0 for null sentinel
                    intern.intern("");
                    let mut ids = Vec::with_capacity(row_count);
                    for row in rows {
                        let s = row.get(col_idx).and_then(|v| v.as_str()).unwrap_or("");
                        ids.push(intern.intern(s));
                    }
                    ColumnData::Strings { ids, intern }
                }
                ColumnType::Bool => {
                    let mut values = Vec::with_capacity(row_count);
                    for row in rows {
                        let v = row.get(col_idx).and_then(Value::as_bool);
                        values.push(match v {
                            Some(true) => 1.0,
                            Some(false) => 0.0,
                            None => f64::NAN,
                        });
                    }
                    ColumnData::Bool(values)
                }
            })
            .collect();
    }

    /// Get the Float64 data pointer for a column (for zero-copy JS access).
    /// Returns None if column is not Float64.
    pub fn get_float64_ptr(&self, col_idx: usize) -> Option<(*const f64, usize)> {
        match self.data.get(col_idx) {
            Some(ColumnData::Float64(v) | ColumnData::Bool(v)) => Some((v.as_ptr(), v.len())),
            _ => None,
        }
    }

    /// Get the column type.
    pub fn column_type(&self, col_idx: usize) -> Option<ColumnType> {
        self.data.get(col_idx).map(|d| match d {
            ColumnData::Float64(_) => ColumnType::Float64,
            ColumnData::Strings { .. } => ColumnType::String,
            ColumnData::Bool(_) => ColumnType::Bool,
        })
    }
}

impl Default for ColumnarStore {
    fn default() -> Self {
        Self::new()
    }
}

// ── Index operations on ColumnarStore ─────────────────────────────────

/// Sort indices by comparing columnar data directly.
pub fn sort_indices_columnar(indices: &mut [u32], store: &ColumnarStore, configs: &[SortConfig]) {
    if configs.is_empty() {
        return;
    }

    indices.sort_by(|&a, &b| {
        for config in configs {
            let ordering = compare_columnar(store, config.column_index, a as usize, b as usize);
            let ordering = match config.direction {
                SortDirection::Ascending => ordering,
                SortDirection::Descending => ordering.reverse(),
            };
            if ordering != std::cmp::Ordering::Equal {
                return ordering;
            }
        }
        std::cmp::Ordering::Equal
    });
}

/// Filter indices using columnar data.
pub fn filter_indices_columnar(
    indices: &[u32],
    store: &ColumnarStore,
    conditions: &[FilterCondition],
) -> Vec<u32> {
    if conditions.is_empty() {
        return indices.to_vec();
    }

    indices
        .iter()
        .copied()
        .filter(|&idx| {
            conditions.iter().all(|cond| {
                let col_idx = store.columns.iter().position(|c| c.key == cond.column_key);
                col_idx.is_some_and(|ci| matches_columnar(store, ci, idx as usize, cond))
            })
        })
        .collect()
}

fn compare_columnar(
    store: &ColumnarStore,
    col_idx: usize,
    row_a: usize,
    row_b: usize,
) -> std::cmp::Ordering {
    match store.data.get(col_idx) {
        Some(ColumnData::Float64(v) | ColumnData::Bool(v)) => {
            let a = v[row_a];
            let b = v[row_b];
            // NaN handling: NaN is "less than" any real value
            match (a.is_nan(), b.is_nan()) {
                (true, true) => std::cmp::Ordering::Equal,
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                (false, false) => a.partial_cmp(&b).unwrap_or(std::cmp::Ordering::Equal),
            }
        }
        Some(ColumnData::Strings { ids, intern }) => {
            let a = intern.resolve(ids[row_a]);
            let b = intern.resolve(ids[row_b]);
            a.cmp(b)
        }
        None => std::cmp::Ordering::Equal,
    }
}

fn matches_columnar(
    store: &ColumnarStore,
    col_idx: usize,
    row_idx: usize,
    cond: &FilterCondition,
) -> bool {
    match store.data.get(col_idx) {
        Some(ColumnData::Float64(v) | ColumnData::Bool(v)) => {
            let cell = v[row_idx];
            if cell.is_nan() {
                return matches!(cond.operator, FilterOperator::NotEquals);
            }
            let filter_val = cond.value.as_f64();
            match cond.operator {
                FilterOperator::Equals => {
                    filter_val.is_some_and(|fv| (cell - fv).abs() < f64::EPSILON)
                }
                FilterOperator::NotEquals => {
                    filter_val.is_none_or(|fv| (cell - fv).abs() >= f64::EPSILON)
                }
                FilterOperator::GreaterThan => filter_val.is_some_and(|fv| cell > fv),
                FilterOperator::LessThan => filter_val.is_some_and(|fv| cell < fv),
                FilterOperator::GreaterThanOrEqual => filter_val.is_some_and(|fv| cell >= fv),
                FilterOperator::LessThanOrEqual => filter_val.is_some_and(|fv| cell <= fv),
                FilterOperator::Contains => false, // numeric columns don't support "contains"
            }
        }
        Some(ColumnData::Strings { ids, intern }) => {
            let cell = intern.resolve(ids[row_idx]);
            let filter_str = cond.value.as_str().unwrap_or("");
            match cond.operator {
                FilterOperator::Equals => cell == filter_str,
                FilterOperator::NotEquals => cell != filter_str,
                FilterOperator::Contains => {
                    cell.to_lowercase().contains(&filter_str.to_lowercase())
                }
                FilterOperator::GreaterThan => cell > filter_str,
                FilterOperator::LessThan => cell < filter_str,
                FilterOperator::GreaterThanOrEqual => cell >= filter_str,
                FilterOperator::LessThanOrEqual => cell <= filter_str,
            }
        }
        None => false,
    }
}

/// Detect column type from first non-null value.
fn detect_type(rows: &[Vec<serde_json::Value>], col_idx: usize) -> ColumnType {
    for row in rows {
        if let Some(v) = row.get(col_idx) {
            if v.is_null() {
                continue;
            }
            if v.is_number() {
                return ColumnType::Float64;
            }
            if v.is_boolean() {
                return ColumnType::Bool;
            }
            return ColumnType::String;
        }
    }
    ColumnType::String // default for all-null columns
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_store::ColumnDef;
    use serde_json::json;

    fn test_columns() -> Vec<ColumnDef> {
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
            ColumnDef {
                key: "active".into(),
                header: "Active".into(),
                width: None,
                sortable: false,
                filterable: true,
            },
        ]
    }

    fn test_rows() -> Vec<Vec<serde_json::Value>> {
        vec![
            vec![json!("Alice"), json!(30), json!(true)],
            vec![json!("Bob"), json!(25), json!(false)],
            vec![json!("Charlie"), json!(35), json!(true)],
            vec![json!("Alice Smith"), json!(28), json!(null)],
        ]
    }

    #[test]
    fn ingest_and_column_types() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        assert_eq!(store.row_count, 4);
        assert_eq!(store.column_type(0), Some(ColumnType::String));
        assert_eq!(store.column_type(1), Some(ColumnType::Float64));
        assert_eq!(store.column_type(2), Some(ColumnType::Bool));
    }

    #[test]
    fn float64_values_correct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        if let ColumnData::Float64(v) = &store.data[1] {
            assert!((v[0] - 30.0).abs() < f64::EPSILON);
            assert!((v[1] - 25.0).abs() < f64::EPSILON);
            assert!((v[2] - 35.0).abs() < f64::EPSILON);
            assert!((v[3] - 28.0).abs() < f64::EPSILON);
        } else {
            panic!("expected Float64");
        }
    }

    #[test]
    fn string_intern_correct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        if let ColumnData::Strings { ids, intern } = &store.data[0] {
            assert_eq!(intern.resolve(ids[0]), "Alice");
            assert_eq!(intern.resolve(ids[1]), "Bob");
            assert_eq!(intern.resolve(ids[2]), "Charlie");
            assert_eq!(intern.resolve(ids[3]), "Alice Smith");
        } else {
            panic!("expected Strings");
        }
    }

    #[test]
    fn bool_values_correct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        if let ColumnData::Bool(v) = &store.data[2] {
            assert!((v[0] - 1.0).abs() < f64::EPSILON); // true
            assert!((v[1] - 0.0).abs() < f64::EPSILON); // false
            assert!((v[2] - 1.0).abs() < f64::EPSILON); // true
            assert!(v[3].is_nan()); // null
        } else {
            panic!("expected Bool");
        }
    }

    #[test]
    fn sort_columnar_ascending() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let mut indices: Vec<u32> = (0..4).collect();
        sort_indices_columnar(
            &mut indices,
            &store,
            &[SortConfig {
                column_index: 1,
                direction: SortDirection::Ascending,
            }],
        );
        // Bob(25), Alice Smith(28), Alice(30), Charlie(35)
        assert_eq!(indices, vec![1, 3, 0, 2]);
    }

    #[test]
    fn sort_columnar_strings() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let mut indices: Vec<u32> = (0..4).collect();
        sort_indices_columnar(
            &mut indices,
            &store,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );
        // Alice, Alice Smith, Bob, Charlie
        assert_eq!(indices, vec![0, 3, 1, 2]);
    }

    #[test]
    fn filter_columnar_gt() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let all: Vec<u32> = (0..4).collect();
        let result = filter_indices_columnar(
            &all,
            &store,
            &[FilterCondition {
                column_key: "age".into(),
                operator: FilterOperator::GreaterThan,
                value: json!(28),
            }],
        );
        assert_eq!(result, vec![0, 2]); // Alice(30), Charlie(35)
    }

    #[test]
    fn filter_columnar_contains() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let all: Vec<u32> = (0..4).collect();
        let result = filter_indices_columnar(
            &all,
            &store,
            &[FilterCondition {
                column_key: "name".into(),
                operator: FilterOperator::Contains,
                value: json!("alice"),
            }],
        );
        assert_eq!(result, vec![0, 3]); // Alice, Alice Smith
    }

    #[test]
    fn float64_ptr_accessible() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let (ptr, len) = store.get_float64_ptr(1).expect("should be Float64");
        assert_eq!(len, 4);
        assert!(!ptr.is_null());
    }

    #[test]
    fn generation_increments() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        assert_eq!(store.generation, 0);

        store.ingest_rows(&test_rows());
        assert_eq!(store.generation, 1);

        store.ingest_rows(&test_rows());
        assert_eq!(store.generation, 2);
    }

    // ── Direct column setter tests ────────────────────────────────────

    #[test]
    fn init_and_set_columns_direct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 4);

        assert_eq!(store.row_count, 4);
        assert_eq!(store.data.len(), 3);
        assert_eq!(store.generation, 1);
    }

    #[test]
    fn set_column_float64_direct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 4);
        store.set_column_float64(1, &[30.0, 25.0, 35.0, 28.0]);

        assert_eq!(store.column_type(1), Some(ColumnType::Float64));
        if let ColumnData::Float64(v) = &store.data[1] {
            assert_eq!(v, &[30.0, 25.0, 35.0, 28.0]);
        } else {
            panic!("expected Float64");
        }
    }

    #[test]
    fn set_column_bool_direct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 4);
        store.set_column_bool(2, &[1.0, 0.0, 1.0, f64::NAN]);

        assert_eq!(store.column_type(2), Some(ColumnType::Bool));
        if let ColumnData::Bool(v) = &store.data[2] {
            assert!((v[0] - 1.0).abs() < f64::EPSILON);
            assert!((v[1] - 0.0).abs() < f64::EPSILON);
            assert!(v[3].is_nan());
        } else {
            panic!("expected Bool");
        }
    }

    #[test]
    fn set_column_strings_direct() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 4);
        let unique = vec![
            "".to_string(),
            "Alice".to_string(),
            "Bob".to_string(),
            "Charlie".to_string(),
            "Alice Smith".to_string(),
        ];
        store.set_column_strings(0, &unique, &[1, 2, 3, 4]);

        assert_eq!(store.column_type(0), Some(ColumnType::String));
        if let ColumnData::Strings { ids, intern } = &store.data[0] {
            assert_eq!(intern.resolve(ids[0]), "Alice");
            assert_eq!(intern.resolve(ids[1]), "Bob");
            assert_eq!(intern.resolve(ids[2]), "Charlie");
            assert_eq!(intern.resolve(ids[3]), "Alice Smith");
        } else {
            panic!("expected Strings");
        }
    }

    #[test]
    fn direct_ingestion_roundtrip_with_sort() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 4);
        // Column 0: strings (name)
        let unique = vec![
            "".to_string(),
            "Alice".to_string(),
            "Bob".to_string(),
            "Charlie".to_string(),
            "Alice Smith".to_string(),
        ];
        store.set_column_strings(0, &unique, &[1, 2, 3, 4]);
        // Column 1: float64 (age)
        store.set_column_float64(1, &[30.0, 25.0, 35.0, 28.0]);
        // Column 2: bool (active)
        store.set_column_bool(2, &[1.0, 0.0, 1.0, f64::NAN]);
        store.finalize();

        // Sort by age ascending
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Ascending,
        }]);
        store.rebuild_view();

        // Bob(25)=1, Alice Smith(28)=3, Alice(30)=0, Charlie(35)=2
        assert_eq!(store.view_indices(), &[1, 3, 0, 2]);
    }

    #[test]
    fn rebuild_view_idempotent() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Ascending,
        }]);

        store.rebuild_view();
        let first = store.view_indices().to_vec();
        store.rebuild_view(); // should be no-op (not dirty)
        let second = store.view_indices().to_vec();
        assert_eq!(first, second);
    }

    #[test]
    fn rebuild_view_with_filter() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 4);
        store.set_column_float64(1, &[30.0, 25.0, 35.0, 28.0]);
        store.set_column_strings(
            0,
            &[
                "".into(),
                "Alice".into(),
                "Bob".into(),
                "Charlie".into(),
                "Alice Smith".into(),
            ],
            &[1, 2, 3, 4],
        );
        store.set_column_bool(2, &[1.0, 0.0, 1.0, f64::NAN]);
        store.finalize();

        store.set_filters(vec![FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::GreaterThan,
            value: json!(28),
        }]);
        store.rebuild_view();

        // Alice(30)=0, Charlie(35)=2
        assert_eq!(store.view_indices(), &[0, 2]);
    }

    #[test]
    fn scroll_config_stored() {
        let mut store = ColumnarStore::new();
        store.set_scroll_config(40.0, 800.0, 3);
        assert!((store.row_height() - 40.0).abs() < f64::EPSILON);
        assert!((store.viewport_height() - 800.0).abs() < f64::EPSILON);
        assert_eq!(store.overscan(), 3);
    }

    // ── StringInternTable coverage ───────────────────────────────────

    #[test]
    fn intern_cache_hit_returns_same_id() {
        let mut intern = StringInternTable::new();
        let id1 = intern.intern("hello");
        let id2 = intern.intern("hello"); // cache hit path (line 50)
        assert_eq!(id1, id2);
        assert_eq!(intern.len(), 1); // only one entry
    }

    #[test]
    fn intern_table_len_and_is_empty() {
        let mut intern = StringInternTable::new();
        assert!(intern.is_empty()); // lines 72-73
        assert_eq!(intern.len(), 0); // lines 68-69

        intern.intern("a");
        assert!(!intern.is_empty());
        assert_eq!(intern.len(), 1);

        intern.intern("b");
        assert_eq!(intern.len(), 2);
    }

    #[test]
    fn intern_table_default() {
        let intern = StringInternTable::default(); // lines 78-79
        assert!(intern.is_empty());
        assert_eq!(intern.len(), 0);
    }

    // ── ColumnarStore Default impl ───────────────────────────────────

    #[test]
    fn columnar_store_default() {
        let store = ColumnarStore::default(); // lines 308-309
        assert_eq!(store.row_count, 0);
        assert_eq!(store.generation, 0);
        assert!(store.columns.is_empty());
        assert!(store.data.is_empty());
    }

    // ── get_float64_ptr for non-Float64 column ──────────────────────

    #[test]
    fn get_float64_ptr_returns_none_for_string_column() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        // Column 0 is String type
        assert!(store.get_float64_ptr(0).is_none()); // line 293
    }

    // ── compare_columnar NaN handling ────────────────────────────────

    #[test]
    fn compare_columnar_nan_both() {
        // Two NaN values should compare as Equal (line 370)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 3);
        store.set_column_float64(1, &[f64::NAN, f64::NAN, 5.0]);

        let result = compare_columnar(&store, 1, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Equal); // line 370: (true, true)
    }

    #[test]
    fn compare_columnar_nan_left_only() {
        // NaN on left should be Less (line 371)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[f64::NAN, 5.0]);

        let result = compare_columnar(&store, 1, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Less);
    }

    #[test]
    fn compare_columnar_nan_right_only() {
        // NaN on right should be Greater (line 372)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[5.0, f64::NAN]);

        let result = compare_columnar(&store, 1, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Greater);
    }

    #[test]
    fn sort_descending_exercises_nan_branches() {
        // Sorting descending with NaN values triggers line 326 (reverse)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 3);
        store.set_column_float64(1, &[f64::NAN, 10.0, 5.0]);

        let mut indices: Vec<u32> = vec![0, 1, 2];
        sort_indices_columnar(
            &mut indices,
            &store,
            &[SortConfig {
                column_index: 1,
                direction: SortDirection::Descending, // line 326
            }],
        );
        // Descending: 10.0(1), 5.0(2), NaN(0)
        assert_eq!(indices, vec![1, 2, 0]);
    }

    // ── compare_columnar for None column (out of bounds) ─────────────

    #[test]
    fn compare_columnar_none_column() {
        // Accessing a non-existent column returns Equal (line 381)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[1.0, 2.0]);

        let result = compare_columnar(&store, 99, 0, 1); // col_idx 99 doesn't exist
        assert_eq!(result, std::cmp::Ordering::Equal); // line 381
    }

    // ── matches_columnar NaN cell handling ───────────────────────────

    #[test]
    fn matches_columnar_nan_not_equals_returns_true() {
        // NaN cell with NotEquals operator returns true (line 395)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[f64::NAN, 5.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::NotEquals,
            value: json!(5),
        };
        assert!(matches_columnar(&store, 1, 0, &cond)); // NaN + NotEquals → true (line 395)
    }

    #[test]
    fn matches_columnar_nan_equals_returns_false() {
        // NaN cell with Equals operator returns false (not NotEquals → false, lines 394-395)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[f64::NAN, 5.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::Equals,
            value: json!(5),
        };
        assert!(!matches_columnar(&store, 1, 0, &cond)); // NaN + Equals → false
    }

    // ── matches_columnar None column ─────────────────────────────────

    #[test]
    fn matches_columnar_none_column_returns_false() {
        // Non-existent column returns false (line 427)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[1.0, 2.0]);

        let cond = FilterCondition {
            column_key: "nonexistent".into(),
            operator: FilterOperator::Equals,
            value: json!(1),
        };
        // filter_indices_columnar won't match "nonexistent" key,
        // so we call matches_columnar directly with out-of-bounds col_idx
        assert!(!matches_columnar(&store, 99, 0, &cond)); // line 427
    }

    // ── matches_columnar numeric operators ───────────────────────────

    #[test]
    fn matches_columnar_numeric_equals() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[30.0, 25.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::Equals, // line 400
            value: json!(30),
        };
        assert!(matches_columnar(&store, 1, 0, &cond));
        assert!(!matches_columnar(&store, 1, 1, &cond));
    }

    #[test]
    fn matches_columnar_numeric_not_equals() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 2);
        store.set_column_float64(1, &[30.0, 25.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::NotEquals, // line 403
            value: json!(30),
        };
        assert!(!matches_columnar(&store, 1, 0, &cond)); // 30 != 30 → false
        assert!(matches_columnar(&store, 1, 1, &cond)); // 25 != 30 → true
    }

    #[test]
    fn matches_columnar_numeric_less_than() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 3);
        store.set_column_float64(1, &[20.0, 30.0, 40.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::LessThan, // line 406
            value: json!(30),
        };
        assert!(matches_columnar(&store, 1, 0, &cond)); // 20 < 30
        assert!(!matches_columnar(&store, 1, 1, &cond)); // 30 < 30 → false
        assert!(!matches_columnar(&store, 1, 2, &cond)); // 40 < 30 → false
    }

    #[test]
    fn matches_columnar_numeric_gte() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 3);
        store.set_column_float64(1, &[20.0, 30.0, 40.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::GreaterThanOrEqual, // line 407
            value: json!(30),
        };
        assert!(!matches_columnar(&store, 1, 0, &cond)); // 20 >= 30 → false
        assert!(matches_columnar(&store, 1, 1, &cond)); // 30 >= 30 → true
        assert!(matches_columnar(&store, 1, 2, &cond)); // 40 >= 30 → true
    }

    #[test]
    fn matches_columnar_numeric_lte() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 3);
        store.set_column_float64(1, &[20.0, 30.0, 40.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::LessThanOrEqual, // line 408
            value: json!(30),
        };
        assert!(matches_columnar(&store, 1, 0, &cond)); // 20 <= 30 → true
        assert!(matches_columnar(&store, 1, 1, &cond)); // 30 <= 30 → true
        assert!(!matches_columnar(&store, 1, 2, &cond)); // 40 <= 30 → false
    }

    #[test]
    fn matches_columnar_numeric_contains_returns_false() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 1);
        store.set_column_float64(1, &[30.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::Contains, // line 409
            value: json!("30"),
        };
        assert!(!matches_columnar(&store, 1, 0, &cond)); // numeric Contains → false
    }

    // ── matches_columnar string operators ────────────────────────────

    #[test]
    fn matches_columnar_string_equals() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let cond = FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::Equals, // line 416
            value: json!("Alice"),
        };
        assert!(matches_columnar(&store, 0, 0, &cond)); // "Alice" == "Alice"
        assert!(!matches_columnar(&store, 0, 1, &cond)); // "Bob" == "Alice" → false
    }

    #[test]
    fn matches_columnar_string_not_equals() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let cond = FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::NotEquals, // line 417
            value: json!("Alice"),
        };
        assert!(!matches_columnar(&store, 0, 0, &cond)); // "Alice" != "Alice" → false
        assert!(matches_columnar(&store, 0, 1, &cond)); // "Bob" != "Alice" → true
    }

    #[test]
    fn matches_columnar_string_gt() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let cond = FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::GreaterThan, // line 421
            value: json!("Bob"),
        };
        assert!(!matches_columnar(&store, 0, 0, &cond)); // "Alice" > "Bob" → false
        assert!(!matches_columnar(&store, 0, 1, &cond)); // "Bob" > "Bob" → false
        assert!(matches_columnar(&store, 0, 2, &cond)); // "Charlie" > "Bob" → true
    }

    #[test]
    fn matches_columnar_string_lt() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let cond = FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::LessThan, // line 422
            value: json!("Bob"),
        };
        assert!(matches_columnar(&store, 0, 0, &cond)); // "Alice" < "Bob" → true
        assert!(!matches_columnar(&store, 0, 1, &cond)); // "Bob" < "Bob" → false
        assert!(!matches_columnar(&store, 0, 2, &cond)); // "Charlie" < "Bob" → false
    }

    #[test]
    fn matches_columnar_string_gte() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let cond = FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::GreaterThanOrEqual, // line 423
            value: json!("Bob"),
        };
        assert!(!matches_columnar(&store, 0, 0, &cond)); // "Alice" >= "Bob" → false
        assert!(matches_columnar(&store, 0, 1, &cond)); // "Bob" >= "Bob" → true
        assert!(matches_columnar(&store, 0, 2, &cond)); // "Charlie" >= "Bob" → true
    }

    #[test]
    fn matches_columnar_string_lte() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let cond = FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::LessThanOrEqual, // line 424
            value: json!("Bob"),
        };
        assert!(matches_columnar(&store, 0, 0, &cond)); // "Alice" <= "Bob" → true
        assert!(matches_columnar(&store, 0, 1, &cond)); // "Bob" <= "Bob" → true
        assert!(!matches_columnar(&store, 0, 2, &cond)); // "Charlie" <= "Bob" → false
    }

    // ── detect_type edge cases ───────────────────────────────────────

    #[test]
    fn detect_type_null_first_then_number() {
        // First row has null, second row has a number (line 436: null → continue)
        let rows = vec![vec![json!(null)], vec![json!(42)]];
        assert_eq!(detect_type(&rows, 0), ColumnType::Float64);
    }

    #[test]
    fn detect_type_all_null_defaults_to_string() {
        // All rows are null → defaults to String (line 447)
        let rows = vec![vec![json!(null)], vec![json!(null)], vec![json!(null)]];
        assert_eq!(detect_type(&rows, 0), ColumnType::String);
    }

    #[test]
    fn detect_type_empty_rows_defaults_to_string() {
        // No rows at all → defaults to String (line 447)
        let rows: Vec<Vec<serde_json::Value>> = vec![];
        assert_eq!(detect_type(&rows, 0), ColumnType::String);
    }

    // ── Bool column with get_float64_ptr ─────────────────────────────

    #[test]
    fn get_float64_ptr_works_for_bool_column() {
        // Bool columns are stored as f64, so get_float64_ptr should return them
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let result = store.get_float64_ptr(2); // column 2 is Bool
        assert!(result.is_some());
        let (ptr, len) = result.unwrap();
        assert_eq!(len, 4);
        assert!(!ptr.is_null());
    }

    // ── Sort with multi-key equal fallthrough ────────────────────────

    #[test]
    fn sort_multi_key_equal_fallthrough() {
        // When first sort key is equal, falls through to Equal (line 332)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 3);
        // All same value in column 1
        store.set_column_float64(1, &[30.0, 30.0, 30.0]);
        // Different values in column 0
        store.set_column_strings(
            0,
            &["".into(), "Charlie".into(), "Alice".into(), "Bob".into()],
            &[1, 2, 3],
        );

        let mut indices: Vec<u32> = vec![0, 1, 2];
        sort_indices_columnar(
            &mut indices,
            &store,
            &[
                SortConfig {
                    column_index: 1,
                    direction: SortDirection::Ascending,
                },
                SortConfig {
                    column_index: 0,
                    direction: SortDirection::Ascending,
                },
            ],
        );
        // All ages equal (30), so sort by name: Alice(2), Bob(3→idx2 is wrong, let me fix)
        // ids: row0→"Charlie", row1→"Alice", row2→"Bob"
        // Sort by name ascending: Alice(1), Bob(2), Charlie(0)
        assert_eq!(indices, vec![1, 2, 0]);
    }

    // ── matches_columnar numeric with non-numeric filter value ───────

    #[test]
    fn matches_columnar_numeric_equals_non_numeric_filter() {
        // filter_val.as_f64() returns None when value is a string
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 1);
        store.set_column_float64(1, &[30.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::Equals,
            value: json!("not_a_number"),
        };
        assert!(!matches_columnar(&store, 1, 0, &cond)); // filter_val is None → false
    }

    #[test]
    fn matches_columnar_numeric_not_equals_non_numeric_filter() {
        // NotEquals with non-numeric filter_val: filter_val.is_none_or → true (since None)
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.init(3, 1);
        store.set_column_float64(1, &[30.0]);

        let cond = FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::NotEquals,
            value: json!("not_a_number"),
        };
        assert!(matches_columnar(&store, 1, 0, &cond)); // filter_val is None → true
    }

    #[test]
    fn sort_columnar_empty_configs_no_change() {
        let mut store = ColumnarStore::new();
        store.set_columns(test_columns());
        store.ingest_rows(&test_rows());

        let mut indices: Vec<u32> = (0..4).collect();
        sort_indices_columnar(&mut indices, &store, &[]);
        // Should remain in original order
        assert_eq!(indices, vec![0, 1, 2, 3]);
    }

    #[test]
    fn sort_columnar_all_equal_returns_equal() {
        // When all sort keys are equal, the final Ordering::Equal fallthrough is hit
        let mut store = ColumnarStore::new();
        store.set_columns(vec![ColumnDef {
            key: "val".into(),
            header: "Val".into(),
            width: None,
            sortable: true,
            filterable: false,
        }]);
        // All rows have the same value
        store.ingest_rows(&vec![vec![json!(42)], vec![json!(42)], vec![json!(42)]]);

        let mut indices: Vec<u32> = (0..3).collect();
        sort_indices_columnar(
            &mut indices,
            &store,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );
        // Order should be stable (original order preserved)
        assert_eq!(indices, vec![0, 1, 2]);
    }
}
