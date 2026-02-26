use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::data_store::ColumnDef;

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

/// Compare two JSON values for sorting.
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

/// Apply multi-column sort to rows in place.
pub fn apply_sort(rows: &mut [Vec<Value>], _columns: &[ColumnDef], configs: &[SortConfig]) {
    rows.sort_by(|a, b| {
        for config in configs {
            let idx = config.column_index;
            let val_a = a.get(idx).unwrap_or(&Value::Null);
            let val_b = b.get(idx).unwrap_or(&Value::Null);

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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_sort_ascending_numbers() {
        let mut rows = vec![vec![json!(3)], vec![json!(1)], vec![json!(2)]];
        let columns = vec![ColumnDef {
            key: "val".into(),
            header: "Val".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let configs = vec![SortConfig {
            column_index: 0,
            direction: SortDirection::Ascending,
        }];

        apply_sort(&mut rows, &columns, &configs);

        assert_eq!(rows[0][0], json!(1));
        assert_eq!(rows[1][0], json!(2));
        assert_eq!(rows[2][0], json!(3));
    }

    #[test]
    fn test_sort_descending_strings() {
        let mut rows = vec![
            vec![json!("apple")],
            vec![json!("cherry")],
            vec![json!("banana")],
        ];
        let columns = vec![ColumnDef {
            key: "fruit".into(),
            header: "Fruit".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let configs = vec![SortConfig {
            column_index: 0,
            direction: SortDirection::Descending,
        }];

        apply_sort(&mut rows, &columns, &configs);

        assert_eq!(rows[0][0], json!("cherry"));
        assert_eq!(rows[1][0], json!("banana"));
        assert_eq!(rows[2][0], json!("apple"));
    }

    #[test]
    fn test_multi_column_sort() {
        let mut rows = vec![
            vec![json!("A"), json!(2)],
            vec![json!("B"), json!(1)],
            vec![json!("A"), json!(1)],
        ];
        let columns = vec![
            ColumnDef {
                key: "group".into(),
                header: "Group".into(),
                width: None,
                sortable: true,
                filterable: false,
            },
            ColumnDef {
                key: "val".into(),
                header: "Val".into(),
                width: None,
                sortable: true,
                filterable: false,
            },
        ];
        let configs = vec![
            SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            },
            SortConfig {
                column_index: 1,
                direction: SortDirection::Ascending,
            },
        ];

        apply_sort(&mut rows, &columns, &configs);

        assert_eq!(rows[0], vec![json!("A"), json!(1)]);
        assert_eq!(rows[1], vec![json!("A"), json!(2)]);
        assert_eq!(rows[2], vec![json!("B"), json!(1)]);
    }

    #[test]
    fn test_compare_bool_values() {
        let mut rows = vec![
            vec![json!(true)],
            vec![json!(false)],
            vec![json!(true)],
            vec![json!(false)],
        ];
        let columns = vec![ColumnDef {
            key: "flag".into(),
            header: "Flag".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let configs = vec![SortConfig {
            column_index: 0,
            direction: SortDirection::Ascending,
        }];

        apply_sort(&mut rows, &columns, &configs);

        // false (0) < true (1) in ascending order
        assert_eq!(rows[0][0], json!(false));
        assert_eq!(rows[1][0], json!(false));
        assert_eq!(rows[2][0], json!(true));
        assert_eq!(rows[3][0], json!(true));
    }

    #[test]
    fn test_compare_null_values() {
        let mut rows = vec![
            vec![json!(2)],
            vec![json!(null)],
            vec![json!(1)],
            vec![json!(null)],
        ];
        let columns = vec![ColumnDef {
            key: "val".into(),
            header: "Val".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let configs = vec![SortConfig {
            column_index: 0,
            direction: SortDirection::Ascending,
        }];

        apply_sort(&mut rows, &columns, &configs);

        // Null < any non-null, and Null == Null
        assert_eq!(rows[0][0], json!(null));
        assert_eq!(rows[1][0], json!(null));
        assert_eq!(rows[2][0], json!(1));
        assert_eq!(rows[3][0], json!(2));
    }

    #[test]
    fn test_compare_fallback_stringify() {
        // Arrays and objects hit the fallback branch that stringifies values
        let mut rows = vec![
            vec![json!([3, 2, 1])],
            vec![json!([1, 2, 3])],
            vec![json!({"a": 1})],
        ];
        let columns = vec![ColumnDef {
            key: "val".into(),
            header: "Val".into(),
            width: None,
            sortable: true,
            filterable: false,
        }];
        let configs = vec![SortConfig {
            column_index: 0,
            direction: SortDirection::Ascending,
        }];

        apply_sort(&mut rows, &columns, &configs);

        // Stringified: "[1,2,3]" < "[3,2,1]" < "{\"a\":1}" (lexicographic)
        assert_eq!(rows[0][0], json!([1, 2, 3]));
        assert_eq!(rows[1][0], json!([3, 2, 1]));
        assert_eq!(rows[2][0], json!({"a": 1}));
    }

    #[test]
    fn test_sort_identical_rows_returns_equal() {
        // When all sort configs produce Equal for every pair, the fallback Equal on line 59 is hit
        let mut rows = vec![
            vec![json!("same"), json!(1)],
            vec![json!("same"), json!(1)],
            vec![json!("same"), json!(1)],
        ];
        let columns = vec![
            ColumnDef {
                key: "a".into(),
                header: "A".into(),
                width: None,
                sortable: true,
                filterable: false,
            },
            ColumnDef {
                key: "b".into(),
                header: "B".into(),
                width: None,
                sortable: true,
                filterable: false,
            },
        ];
        let configs = vec![
            SortConfig {
                column_index: 0,
                direction: SortDirection::Ascending,
            },
            SortConfig {
                column_index: 1,
                direction: SortDirection::Ascending,
            },
        ];

        apply_sort(&mut rows, &columns, &configs);

        // All rows identical — order preserved, no panic
        assert_eq!(rows[0], vec![json!("same"), json!(1)]);
        assert_eq!(rows[1], vec![json!("same"), json!(1)]);
        assert_eq!(rows[2], vec![json!("same"), json!(1)]);
    }
}
