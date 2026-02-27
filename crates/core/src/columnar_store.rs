use std::collections::HashMap;

use crate::types::{ColumnFilter, FilterOp, FilterValue, GlobalFilter, SortConfig, SortDirection};

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
    pub data: Vec<ColumnData>,
    pub row_count: usize,
    pub generation: u64,
    view_indices: Vec<u32>,
    view_dirty: bool,
    sort_configs: Vec<SortConfig>,
    column_filters: Vec<ColumnFilter>,
    global_filter: Option<GlobalFilter>,
    row_height: f64,
    viewport_height: f64,
    overscan: usize,
}

impl ColumnarStore {
    pub const fn new() -> Self {
        Self {
            data: Vec::new(),
            row_count: 0,
            generation: 0,
            view_indices: Vec::new(),
            view_dirty: true,
            sort_configs: Vec::new(),
            column_filters: Vec::new(),
            global_filter: None,
            row_height: 36.0,
            viewport_height: 600.0,
            overscan: 5,
        }
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

    /// Set column filters. Marks view dirty.
    pub fn set_column_filters(&mut self, filters: Vec<ColumnFilter>) {
        self.column_filters = filters;
        self.view_dirty = true;
    }

    /// Set global filter. Marks view dirty.
    pub fn set_global_filter(&mut self, filter: Option<GlobalFilter>) {
        self.global_filter = filter;
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

    /// Rebuild the view index array: filter → sort pipeline.
    /// Skips if not dirty.
    pub fn rebuild_view(&mut self) {
        if !self.view_dirty {
            return;
        }
        self.view_dirty = false;

        let mut indices: Vec<u32> = (0..self.row_count as u32).collect();

        // 1. Apply column filters (AND logic)
        if !self.column_filters.is_empty() {
            let filters = std::mem::take(&mut self.column_filters);
            filter_indices_columnar(&mut indices, self, &filters);
            self.column_filters = filters;
        }

        // 2. Apply global filter (OR across string columns)
        if let Some(gf) = self.global_filter.take() {
            if !gf.query.is_empty() {
                global_filter_indices(&mut indices, self, &gf);
            }
            self.global_filter = Some(gf);
        }

        // 3. Sort
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

/// Filter indices by column filters (AND logic: row must pass all filters).
pub fn filter_indices_columnar(
    indices: &mut Vec<u32>,
    store: &ColumnarStore,
    filters: &[ColumnFilter],
) {
    if filters.is_empty() {
        return;
    }
    indices.retain(|&idx| {
        let row = idx as usize;
        filters.iter().all(|f| match_column_filter(store, f, row))
    });
}

/// Check if a single row passes a column filter.
fn match_column_filter(store: &ColumnarStore, filter: &ColumnFilter, row: usize) -> bool {
    match store.data.get(filter.column_index) {
        Some(ColumnData::Float64(v) | ColumnData::Bool(v)) => {
            let val = v[row];
            if val.is_nan() {
                return false; // NaN never passes
            }
            match &filter.value {
                FilterValue::Float64(target) => match filter.op {
                    FilterOp::Eq => (val - target).abs() < f64::EPSILON,
                    FilterOp::Neq => (val - target).abs() >= f64::EPSILON,
                    FilterOp::Gt => val > *target,
                    FilterOp::Gte => val >= *target - f64::EPSILON,
                    FilterOp::Lt => val < *target,
                    FilterOp::Lte => val <= *target + f64::EPSILON,
                    FilterOp::Contains | FilterOp::StartsWith | FilterOp::EndsWith => false,
                },
                FilterValue::Bool(target) => {
                    let val_bool = val != 0.0;
                    match filter.op {
                        FilterOp::Eq => val_bool == *target,
                        FilterOp::Neq => val_bool != *target,
                        _ => false,
                    }
                }
                FilterValue::String(_) => false,
            }
        }
        Some(ColumnData::Strings { ids, intern }) => {
            let resolved = intern.resolve(ids[row]);
            match &filter.value {
                FilterValue::String(target) => match filter.op {
                    FilterOp::Eq => resolved == target.as_str(),
                    FilterOp::Neq => resolved != target.as_str(),
                    FilterOp::Gt => resolved > target.as_str(),
                    FilterOp::Gte => resolved >= target.as_str(),
                    FilterOp::Lt => resolved < target.as_str(),
                    FilterOp::Lte => resolved <= target.as_str(),
                    FilterOp::Contains => resolved.to_lowercase().contains(&target.to_lowercase()),
                    FilterOp::StartsWith => {
                        resolved.to_lowercase().starts_with(&target.to_lowercase())
                    }
                    FilterOp::EndsWith => resolved.to_lowercase().ends_with(&target.to_lowercase()),
                },
                _ => false,
            }
        }
        None => false,
    }
}

/// Filter indices by global filter (OR across all string columns, case-insensitive contains).
pub fn global_filter_indices(indices: &mut Vec<u32>, store: &ColumnarStore, filter: &GlobalFilter) {
    let query = filter.query.to_lowercase();
    if query.is_empty() {
        return;
    }

    // Collect string column indices
    let string_cols: Vec<usize> = store
        .data
        .iter()
        .enumerate()
        .filter_map(|(i, d)| matches!(d, ColumnData::Strings { .. }).then_some(i))
        .collect();

    if string_cols.is_empty() {
        return;
    }

    indices.retain(|&idx| {
        let row = idx as usize;
        string_cols.iter().any(|&col_idx| {
            if let Some(ColumnData::Strings { ids, intern }) = store.data.get(col_idx) {
                let resolved = intern.resolve(ids[row]);
                resolved.to_lowercase().contains(&query)
            } else {
                false
            }
        })
    });
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── Direct column setter tests ────────────────────────────────────

    #[test]
    fn init_and_set_columns_direct() {
        let mut store = ColumnarStore::new();
        store.init(3, 4);

        assert_eq!(store.row_count, 4);
        assert_eq!(store.data.len(), 3);
        assert_eq!(store.generation, 1);
    }

    #[test]
    fn set_column_float64_direct() {
        let mut store = ColumnarStore::new();
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
        store.init(3, 4);
        let unique = vec![
            "".to_string(),
            "Alice".to_string(),
            "Bob".to_string(),
            "Charlie".to_string(),
            "Alice Smith".to_string(),
        ];
        store.set_column_strings(0, &unique, &[1, 2, 3, 4]);
        store.set_column_float64(1, &[30.0, 25.0, 35.0, 28.0]);
        store.set_column_bool(2, &[1.0, 0.0, 1.0, f64::NAN]);
        store.finalize();

        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Ascending,
        }]);
        store.rebuild_view();

        // Bob(25)=1, Alice Smith(28)=3, Alice(30)=0, Charlie(35)=2
        assert_eq!(store.view_indices(), &[1, 3, 0, 2]);
    }

    #[test]
    fn sort_columnar_strings() {
        let mut store = ColumnarStore::new();
        store.init(1, 4);
        let unique = vec![
            "".into(),
            "Alice".into(),
            "Bob".into(),
            "Charlie".into(),
            "Alice Smith".into(),
        ];
        store.set_column_strings(0, &unique, &[1, 2, 3, 4]);
        store.finalize();

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
    fn rebuild_view_idempotent() {
        let mut store = ColumnarStore::new();
        store.init(1, 4);
        store.set_column_float64(0, &[30.0, 25.0, 35.0, 28.0]);
        store.finalize();
        store.set_sort(vec![SortConfig {
            column_index: 0,
            direction: SortDirection::Ascending,
        }]);

        store.rebuild_view();
        let first = store.view_indices().to_vec();
        store.rebuild_view(); // should be no-op (not dirty)
        let second = store.view_indices().to_vec();
        assert_eq!(first, second);
    }

    #[test]
    fn scroll_config_stored() {
        let mut store = ColumnarStore::new();
        store.set_scroll_config(40.0, 800.0, 3);
        assert!((store.row_height() - 40.0).abs() < f64::EPSILON);
        assert!((store.viewport_height() - 800.0).abs() < f64::EPSILON);
        assert_eq!(store.overscan(), 3);
    }

    #[test]
    fn generation_increments() {
        let mut store = ColumnarStore::new();
        assert_eq!(store.generation, 0);

        store.init(1, 2);
        assert_eq!(store.generation, 1);

        store.init(1, 3);
        assert_eq!(store.generation, 2);
    }

    #[test]
    fn get_float64_ptr_accessible() {
        let mut store = ColumnarStore::new();
        store.init(2, 4);
        store.set_column_float64(0, &[30.0, 25.0, 35.0, 28.0]);

        let (ptr, len) = store.get_float64_ptr(0).expect("should be Float64");
        assert_eq!(len, 4);
        assert!(!ptr.is_null());
    }

    #[test]
    fn get_float64_ptr_returns_none_for_string_column() {
        let mut store = ColumnarStore::new();
        store.init(1, 2);
        store.set_column_strings(0, &["".into(), "A".into()], &[0, 1]);

        assert!(store.get_float64_ptr(0).is_none());
    }

    #[test]
    fn get_float64_ptr_works_for_bool_column() {
        let mut store = ColumnarStore::new();
        store.init(1, 4);
        store.set_column_bool(0, &[1.0, 0.0, 1.0, f64::NAN]);

        let result = store.get_float64_ptr(0);
        assert!(result.is_some());
        let (ptr, len) = result.unwrap();
        assert_eq!(len, 4);
        assert!(!ptr.is_null());
    }

    // ── StringInternTable coverage ───────────────────────────────────

    #[test]
    fn intern_cache_hit_returns_same_id() {
        let mut intern = StringInternTable::new();
        let id1 = intern.intern("hello");
        let id2 = intern.intern("hello");
        assert_eq!(id1, id2);
        assert_eq!(intern.len(), 1);
    }

    #[test]
    fn intern_table_len_and_is_empty() {
        let mut intern = StringInternTable::new();
        assert!(intern.is_empty());
        assert_eq!(intern.len(), 0);

        intern.intern("a");
        assert!(!intern.is_empty());
        assert_eq!(intern.len(), 1);

        intern.intern("b");
        assert_eq!(intern.len(), 2);
    }

    #[test]
    fn intern_table_default() {
        let intern = StringInternTable::default();
        assert!(intern.is_empty());
        assert_eq!(intern.len(), 0);
    }

    // ── ColumnarStore Default impl ───────────────────────────────────

    #[test]
    fn columnar_store_default() {
        let store = ColumnarStore::default();
        assert_eq!(store.row_count, 0);
        assert_eq!(store.generation, 0);
        assert!(store.data.is_empty());
    }

    // ── compare_columnar NaN handling ────────────────────────────────

    #[test]
    fn compare_columnar_nan_both() {
        let mut store = ColumnarStore::new();
        store.init(1, 3);
        store.set_column_float64(0, &[f64::NAN, f64::NAN, 5.0]);

        let result = compare_columnar(&store, 0, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Equal);
    }

    #[test]
    fn compare_columnar_nan_left_only() {
        let mut store = ColumnarStore::new();
        store.init(1, 2);
        store.set_column_float64(0, &[f64::NAN, 5.0]);

        let result = compare_columnar(&store, 0, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Less);
    }

    #[test]
    fn compare_columnar_nan_right_only() {
        let mut store = ColumnarStore::new();
        store.init(1, 2);
        store.set_column_float64(0, &[5.0, f64::NAN]);

        let result = compare_columnar(&store, 0, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Greater);
    }

    #[test]
    fn sort_descending_exercises_nan_branches() {
        let mut store = ColumnarStore::new();
        store.init(1, 3);
        store.set_column_float64(0, &[f64::NAN, 10.0, 5.0]);

        let mut indices: Vec<u32> = vec![0, 1, 2];
        sort_indices_columnar(
            &mut indices,
            &store,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Descending,
            }],
        );
        // Descending: 10.0(1), 5.0(2), NaN(0)
        assert_eq!(indices, vec![1, 2, 0]);
    }

    #[test]
    fn compare_columnar_none_column() {
        let mut store = ColumnarStore::new();
        store.init(1, 2);
        store.set_column_float64(0, &[1.0, 2.0]);

        let result = compare_columnar(&store, 99, 0, 1);
        assert_eq!(result, std::cmp::Ordering::Equal);
    }

    #[test]
    fn sort_multi_key_equal_fallthrough() {
        let mut store = ColumnarStore::new();
        store.init(2, 3);
        // All same value in column 0
        store.set_column_float64(0, &[30.0, 30.0, 30.0]);
        // Different values in column 1
        store.set_column_strings(
            1,
            &["".into(), "Charlie".into(), "Alice".into(), "Bob".into()],
            &[1, 2, 3],
        );

        let mut indices: Vec<u32> = vec![0, 1, 2];
        sort_indices_columnar(
            &mut indices,
            &store,
            &[
                SortConfig {
                    column_index: 0,
                    direction: SortDirection::Ascending,
                },
                SortConfig {
                    column_index: 1,
                    direction: SortDirection::Ascending,
                },
            ],
        );
        // All ages equal (30), so sort by name: Alice(1), Bob(2), Charlie(0)
        assert_eq!(indices, vec![1, 2, 0]);
    }

    #[test]
    fn sort_columnar_empty_configs_no_change() {
        let mut store = ColumnarStore::new();
        store.init(1, 4);
        store.set_column_float64(0, &[30.0, 25.0, 35.0, 28.0]);

        let mut indices: Vec<u32> = (0..4).collect();
        sort_indices_columnar(&mut indices, &store, &[]);
        assert_eq!(indices, vec![0, 1, 2, 3]);
    }

    #[test]
    fn sort_columnar_all_equal_returns_equal() {
        let mut store = ColumnarStore::new();
        store.init(1, 3);
        store.set_column_float64(0, &[42.0, 42.0, 42.0]);

        let mut indices: Vec<u32> = (0..3).collect();
        sort_indices_columnar(
            &mut indices,
            &store,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );
        assert_eq!(indices, vec![0, 1, 2]);
    }

    // ── Column filter tests ─────────────────────────────────────────

    fn make_store_for_filter() -> ColumnarStore {
        let mut store = ColumnarStore::new();
        store.init(3, 4);
        let unique = vec![
            "".to_string(),
            "Alice".to_string(),
            "Bob".to_string(),
            "Charlie".to_string(),
            "Dave".to_string(),
        ];
        store.set_column_strings(0, &unique, &[1, 2, 3, 4]); // names
        store.set_column_float64(1, &[30.0, 25.0, 35.0, 28.0]); // ages
        store.set_column_bool(2, &[1.0, 0.0, 1.0, f64::NAN]); // active
        store.finalize();
        store
    }

    #[test]
    fn filter_float64_eq() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 1,
                op: FilterOp::Eq,
                value: FilterValue::Float64(30.0),
            }],
        );
        assert_eq!(indices, vec![0]); // Alice=30
    }

    #[test]
    fn filter_float64_gt() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 1,
                op: FilterOp::Gt,
                value: FilterValue::Float64(28.0),
            }],
        );
        assert_eq!(indices, vec![0, 2]); // Alice=30, Charlie=35
    }

    #[test]
    fn filter_float64_lte() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 1,
                op: FilterOp::Lte,
                value: FilterValue::Float64(28.0),
            }],
        );
        assert_eq!(indices, vec![1, 3]); // Bob=25, Dave=28
    }

    #[test]
    fn filter_float64_neq() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 1,
                op: FilterOp::Neq,
                value: FilterValue::Float64(30.0),
            }],
        );
        assert_eq!(indices, vec![1, 2, 3]); // all except Alice
    }

    #[test]
    fn filter_float64_gte_lt() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 1,
                op: FilterOp::Gte,
                value: FilterValue::Float64(28.0),
            }],
        );
        assert_eq!(indices, vec![0, 2, 3]); // Alice=30, Charlie=35, Dave=28

        let mut indices2: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices2,
            &store,
            &[ColumnFilter {
                column_index: 1,
                op: FilterOp::Lt,
                value: FilterValue::Float64(28.0),
            }],
        );
        assert_eq!(indices2, vec![1]); // Bob=25
    }

    #[test]
    fn filter_string_eq() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Eq,
                value: FilterValue::String("Bob".to_string()),
            }],
        );
        assert_eq!(indices, vec![1]);
    }

    #[test]
    fn filter_string_contains() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Contains,
                value: FilterValue::String("li".to_string()), // Alice, Charlie
            }],
        );
        assert_eq!(indices, vec![0, 2]);
    }

    #[test]
    fn filter_string_starts_with() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::StartsWith,
                value: FilterValue::String("ch".to_string()),
            }],
        );
        assert_eq!(indices, vec![2]); // Charlie
    }

    #[test]
    fn filter_string_ends_with() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::EndsWith,
                value: FilterValue::String("ve".to_string()),
            }],
        );
        assert_eq!(indices, vec![3]); // Dave
    }

    #[test]
    fn filter_bool_eq() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 2,
                op: FilterOp::Eq,
                value: FilterValue::Bool(true),
            }],
        );
        assert_eq!(indices, vec![0, 2]); // Alice, Charlie (NaN excluded)
    }

    #[test]
    fn filter_bool_neq() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 2,
                op: FilterOp::Neq,
                value: FilterValue::Bool(true),
            }],
        );
        assert_eq!(indices, vec![1]); // Bob=false (NaN excluded)
    }

    #[test]
    fn filter_nan_always_excluded() {
        let mut store = ColumnarStore::new();
        store.init(1, 3);
        store.set_column_float64(0, &[f64::NAN, 5.0, f64::NAN]);
        store.finalize();

        let mut indices: Vec<u32> = (0..3).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Gte,
                value: FilterValue::Float64(0.0),
            }],
        );
        assert_eq!(indices, vec![1]); // only row 1 (5.0)
    }

    #[test]
    fn filter_multiple_columns_and_logic() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        // name contains "li" AND age > 28
        filter_indices_columnar(
            &mut indices,
            &store,
            &[
                ColumnFilter {
                    column_index: 0,
                    op: FilterOp::Contains,
                    value: FilterValue::String("li".to_string()),
                },
                ColumnFilter {
                    column_index: 1,
                    op: FilterOp::Gt,
                    value: FilterValue::Float64(28.0),
                },
            ],
        );
        assert_eq!(indices, vec![0, 2]); // Alice(30) and Charlie(35) both contain "li" and > 28
    }

    #[test]
    fn filter_empty_filters_no_change() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(&mut indices, &store, &[]);
        assert_eq!(indices, vec![0, 1, 2, 3]);
    }

    #[test]
    fn filter_invalid_column_excludes_all() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 99,
                op: FilterOp::Eq,
                value: FilterValue::Float64(30.0),
            }],
        );
        assert_eq!(indices, Vec::<u32>::new());
    }

    #[test]
    fn filter_string_ops_on_float_col_returns_false() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 1, // float64 column
                op: FilterOp::Contains,
                value: FilterValue::Float64(30.0),
            }],
        );
        assert_eq!(indices, Vec::<u32>::new());
    }

    // ── Global filter tests ─────────────────────────────────────────

    #[test]
    fn global_filter_matches_string_columns() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        global_filter_indices(
            &mut indices,
            &store,
            &GlobalFilter {
                query: "bob".to_string(),
            },
        );
        assert_eq!(indices, vec![1]); // Bob
    }

    #[test]
    fn global_filter_case_insensitive() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        global_filter_indices(
            &mut indices,
            &store,
            &GlobalFilter {
                query: "ALICE".to_string(),
            },
        );
        assert_eq!(indices, vec![0]);
    }

    #[test]
    fn global_filter_empty_query_no_change() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        global_filter_indices(
            &mut indices,
            &store,
            &GlobalFilter {
                query: String::new(),
            },
        );
        assert_eq!(indices, vec![0, 1, 2, 3]);
    }

    #[test]
    fn global_filter_no_string_columns_no_change() {
        let mut store = ColumnarStore::new();
        store.init(1, 3);
        store.set_column_float64(0, &[1.0, 2.0, 3.0]);
        store.finalize();

        let mut indices: Vec<u32> = (0..3).collect();
        global_filter_indices(
            &mut indices,
            &store,
            &GlobalFilter {
                query: "test".to_string(),
            },
        );
        assert_eq!(indices, vec![0, 1, 2]);
    }

    // ── rebuild_view filter+sort pipeline ───────────────────────────

    #[test]
    fn rebuild_view_filter_then_sort() {
        let mut store = make_store_for_filter();
        // Filter: age >= 28 → Alice(30), Charlie(35), Dave(28)
        store.set_column_filters(vec![ColumnFilter {
            column_index: 1,
            op: FilterOp::Gte,
            value: FilterValue::Float64(28.0),
        }]);
        // Sort: age ascending → Dave(28), Alice(30), Charlie(35)
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Ascending,
        }]);
        store.rebuild_view();
        assert_eq!(store.view_indices(), &[3, 0, 2]); // Dave=3, Alice=0, Charlie=2
    }

    #[test]
    fn rebuild_view_global_filter_then_sort() {
        let mut store = make_store_for_filter();
        // Global filter: "a" → Alice, Charlie, Dave (all contain 'a')
        store.set_global_filter(Some(GlobalFilter {
            query: "a".to_string(),
        }));
        store.set_sort(vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Descending,
        }]);
        store.rebuild_view();
        // Desc by age: Charlie(35)=2, Alice(30)=0, Dave(28)=3
        assert_eq!(store.view_indices(), &[2, 0, 3]);
    }

    #[test]
    fn set_column_filters_marks_dirty() {
        let mut store = make_store_for_filter();
        store.rebuild_view(); // clears dirty

        store.set_column_filters(vec![ColumnFilter {
            column_index: 1,
            op: FilterOp::Gt,
            value: FilterValue::Float64(30.0),
        }]);
        store.rebuild_view();
        assert_eq!(store.view_indices(), &[2]); // only Charlie=35
    }

    #[test]
    fn set_global_filter_marks_dirty() {
        let mut store = make_store_for_filter();
        store.rebuild_view();

        store.set_global_filter(Some(GlobalFilter {
            query: "dave".to_string(),
        }));
        store.rebuild_view();
        assert_eq!(store.view_indices(), &[3]);
    }

    #[test]
    fn filter_string_neq() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Neq,
                value: FilterValue::String("Alice".to_string()),
            }],
        );
        assert_eq!(indices, vec![1, 2, 3]); // Bob, Charlie, Dave
    }

    #[test]
    fn filter_string_gt_lt() {
        let store = make_store_for_filter();
        let mut indices: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Gt,
                value: FilterValue::String("Bob".to_string()),
            }],
        );
        assert_eq!(indices, vec![2, 3]); // Charlie, Dave

        let mut indices2: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices2,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Gte,
                value: FilterValue::String("Charlie".to_string()),
            }],
        );
        assert_eq!(indices2, vec![2, 3]); // Charlie, Dave

        let mut indices3: Vec<u32> = (0..4).collect();
        filter_indices_columnar(
            &mut indices3,
            &store,
            &[ColumnFilter {
                column_index: 0,
                op: FilterOp::Lt,
                value: FilterValue::String("Bob".to_string()),
            }],
        );
        assert_eq!(indices3, vec![0]); // Alice
    }
}
