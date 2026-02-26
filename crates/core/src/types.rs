use serde::{Deserialize, Serialize};

/// Column definition for the table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDef {
    pub key: String,
    pub header: String,
    pub width: Option<f64>,
    pub sortable: bool,
    pub filterable: bool,
}

/// Sort direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SortDirection {
    Ascending,
    Descending,
}

/// Configuration for a single sort operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortConfig {
    pub column_index: usize,
    pub direction: SortDirection,
}
