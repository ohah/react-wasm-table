/// Sort direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortDirection {
    Ascending,
    Descending,
}

/// Configuration for a single sort operation.
#[derive(Debug, Clone)]
pub struct SortConfig {
    pub column_index: usize,
    pub direction: SortDirection,
}

// ── Filter types ─────────────────────────────────────────────────────

/// Filter comparison operator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterOp {
    Eq,
    Neq,
    Gt,
    Gte,
    Lt,
    Lte,
    Contains,
    StartsWith,
    EndsWith,
}

/// A typed filter value.
#[derive(Debug, Clone, PartialEq)]
pub enum FilterValue {
    Float64(f64),
    String(String),
    Bool(bool),
}

/// Filter on a single column.
#[derive(Debug, Clone)]
pub struct ColumnFilter {
    pub column_index: usize,
    pub op: FilterOp,
    pub value: FilterValue,
}

/// Global text filter across all string columns.
#[derive(Debug, Clone)]
pub struct GlobalFilter {
    pub query: String,
}
