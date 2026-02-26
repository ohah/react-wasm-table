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
