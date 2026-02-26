use serde_json::Value;

use crate::data_store::ColumnDef;
use crate::filtering::FilterCondition;
use crate::sorting::{SortConfig, SortDirection};

/// Create an identity index array [0, 1, 2, ..., n-1].
pub fn identity_indices(n: usize) -> Vec<u32> {
    (0..n as u32).collect()
}

/// Filter: keep only indices where the row matches all conditions.
pub fn filter_indices(
    indices: &[u32],
    rows: &[Vec<Value>],
    columns: &[ColumnDef],
    conditions: &[FilterCondition],
) -> Vec<u32> {
    if conditions.is_empty() {
        return indices.to_vec();
    }

    indices
        .iter()
        .copied()
        .filter(|&idx| {
            let row = &rows[idx as usize];
            conditions.iter().all(|cond| {
                find_column_index(columns, &cond.column_key).is_some_and(|col_idx| {
                    row.get(col_idx)
                        .is_some_and(|cell| matches_condition(cell, cond))
                })
            })
        })
        .collect()
}

/// Sort indices in-place by comparing the original rows. Data is never moved.
pub fn sort_indices(
    indices: &mut [u32],
    rows: &[Vec<Value>],
    _columns: &[ColumnDef],
    configs: &[SortConfig],
) {
    if configs.is_empty() {
        return;
    }

    indices.sort_by(|&a, &b| {
        let row_a = &rows[a as usize];
        let row_b = &rows[b as usize];
        for config in configs {
            let idx = config.column_index;
            let val_a = row_a.get(idx).unwrap_or(&Value::Null);
            let val_b = row_b.get(idx).unwrap_or(&Value::Null);

            let ordering = compare_values(val_a, val_b);
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

// ── Helpers (mirrored from sorting.rs / filtering.rs to keep self-contained) ──

fn compare_values(a: &Value, b: &Value) -> std::cmp::Ordering {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => {
            let a = a.as_f64().unwrap_or(0.0);
            let b = b.as_f64().unwrap_or(0.0);
            a.partial_cmp(&b).unwrap_or(std::cmp::Ordering::Equal)
        }
        (Value::String(a), Value::String(b)) => a.cmp(b),
        (Value::Bool(a), Value::Bool(b)) => a.cmp(b),
        (Value::Null, Value::Null) => std::cmp::Ordering::Equal,
        (Value::Null, _) => std::cmp::Ordering::Less,
        (_, Value::Null) => std::cmp::Ordering::Greater,
        _ => {
            let a_str = a.to_string();
            let b_str = b.to_string();
            a_str.cmp(&b_str)
        }
    }
}

fn find_column_index(columns: &[ColumnDef], key: &str) -> Option<usize> {
    columns.iter().position(|c| c.key == key)
}

fn matches_condition(cell_value: &Value, condition: &FilterCondition) -> bool {
    use crate::filtering::FilterOperator;
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sorting::SortDirection;
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
    fn identity_indices_correct() {
        let ids = identity_indices(5);
        assert_eq!(ids, vec![0, 1, 2, 3, 4]);
    }

    #[test]
    fn filter_indices_equals() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: crate::filtering::FilterOperator::Equals,
            value: json!("Bob"),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        assert_eq!(result, vec![1]); // Bob is at index 1
    }

    #[test]
    fn filter_indices_contains() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: crate::filtering::FilterOperator::Contains,
            value: json!("alice"),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        assert_eq!(result, vec![0, 3]); // Alice and Alice Smith
    }

    #[test]
    fn sort_indices_ascending() {
        let rows = test_rows();
        let cols = test_columns();
        let mut indices = identity_indices(rows.len());
        let configs = vec![SortConfig {
            column_index: 1, // age
            direction: SortDirection::Ascending,
        }];

        sort_indices(&mut indices, &rows, &cols, &configs);
        // Bob(25), Alice Smith(28), Alice(30), Charlie(35)
        assert_eq!(indices, vec![1, 3, 0, 2]);
    }

    #[test]
    fn sort_indices_descending() {
        let rows = test_rows();
        let cols = test_columns();
        let mut indices = identity_indices(rows.len());
        let configs = vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Descending,
        }];

        sort_indices(&mut indices, &rows, &cols, &configs);
        // Charlie(35), Alice(30), Alice Smith(28), Bob(25)
        assert_eq!(indices, vec![2, 0, 3, 1]);
    }

    #[test]
    fn filter_then_sort() {
        let rows = test_rows();
        let cols = test_columns();
        let all = identity_indices(rows.len());

        // Filter: age > 26
        let filtered = filter_indices(
            &all,
            &rows,
            &cols,
            &[FilterCondition {
                column_key: "age".into(),
                operator: crate::filtering::FilterOperator::GreaterThan,
                value: json!(26),
            }],
        );
        // Should be [0(Alice,30), 2(Charlie,35), 3(Alice Smith,28)]
        assert_eq!(filtered, vec![0, 2, 3]);

        // Sort by age ascending
        let mut sorted = filtered;
        sort_indices(
            &mut sorted,
            &rows,
            &cols,
            &[SortConfig {
                column_index: 1,
                direction: SortDirection::Ascending,
            }],
        );
        // Alice Smith(28), Alice(30), Charlie(35)
        assert_eq!(sorted, vec![3, 0, 2]);
    }

    #[test]
    fn sort_matches_original_sort() {
        // Verify index sort produces same order as the original apply_sort
        use crate::sorting::apply_sort;

        let rows = test_rows();
        let cols = test_columns();
        let configs = vec![SortConfig {
            column_index: 1,
            direction: SortDirection::Ascending,
        }];

        // Original sort (clones data)
        let mut cloned = rows.clone();
        apply_sort(&mut cloned, &cols, &configs);

        // Index sort (no clone)
        let mut indices = identity_indices(rows.len());
        sort_indices(&mut indices, &rows, &cols, &configs);
        let index_sorted: Vec<&Vec<Value>> = indices.iter().map(|&i| &rows[i as usize]).collect();

        for (i, row) in cloned.iter().enumerate() {
            assert_eq!(row, index_sorted[i], "mismatch at position {i}");
        }
    }

    // ── Coverage: sort_indices with empty configs (line 46) ──

    #[test]
    fn sort_indices_empty_configs_returns_unchanged() {
        let rows = test_rows();
        let cols = test_columns();
        let mut indices = identity_indices(rows.len());
        let original = indices.clone();

        sort_indices(&mut indices, &rows, &cols, &[]);

        assert_eq!(
            indices, original,
            "empty configs should not reorder indices"
        );
    }

    // ── Coverage: compare_values multi-type comparisons (line 67, 80-88) ──

    #[test]
    fn sort_indices_multi_key_all_equal_returns_equal() {
        // Two rows identical on all sort keys → compare_values returns Equal for all,
        // hitting the final `Ordering::Equal` at line 67.
        let rows = vec![
            vec![json!("Alice"), json!(30)],
            vec![json!("Alice"), json!(30)],
        ];
        let cols = test_columns();
        let mut indices = identity_indices(rows.len());

        sort_indices(
            &mut indices,
            &rows,
            &cols,
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

        // Order is stable; both rows are equal so indices stay as-is.
        assert_eq!(indices, vec![0, 1]);
    }

    #[test]
    fn compare_values_bool_ordering() {
        // Exercises Bool vs Bool branch (line 81)
        let rows = vec![vec![json!(true)], vec![json!(false)], vec![json!(true)]];
        let cols = vec![ColumnDef {
            key: "flag".into(),
            header: "Flag".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let mut indices = identity_indices(rows.len());

        sort_indices(
            &mut indices,
            &rows,
            &cols,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );

        // false < true, so row 1 (false) comes first
        assert_eq!(indices[0], 1);
    }

    #[test]
    fn compare_values_null_vs_null() {
        // Exercises Null vs Null branch (line 82)
        let rows = vec![vec![json!(null)], vec![json!(null)]];
        let cols = vec![ColumnDef {
            key: "x".into(),
            header: "X".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let mut indices = identity_indices(rows.len());

        sort_indices(
            &mut indices,
            &rows,
            &cols,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );

        // Both null → Equal, stable order preserved
        assert_eq!(indices, vec![0, 1]);
    }

    #[test]
    fn compare_values_null_vs_value_and_value_vs_null() {
        // Exercises Null < non-Null (line 83) and non-Null > Null (line 84)
        let rows = vec![
            vec![json!(null)],
            vec![json!(42)],
            vec![json!(null)],
            vec![json!(10)],
        ];
        let cols = vec![ColumnDef {
            key: "v".into(),
            header: "V".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let mut indices = identity_indices(rows.len());

        sort_indices(
            &mut indices,
            &rows,
            &cols,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );

        // Nulls sort before numbers: [null, null, 10, 42]
        assert_eq!(indices, vec![0, 2, 3, 1]);
    }

    #[test]
    fn compare_values_fallback_stringify() {
        // Exercises the fallback `_` arm (lines 86-88) that stringifies values
        // e.g. Array vs Array, or Array vs Object
        let rows = vec![
            vec![json!([3, 2, 1])],
            vec![json!([1, 2, 3])],
            vec![json!({"a": 1})],
        ];
        let cols = vec![ColumnDef {
            key: "data".into(),
            header: "Data".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let mut indices = identity_indices(rows.len());

        sort_indices(
            &mut indices,
            &rows,
            &cols,
            &[SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            }],
        );

        // Stringified: "[1,2,3]" < "[3,2,1]" < "{\"a\":1}"
        assert_eq!(indices, vec![1, 0, 2]);
    }

    // ── Coverage: matches_condition operator branches (lines 101, 106, 110, 112, 115) ──

    #[test]
    fn filter_not_equals() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: crate::filtering::FilterOperator::NotEquals,
            value: json!("Bob"),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        // Everyone except Bob (index 1)
        assert_eq!(result, vec![0, 2, 3]);
    }

    #[test]
    fn filter_greater_than_or_equal() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: crate::filtering::FilterOperator::GreaterThanOrEqual,
            value: json!(30),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        // Alice(30) and Charlie(35)
        assert_eq!(result, vec![0, 2]);
    }

    #[test]
    fn filter_less_than() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: crate::filtering::FilterOperator::LessThan,
            value: json!(28),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        // Only Bob(25)
        assert_eq!(result, vec![1]);
    }

    #[test]
    fn filter_less_than_or_equal() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: crate::filtering::FilterOperator::LessThanOrEqual,
            value: json!(28),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        // Bob(25) and Alice Smith(28)
        assert_eq!(result, vec![1, 3]);
    }

    // ── Coverage: Contains with non-string returns false (line 106) ──

    #[test]
    fn filter_contains_non_string_returns_false() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        // Try Contains on the numeric "age" column — cell is a number, not a string
        let conditions = vec![FilterCondition {
            column_key: "age".into(),
            operator: crate::filtering::FilterOperator::Contains,
            value: json!("30"),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        // No rows match because cell values are numbers, not strings
        assert_eq!(result, Vec::<u32>::new());
    }

    // ── Coverage: compare_numeric with non-numeric values (line 123) ──

    #[test]
    fn filter_greater_than_non_numeric_returns_false() {
        let rows = test_rows();
        let cols = test_columns();
        let indices = identity_indices(rows.len());
        // GreaterThan on string column — as_f64() returns None → false
        let conditions = vec![FilterCondition {
            column_key: "name".into(),
            operator: crate::filtering::FilterOperator::GreaterThan,
            value: json!("Alice"),
        }];

        let result = filter_indices(&indices, &rows, &cols, &conditions);
        assert_eq!(result, Vec::<u32>::new());
    }
}
