use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::data_store::ColumnDef;

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

/// Check if a single value matches a filter condition.
fn matches_condition(cell_value: &Value, condition: &FilterCondition) -> bool {
    match condition.operator {
        FilterOperator::Equals => cell_value == &condition.value,
        FilterOperator::NotEquals => cell_value != &condition.value,
        FilterOperator::Contains => {
            if let (Value::String(cell), Value::String(filter)) = (cell_value, &condition.value) {
                cell.to_lowercase().contains(&filter.to_lowercase())
            } else {
                false
            }
        }
        FilterOperator::GreaterThan => compare_numeric(cell_value, &condition.value, |a, b| a > b),
        FilterOperator::LessThan => compare_numeric(cell_value, &condition.value, |a, b| a < b),
        FilterOperator::GreaterThanOrEqual => {
            compare_numeric(cell_value, &condition.value, |a, b| a >= b)
        }
        FilterOperator::LessThanOrEqual => {
            compare_numeric(cell_value, &condition.value, |a, b| a <= b)
        }
    }
}

fn compare_numeric(a: &Value, b: &Value, cmp: fn(f64, f64) -> bool) -> bool {
    match (a.as_f64(), b.as_f64()) {
        (Some(a), Some(b)) => cmp(a, b),
        _ => false,
    }
}

/// Find column index by key.
fn find_column_index(columns: &[ColumnDef], key: &str) -> Option<usize> {
    columns.iter().position(|c| c.key == key)
}

/// Apply all filter conditions to rows, returning references to matching rows.
pub fn apply_filters<'a>(
    rows: &'a [Vec<Value>],
    columns: &[ColumnDef],
    conditions: &[FilterCondition],
) -> Vec<&'a Vec<Value>> {
    rows.iter()
        .filter(|row| {
            conditions.iter().all(|condition| {
                find_column_index(columns, &condition.column_key).is_some_and(|col_idx| {
                    row.get(col_idx)
                        .is_some_and(|cell_value| matches_condition(cell_value, condition))
                })
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
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
        ]
    }

    fn test_rows() -> Vec<Vec<Value>> {
        vec![
            vec![json!("Alice"), json!(30)],
            vec![json!("Bob"), json!(25)],
            vec![json!("Charlie"), json!(35)],
            vec![json!("Alice Smith"), json!(28)],
        ]
    }

    #[test]
    fn test_filter_equals() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::Equals,
            value: json!("Bob"),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0][0], json!("Bob"));
    }

    #[test]
    fn test_filter_contains() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::Contains,
            value: json!("alice"),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_greater_than() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::GreaterThan,
            value: json!(28),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 2); // Alice(30), Charlie(35)
    }

    #[test]
    fn test_multiple_filters() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![
            FilterCondition {
                column_key: "name".into(),
                operator: FilterOperator::Contains,
                value: json!("alice"),
            },
            FilterCondition {
                column_key: "age".into(),
                operator: FilterOperator::GreaterThan,
                value: json!(29),
            },
        ];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 1); // Only Alice(30)
        assert_eq!(result[0][0], json!("Alice"));
    }

    #[test]
    fn test_filter_not_equals() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::NotEquals,
            value: json!("Bob"),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 3); // Alice, Charlie, Alice Smith
        assert!(result.iter().all(|r| r[0] != json!("Bob")));
    }

    #[test]
    fn test_filter_contains_non_string_returns_false() {
        let columns = test_columns();
        let rows = test_rows();
        // Contains on the "age" column (numeric values) should return false for all
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::Contains,
            value: json!("30"),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_filter_greater_than_or_equal() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::GreaterThanOrEqual,
            value: json!(30),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 2); // Alice(30), Charlie(35)
        assert_eq!(result[0][0], json!("Alice"));
        assert_eq!(result[1][0], json!("Charlie"));
    }

    #[test]
    fn test_filter_less_than() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::LessThan,
            value: json!(28),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 1); // Bob(25)
        assert_eq!(result[0][0], json!("Bob"));
    }

    #[test]
    fn test_filter_less_than_or_equal() {
        let columns = test_columns();
        let rows = test_rows();
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: FilterOperator::LessThanOrEqual,
            value: json!(28),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 2); // Bob(25), Alice Smith(28)
        assert_eq!(result[0][0], json!("Bob"));
        assert_eq!(result[1][0], json!("Alice Smith"));
    }

    #[test]
    fn test_compare_numeric_with_non_numeric_value() {
        let columns = test_columns();
        let rows = test_rows();
        // GreaterThan on "name" column (string values) with a numeric filter value
        // compare_numeric will get None from as_f64() on strings, returning false
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: FilterOperator::GreaterThan,
            value: json!(10),
        }];

        let result = apply_filters(&rows, &columns, &conditions);
        assert_eq!(result.len(), 0);
    }
}
