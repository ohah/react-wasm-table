use serde::Serialize;
use taffy::prelude::*;
use taffy::{Overflow, Point, TaffyTree};

use crate::layout_buffer;

/// Text alignment within a cell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
pub enum Align {
    #[default]
    Left,
    Center,
    Right,
}

/// A CSS dimension value: length(px), percent, or auto.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum DimensionValue {
    #[default]
    Auto,
    Length(f32),
    Percent(f32),
}

/// A CSS length value: length(px) or percent (no auto).
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum LengthValue {
    #[default]
    Zero,
    Length(f32),
    Percent(f32),
}

/// A CSS length value that also supports auto.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum LengthAutoValue {
    #[default]
    Auto,
    Length(f32),
    Percent(f32),
}

/// Rect with top/right/bottom/left values.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct RectValue<T: Default + Copy> {
    pub top: T,
    pub right: T,
    pub bottom: T,
    pub left: T,
}

impl RectValue<LengthAutoValue> {
    /// Create a rect with all sides set to zero (not auto).
    /// Matches Taffy's default margin behavior.
    pub const fn zero_auto() -> Self {
        Self {
            top: LengthAutoValue::Length(0.0),
            right: LengthAutoValue::Length(0.0),
            bottom: LengthAutoValue::Length(0.0),
            left: LengthAutoValue::Length(0.0),
        }
    }
}

/// CSS overflow enum.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum OverflowValue {
    #[default]
    Visible,
    Clip,
    Hidden,
    Scroll,
}

/// CSS display enum.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum DisplayValue {
    #[default]
    Flex,
    Block,
    None,
}

/// CSS flex-direction enum.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum FlexDirectionValue {
    #[default]
    Row,
    Column,
    RowReverse,
    ColumnReverse,
}

/// CSS flex-wrap enum.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum FlexWrapValue {
    #[default]
    NoWrap,
    Wrap,
    WrapReverse,
}

/// CSS alignment enum (for align-items, align-content, justify-content, align-self).
#[derive(Debug, Clone, Copy, Serialize)]
pub enum AlignValue {
    Start,
    End,
    FlexStart,
    FlexEnd,
    Center,
    Baseline,
    Stretch,
    SpaceBetween,
    SpaceEvenly,
    SpaceAround,
}

/// CSS position enum.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum PositionValue {
    #[default]
    Relative,
    Absolute,
}

/// CSS box-sizing enum.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub enum BoxSizingValue {
    #[default]
    BorderBox,
    ContentBox,
}

/// Layout configuration for a single column (flex child).
#[derive(Debug, Clone, Serialize)]
pub struct ColumnLayout {
    pub width: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub align: Align,
    // New flex child properties
    pub flex_basis: DimensionValue,
    pub height: DimensionValue,
    pub min_height: DimensionValue,
    pub max_height: DimensionValue,
    pub align_self: Option<AlignValue>,
    pub padding: RectValue<LengthValue>,
    pub margin: RectValue<LengthAutoValue>,
    pub border: RectValue<LengthValue>,
    pub box_sizing: BoxSizingValue,
    pub aspect_ratio: Option<f32>,
    pub position: PositionValue,
    pub inset: RectValue<LengthAutoValue>,
}

impl Default for ColumnLayout {
    fn default() -> Self {
        Self {
            width: 0.0,
            flex_grow: 0.0,
            flex_shrink: 0.0,
            min_width: None,
            max_width: None,
            align: Align::default(),
            flex_basis: DimensionValue::Auto,
            height: DimensionValue::Auto,
            min_height: DimensionValue::Auto,
            max_height: DimensionValue::Auto,
            align_self: None,
            padding: RectValue::default(),
            margin: RectValue::zero_auto(),
            border: RectValue::default(),
            box_sizing: BoxSizingValue::default(),
            aspect_ratio: None,
            position: PositionValue::default(),
            inset: RectValue::default(), // inset defaults to auto in Taffy
        }
    }
}

/// Container layout configuration (flex parent).
#[derive(Debug, Clone, Serialize)]
pub struct ContainerLayout {
    pub display: DisplayValue,
    pub flex_direction: FlexDirectionValue,
    pub flex_wrap: FlexWrapValue,
    pub gap: LengthValue,
    pub row_gap: Option<LengthValue>,
    pub column_gap: Option<LengthValue>,
    pub align_items: Option<AlignValue>,
    pub align_content: Option<AlignValue>,
    pub justify_content: Option<AlignValue>,
    pub overflow_x: OverflowValue,
    pub overflow_y: OverflowValue,
    pub scrollbar_width: f32,
    pub padding: RectValue<LengthValue>,
    pub margin: RectValue<LengthAutoValue>,
    pub border: RectValue<LengthValue>,
}

impl Default for ContainerLayout {
    fn default() -> Self {
        Self {
            display: DisplayValue::Flex,
            flex_direction: FlexDirectionValue::Row,
            flex_wrap: FlexWrapValue::NoWrap,
            gap: LengthValue::Zero,
            row_gap: None,
            column_gap: None,
            align_items: None,
            align_content: None,
            justify_content: None,
            overflow_x: OverflowValue::Visible,
            overflow_y: OverflowValue::Visible,
            scrollbar_width: 0.0,
            padding: RectValue::default(),
            margin: RectValue::zero_auto(),
            border: RectValue::default(),
        }
    }
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

// ── Conversion helpers: our value types → Taffy types ──────────────────

const fn dimension_to_taffy(d: DimensionValue) -> Dimension {
    match d {
        DimensionValue::Auto => Dimension::auto(),
        DimensionValue::Length(v) => Dimension::length(v),
        DimensionValue::Percent(v) => Dimension::percent(v),
    }
}

const fn length_to_taffy(l: LengthValue) -> LengthPercentage {
    match l {
        LengthValue::Zero => LengthPercentage::length(0.0),
        LengthValue::Length(v) => LengthPercentage::length(v),
        LengthValue::Percent(v) => LengthPercentage::percent(v),
    }
}

const fn length_auto_to_taffy(l: LengthAutoValue) -> LengthPercentageAuto {
    match l {
        LengthAutoValue::Auto => LengthPercentageAuto::auto(),
        LengthAutoValue::Length(v) => LengthPercentageAuto::length(v),
        LengthAutoValue::Percent(v) => LengthPercentageAuto::percent(v),
    }
}

const fn length_rect_to_taffy(r: &RectValue<LengthValue>) -> Rect<LengthPercentage> {
    Rect {
        top: length_to_taffy(r.top),
        right: length_to_taffy(r.right),
        bottom: length_to_taffy(r.bottom),
        left: length_to_taffy(r.left),
    }
}

const fn length_auto_rect_to_taffy(
    r: &RectValue<LengthAutoValue>,
) -> Rect<LengthPercentageAuto> {
    Rect {
        top: length_auto_to_taffy(r.top),
        right: length_auto_to_taffy(r.right),
        bottom: length_auto_to_taffy(r.bottom),
        left: length_auto_to_taffy(r.left),
    }
}

const fn align_value_to_taffy_align(v: AlignValue) -> Option<AlignItems> {
    Some(match v {
        AlignValue::Start => AlignItems::Start,
        AlignValue::End => AlignItems::End,
        AlignValue::FlexStart => AlignItems::FlexStart,
        AlignValue::FlexEnd => AlignItems::FlexEnd,
        AlignValue::Center => AlignItems::Center,
        AlignValue::Baseline => AlignItems::Baseline,
        AlignValue::Stretch => AlignItems::Stretch,
        AlignValue::SpaceBetween | AlignValue::SpaceEvenly | AlignValue::SpaceAround => {
            return None
        }
    })
}

const fn align_value_to_taffy_align_content(v: AlignValue) -> Option<AlignContent> {
    Some(match v {
        AlignValue::Start => AlignContent::Start,
        AlignValue::End => AlignContent::End,
        AlignValue::FlexStart => AlignContent::FlexStart,
        AlignValue::FlexEnd => AlignContent::FlexEnd,
        AlignValue::Center => AlignContent::Center,
        AlignValue::Stretch => AlignContent::Stretch,
        AlignValue::SpaceBetween => AlignContent::SpaceBetween,
        AlignValue::SpaceEvenly => AlignContent::SpaceEvenly,
        AlignValue::SpaceAround => AlignContent::SpaceAround,
        AlignValue::Baseline => return None,
    })
}

const fn align_value_to_taffy_justify(v: AlignValue) -> Option<JustifyContent> {
    Some(match v {
        AlignValue::Start => JustifyContent::Start,
        AlignValue::End => JustifyContent::End,
        AlignValue::FlexStart => JustifyContent::FlexStart,
        AlignValue::FlexEnd => JustifyContent::FlexEnd,
        AlignValue::Center => JustifyContent::Center,
        AlignValue::Stretch => JustifyContent::Stretch,
        AlignValue::SpaceBetween => JustifyContent::SpaceBetween,
        AlignValue::SpaceEvenly => JustifyContent::SpaceEvenly,
        AlignValue::SpaceAround => JustifyContent::SpaceAround,
        AlignValue::Baseline => return None,
    })
}

const fn overflow_to_taffy(o: OverflowValue) -> Overflow {
    match o {
        OverflowValue::Visible => Overflow::Visible,
        OverflowValue::Clip => Overflow::Clip,
        OverflowValue::Hidden => Overflow::Hidden,
        OverflowValue::Scroll => Overflow::Scroll,
    }
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
                height: match col.height {
                    DimensionValue::Auto => Dimension::length(height),
                    DimensionValue::Length(v) => Dimension::length(v),
                    DimensionValue::Percent(v) => Dimension::percent(v),
                },
            },
            flex_grow: col.flex_grow,
            flex_shrink: col.flex_shrink,
            flex_basis: dimension_to_taffy(col.flex_basis),
            min_size: Size {
                width: col.min_width.map_or(Dimension::auto(), Dimension::length),
                height: dimension_to_taffy(col.min_height),
            },
            max_size: Size {
                width: col.max_width.map_or(Dimension::auto(), Dimension::length),
                height: dimension_to_taffy(col.max_height),
            },
            align_self: col.align_self.and_then(align_value_to_taffy_align),
            padding: length_rect_to_taffy(&col.padding),
            margin: length_auto_rect_to_taffy(&col.margin),
            border: length_rect_to_taffy(&col.border),
            box_sizing: match col.box_sizing {
                BoxSizingValue::BorderBox => BoxSizing::BorderBox,
                BoxSizingValue::ContentBox => BoxSizing::ContentBox,
            },
            aspect_ratio: col.aspect_ratio,
            position: match col.position {
                PositionValue::Relative => Position::Relative,
                PositionValue::Absolute => Position::Absolute,
            },
            inset: Rect {
                top: length_auto_to_taffy(col.inset.top),
                right: length_auto_to_taffy(col.inset.right),
                bottom: length_auto_to_taffy(col.inset.bottom),
                left: length_auto_to_taffy(col.inset.left),
            },
            ..Style::default()
        }
    }

    /// Compute x/width for each column using Taffy flexbox, returning (x, width, padding) tuples.
    fn compute_column_positions(
        &mut self,
        columns: &[ColumnLayout],
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
    ) -> Vec<(f32, f32, [f32; 4])> {
        let root_style = Self::build_container_style(container, viewport_width, row_height);
        let root = self
            .tree
            .new_leaf(root_style)
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

        let positions: Vec<(f32, f32, [f32; 4])> = children
            .iter()
            .map(|&child| {
                let layout = self.tree.layout(child).expect("failed to get layout");
                (
                    layout.location.x,
                    layout.size.width,
                    [
                        layout.padding.top,
                        layout.padding.right,
                        layout.padding.bottom,
                        layout.padding.left,
                    ],
                )
            })
            .collect();

        self.tree.clear();

        positions
    }

    /// Build a Taffy Style for the container (root) node.
    fn build_container_style(
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
    ) -> Style {
        let row_gap = container.row_gap.unwrap_or(container.gap);
        let col_gap = container.column_gap.unwrap_or(container.gap);

        Style {
            display: match container.display {
                DisplayValue::Flex | DisplayValue::Block => Display::Flex, // Block falls back to flex
                DisplayValue::None => Display::None,
            },
            flex_direction: match container.flex_direction {
                FlexDirectionValue::Row => FlexDirection::Row,
                FlexDirectionValue::Column => FlexDirection::Column,
                FlexDirectionValue::RowReverse => FlexDirection::RowReverse,
                FlexDirectionValue::ColumnReverse => FlexDirection::ColumnReverse,
            },
            flex_wrap: match container.flex_wrap {
                FlexWrapValue::NoWrap => FlexWrap::NoWrap,
                FlexWrapValue::Wrap => FlexWrap::Wrap,
                FlexWrapValue::WrapReverse => FlexWrap::WrapReverse,
            },
            size: Size {
                width: Dimension::length(viewport_width),
                height: Dimension::length(row_height),
            },
            gap: Size {
                width: length_to_taffy(col_gap),
                height: length_to_taffy(row_gap),
            },
            align_items: container.align_items.and_then(align_value_to_taffy_align),
            align_content: container
                .align_content
                .and_then(align_value_to_taffy_align_content),
            justify_content: container
                .justify_content
                .and_then(align_value_to_taffy_justify),
            overflow: Point {
                x: overflow_to_taffy(container.overflow_x),
                y: overflow_to_taffy(container.overflow_y),
            },
            scrollbar_width: container.scrollbar_width,
            padding: length_rect_to_taffy(&container.padding),
            margin: length_auto_rect_to_taffy(&container.margin),
            border: length_rect_to_taffy(&container.border),
            ..Style::default()
        }
    }

    /// Compute header cell layouts for the given columns and viewport.
    pub fn compute_header_layout(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
        container: &ContainerLayout,
    ) -> Vec<CellLayout> {
        let positions = self.compute_column_positions(
            columns,
            container,
            viewport.width,
            viewport.header_height,
        );

        positions
            .into_iter()
            .enumerate()
            .map(|(col_idx, (x, width, _padding))| CellLayout {
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
        container: &ContainerLayout,
        visible_range: std::ops::Range<usize>,
    ) -> Vec<CellLayout> {
        if visible_range.is_empty() || columns.is_empty() {
            return Vec::new();
        }

        // Compute column positions once — all rows share the same x/width
        let positions =
            self.compute_column_positions(columns, container, viewport.width, viewport.row_height);

        let mut result =
            Vec::with_capacity((visible_range.end - visible_range.start) * columns.len());

        for row_idx in visible_range {
            // Position relative to the canvas viewport: absolute position minus scroll offset.
            let y = (row_idx as f32).mul_add(viewport.row_height, viewport.header_height)
                - viewport.scroll_top;
            for (col_idx, &(x, width, _padding)) in positions.iter().enumerate() {
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

    /// Compute header + visible row layouts into a pre-allocated flat f32 buffer.
    /// Returns the number of cells written.
    ///
    /// Buffer layout: first `columns.len()` cells are headers, then data cells.
    /// Each cell occupies `LAYOUT_STRIDE` f32 values.
    pub fn compute_into_buffer(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
        container: &ContainerLayout,
        visible_range: std::ops::Range<usize>,
        buf: &mut [f32],
    ) -> usize {
        if columns.is_empty() {
            return 0;
        }

        let col_count = columns.len();
        let row_count = visible_range.end.saturating_sub(visible_range.start);
        let total_cells = col_count + row_count * col_count;

        debug_assert!(
            buf.len() >= layout_buffer::buf_len(total_cells),
            "buffer too small: need {} f32s, got {}",
            layout_buffer::buf_len(total_cells),
            buf.len()
        );

        // Compute column positions (shared by header and all rows)
        let positions = self.compute_column_positions(
            columns,
            container,
            viewport.width,
            viewport.header_height,
        );

        // Write header cells (row=0, y=0)
        for (col_idx, &(x, width, padding)) in positions.iter().enumerate() {
            layout_buffer::write_cell(
                buf,
                col_idx,
                0,
                col_idx,
                x,
                0.0,
                width,
                viewport.header_height,
                columns
                    .get(col_idx)
                    .map_or_else(Align::default, |c| c.align),
                padding,
            );
        }

        // Re-compute positions for row height if different from header height
        let row_positions = if (viewport.row_height - viewport.header_height).abs() > f32::EPSILON {
            self.compute_column_positions(columns, container, viewport.width, viewport.row_height)
        } else {
            positions
        };

        // Write data cells
        let mut cell_idx = col_count;
        for row_idx in visible_range {
            let y = (row_idx as f32).mul_add(viewport.row_height, viewport.header_height)
                - viewport.scroll_top;
            for (col_idx, &(x, width, padding)) in row_positions.iter().enumerate() {
                layout_buffer::write_cell(
                    buf,
                    cell_idx,
                    row_idx,
                    col_idx,
                    x,
                    y,
                    width,
                    viewport.row_height,
                    columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                    padding,
                );
                cell_idx += 1;
            }
        }

        total_cells
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

    fn default_container() -> ContainerLayout {
        ContainerLayout::default()
    }

    fn col(width: f32, align: Align) -> ColumnLayout {
        ColumnLayout {
            width,
            align,
            ..ColumnLayout::default()
        }
    }

    fn col_flex(width: f32, flex_grow: f32, flex_shrink: f32) -> ColumnLayout {
        ColumnLayout {
            width,
            flex_grow,
            flex_shrink,
            ..ColumnLayout::default()
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
            col(100.0, Align::Left),
            col(200.0, Align::Center),
            col(150.0, Align::Right),
        ];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());

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
            col_flex(100.0, 0.0, 0.0),
            col_flex(0.0, 1.0, 0.0),
            col_flex(100.0, 0.0, 0.0),
        ];
        let viewport = make_viewport(); // width = 600

        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
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
                min_width: Some(50.0),
                max_width: Some(200.0),
                ..ColumnLayout::default()
            },
            col_flex(0.0, 1.0, 0.0),
        ];
        let viewport = make_viewport(); // width = 600

        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // First column: flex_grow=1, but max_width=200 → clamped to 200
        assert!(header[0].width <= 200.0 + 0.1);
        assert!(header[0].width >= 50.0 - 0.1);
    }

    #[test]
    fn rows_layout_correct_positions() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Right)];
        let viewport = make_viewport(); // header_height=40, row_height=36

        let rows = engine.compute_rows_layout(&columns, &viewport, &default_container(), 0..3);
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
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let rows = engine.compute_rows_layout(&columns, &viewport, &default_container(), 0..0);
        assert!(rows.is_empty());
    }

    fn make_single_column() -> Vec<ColumnLayout> {
        vec![col(100.0, Align::Left)]
    }

    // ── Scroll tests ───────────────────────────────────────────────

    #[test]
    fn scroll_zero_rows_start_below_header() {
        let mut engine = LayoutEngine::new();
        let viewport = make_viewport(); // scroll_top = 0, header = 40, row = 36

        let rows = engine.compute_rows_layout(
            &make_single_column(),
            &viewport,
            &default_container(),
            0..3,
        );
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
        let rows = engine.compute_rows_layout(
            &make_single_column(),
            &viewport,
            &default_container(),
            5..15,
        );
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
        let mut engine = LayoutEngine::new();
        let mut viewport = make_viewport();
        viewport.scroll_top = 18.0; // half a row (36/2)

        let rows = engine.compute_rows_layout(
            &make_single_column(),
            &viewport,
            &default_container(),
            0..3,
        );
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

        let rows = engine.compute_rows_layout(
            &make_single_column(),
            &viewport,
            &default_container(),
            985..1000,
        );
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

        let header =
            engine.compute_header_layout(&make_single_column(), &viewport, &default_container());
        // Header is always pinned at y=0, regardless of scroll
        assert!((header[0].y - 0.0).abs() < 0.1);
        assert!((header[0].height - viewport.header_height).abs() < 0.1);
    }

    // ── Buffer output tests ──────────────────────────────────────────

    #[test]
    fn compute_into_buffer_matches_struct_output() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Right)];
        let viewport = make_viewport();
        let container = default_container();

        // Struct-based output
        let headers = engine.compute_header_layout(&columns, &viewport, &container);
        let rows = engine.compute_rows_layout(&columns, &viewport, &container, 0..3);

        // Buffer-based output
        let col_count = columns.len();
        let total_cells = col_count + 3 * col_count; // 2 header + 6 data = 8
        let mut buf = vec![0.0_f32; layout_buffer::buf_len(total_cells)];
        let count = engine.compute_into_buffer(&columns, &viewport, &container, 0..3, &mut buf);
        assert_eq!(count, total_cells);

        // Verify header cells match
        for (i, h) in headers.iter().enumerate() {
            let base = i * layout_buffer::LAYOUT_STRIDE;
            assert!((buf[base + layout_buffer::FIELD_X] - h.x).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_Y] - h.y).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_WIDTH] - h.width).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_HEIGHT] - h.height).abs() < 0.1);
        }

        // Verify data cells match
        for (i, r) in rows.iter().enumerate() {
            let base = (col_count + i) * layout_buffer::LAYOUT_STRIDE;
            assert!((buf[base + layout_buffer::FIELD_ROW] - r.row as f32).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_COL] - r.col as f32).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_X] - r.x).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_Y] - r.y).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_WIDTH] - r.width).abs() < 0.1);
            assert!((buf[base + layout_buffer::FIELD_HEIGHT] - r.height).abs() < 0.1);
        }
    }

    #[test]
    fn compute_into_buffer_with_scroll() {
        let mut engine = LayoutEngine::new();
        let columns = make_single_column();
        let mut viewport = make_viewport();
        viewport.scroll_top = 360.0;

        let total_cells = 1 + 10; // 1 header + 10 data
        let mut buf = vec![0.0_f32; layout_buffer::buf_len(total_cells)];
        let count =
            engine.compute_into_buffer(&columns, &viewport, &default_container(), 5..15, &mut buf);
        assert_eq!(count, total_cells);

        // Header at y=0 regardless of scroll
        assert!((buf[layout_buffer::FIELD_Y] - 0.0).abs() < 0.1);

        // Row 5: y = 40 + 5*36 - 360 = -140
        let base = 1 * layout_buffer::LAYOUT_STRIDE;
        assert!((buf[base + layout_buffer::FIELD_Y] - -140.0).abs() < 0.1);

        // Row 10: y = 40 + 10*36 - 360 = 40
        let base = 6 * layout_buffer::LAYOUT_STRIDE;
        assert!((buf[base + layout_buffer::FIELD_Y] - 40.0).abs() < 0.1);
    }

    #[test]
    fn compute_into_buffer_empty_range() {
        let mut engine = LayoutEngine::new();
        let columns = make_single_column();
        let viewport = make_viewport();

        let mut buf = vec![0.0_f32; layout_buffer::buf_len(1)]; // just header
        let count =
            engine.compute_into_buffer(&columns, &viewport, &default_container(), 0..0, &mut buf);
        assert_eq!(count, 1); // header only
    }

    #[test]
    fn scroll_preserves_column_x_and_width() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Right)];
        let mut viewport = make_viewport();
        viewport.scroll_top = 720.0;

        let rows = engine.compute_rows_layout(&columns, &viewport, &default_container(), 15..25);
        // x and width must be identical to scroll_top=0 results
        assert!((rows[0].x - 0.0).abs() < 0.1);
        assert!((rows[0].width - 100.0).abs() < 0.1);
        assert!((rows[1].x - 100.0).abs() < 0.1);
        assert!((rows[1].width - 200.0).abs() < 0.1);
        // But y is offset
        // Row 15, Col 0: 40 + 15*36 - 720 = -140
        assert!((rows[0].y - -140.0).abs() < 0.1);
    }

    // ── New: container layout tests ──────────────────────────────────

    #[test]
    fn container_gap_adds_space_between_columns() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            gap: LengthValue::Length(10.0),
            ..ContainerLayout::default()
        };

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // Second column should start at 100 + 10 = 110
        assert!((header[1].x - 110.0).abs() < 0.5);
    }

    #[test]
    fn column_padding_appears_in_buffer() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 200.0,
            padding: RectValue {
                top: LengthValue::Length(4.0),
                right: LengthValue::Length(8.0),
                bottom: LengthValue::Length(4.0),
                left: LengthValue::Length(8.0),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let container = default_container();

        let total_cells = 1; // header only
        let mut buf = vec![0.0_f32; layout_buffer::buf_len(total_cells)];
        engine.compute_into_buffer(&columns, &viewport, &container, 0..0, &mut buf);

        assert!((buf[layout_buffer::FIELD_PADDING_TOP] - 4.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_PADDING_RIGHT] - 8.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_PADDING_BOTTOM] - 4.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_PADDING_LEFT] - 8.0).abs() < 0.1);
    }

    #[test]
    fn justify_content_space_between() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport(); // width = 600
        let container = ContainerLayout {
            justify_content: Some(AlignValue::SpaceBetween),
            ..ContainerLayout::default()
        };

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // With space-between, items are at 0 and 500 (600 - 100)
        assert!((header[0].x - 0.0).abs() < 0.5);
        assert!((header[1].x - 500.0).abs() < 0.5);
    }
}
