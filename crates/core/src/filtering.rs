use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Filter operator types.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FilterOperator {
    Equals,
    NotEquals,
    Contains,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
}

/// A single filter condition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    pub column_key: String,
    pub operator: FilterOperator,
    pub value: Value,
}
