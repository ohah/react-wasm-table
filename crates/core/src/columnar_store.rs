use std::collections::HashMap;

use serde_json::Value;
use crate::data_store::ColumnDef;
use crate::filtering::{FilterCondition, FilterOperator};
use crate::sorting::{SortConfig, SortDirection};

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
}

impl ColumnarStore {
    pub const fn new() -> Self {
        Self {
            columns: Vec::new(),
            data: Vec::new(),
            row_count: 0,
            generation: 0,
        }
    }

    /// Set column definitions and clear data.
    pub fn set_columns(&mut self, columns: Vec<ColumnDef>) {
        self.columns = columns;
        self.data.clear();
        self.row_count = 0;
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
                        let v = row
                            .get(col_idx)
                            .and_then(Value::as_f64)
                            .unwrap_or(f64::NAN);
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
}
