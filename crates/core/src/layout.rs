use serde::Serialize;
use taffy::prelude::*;
use taffy::TaffyTree;

/// Text alignment within a cell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
pub enum Align {
    #[default]
    Left,
    Center,
    Right,
}

/// Layout configuration for a single column.
#[derive(Debug, Clone, Serialize)]
pub struct ColumnLayout {
    pub width: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub align: Align,
}

/// Viewport dimensions and scroll state.
#[derive(Debug, Clone, Serialize)]
pub struct Viewport {
    pub width: f32,
    pub height: f32,
    pub row_height: f32,
    pub header_height: f32,
    pub scroll_top: f32,
}

/// Computed layout for a single cell.
#[derive(Debug, Clone, Serialize)]
pub struct CellLayout {
    pub row: usize,
    pub col: usize,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub content_align: Align,
}

/// Flexbox-based layout engine powered by Taffy.
pub struct LayoutEngine {
    pub(crate) tree: TaffyTree<()>,
}

impl LayoutEngine {
    /// Create a new `LayoutEngine` with an empty Taffy tree.
    pub fn new() -> Self {
        Self {
            tree: TaffyTree::new(),
        }
    }

    /// Build a Taffy style for a column child node.
    fn column_style(col: &ColumnLayout, height: f32) -> Style {
        Style {
            size: Size {
                width: if col.width > 0.0 {
                    Dimension::length(col.width)
                } else {
                    Dimension::auto()
                },
                height: Dimension::length(height),
            },
            flex_grow: col.flex_grow,
            flex_shrink: col.flex_shrink,
            min_size: Size {
                width: col.min_width.map_or(Dimension::auto(), Dimension::length),
                height: Dimension::auto(),
            },
            max_size: Size {
                width: col.max_width.map_or(Dimension::auto(), Dimension::length),
                height: Dimension::auto(),
            },
            ..Style::default()
        }
    }

    /// Compute x/width for each column using Taffy flexbox, returning (x, width) pairs.
    fn compute_column_positions(
        &mut self,
        columns: &[ColumnLayout],
        viewport_width: f32,
        row_height: f32,
    ) -> Vec<(f32, f32)> {
        let root = self
            .tree
            .new_leaf(Style {
                display: Display::Flex,
                flex_direction: FlexDirection::Row,
                size: Size {
                    width: Dimension::length(viewport_width),
                    height: Dimension::length(row_height),
                },
                ..Style::default()
            })
            .expect("failed to create root node");

        let children: Vec<_> = columns
            .iter()
            .map(|col| {
                self.tree
                    .new_leaf(Self::column_style(col, row_height))
                    .expect("failed to create child node")
            })
            .collect();

        self.tree
            .set_children(root, &children)
            .expect("failed to set children");

        self.tree
            .compute_layout(
                root,
                Size {
                    width: AvailableSpace::Definite(viewport_width),
                    height: AvailableSpace::Definite(row_height),
                },
            )
            .expect("failed to compute layout");

        let positions: Vec<(f32, f32)> = children
            .iter()
            .map(|&child| {
                let layout = self.tree.layout(child).expect("failed to get layout");
                (layout.location.x, layout.size.width)
            })
            .collect();

        self.tree.clear();

        positions
    }

    /// Compute header cell layouts for the given columns and viewport.
    pub fn compute_header_layout(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
    ) -> Vec<CellLayout> {
        let positions =
            self.compute_column_positions(columns, viewport.width, viewport.header_height);

        positions
            .into_iter()
            .enumerate()
            .map(|(col_idx, (x, width))| CellLayout {
                row: 0,
                col: col_idx,
                x,
                y: 0.0,
                width,
                height: viewport.header_height,
                content_align: columns
                    .get(col_idx)
                    .map_or_else(Align::default, |c| c.align),
            })
            .collect()
    }

    /// Compute row cell layouts for visible rows.
    pub fn compute_rows_layout(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
        visible_range: std::ops::Range<usize>,
    ) -> Vec<CellLayout> {
        if visible_range.is_empty() || columns.is_empty() {
            return Vec::new();
        }

        // Compute column positions once — all rows share the same x/width
        let positions = self.compute_column_positions(columns, viewport.width, viewport.row_height);

        let mut result =
            Vec::with_capacity((visible_range.end - visible_range.start) * columns.len());

        for row_idx in visible_range {
            // Position relative to the canvas viewport: absolute position minus scroll offset.
            let y = (row_idx as f32).mul_add(viewport.row_height, viewport.header_height)
                - viewport.scroll_top;
            for (col_idx, &(x, width)) in positions.iter().enumerate() {
                result.push(CellLayout {
                    row: row_idx,
                    col: col_idx,
                    x,
                    y,
                    width,
                    height: viewport.row_height,
                    content_align: columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                });
            }
        }

        result
    }
}

impl Default for LayoutEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_viewport() -> Viewport {
        Viewport {
            width: 600.0,
            height: 400.0,
            row_height: 36.0,
            header_height: 40.0,
            scroll_top: 0.0,
        }
    }

    #[test]
    fn layout_engine_creation() {
        let engine = LayoutEngine::new();
        assert_eq!(engine.tree.total_node_count(), 0);
    }

    #[test]
    fn fixed_width_columns() {
        let mut engine = LayoutEngine::new();
        let columns = vec![
            ColumnLayout {
                width: 100.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
            ColumnLayout {
                width: 200.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Center,
            },
            ColumnLayout {
                width: 150.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Right,
            },
        ];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport);

        assert_eq!(header.len(), 3);
        assert!((header[0].x - 0.0).abs() < 0.1);
        assert!((header[0].width - 100.0).abs() < 0.1);
        assert!((header[1].x - 100.0).abs() < 0.1);
        assert!((header[1].width - 200.0).abs() < 0.1);
        assert!((header[2].x - 300.0).abs() < 0.1);
        assert!((header[2].width - 150.0).abs() < 0.1);
        // Verify alignment propagation
        assert_eq!(header[0].content_align, Align::Left);
        assert_eq!(header[1].content_align, Align::Center);
        assert_eq!(header[2].content_align, Align::Right);
    }

    #[test]
    fn flex_grow_column_fills_remaining_space() {
        let mut engine = LayoutEngine::new();
        let columns = vec![
            ColumnLayout {
                width: 100.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
            ColumnLayout {
                width: 0.0,
                flex_grow: 1.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
            ColumnLayout {
                width: 100.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
        ];
        let viewport = make_viewport(); // width = 600

        let header = engine.compute_header_layout(&columns, &viewport);
        // Middle column should fill remaining: 600 - 100 - 100 = 400
        assert!((header[1].width - 400.0).abs() < 1.0);
        assert!((header[1].x - 100.0).abs() < 1.0);
        assert!((header[2].x - 500.0).abs() < 1.0);
    }

    #[test]
    fn min_max_width_constraints() {
        let mut engine = LayoutEngine::new();
        let columns = vec![
            ColumnLayout {
                width: 0.0,
                flex_grow: 1.0,
                flex_shrink: 0.0,
                min_width: Some(50.0),
                max_width: Some(200.0),
                align: Align::Left,
            },
            ColumnLayout {
                width: 0.0,
                flex_grow: 1.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
        ];
        let viewport = make_viewport(); // width = 600

        let header = engine.compute_header_layout(&columns, &viewport);
        // First column: flex_grow=1, but max_width=200 → clamped to 200
        assert!(header[0].width <= 200.0 + 0.1);
        assert!(header[0].width >= 50.0 - 0.1);
    }

    #[test]
    fn rows_layout_correct_positions() {
        let mut engine = LayoutEngine::new();
        let columns = vec![
            ColumnLayout {
                width: 100.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
            ColumnLayout {
                width: 200.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Right,
            },
        ];
        let viewport = make_viewport(); // header_height=40, row_height=36

        let rows = engine.compute_rows_layout(&columns, &viewport, 0..3);
        // 3 rows × 2 columns = 6 cells
        assert_eq!(rows.len(), 6);

        // Row 0, Col 0
        assert_eq!(rows[0].row, 0);
        assert_eq!(rows[0].col, 0);
        assert!((rows[0].y - 40.0).abs() < 0.1); // header_height
        assert!((rows[0].x - 0.0).abs() < 0.1);

        // Row 0, Col 1
        assert_eq!(rows[1].row, 0);
        assert_eq!(rows[1].col, 1);
        assert!((rows[1].x - 100.0).abs() < 0.1);

        // Row 1, Col 0
        assert_eq!(rows[2].row, 1);
        assert!((rows[2].y - 76.0).abs() < 0.1); // 40 + 1*36

        // Row 2, Col 0
        assert_eq!(rows[4].row, 2);
        assert!((rows[4].y - 112.0).abs() < 0.1); // 40 + 2*36
    }

    #[test]
    fn empty_range_returns_empty() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            flex_grow: 0.0,
            flex_shrink: 0.0,
            min_width: None,
            max_width: None,
            align: Align::Left,
        }];
        let viewport = make_viewport();
        let rows = engine.compute_rows_layout(&columns, &viewport, 0..0);
        assert!(rows.is_empty());
    }

    fn make_single_column() -> Vec<ColumnLayout> {
        vec![ColumnLayout {
            width: 100.0,
            flex_grow: 0.0,
            flex_shrink: 0.0,
            min_width: None,
            max_width: None,
            align: Align::Left,
        }]
    }

    // ── Scroll tests ───────────────────────────────────────────────

    #[test]
    fn scroll_zero_rows_start_below_header() {
        let mut engine = LayoutEngine::new();
        let viewport = make_viewport(); // scroll_top = 0, header = 40, row = 36

        let rows = engine.compute_rows_layout(&make_single_column(), &viewport, 0..3);
        // scroll_top=0 → y = header + row_idx*row_height
        assert!((rows[0].y - 40.0).abs() < 0.1); // row 0
        assert!((rows[1].y - 76.0).abs() < 0.1); // row 1
        assert!((rows[2].y - 112.0).abs() < 0.1); // row 2
    }

    #[test]
    fn scroll_offsets_row_y_positions() {
        let mut engine = LayoutEngine::new();
        let mut viewport = make_viewport();
        viewport.scroll_top = 360.0; // scrolled 10 rows down

        // Visible range 5..15 (overscan=5 rows before first visible)
        let rows = engine.compute_rows_layout(&make_single_column(), &viewport, 5..15);
        assert_eq!(rows.len(), 10);

        // y = header(40) + row_idx*36 - scroll_top(360)
        // Row  5: 40 + 180 - 360 = -140  (overscan, above viewport)
        assert!((rows[0].y - -140.0).abs() < 0.1);
        // Row 10: 40 + 360 - 360 =   40  (first visible, right below header)
        assert!((rows[5].y - 40.0).abs() < 0.1);
        // Row 14: 40 + 504 - 360 =  184
        assert!((rows[9].y - 184.0).abs() < 0.1);
    }

    #[test]
    fn scroll_partial_row_offset() {
        // When the user scrolls to a fractional position (middle of a row),
        // the first visible row should be drawn partially above the header.
        let mut engine = LayoutEngine::new();
        let mut viewport = make_viewport();
        viewport.scroll_top = 18.0; // half a row (36/2)

        let rows = engine.compute_rows_layout(&make_single_column(), &viewport, 0..3);
        // Row 0: 40 + 0 - 18 = 22  (shifted up by 18px)
        assert!((rows[0].y - 22.0).abs() < 0.1);
        // Row 1: 40 + 36 - 18 = 58
        assert!((rows[1].y - 58.0).abs() < 0.1);
    }

    #[test]
    fn scroll_large_offset_far_down() {
        let mut engine = LayoutEngine::new();
        let mut viewport = make_viewport();
        viewport.scroll_top = 35_640.0; // row 990: 990*36 = 35_640

        let rows = engine.compute_rows_layout(&make_single_column(), &viewport, 985..1000);
        assert_eq!(rows.len(), 15);

        // Row 985: 40 + 985*36 - 35640 = 40 + 35460 - 35640 = -140
        assert!((rows[0].y - -140.0).abs() < 0.1);
        // Row 990: 40 + 990*36 - 35640 = 40 + 35640 - 35640 = 40
        assert!((rows[5].y - 40.0).abs() < 0.1);
    }

    #[test]
    fn scroll_does_not_affect_header_layout() {
        let mut engine = LayoutEngine::new();
        let mut viewport = make_viewport();
        viewport.scroll_top = 500.0;

        let header = engine.compute_header_layout(&make_single_column(), &viewport);
        // Header is always pinned at y=0, regardless of scroll
        assert!((header[0].y - 0.0).abs() < 0.1);
        assert!((header[0].height - viewport.header_height).abs() < 0.1);
    }

    #[test]
    fn scroll_preserves_column_x_and_width() {
        let mut engine = LayoutEngine::new();
        let columns = vec![
            ColumnLayout {
                width: 100.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Left,
            },
            ColumnLayout {
                width: 200.0,
                flex_grow: 0.0,
                flex_shrink: 0.0,
                min_width: None,
                max_width: None,
                align: Align::Right,
            },
        ];
        let mut viewport = make_viewport();
        viewport.scroll_top = 720.0;

        let rows = engine.compute_rows_layout(&columns, &viewport, 15..25);
        // x and width must be identical to scroll_top=0 results
        assert!((rows[0].x - 0.0).abs() < 0.1);
        assert!((rows[0].width - 100.0).abs() < 0.1);
        assert!((rows[1].x - 100.0).abs() < 0.1);
        assert!((rows[1].width - 200.0).abs() < 0.1);
        // But y is offset
        // Row 15, Col 0: 40 + 15*36 - 720 = -140
        assert!((rows[0].y - -140.0).abs() < 0.1);
    }
}
