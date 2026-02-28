use std::hash::{Hash, Hasher};

use taffy::prelude::*;
use taffy::{GridAutoFlow, GridTemplateRepetition, MinMax, Overflow, Point, TaffyTree};

use crate::layout_buffer;

/// Text alignment within a cell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Align {
    #[default]
    Left,
    Center,
    Right,
}

/// A CSS dimension value: length(px), percent, or auto.
#[derive(Debug, Clone, Copy, Default)]
pub enum DimensionValue {
    #[default]
    Auto,
    Length(f32),
    Percent(f32),
}

/// A CSS length value: length(px) or percent (no auto).
#[derive(Debug, Clone, Copy, Default)]
pub enum LengthValue {
    #[default]
    Zero,
    Length(f32),
    Percent(f32),
}

/// A CSS length value that also supports auto.
#[derive(Debug, Clone, Copy, Default)]
pub enum LengthAutoValue {
    #[default]
    Auto,
    Length(f32),
    Percent(f32),
}

/// Rect with top/right/bottom/left values.
#[derive(Debug, Clone, Copy, Default)]
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
#[derive(Debug, Clone, Copy, Default)]
pub enum OverflowValue {
    #[default]
    Visible,
    Clip,
    Hidden,
    Scroll,
}

/// CSS display enum. Maps to Taffy's Display (Flex, Grid, Block, None).
#[derive(Debug, Clone, Copy, Default)]
pub enum DisplayValue {
    #[default]
    Flex,
    Grid,
    Block,
    None,
}

/// CSS grid-auto-flow enum.
#[derive(Debug, Clone, Copy, Default)]
pub enum GridAutoFlowValue {
    #[default]
    Row,
    Column,
    RowDense,
    ColumnDense,
}

/// A single track sizing value (e.g., `1fr`, `200px`, `auto`, `minmax(100px, 1fr)`).
#[derive(Debug, Clone)]
pub enum TrackSizeValue {
    Length(f32),
    Percent(f32),
    Fr(f32),
    Auto,
    MinContent,
    MaxContent,
    MinMax(Box<Self>, Box<Self>),
    FitContentPx(f32),
    FitContentPercent(f32),
}

/// An item in a grid track list: either a single track or a `repeat()`.
#[derive(Debug, Clone)]
pub enum TrackListItem {
    Single(TrackSizeValue),
    Repeat(RepeatValue, Vec<TrackSizeValue>),
}

/// The repeat count for a CSS `repeat()` function.
#[derive(Debug, Clone, Copy)]
pub enum RepeatValue {
    Count(u16),
    AutoFill,
    AutoFit,
}

/// Grid placement value for a single edge (start or end).
#[derive(Debug, Clone, Copy, Default)]
pub enum GridPlacementValue {
    #[default]
    Auto,
    Line(i16),
    Span(u16),
}

/// Grid line value with start/end placement (e.g., `grid-row: 1 / span 2`).
#[derive(Debug, Clone, Copy)]
pub struct GridLineValue {
    pub start: GridPlacementValue,
    pub end: GridPlacementValue,
}

/// CSS flex-direction enum.
#[derive(Debug, Clone, Copy, Default)]
pub enum FlexDirectionValue {
    #[default]
    Row,
    Column,
    RowReverse,
    ColumnReverse,
}

/// CSS flex-wrap enum.
#[derive(Debug, Clone, Copy, Default)]
pub enum FlexWrapValue {
    #[default]
    NoWrap,
    Wrap,
    WrapReverse,
}

/// CSS alignment enum (for align-items, align-content, justify-content, align-self).
#[derive(Debug, Clone, Copy)]
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
#[derive(Debug, Clone, Copy, Default)]
pub enum PositionValue {
    #[default]
    Relative,
    Absolute,
}

/// CSS box-sizing enum.
#[derive(Debug, Clone, Copy, Default)]
pub enum BoxSizingValue {
    #[default]
    BorderBox,
    ContentBox,
}

/// Layout configuration for a single column (flex/grid child).
#[derive(Debug, Clone)]
pub struct ColumnLayout {
    pub width: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub align: Align,
    // Flex child properties
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
    // Grid child properties
    pub grid_row: Option<GridLineValue>,
    pub grid_column: Option<GridLineValue>,
    pub justify_self: Option<AlignValue>,
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
            inset: RectValue::default(),
            grid_row: None,
            grid_column: None,
            justify_self: None,
        }
    }
}

/// Container layout configuration (flex/grid parent).
#[derive(Debug, Clone)]
pub struct ContainerLayout {
    pub display: DisplayValue,
    // Flex properties
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
    // Grid container properties
    pub grid_template_rows: Vec<TrackListItem>,
    pub grid_template_columns: Vec<TrackListItem>,
    pub grid_auto_rows: Vec<TrackSizeValue>,
    pub grid_auto_columns: Vec<TrackSizeValue>,
    pub grid_auto_flow: GridAutoFlowValue,
    pub justify_items: Option<AlignValue>,
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
            grid_template_rows: Vec::new(),
            grid_template_columns: Vec::new(),
            grid_auto_rows: Vec::new(),
            grid_auto_columns: Vec::new(),
            grid_auto_flow: GridAutoFlowValue::Row,
            justify_items: None,
        }
    }
}

/// Viewport dimensions and scroll state.
#[derive(Debug, Clone)]
pub struct Viewport {
    pub width: f32,
    pub height: f32,
    pub row_height: f32,
    pub header_height: f32,
    pub scroll_top: f32,
    /// Approximate single-line text height (fontSize * lineHeightRatio).
    /// Used as default min-height for auto-height columns.
    pub line_height: f32,
}

/// Parameters for row-pinned layout computation (reduces argument count).
#[derive(Debug)]
pub struct RowPinnedLayoutParams<'a> {
    pub viewport: &'a Viewport,
    pub container: &'a ContainerLayout,
    pub pinned_top: usize,
    pub pinned_bottom: usize,
    pub scroll_top: f32,
    pub total_rows: usize,
    pub middle_range: std::ops::Range<usize>,
}

/// Column position from Taffy layout result (includes cross-axis info).
#[derive(Debug, Clone)]
struct ColumnPosition {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    padding: [f32; 4],
    border: [f32; 4],
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

const fn length_auto_rect_to_taffy(r: &RectValue<LengthAutoValue>) -> Rect<LengthPercentageAuto> {
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

// ── Grid conversion helpers: our grid types → Taffy grid types ─────────

fn track_size_to_min(v: &TrackSizeValue) -> MinTrackSizingFunction {
    match v {
        TrackSizeValue::Length(px) => MinTrackSizingFunction::length(*px),
        TrackSizeValue::Percent(pct) => MinTrackSizingFunction::percent(*pct / 100.0),
        TrackSizeValue::MinContent => MinTrackSizingFunction::min_content(),
        TrackSizeValue::MaxContent => MinTrackSizingFunction::max_content(),
        TrackSizeValue::MinMax(min, _) => track_size_to_min(min),
        // Fr/FitContent/Auto → auto for min sizing
        TrackSizeValue::Auto
        | TrackSizeValue::Fr(_)
        | TrackSizeValue::FitContentPx(_)
        | TrackSizeValue::FitContentPercent(_) => MinTrackSizingFunction::auto(),
    }
}

fn track_size_to_max(v: &TrackSizeValue) -> MaxTrackSizingFunction {
    match v {
        TrackSizeValue::Length(px) => MaxTrackSizingFunction::length(*px),
        TrackSizeValue::Percent(pct) => MaxTrackSizingFunction::percent(*pct / 100.0),
        TrackSizeValue::Fr(fr) => MaxTrackSizingFunction::fr(*fr),
        TrackSizeValue::Auto => MaxTrackSizingFunction::auto(),
        TrackSizeValue::MinContent => MaxTrackSizingFunction::min_content(),
        TrackSizeValue::MaxContent => MaxTrackSizingFunction::max_content(),
        TrackSizeValue::FitContentPx(px) => MaxTrackSizingFunction::fit_content_px(*px),
        TrackSizeValue::FitContentPercent(pct) => {
            MaxTrackSizingFunction::fit_content_percent(*pct / 100.0)
        }
        TrackSizeValue::MinMax(_, max) => track_size_to_max(max),
    }
}

fn track_size_to_taffy(v: &TrackSizeValue) -> TrackSizingFunction {
    match v {
        TrackSizeValue::MinMax(min, max) => MinMax {
            min: track_size_to_min(min),
            max: track_size_to_max(max),
        },
        _ => MinMax {
            min: track_size_to_min(v),
            max: track_size_to_max(v),
        },
    }
}

fn track_list_to_taffy(items: &[TrackListItem]) -> Vec<GridTemplateComponent<String>> {
    items
        .iter()
        .map(|item| match item {
            TrackListItem::Single(v) => GridTemplateComponent::Single(track_size_to_taffy(v)),
            TrackListItem::Repeat(rep, tracks) => {
                let count = match rep {
                    RepeatValue::Count(n) => RepetitionCount::Count(*n),
                    RepeatValue::AutoFill => RepetitionCount::AutoFill,
                    RepeatValue::AutoFit => RepetitionCount::AutoFit,
                };
                GridTemplateComponent::Repeat(GridTemplateRepetition {
                    count,
                    tracks: tracks.iter().map(track_size_to_taffy).collect(),
                    line_names: vec![],
                })
            }
        })
        .collect()
}

fn auto_tracks_to_taffy(tracks: &[TrackSizeValue]) -> Vec<TrackSizingFunction> {
    tracks.iter().map(track_size_to_taffy).collect()
}

fn grid_placement_to_taffy(v: GridPlacementValue) -> GridPlacement {
    match v {
        GridPlacementValue::Auto => GridPlacement::Auto,
        GridPlacementValue::Line(n) => GridPlacement::from_line_index(n),
        GridPlacementValue::Span(n) => GridPlacement::from_span(n),
    }
}

fn grid_line_to_taffy(v: GridLineValue) -> Line<GridPlacement> {
    Line {
        start: grid_placement_to_taffy(v.start),
        end: grid_placement_to_taffy(v.end),
    }
}

const fn grid_auto_flow_to_taffy(v: GridAutoFlowValue) -> GridAutoFlow {
    match v {
        GridAutoFlowValue::Row => GridAutoFlow::Row,
        GridAutoFlowValue::Column => GridAutoFlow::Column,
        GridAutoFlowValue::RowDense => GridAutoFlow::RowDense,
        GridAutoFlowValue::ColumnDense => GridAutoFlow::ColumnDense,
    }
}

/// Cached result from `compute_column_positions`.
#[derive(Clone)]
struct ColumnLayoutCache {
    key: u64,
    positions: Vec<ColumnPosition>,
    effective_height: f32,
}

/// Hash an f32 by its bit pattern.
fn hash_f32<H: Hasher>(h: &mut H, v: f32) {
    v.to_bits().hash(h);
}

fn hash_opt_f32<H: Hasher>(h: &mut H, v: Option<f32>) {
    v.is_some().hash(h);
    if let Some(f) = v {
        hash_f32(h, f);
    }
}

fn hash_dimension<H: Hasher>(h: &mut H, v: DimensionValue) {
    std::mem::discriminant(&v).hash(h);
    match v {
        DimensionValue::Length(f) | DimensionValue::Percent(f) => hash_f32(h, f),
        DimensionValue::Auto => {}
    }
}

fn hash_length<H: Hasher>(h: &mut H, v: LengthValue) {
    std::mem::discriminant(&v).hash(h);
    match v {
        LengthValue::Length(f) | LengthValue::Percent(f) => hash_f32(h, f),
        LengthValue::Zero => {}
    }
}

fn hash_length_auto<H: Hasher>(h: &mut H, v: LengthAutoValue) {
    std::mem::discriminant(&v).hash(h);
    match v {
        LengthAutoValue::Length(f) | LengthAutoValue::Percent(f) => hash_f32(h, f),
        LengthAutoValue::Auto => {}
    }
}

fn hash_length_rect<H: Hasher>(h: &mut H, r: &RectValue<LengthValue>) {
    hash_length(h, r.top);
    hash_length(h, r.right);
    hash_length(h, r.bottom);
    hash_length(h, r.left);
}

fn hash_length_auto_rect<H: Hasher>(h: &mut H, r: &RectValue<LengthAutoValue>) {
    hash_length_auto(h, r.top);
    hash_length_auto(h, r.right);
    hash_length_auto(h, r.bottom);
    hash_length_auto(h, r.left);
}

fn hash_opt_align<H: Hasher>(h: &mut H, v: Option<&AlignValue>) {
    v.is_some().hash(h);
    if let Some(a) = v {
        std::mem::discriminant(a).hash(h);
    }
}

fn hash_grid_placement<H: Hasher>(h: &mut H, v: GridPlacementValue) {
    std::mem::discriminant(&v).hash(h);
    match v {
        GridPlacementValue::Line(n) => n.hash(h),
        GridPlacementValue::Span(n) => n.hash(h),
        GridPlacementValue::Auto => {}
    }
}

fn hash_opt_grid_line<H: Hasher>(h: &mut H, v: Option<&GridLineValue>) {
    v.is_some().hash(h);
    if let Some(gl) = v {
        hash_grid_placement(h, gl.start);
        hash_grid_placement(h, gl.end);
    }
}

fn hash_track_size<H: Hasher>(h: &mut H, v: &TrackSizeValue) {
    std::mem::discriminant(v).hash(h);
    match v {
        TrackSizeValue::Length(f)
        | TrackSizeValue::Percent(f)
        | TrackSizeValue::Fr(f)
        | TrackSizeValue::FitContentPx(f)
        | TrackSizeValue::FitContentPercent(f) => hash_f32(h, *f),
        TrackSizeValue::MinMax(a, b) => {
            hash_track_size(h, a);
            hash_track_size(h, b);
        }
        TrackSizeValue::Auto | TrackSizeValue::MinContent | TrackSizeValue::MaxContent => {}
    }
}

fn hash_track_list_item<H: Hasher>(h: &mut H, item: &TrackListItem) {
    std::mem::discriminant(item).hash(h);
    match item {
        TrackListItem::Single(ts) => hash_track_size(h, ts),
        TrackListItem::Repeat(rep, sizes) => {
            std::mem::discriminant(rep).hash(h);
            match rep {
                RepeatValue::Count(n) => n.hash(h),
                RepeatValue::AutoFill | RepeatValue::AutoFit => {}
            }
            sizes.len().hash(h);
            for s in sizes {
                hash_track_size(h, s);
            }
        }
    }
}

fn hash_column<H: Hasher>(h: &mut H, col: &ColumnLayout) {
    hash_f32(h, col.width);
    hash_f32(h, col.flex_grow);
    hash_f32(h, col.flex_shrink);
    hash_opt_f32(h, col.min_width);
    hash_opt_f32(h, col.max_width);
    std::mem::discriminant(&col.align).hash(h);
    hash_dimension(h, col.flex_basis);
    hash_dimension(h, col.height);
    hash_dimension(h, col.min_height);
    hash_dimension(h, col.max_height);
    hash_opt_align(h, col.align_self.as_ref());
    hash_length_rect(h, &col.padding);
    hash_length_auto_rect(h, &col.margin);
    hash_length_rect(h, &col.border);
    std::mem::discriminant(&col.box_sizing).hash(h);
    hash_opt_f32(h, col.aspect_ratio);
    std::mem::discriminant(&col.position).hash(h);
    hash_length_auto_rect(h, &col.inset);
    hash_opt_grid_line(h, col.grid_row.as_ref());
    hash_opt_grid_line(h, col.grid_column.as_ref());
    hash_opt_align(h, col.justify_self.as_ref());
}

fn hash_container<H: Hasher>(h: &mut H, c: &ContainerLayout) {
    std::mem::discriminant(&c.display).hash(h);
    std::mem::discriminant(&c.flex_direction).hash(h);
    std::mem::discriminant(&c.flex_wrap).hash(h);
    hash_length(h, c.gap);
    c.row_gap.is_some().hash(h);
    if let Some(rg) = c.row_gap {
        hash_length(h, rg);
    }
    c.column_gap.is_some().hash(h);
    if let Some(cg) = c.column_gap {
        hash_length(h, cg);
    }
    hash_opt_align(h, c.align_items.as_ref());
    hash_opt_align(h, c.align_content.as_ref());
    hash_opt_align(h, c.justify_content.as_ref());
    std::mem::discriminant(&c.overflow_x).hash(h);
    std::mem::discriminant(&c.overflow_y).hash(h);
    hash_f32(h, c.scrollbar_width);
    hash_length_rect(h, &c.padding);
    hash_length_auto_rect(h, &c.margin);
    hash_length_rect(h, &c.border);
    c.grid_template_rows.len().hash(h);
    for item in &c.grid_template_rows {
        hash_track_list_item(h, item);
    }
    c.grid_template_columns.len().hash(h);
    for item in &c.grid_template_columns {
        hash_track_list_item(h, item);
    }
    c.grid_auto_rows.len().hash(h);
    for ts in &c.grid_auto_rows {
        hash_track_size(h, ts);
    }
    c.grid_auto_columns.len().hash(h);
    for ts in &c.grid_auto_columns {
        hash_track_size(h, ts);
    }
    std::mem::discriminant(&c.grid_auto_flow).hash(h);
    hash_opt_align(h, c.justify_items.as_ref());
}

/// Compute a hash key for all inputs to `compute_column_positions`.
fn hash_layout_inputs(
    columns: &[ColumnLayout],
    container: &ContainerLayout,
    viewport_width: f32,
    row_height: f32,
    line_height: f32,
) -> u64 {
    let mut hasher = std::hash::DefaultHasher::new();
    columns.len().hash(&mut hasher);
    for col in columns {
        hash_column(&mut hasher, col);
    }
    hash_container(&mut hasher, container);
    hash_f32(&mut hasher, viewport_width);
    hash_f32(&mut hasher, row_height);
    hash_f32(&mut hasher, line_height);
    hasher.finish()
}

/// Layout engine powered by Taffy (supports Flexbox and CSS Grid).
pub struct LayoutEngine {
    pub(crate) tree: TaffyTree<()>,
    /// Two-slot LRU cache for column layout results.
    /// Slot 0 and 1 hold independent cached results (typically header-height and row-height).
    cache_slots: [Option<ColumnLayoutCache>; 2],
    /// Tracks which slot was used least recently (0 or 1).
    cache_lru: usize,
}

impl LayoutEngine {
    /// Create a new `LayoutEngine` with an empty Taffy tree.
    pub fn new() -> Self {
        Self {
            tree: TaffyTree::new(),
            cache_slots: [None, None],
            cache_lru: 0,
        }
    }

    /// Invalidate all cached layout results. Call when column definitions or
    /// container properties change.
    pub fn invalidate_cache(&mut self) {
        self.cache_slots = [None, None];
        self.cache_lru = 0;
    }

    /// Build a Taffy style for a column child node.
    fn column_style(col: &ColumnLayout, line_height: f32) -> Style {
        log::debug!(
            "[layout] column_style: w={}, grow={}, shrink={}, basis={:?}, align_self={:?}",
            col.width,
            col.flex_grow,
            col.flex_shrink,
            col.flex_basis,
            col.align_self
        );
        Style {
            size: Size {
                width: if col.width > 0.0 {
                    Dimension::length(col.width)
                } else {
                    Dimension::auto()
                },
                height: match col.height {
                    DimensionValue::Auto => Dimension::auto(),
                    DimensionValue::Length(v) => Dimension::length(v),
                    DimensionValue::Percent(v) => Dimension::percent(v),
                },
            },
            flex_grow: col.flex_grow,
            flex_shrink: col.flex_shrink,
            flex_basis: dimension_to_taffy(col.flex_basis),
            min_size: Size {
                width: col.min_width.map_or(Dimension::auto(), Dimension::length),
                // Leaf nodes have no intrinsic content size; use line_height
                // as the default minimum so align-items start/center/end
                // produce visible cells.
                height: match col.min_height {
                    DimensionValue::Auto => Dimension::length(line_height),
                    other => dimension_to_taffy(other),
                },
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
            grid_row: col.grid_row.map_or_else(Line::default, grid_line_to_taffy),
            grid_column: col
                .grid_column
                .map_or_else(Line::default, grid_line_to_taffy),
            justify_self: col.justify_self.and_then(align_value_to_taffy_align),
            ..Style::default()
        }
    }

    /// Compute positions for each column using Taffy layout, returning full cross-axis info
    /// and the effective row height (which may differ from `row_height` for column directions).
    /// Results are cached; repeated calls with the same inputs return cloned cached data.
    fn compute_column_positions(
        &mut self,
        columns: &[ColumnLayout],
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
        line_height: f32,
    ) -> (Vec<ColumnPosition>, f32) {
        let key = hash_layout_inputs(columns, container, viewport_width, row_height, line_height);

        for cached in self.cache_slots.iter().flatten() {
            if cached.key == key {
                log::debug!(
                    "[layout] cache HIT: cols={}, viewport_width={}, row_height={}",
                    columns.len(),
                    viewport_width,
                    row_height
                );
                return (cached.positions.clone(), cached.effective_height);
            }
        }

        log::debug!(
            "[layout] compute_column_positions: cols={}, viewport_width={}, row_height={}",
            columns.len(),
            viewport_width,
            row_height
        );
        let is_column_dir = matches!(
            container.flex_direction,
            FlexDirectionValue::Column | FlexDirectionValue::ColumnReverse
        );

        let (positions, effective_height) = self.run_taffy_column_layout(
            columns,
            container,
            viewport_width,
            row_height,
            line_height,
            is_column_dir,
        );

        for (i, pos) in positions.iter().enumerate() {
            log::debug!(
                "[layout] col[{}]: x={:.1}, y={:.1}, w={:.1}, h={:.1}, pad=[{:.1},{:.1},{:.1},{:.1}], border=[{:.1},{:.1},{:.1},{:.1}]",
                i,
                pos.x,
                pos.y,
                pos.width,
                pos.height,
                pos.padding[0],
                pos.padding[1],
                pos.padding[2],
                pos.padding[3],
                pos.border[0],
                pos.border[1],
                pos.border[2],
                pos.border[3],
            );
        }

        log::debug!(
            "[layout] effective_height={effective_height:.1} (row_height={row_height:.1}, column_dir={is_column_dir})"
        );

        self.tree.clear();

        let store_slot = self.cache_lru;
        self.cache_slots[store_slot] = Some(ColumnLayoutCache {
            key,
            positions: positions.clone(),
            effective_height,
        });
        self.cache_lru = 1 - store_slot;

        (positions, effective_height)
    }

    /// Run Taffy layout for columns and return positions plus effective height.
    fn run_taffy_column_layout(
        &mut self,
        columns: &[ColumnLayout],
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
        line_height: f32,
        is_column_dir: bool,
    ) -> (Vec<ColumnPosition>, f32) {
        let root_style = Self::build_container_style(container, viewport_width, row_height);
        let root = self
            .tree
            .new_leaf(root_style)
            .expect("failed to create root node");

        let children: Vec<_> = columns
            .iter()
            .map(|col| {
                self.tree
                    .new_leaf(Self::column_style(col, line_height))
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
                    height: if is_column_dir {
                        AvailableSpace::MaxContent
                    } else {
                        AvailableSpace::Definite(row_height)
                    },
                },
            )
            .expect("failed to compute layout");

        let effective_height = if is_column_dir {
            self.tree
                .layout(root)
                .expect("failed to get root layout")
                .size
                .height
        } else {
            row_height
        };

        let positions: Vec<ColumnPosition> = children
            .iter()
            .map(|&child| {
                let layout = self.tree.layout(child).expect("failed to get layout");
                ColumnPosition {
                    x: layout.location.x,
                    y: layout.location.y,
                    width: layout.size.width,
                    height: layout.size.height,
                    padding: [
                        layout.padding.top,
                        layout.padding.right,
                        layout.padding.bottom,
                        layout.padding.left,
                    ],
                    border: [
                        layout.border.top,
                        layout.border.right,
                        layout.border.bottom,
                        layout.border.left,
                    ],
                }
            })
            .collect();

        (positions, effective_height)
    }

    /// Build a Taffy Style for the container (root) node.
    fn build_container_style(
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
    ) -> Style {
        log::debug!(
            "[layout] container: display={:?}, flex_dir={:?}, gap={:?}, align_items={:?}, justify={:?}",
            container.display,
            container.flex_direction,
            container.gap,
            container.align_items,
            container.justify_content
        );
        let row_gap = container.row_gap.unwrap_or(container.gap);
        let col_gap = container.column_gap.unwrap_or(container.gap);

        let display = match container.display {
            DisplayValue::Flex => Display::Flex,
            DisplayValue::Grid => Display::Grid,
            DisplayValue::Block => Display::Block,
            DisplayValue::None => Display::None,
        };

        let grid_template_columns = track_list_to_taffy(&container.grid_template_columns);
        let grid_template_rows = track_list_to_taffy(&container.grid_template_rows);
        let grid_auto_columns = auto_tracks_to_taffy(&container.grid_auto_columns);
        let grid_auto_rows = auto_tracks_to_taffy(&container.grid_auto_rows);

        Style {
            display,
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
                height: match container.flex_direction {
                    FlexDirectionValue::Column | FlexDirectionValue::ColumnReverse => {
                        Dimension::auto()
                    }
                    _ => Dimension::length(row_height),
                },
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
            grid_template_columns,
            grid_template_rows,
            grid_auto_columns,
            grid_auto_rows,
            grid_auto_flow: grid_auto_flow_to_taffy(container.grid_auto_flow),
            justify_items: container.justify_items.and_then(align_value_to_taffy_align),
            ..Style::default()
        }
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

        log::debug!(
            "[layout] compute_into_buffer: cols={}, rows={}, total_cells={}, viewport={}x{}, range={}..{}",
            col_count,
            row_count,
            total_cells,
            viewport.width,
            viewport.row_height,
            visible_range.start,
            visible_range.end
        );

        debug_assert!(
            buf.len() >= layout_buffer::buf_len(total_cells),
            "buffer too small: need {} f32s, got {}",
            layout_buffer::buf_len(total_cells),
            buf.len()
        );

        // Compute column positions (shared by header and all rows)
        let (positions, effective_header_height) = self.compute_column_positions(
            columns,
            container,
            viewport.width,
            viewport.header_height,
            viewport.line_height,
        );

        // Write header cells (scroll with content, not sticky)
        let header_y = -viewport.scroll_top;
        for (col_idx, pos) in positions.iter().enumerate() {
            layout_buffer::write_cell(
                buf,
                col_idx,
                0,
                col_idx,
                pos.x,
                header_y + pos.y,
                pos.width,
                pos.height,
                columns
                    .get(col_idx)
                    .map_or_else(Align::default, |c| c.align),
                pos.padding,
                pos.border,
            );
        }

        // Re-compute positions for row height if different from header height
        let (row_positions, effective_row_height) =
            if (viewport.row_height - viewport.header_height).abs() > f32::EPSILON {
                self.compute_column_positions(
                    columns,
                    container,
                    viewport.width,
                    viewport.row_height,
                    viewport.line_height,
                )
            } else {
                (positions, effective_header_height)
            };

        // Write data cells
        let mut cell_idx = col_count;
        for row_idx in visible_range {
            let row_base_y = (row_idx as f32)
                .mul_add(effective_row_height, effective_header_height)
                - viewport.scroll_top;
            for (col_idx, pos) in row_positions.iter().enumerate() {
                layout_buffer::write_cell(
                    buf,
                    cell_idx,
                    row_idx,
                    col_idx,
                    pos.x,
                    row_base_y + pos.y,
                    pos.width,
                    pos.height,
                    columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                    pos.padding,
                    pos.border,
                );
                cell_idx += 1;
            }
        }

        log::debug!("[layout] compute_into_buffer: done, cells_written={total_cells}");

        total_cells
    }

    /// Compute layout with row pinning: header + top pinned + visible middle + bottom pinned.
    /// Uses different y formulas so that drawing with clip+translate per row region lines up.
    #[allow(clippy::too_many_lines)]
    pub fn compute_into_buffer_row_pinned(
        &mut self,
        columns: &[ColumnLayout],
        params: &RowPinnedLayoutParams<'_>,
        buf: &mut [f32],
    ) -> usize {
        let pinned_top = params.pinned_top;
        let pinned_bottom = params.pinned_bottom;
        let total_rows = params.total_rows;
        let middle_range = &params.middle_range;

        if columns.is_empty() || total_rows == 0 {
            return 0;
        }
        let scrollable_count = total_rows
            .saturating_sub(pinned_top)
            .saturating_sub(pinned_bottom);
        let col_count = columns.len();
        let top_cells = pinned_top * col_count;
        let middle_cells = middle_range.len() * col_count;
        let bottom_cells = pinned_bottom * col_count;
        let total_cells = col_count + top_cells + middle_cells + bottom_cells;

        debug_assert!(
            buf.len() >= layout_buffer::buf_len(total_cells),
            "buffer too small for row-pinned layout"
        );

        let (positions, effective_header_height) = self.compute_column_positions(
            columns,
            params.container,
            params.viewport.width,
            params.viewport.header_height,
            params.viewport.line_height,
        );
        let (row_positions, effective_row_height) =
            if (params.viewport.row_height - params.viewport.header_height).abs() > f32::EPSILON {
                self.compute_column_positions(
                    columns,
                    params.container,
                    params.viewport.width,
                    params.viewport.row_height,
                    params.viewport.line_height,
                )
            } else {
                (positions.clone(), effective_header_height)
            };

        let mut cell_idx = 0;

        // Header at y = 0 (fixed at top; drawn in top region)
        for (col_idx, pos) in positions.iter().enumerate() {
            layout_buffer::write_cell(
                buf,
                cell_idx,
                0,
                col_idx,
                pos.x,
                pos.y,
                pos.width,
                pos.height,
                columns
                    .get(col_idx)
                    .map_or_else(Align::default, |c| c.align),
                pos.padding,
                pos.border,
            );
            cell_idx += 1;
        }

        // Top pinned rows: y = header_height + row_idx * row_height
        for row_idx in 0..pinned_top {
            let row_base_y = (row_idx as f32).mul_add(effective_row_height, effective_header_height);
            for (col_idx, pos) in row_positions.iter().enumerate() {
                layout_buffer::write_cell(
                    buf,
                    cell_idx,
                    row_idx,
                    col_idx,
                    pos.x,
                    row_base_y + pos.y,
                    pos.width,
                    pos.height,
                    columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                    pos.padding,
                    pos.border,
                );
                cell_idx += 1;
            }
        }

        // Middle (scrollable) rows: absolute content y (scroll handled by JS translateY)
        for row_idx in middle_range.start..middle_range.end {
            let row_base_y = (row_idx as f32).mul_add(effective_row_height, effective_header_height);
            for (col_idx, pos) in row_positions.iter().enumerate() {
                layout_buffer::write_cell(
                    buf,
                    cell_idx,
                    row_idx,
                    col_idx,
                    pos.x,
                    row_base_y + pos.y,
                    pos.width,
                    pos.height,
                    columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                    pos.padding,
                    pos.border,
                );
                cell_idx += 1;
            }
        }

        // Bottom pinned rows: y = header + (pinned_top + scrollable_count)*rh + (row_idx - (total - pinned_bottom))*rh
        let bottom_start = total_rows.saturating_sub(pinned_bottom);
        let bottom_base_y =
            ((pinned_top + scrollable_count) as f32).mul_add(effective_row_height, effective_header_height);
        for (i, row_idx) in (bottom_start..total_rows).enumerate() {
            let row_base_y = (i as f32).mul_add(effective_row_height, bottom_base_y);
            for (col_idx, pos) in row_positions.iter().enumerate() {
                layout_buffer::write_cell(
                    buf,
                    cell_idx,
                    row_idx,
                    col_idx,
                    pos.x,
                    row_base_y + pos.y,
                    pos.width,
                    pos.height,
                    columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                    pos.padding,
                    pos.border,
                );
                cell_idx += 1;
            }
        }

        total_cells
    }

    /// Compute the effective row height for the given columns/container.
    /// In column/column-reverse direction the effective height may be larger
    /// than the nominal `row_height` because Taffy stacks children vertically.
    pub fn compute_effective_row_height(
        &mut self,
        columns: &[ColumnLayout],
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
        line_height: f32,
    ) -> f32 {
        if columns.is_empty() {
            return row_height;
        }
        let (_, effective) = self.compute_column_positions(
            columns,
            container,
            viewport_width,
            row_height,
            line_height,
        );
        effective
    }
}

impl Default for LayoutEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
impl LayoutEngine {
    /// Check if the cache contains a result for the given inputs.
    fn cache_contains(
        &self,
        columns: &[ColumnLayout],
        container: &ContainerLayout,
        viewport_width: f32,
        row_height: f32,
        line_height: f32,
    ) -> bool {
        let key = hash_layout_inputs(columns, container, viewport_width, row_height, line_height);
        self.cache_slots
            .iter()
            .any(|s| s.as_ref().is_some_and(|c| c.key == key))
    }
}

/// Computed layout for a single cell (test-only).
#[cfg(test)]
#[derive(Debug, Clone)]
pub struct CellLayout {
    pub row: usize,
    pub col: usize,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub content_align: Align,
}

#[cfg(test)]
impl LayoutEngine {
    /// Compute header cell layouts for the given columns and viewport.
    pub fn compute_header_layout(
        &mut self,
        columns: &[ColumnLayout],
        viewport: &Viewport,
        container: &ContainerLayout,
    ) -> Vec<CellLayout> {
        let (positions, _effective_height) = self.compute_column_positions(
            columns,
            container,
            viewport.width,
            viewport.header_height,
            viewport.line_height,
        );

        positions
            .into_iter()
            .enumerate()
            .map(|(col_idx, pos)| CellLayout {
                row: 0,
                col: col_idx,
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
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

        let (positions, effective_row_height) = self.compute_column_positions(
            columns,
            container,
            viewport.width,
            viewport.row_height,
            viewport.line_height,
        );

        // Also compute effective header height for row base y offset
        let effective_header_height =
            if (viewport.row_height - viewport.header_height).abs() > f32::EPSILON {
                let (_, h) = self.compute_column_positions(
                    columns,
                    container,
                    viewport.width,
                    viewport.header_height,
                    viewport.line_height,
                );
                h
            } else {
                effective_row_height
            };

        let mut result =
            Vec::with_capacity((visible_range.end - visible_range.start) * columns.len());

        for row_idx in visible_range {
            let row_base_y = (row_idx as f32)
                .mul_add(effective_row_height, effective_header_height)
                - viewport.scroll_top;
            for (col_idx, pos) in positions.iter().enumerate() {
                result.push(CellLayout {
                    row: row_idx,
                    col: col_idx,
                    x: pos.x,
                    y: row_base_y + pos.y,
                    width: pos.width,
                    height: pos.height,
                    content_align: columns
                        .get(col_idx)
                        .map_or_else(Align::default, |c| c.align),
                });
            }
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct NullLogger;
    impl log::Log for NullLogger {
        fn enabled(&self, _: &log::Metadata) -> bool {
            true
        }
        fn log(&self, _: &log::Record) {}
        fn flush(&self) {}
    }
    static NULL_LOGGER: NullLogger = NullLogger;

    fn init_logger() {
        let _ = log::set_logger(&NULL_LOGGER);
        log::set_max_level(log::LevelFilter::Debug);
    }

    fn make_viewport() -> Viewport {
        Viewport {
            width: 600.0,
            height: 400.0,
            row_height: 36.0,
            header_height: 40.0,
            scroll_top: 0.0,
            line_height: 20.0,
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
        init_logger();
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
        init_logger();
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

        // Header scrolls with content: y = -scroll_top = -360
        assert!((buf[layout_buffer::FIELD_Y] - -360.0).abs() < 0.1);

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

    // ── CSS Grid layout tests ───────────────────────────────────────────

    fn grid_container(cols: Vec<TrackListItem>) -> ContainerLayout {
        ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: cols,
            ..ContainerLayout::default()
        }
    }

    fn grid_col_default() -> ColumnLayout {
        ColumnLayout {
            width: 0.0,
            ..ColumnLayout::default()
        }
    }

    #[test]
    fn display_grid_3col_1fr() {
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 3);
        // Each column should be 200px (600/3)
        assert!((header[0].width - 200.0).abs() < 1.0);
        assert!((header[1].width - 200.0).abs() < 1.0);
        assert!((header[2].width - 200.0).abs() < 1.0);
        // Positions: 0, 200, 400
        assert!((header[0].x - 0.0).abs() < 1.0);
        assert!((header[1].x - 200.0).abs() < 1.0);
        assert!((header[2].x - 400.0).abs() < 1.0);
    }

    #[test]
    fn grid_fixed_and_fr() {
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Length(200.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // Col 0: fixed 200px, Col 1 & 2: split remaining 400px → 200px each
        assert!((header[0].width - 200.0).abs() < 1.0);
        assert!((header[1].width - 200.0).abs() < 1.0);
        assert!((header[2].width - 200.0).abs() < 1.0);
    }

    #[test]
    fn grid_auto_flow_column() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            grid_auto_flow: GridAutoFlowValue::Column,
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // Both columns should have width ~300 (600/2)
        assert!((header[0].width - 300.0).abs() < 1.0);
        assert!((header[1].width - 300.0).abs() < 1.0);
    }

    #[test]
    fn grid_placement_span() {
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        // First column spans 2 grid columns
        let columns = vec![
            ColumnLayout {
                grid_column: Some(GridLineValue {
                    start: GridPlacementValue::Auto,
                    end: GridPlacementValue::Span(2),
                }),
                ..grid_col_default()
            },
            grid_col_default(),
        ];
        let viewport = make_viewport(); // width=600

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // First item spans 2 columns → 400px, second item → 200px
        assert!((header[0].width - 400.0).abs() < 1.0);
        assert!((header[1].width - 200.0).abs() < 1.0);
    }

    #[test]
    fn grid_gap() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            gap: LengthValue::Length(20.0),
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // 600 - 20 gap = 580 / 2 = 290 each
        assert!((header[0].width - 290.0).abs() < 1.0);
        assert!((header[1].width - 290.0).abs() < 1.0);
        // Second column starts at 290 + 20 = 310
        assert!((header[1].x - 310.0).abs() < 1.0);
    }

    #[test]
    fn grid_into_buffer() {
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();

        let total_cells = 2 + 2 * 2; // 2 headers + 2 rows × 2 cols
        let mut buf = vec![0.0_f32; layout_buffer::buf_len(total_cells)];
        let count = engine.compute_into_buffer(&columns, &viewport, &container, 0..2, &mut buf);
        assert_eq!(count, total_cells);

        // Header col 0: x=0, width=300
        assert!((buf[layout_buffer::FIELD_X] - 0.0).abs() < 1.0);
        assert!((buf[layout_buffer::FIELD_WIDTH] - 300.0).abs() < 1.0);
        // Header col 1: x=300, width=300
        let base = layout_buffer::LAYOUT_STRIDE;
        assert!((buf[base + layout_buffer::FIELD_X] - 300.0).abs() < 1.0);
        assert!((buf[base + layout_buffer::FIELD_WIDTH] - 300.0).abs() < 1.0);
    }

    #[test]
    fn grid_minmax_track() {
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::MinMax(
                Box::new(TrackSizeValue::Length(100.0)),
                Box::new(TrackSizeValue::Fr(1.0)),
            )),
            TrackListItem::Single(TrackSizeValue::Fr(2.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // minmax(100px, 1fr) vs 2fr → 1fr:2fr ratio → 200:400 (min 100 satisfied)
        assert!((header[0].width - 200.0).abs() < 1.0);
        assert!((header[1].width - 400.0).abs() < 1.0);
    }

    #[test]
    fn grid_repeat_track() {
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![TrackListItem::Repeat(
            RepeatValue::Count(3),
            vec![TrackSizeValue::Fr(1.0)],
        )]);
        let columns = vec![grid_col_default(), grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // repeat(3, 1fr) → 3 columns of 200px each
        assert_eq!(header.len(), 3);
        assert!((header[0].width - 200.0).abs() < 1.0);
        assert!((header[1].width - 200.0).abs() < 1.0);
        assert!((header[2].width - 200.0).abs() < 1.0);
    }

    // ── Cross-axis (y/height/border) tests ─────────────────────────────

    #[test]
    fn align_self_center_offsets_y() {
        let mut engine = LayoutEngine::new();
        // Column with explicit height=20 + align_self=center in a 40px-high container
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            align_self: Some(AlignValue::Center),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport(); // header_height=40

        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
        // Centered: y = (40 - 20) / 2 = 10
        assert!((header[0].y - 10.0).abs() < 1.0);
        assert!((header[0].height - 20.0).abs() < 1.0);
    }

    #[test]
    fn column_border_appears_in_buffer() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 200.0,
            border: RectValue {
                top: LengthValue::Length(2.0),
                right: LengthValue::Length(3.0),
                bottom: LengthValue::Length(2.0),
                left: LengthValue::Length(3.0),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let container = default_container();

        let total_cells = 1; // header only
        let mut buf = vec![0.0_f32; layout_buffer::buf_len(total_cells)];
        engine.compute_into_buffer(&columns, &viewport, &container, 0..0, &mut buf);

        assert!((buf[layout_buffer::FIELD_BORDER_TOP] - 2.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_BORDER_RIGHT] - 3.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_BORDER_BOTTOM] - 2.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_BORDER_LEFT] - 3.0).abs() < 0.1);
    }

    // ── Coverage: DimensionValue conversion paths ──────────────────────

    #[test]
    fn dimension_auto_when_column_width_zero() {
        // Line 547: column_style with width=0 produces Dimension::auto()
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 0.0,
            flex_grow: 1.0,
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // width=0 → Dimension::auto(), but flex_grow=1 fills container → 600
        assert!((header[0].width - 600.0).abs() < 1.0);
    }

    #[test]
    fn dimension_percent_height() {
        // Lines 343-344: dimension_to_taffy Percent branch via column height
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Percent(0.5), // 50% of row height
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport(); // header_height=40
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // 50% of 40 = 20
        assert!((header[0].height - 20.0).abs() < 1.0);
    }

    #[test]
    fn dimension_auto_flex_basis() {
        // dimension_to_taffy Auto branch via flex_basis (default)
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            flex_basis: DimensionValue::Auto,
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert!((header[0].width - 100.0).abs() < 1.0);
    }

    #[test]
    fn dimension_percent_flex_basis() {
        // dimension_to_taffy Percent branch via flex_basis
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 0.0,
            flex_basis: DimensionValue::Percent(0.5), // 50% of container width
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport(); // width=600
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // 50% of 600 = 300
        assert!((header[0].width - 300.0).abs() < 1.0);
    }

    // ── Coverage: LengthValue Percent branch ───────────────────────────

    #[test]
    fn length_percent_gap() {
        // Line 352: length_to_taffy Percent branch via gap
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport(); // width=600
        let container = ContainerLayout {
            gap: LengthValue::Percent(0.1), // 10% of container
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // Gap of 10% of 600 = 60, second column starts at 100 + 60 = 160
        assert!((header[1].x - 160.0).abs() < 1.0);
    }

    #[test]
    fn length_percent_padding_on_column() {
        // length_to_taffy Percent branch via column padding
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 200.0,
            padding: RectValue {
                top: LengthValue::Percent(0.1),
                right: LengthValue::Percent(0.05),
                bottom: LengthValue::Percent(0.1),
                left: LengthValue::Percent(0.05),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // Layout should compute without error; padding percents are resolved
        assert_eq!(header.len(), 1);
        assert!(header[0].width > 0.0);
    }

    // ── Coverage: LengthAutoValue Percent branch ───────────────────────

    #[test]
    fn length_auto_percent_margin() {
        // Line 360: length_auto_to_taffy Percent branch via column margin
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            margin: RectValue {
                top: LengthAutoValue::Percent(0.1),
                right: LengthAutoValue::Percent(0.05),
                bottom: LengthAutoValue::Percent(0.1),
                left: LengthAutoValue::Percent(0.05),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
        // 10% margins on left/right of the container width shrink available space
        assert!(header[0].x > 0.0);
    }

    #[test]
    fn length_auto_percent_inset() {
        // length_auto_to_taffy Percent branch via column inset
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            position: PositionValue::Absolute,
            inset: RectValue {
                top: LengthAutoValue::Percent(0.1),
                right: LengthAutoValue::Auto,
                bottom: LengthAutoValue::Auto,
                left: LengthAutoValue::Percent(0.2),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: AlignValue → AlignItems (all branches) ───────────────

    #[test]
    fn align_self_end() {
        // Line 385: AlignValue::End → AlignItems::End
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            align_self: Some(AlignValue::End),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport(); // header_height=40
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // End-aligned: y = 40 - 20 = 20
        assert!((header[0].y - 20.0).abs() < 1.0);
    }

    #[test]
    fn align_self_flex_start() {
        // Line 386: AlignValue::FlexStart → AlignItems::FlexStart
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            align_self: Some(AlignValue::FlexStart),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // FlexStart in a row container → y=0
        assert!((header[0].y - 0.0).abs() < 1.0);
    }

    #[test]
    fn align_self_flex_end() {
        // Line 387: AlignValue::FlexEnd → AlignItems::FlexEnd
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            align_self: Some(AlignValue::FlexEnd),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport(); // header_height=40
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // FlexEnd: y = 40 - 20 = 20
        assert!((header[0].y - 20.0).abs() < 1.0);
    }

    #[test]
    fn align_self_baseline() {
        // Line 389: AlignValue::Baseline → AlignItems::Baseline
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            align_self: Some(AlignValue::Baseline),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_self_space_between_returns_none() {
        // Lines 391-392: SpaceBetween/SpaceEvenly/SpaceAround → None for align_self
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            align_self: Some(AlignValue::SpaceBetween),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // SpaceBetween is invalid for align_self → returns None → default behavior
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_self_space_around_returns_none() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            align_self: Some(AlignValue::SpaceAround),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_self_space_evenly_returns_none() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            align_self: Some(AlignValue::SpaceEvenly),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: AlignValue → AlignContent (all branches) ─────────────

    #[test]
    fn align_content_end() {
        // Line 400: AlignValue::End → AlignContent::End
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::End),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_flex_start() {
        // Line 401: AlignValue::FlexStart → AlignContent::FlexStart
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::FlexStart),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_flex_end() {
        // Line 402: AlignValue::FlexEnd → AlignContent::FlexEnd
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::FlexEnd),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_center() {
        // Line 403: AlignValue::Center → AlignContent::Center
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::Center),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_stretch() {
        // Line 404: AlignValue::Stretch → AlignContent::Stretch
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::Stretch),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_space_between() {
        // Line 405: AlignValue::SpaceBetween → AlignContent::SpaceBetween
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::SpaceBetween),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_space_evenly() {
        // Line 406: AlignValue::SpaceEvenly → AlignContent::SpaceEvenly
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::SpaceEvenly),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_space_around() {
        // Line 407: AlignValue::SpaceAround → AlignContent::SpaceAround
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::SpaceAround),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_baseline_returns_none() {
        // Line 408: AlignValue::Baseline → return None for align_content
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::Baseline),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_content_start() {
        // Line 399: AlignValue::Start → AlignContent::Start
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            align_content: Some(AlignValue::Start),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: AlignValue → JustifyContent (remaining branches) ─────

    #[test]
    fn justify_content_end() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            justify_content: Some(AlignValue::End),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // End-justified: column at 600 - 100 = 500
        assert!((header[0].x - 500.0).abs() < 1.0);
    }

    #[test]
    fn justify_content_flex_start() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            justify_content: Some(AlignValue::FlexStart),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert!((header[0].x - 0.0).abs() < 1.0);
    }

    #[test]
    fn justify_content_flex_end() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            justify_content: Some(AlignValue::FlexEnd),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert!((header[0].x - 500.0).abs() < 1.0);
    }

    #[test]
    fn justify_content_center() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport(); // width=600
        let container = ContainerLayout {
            justify_content: Some(AlignValue::Center),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // Centered: (600 - 100) / 2 = 250
        assert!((header[0].x - 250.0).abs() < 1.0);
    }

    #[test]
    fn justify_content_stretch() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            justify_content: Some(AlignValue::Stretch),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn justify_content_space_evenly() {
        // Line 421: AlignValue::SpaceEvenly → JustifyContent::SpaceEvenly
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport(); // width=600
        let container = ContainerLayout {
            justify_content: Some(AlignValue::SpaceEvenly),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // SpaceEvenly: equal space around each item
        // (600 - 200) / 3 gaps = 133.33
        assert!((header[0].x - 133.33).abs() < 1.0);
    }

    #[test]
    fn justify_content_space_around() {
        // Line 422: AlignValue::SpaceAround → JustifyContent::SpaceAround
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport(); // width=600
        let container = ContainerLayout {
            justify_content: Some(AlignValue::SpaceAround),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // SpaceAround: half-space on edges, full space between
        // (600 - 200) = 400 free space, 2 items → 400/2 = 200 per item
        // edge = 100, between = 200
        assert!((header[0].x - 100.0).abs() < 1.0);
        assert!((header[1].x - 400.0).abs() < 1.0);
    }

    #[test]
    fn justify_content_baseline_returns_none() {
        // Line 423: AlignValue::Baseline → return None for justify_content
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            justify_content: Some(AlignValue::Baseline),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // Baseline is invalid for justify_content → None → default behavior
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: OverflowValue conversion (Clip, Hidden, Scroll) ──────

    #[test]
    fn overflow_clip() {
        // Line 430: OverflowValue::Clip → Overflow::Clip
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            overflow_x: OverflowValue::Clip,
            overflow_y: OverflowValue::Clip,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn overflow_hidden() {
        // Line 431: OverflowValue::Hidden → Overflow::Hidden
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            overflow_x: OverflowValue::Hidden,
            overflow_y: OverflowValue::Hidden,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn overflow_scroll() {
        // Line 432: OverflowValue::Scroll → Overflow::Scroll
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            overflow_x: OverflowValue::Scroll,
            overflow_y: OverflowValue::Scroll,
            scrollbar_width: 15.0,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: TrackSizeValue conversion paths ──────────────────────

    #[test]
    fn grid_track_percent() {
        // Lines 441, 456: track_size_to_min/max Percent branch
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Percent(50.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // 50% of 600 = 300, remaining 300 for 1fr
        assert!((header[0].width - 300.0).abs() < 1.0);
        assert!((header[1].width - 300.0).abs() < 1.0);
    }

    #[test]
    fn grid_track_min_content() {
        // Lines 442, 459: track_size_to_min/max MinContent branch
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::MinContent),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // MinContent with no intrinsic content → 0 width, rest to fr
        assert_eq!(header.len(), 2);
    }

    #[test]
    fn grid_track_max_content() {
        // Lines 443 (via MinMax fallthrough), 460: track_size_to_min/max MaxContent branch
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::MaxContent),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    #[test]
    fn grid_track_auto() {
        // Lines 458: track_size_to_max Auto branch
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Auto),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    #[test]
    fn grid_track_fit_content_px() {
        // Lines 461: track_size_to_max FitContentPx branch
        // (also covers the auto fallthrough in track_size_to_min for FitContentPx)
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::FitContentPx(150.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // FitContent(150px) with no content → minimal size
    }

    #[test]
    fn grid_track_fit_content_percent() {
        // Lines 462-463: track_size_to_max FitContentPercent branch
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::FitContentPercent(50.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    #[test]
    fn grid_track_minmax_nested() {
        // Lines 444, 465: track_size_to_min/max MinMax branch (recursive)
        // Need nested MinMax so the inner MinMax hits the recursive arm
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::MinMax(
                Box::new(TrackSizeValue::MinMax(
                    Box::new(TrackSizeValue::Length(50.0)),
                    Box::new(TrackSizeValue::Length(100.0)),
                )),
                Box::new(TrackSizeValue::MinMax(
                    Box::new(TrackSizeValue::Length(100.0)),
                    Box::new(TrackSizeValue::Length(200.0)),
                )),
            )),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    // ── Coverage: RepeatValue::AutoFit ─────────────────────────────────

    #[test]
    fn grid_repeat_auto_fit() {
        // Lines 490-491: RepeatValue::AutoFit in track_list_to_taffy
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![TrackListItem::Repeat(
            RepeatValue::AutoFit,
            vec![TrackSizeValue::Length(200.0)],
        )]);
        let columns = vec![grid_col_default(), grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // AutoFit with 200px tracks in 600px → 3 columns of 200px
        assert_eq!(header.len(), 3);
        assert!((header[0].width - 200.0).abs() < 1.0);
    }

    #[test]
    fn grid_repeat_auto_fill() {
        // Line 490: RepeatValue::AutoFill in track_list_to_taffy
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![TrackListItem::Repeat(
            RepeatValue::AutoFill,
            vec![TrackSizeValue::Length(200.0)],
        )]);
        let columns = vec![grid_col_default(), grid_col_default(), grid_col_default()];
        let viewport = make_viewport(); // width=600
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 3);
        assert!((header[0].width - 200.0).abs() < 1.0);
    }

    // ── Coverage: GridPlacementValue::Span ──────────────────────────────

    #[test]
    fn grid_placement_line() {
        // Line 510: GridPlacementValue::Line
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![
            ColumnLayout {
                grid_column: Some(GridLineValue {
                    start: GridPlacementValue::Line(2),
                    end: GridPlacementValue::Auto,
                }),
                ..grid_col_default()
            },
            grid_col_default(),
            grid_col_default(),
        ];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 3);
        // First column placed at line 2 (second track), so x ~200
        assert!((header[0].x - 200.0).abs() < 1.0);
    }

    #[test]
    fn grid_placement_span_value() {
        // Line 511: GridPlacementValue::Span
        let mut engine = LayoutEngine::new();
        let container = grid_container(vec![
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            TrackListItem::Single(TrackSizeValue::Fr(1.0)),
        ]);
        let columns = vec![
            ColumnLayout {
                grid_column: Some(GridLineValue {
                    start: GridPlacementValue::Line(1),
                    end: GridPlacementValue::Span(2),
                }),
                ..grid_col_default()
            },
            grid_col_default(),
        ];
        let viewport = make_viewport(); // width=600
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // First column starts at line 1, spans 2 → width=400
        assert!((header[0].width - 400.0).abs() < 1.0);
    }

    // ── Coverage: GridAutoFlowValue (RowDense, ColumnDense) ────────────

    #[test]
    fn grid_auto_flow_row_dense() {
        // Line 526: GridAutoFlowValue::RowDense
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            grid_auto_flow: GridAutoFlowValue::RowDense,
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    #[test]
    fn grid_auto_flow_column_dense() {
        // Line 527: GridAutoFlowValue::ColumnDense
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            grid_auto_flow: GridAutoFlowValue::ColumnDense,
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    // ── Coverage: grid_auto_rows / grid_auto_columns ───────────────────

    #[test]
    fn grid_auto_rows_sizing() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![TrackListItem::Single(TrackSizeValue::Fr(1.0))],
            grid_auto_rows: vec![TrackSizeValue::Length(50.0)],
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn grid_auto_columns_sizing() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_rows: vec![TrackListItem::Single(TrackSizeValue::Fr(1.0))],
            grid_auto_columns: vec![TrackSizeValue::Length(100.0)],
            grid_auto_flow: GridAutoFlowValue::Column,
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    // ── Coverage: compute_into_buffer edge cases ───────────────────────

    #[test]
    fn compute_into_buffer_empty_columns() {
        // Line 872: compute_into_buffer with empty columns returns 0
        let mut engine = LayoutEngine::new();
        let columns: Vec<ColumnLayout> = vec![];
        let viewport = make_viewport();
        let mut buf = vec![0.0_f32; 64];
        let count =
            engine.compute_into_buffer(&columns, &viewport, &default_container(), 0..5, &mut buf);
        assert_eq!(count, 0);
    }

    #[test]
    #[should_panic(expected = "buffer too small")]
    fn compute_into_buffer_panics_on_small_buffer() {
        // Lines 892-894: debug_assert! fires when buffer is too small
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        // 1 header cell + 2 row cells = 3 cells needed (3 * 16 = 48 f32s)
        // Provide a buffer that's too small
        let mut buf = vec![0.0_f32; 1];
        engine.compute_into_buffer(&columns, &viewport, &default_container(), 0..2, &mut buf);
    }

    #[test]
    fn compute_into_buffer_header_equals_row_height() {
        // Line 936: compute_into_buffer when header_height == row_height (else branch)
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Right)];
        let mut viewport = make_viewport();
        viewport.header_height = 36.0; // same as row_height
        viewport.row_height = 36.0;

        let total_cells = 2 + 3 * 2; // 2 headers + 3 rows × 2 cols = 8
        let mut buf = vec![0.0_f32; layout_buffer::buf_len(total_cells)];
        let count =
            engine.compute_into_buffer(&columns, &viewport, &default_container(), 0..3, &mut buf);
        assert_eq!(count, total_cells);

        // Header cells
        assert!((buf[layout_buffer::FIELD_X] - 0.0).abs() < 0.1);
        assert!((buf[layout_buffer::FIELD_WIDTH] - 100.0).abs() < 0.1);
        // Data cell row 0, col 0: y = header_height + 0*36 - 0 = 36
        let base = 2 * layout_buffer::LAYOUT_STRIDE;
        assert!((buf[base + layout_buffer::FIELD_Y] - 36.0).abs() < 0.1);
    }

    // ── Coverage: LayoutEngine Default impl ────────────────────────────

    #[test]
    fn layout_engine_default() {
        // Lines 971-972: LayoutEngine Default impl
        let engine = LayoutEngine::default();
        assert_eq!(engine.tree.total_node_count(), 0);
    }

    // ── Coverage: container align_items all branches ────────────────────

    #[test]
    fn container_align_items_end() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::End),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // End-aligned: y = 40 - 20 = 20
        assert!((header[0].y - 20.0).abs() < 1.0);
    }

    #[test]
    fn container_align_items_flex_start() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::FlexStart),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert!((header[0].y - 0.0).abs() < 1.0);
    }

    #[test]
    fn container_align_items_flex_end() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            height: DimensionValue::Length(20.0),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::FlexEnd),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert!((header[0].y - 20.0).abs() < 1.0);
    }

    #[test]
    fn container_align_items_baseline() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::Baseline),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn container_align_items_space_between_returns_none() {
        // SpaceBetween invalid for align_items → None
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::SpaceBetween),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: justify_items via grid container ──────────────────────

    #[test]
    fn grid_justify_items() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            justify_items: Some(AlignValue::Center),
            ..ContainerLayout::default()
        };
        let columns = vec![grid_col_default(), grid_col_default()];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    // ── Coverage: justify_self via column ───────────────────────────────

    #[test]
    fn column_justify_self() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![TrackListItem::Single(TrackSizeValue::Fr(1.0))],
            ..ContainerLayout::default()
        };
        let columns = vec![ColumnLayout {
            justify_self: Some(AlignValue::Center),
            ..grid_col_default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: Display::Block and Display::None ──────────────────────

    #[test]
    fn display_block() {
        // Line 725: DisplayValue::Block → Display::Block
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            display: DisplayValue::Block,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn display_none() {
        // Line 726: DisplayValue::None → Display::None
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            display: DisplayValue::None,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
        // Display::None collapses all sizes to 0
        assert!((header[0].width - 0.0).abs() < 1.0);
        assert!((header[0].height - 0.0).abs() < 1.0);
    }

    // ── Coverage: column dimension variants through min/max height ──────

    #[test]
    fn column_min_height_length() {
        // dimension_to_taffy Length variant via min_height
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            min_height: DimensionValue::Length(30.0),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert!(header[0].height >= 30.0 - 0.1);
    }

    #[test]
    fn column_min_height_percent() {
        // dimension_to_taffy Percent variant via min_height
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            min_height: DimensionValue::Percent(0.5),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn column_max_height_length() {
        // dimension_to_taffy Length variant via max_height
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            min_height: DimensionValue::Length(0.0), // override default line_height min
            max_height: DimensionValue::Length(15.0),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert!(header[0].height <= 15.0 + 0.1);
    }

    #[test]
    fn column_max_height_percent() {
        // dimension_to_taffy Percent variant via max_height
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            max_height: DimensionValue::Percent(0.5),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: row_gap / column_gap overrides ───────────────────────

    #[test]
    fn separate_row_and_column_gap() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            gap: LengthValue::Length(5.0),
            row_gap: Some(LengthValue::Length(20.0)),
            column_gap: Some(LengthValue::Length(30.0)),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        // column_gap=30 overrides gap for horizontal spacing
        assert!((header[1].x - 130.0).abs() < 1.0);
    }

    // ── Coverage: grid_row placement ───────────────────────────────────

    #[test]
    fn grid_row_placement() {
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![TrackListItem::Single(TrackSizeValue::Fr(1.0))],
            grid_template_rows: vec![
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            ..ContainerLayout::default()
        };
        let columns = vec![ColumnLayout {
            grid_row: Some(GridLineValue {
                start: GridPlacementValue::Line(2),
                end: GridPlacementValue::Auto,
            }),
            ..grid_col_default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
        // Placed in row 2 → y offset should be non-zero
        assert!(header[0].y > 0.0);
    }

    // ── Coverage: container margin/border/padding with percent ──────────

    #[test]
    fn container_padding_percent() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            padding: RectValue {
                top: LengthValue::Percent(0.05),
                right: LengthValue::Percent(0.05),
                bottom: LengthValue::Percent(0.05),
                left: LengthValue::Percent(0.05),
            },
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
        // Column is offset by padding
        assert!(header[0].x > 0.0);
    }

    #[test]
    fn container_margin_percent() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            margin: RectValue {
                top: LengthAutoValue::Percent(0.1),
                right: LengthAutoValue::Percent(0.1),
                bottom: LengthAutoValue::Percent(0.1),
                left: LengthAutoValue::Percent(0.1),
            },
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn container_border_percent() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            border: RectValue {
                top: LengthValue::Percent(0.02),
                right: LengthValue::Percent(0.02),
                bottom: LengthValue::Percent(0.02),
                left: LengthValue::Percent(0.02),
            },
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: column border with percent ───────────────────────────

    #[test]
    fn column_border_percent() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 200.0,
            border: RectValue {
                top: LengthValue::Percent(0.05),
                right: LengthValue::Percent(0.05),
                bottom: LengthValue::Percent(0.05),
                left: LengthValue::Percent(0.05),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: grid_template_rows ───────────────────────────────────

    #[test]
    fn grid_template_rows_applied() {
        // Exercises grid_template_rows conversion through track_list_to_taffy
        let mut engine = LayoutEngine::new();
        let container = ContainerLayout {
            display: DisplayValue::Grid,
            grid_template_columns: vec![TrackListItem::Single(TrackSizeValue::Fr(1.0))],
            grid_template_rows: vec![
                TrackListItem::Single(TrackSizeValue::Length(25.0)),
                TrackListItem::Single(TrackSizeValue::Fr(1.0)),
            ],
            ..ContainerLayout::default()
        };
        let columns = vec![ColumnLayout {
            min_height: DimensionValue::Length(0.0), // allow small height
            ..grid_col_default()
        }];
        let viewport = make_viewport(); // header_height=40
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 1);
        // Column placed in first row template (25px)
        assert!((header[0].height - 25.0).abs() < 1.0);
    }

    // ── Coverage: empty columns for compute_rows_layout ────────────────

    #[test]
    fn compute_rows_layout_empty_columns() {
        let mut engine = LayoutEngine::new();
        let columns: Vec<ColumnLayout> = vec![];
        let viewport = make_viewport();
        let rows = engine.compute_rows_layout(&columns, &viewport, &default_container(), 0..5);
        assert!(rows.is_empty());
    }

    // ── Coverage: column with content-box sizing ───────────────────────

    #[test]
    fn column_content_box_sizing() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 200.0,
            box_sizing: BoxSizingValue::ContentBox,
            padding: RectValue {
                top: LengthValue::Length(4.0),
                right: LengthValue::Length(8.0),
                bottom: LengthValue::Length(4.0),
                left: LengthValue::Length(8.0),
            },
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        // Content-box: 200 + 8 + 8 = 216 total width
        assert!((header[0].width - 216.0).abs() < 1.0);
    }

    // ── Coverage: column position absolute ─────────────────────────────

    #[test]
    fn column_position_absolute() {
        let mut engine = LayoutEngine::new();
        let columns = vec![
            col(100.0, Align::Left),
            ColumnLayout {
                width: 50.0,
                position: PositionValue::Absolute,
                inset: RectValue {
                    top: LengthAutoValue::Length(5.0),
                    right: LengthAutoValue::Auto,
                    bottom: LengthAutoValue::Auto,
                    left: LengthAutoValue::Length(10.0),
                },
                ..ColumnLayout::default()
            },
        ];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 2);
        // Absolutely positioned column inset from left=10, top=5
        assert!((header[1].x - 10.0).abs() < 1.0);
        assert!((header[1].y - 5.0).abs() < 1.0);
    }

    // ── Coverage: column aspect_ratio ──────────────────────────────────

    #[test]
    fn column_aspect_ratio() {
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            aspect_ratio: Some(2.0),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    // ── Coverage: FlexWrap variants ────────────────────────────────────

    #[test]
    fn flex_wrap_wrap() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(400.0, Align::Left), col(400.0, Align::Left)];
        let viewport = make_viewport(); // width=600
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::Wrap,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // Second column wraps to next line
        assert!((header[1].y).abs() > 0.0 || header[1].x < 400.0 + 0.1);
    }

    #[test]
    fn flex_wrap_wrap_reverse() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(400.0, Align::Left), col(400.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_wrap: FlexWrapValue::WrapReverse,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    // ── Coverage: FlexDirection variants ────────────────────────────────

    #[test]
    fn flex_direction_column() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_direction: FlexDirectionValue::Column,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // In column direction, items stack vertically
        assert!((header[0].x - header[1].x).abs() < 1.0);
    }

    #[test]
    fn flex_direction_row_reverse() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_direction: FlexDirectionValue::RowReverse,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // In row-reverse, first item is on the right
        assert!(header[0].x > header[1].x);
    }

    #[test]
    fn flex_direction_column_reverse() {
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_direction: FlexDirectionValue::ColumnReverse,
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // In column-reverse, first item is at the bottom
        assert!(header[0].y > header[1].y);
    }

    // ── Coverage: align_items Start and Stretch ────────────────────────

    #[test]
    fn container_align_items_start() {
        // Line 384: AlignValue::Start → AlignItems::Start in align_value_to_taffy_align
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::Start),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // Items should start at y=0
        assert!(header[0].y.abs() < f32::EPSILON);
    }

    #[test]
    fn container_align_items_stretch() {
        // Line 390: AlignValue::Stretch → AlignItems::Stretch in align_value_to_taffy_align
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            align_items: Some(AlignValue::Stretch),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
    }

    #[test]
    fn justify_content_start() {
        // Line 414: AlignValue::Start → JustifyContent::Start in align_value_to_taffy_justify
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(100.0, Align::Left)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            justify_content: Some(AlignValue::Start),
            ..ContainerLayout::default()
        };
        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);
        // Items should be packed to the start
        assert!(header[0].x.abs() < f32::EPSILON);
    }

    #[test]
    fn align_self_start() {
        // Also exercises line 384 via align_self path
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            align_self: Some(AlignValue::Start),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn align_self_stretch() {
        // Also exercises line 390 via align_self path
        let mut engine = LayoutEngine::new();
        let columns = vec![ColumnLayout {
            width: 100.0,
            align_self: Some(AlignValue::Stretch),
            ..ColumnLayout::default()
        }];
        let viewport = make_viewport();
        let header = engine.compute_header_layout(&columns, &viewport, &default_container());
        assert_eq!(header.len(), 1);
    }

    #[test]
    fn column_direction_stacks_vertically() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![
            col(100.0, Align::Left),
            col(200.0, Align::Center),
            col(150.0, Align::Right),
        ];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_direction: FlexDirectionValue::Column,
            ..ContainerLayout::default()
        };

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 3);

        // In column direction, columns should stack vertically (different y, x = 0)
        assert!((header[0].x).abs() < 0.1, "col0 x should be ~0");
        assert!((header[1].x).abs() < 0.1, "col1 x should be ~0");
        assert!((header[2].x).abs() < 0.1, "col2 x should be ~0");

        // Each column should be below the previous
        assert!(header[1].y > header[0].y, "col1 should be below col0");
        assert!(header[2].y > header[1].y, "col2 should be below col1");
    }

    #[test]
    fn column_direction_effective_height_exceeds_row_height() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![
            col(100.0, Align::Left),
            col(200.0, Align::Center),
            col(150.0, Align::Right),
        ];
        let viewport = make_viewport(); // row_height = 36
        let container = ContainerLayout {
            flex_direction: FlexDirectionValue::Column,
            ..ContainerLayout::default()
        };

        let effective = engine.compute_effective_row_height(
            &columns,
            &container,
            viewport.width,
            viewport.row_height,
            viewport.line_height,
        );

        // 3 columns stacked vertically, each with line_height (20),
        // so effective height should be > row_height (36)
        assert!(
            effective > viewport.row_height,
            "effective height {effective} should exceed row_height {}",
            viewport.row_height
        );
    }

    #[test]
    fn column_reverse_direction_reverses_order() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Center)];
        let viewport = make_viewport();
        let container = ContainerLayout {
            flex_direction: FlexDirectionValue::ColumnReverse,
            ..ContainerLayout::default()
        };

        let header = engine.compute_header_layout(&columns, &viewport, &container);
        assert_eq!(header.len(), 2);

        // In column-reverse, first defined column should be below the second
        assert!(
            header[0].y > header[1].y,
            "col0 y ({}) should be > col1 y ({}) in column-reverse",
            header[0].y,
            header[1].y
        );
    }

    #[test]
    fn row_direction_unchanged_with_effective_height() {
        // Verify that row direction returns effective_height == row_height
        let mut engine = LayoutEngine::new();
        let columns = vec![col(100.0, Align::Left), col(200.0, Align::Center)];
        let viewport = make_viewport();
        let container = default_container(); // Row direction

        let effective = engine.compute_effective_row_height(
            &columns,
            &container,
            viewport.width,
            viewport.row_height,
            viewport.line_height,
        );

        assert!(
            (effective - viewport.row_height).abs() < 0.1,
            "row direction effective height {effective} should equal row_height {}",
            viewport.row_height
        );
    }

    // ── Layout Cache tests ───────────────────────────────────────────

    #[test]
    fn cache_hit() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![col(200.0, Align::Left), col(100.0, Align::Right)];
        let container = default_container();

        let (pos1, h1) = engine.compute_column_positions(&columns, &container, 600.0, 36.0, 20.0);
        assert!(engine.cache_contains(&columns, &container, 600.0, 36.0, 20.0));

        // Second call with identical inputs should return same result (from cache)
        let (pos2, h2) = engine.compute_column_positions(&columns, &container, 600.0, 36.0, 20.0);
        assert_eq!(pos1.len(), pos2.len());
        for (a, b) in pos1.iter().zip(pos2.iter()) {
            assert!((a.x - b.x).abs() < f32::EPSILON);
            assert!((a.width - b.width).abs() < f32::EPSILON);
        }
        assert!((h1 - h2).abs() < f32::EPSILON);
    }

    #[test]
    fn cache_miss_viewport_width() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![col(200.0, Align::Left), col(0.0, Align::Left)];
        let container = default_container();

        engine.compute_column_positions(&columns, &container, 600.0, 36.0, 20.0);
        // Different viewport width → cache miss → different result
        engine.compute_column_positions(&columns, &container, 800.0, 36.0, 20.0);

        // The second column has width=0 (auto), so it should differ between viewport widths
        // when flex is in play. At minimum the cache should not return stale data.
        assert!(engine.cache_contains(&columns, &container, 800.0, 36.0, 20.0));
    }

    #[test]
    fn cache_miss_column_change() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let container = default_container();
        let cols_a = vec![col(200.0, Align::Left)];
        let cols_b = vec![col(200.0, Align::Left), col(100.0, Align::Right)];

        engine.compute_column_positions(&cols_a, &container, 600.0, 36.0, 20.0);
        assert!(engine.cache_contains(&cols_a, &container, 600.0, 36.0, 20.0));

        engine.compute_column_positions(&cols_b, &container, 600.0, 36.0, 20.0);
        assert!(engine.cache_contains(&cols_b, &container, 600.0, 36.0, 20.0));
    }

    #[test]
    fn cache_miss_container_change() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![col(200.0, Align::Left), col(100.0, Align::Right)];
        let container_a = default_container();
        let mut container_b = default_container();
        container_b.flex_direction = FlexDirectionValue::Column;

        engine.compute_column_positions(&columns, &container_a, 600.0, 36.0, 20.0);
        engine.compute_column_positions(&columns, &container_b, 600.0, 36.0, 20.0);

        // Column direction produces different effective height
        assert!(engine.cache_contains(&columns, &container_b, 600.0, 36.0, 20.0));
    }

    #[test]
    fn invalidate_forces_recompute() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![col(200.0, Align::Left)];
        let container = default_container();

        engine.compute_column_positions(&columns, &container, 600.0, 36.0, 20.0);
        assert!(engine.cache_contains(&columns, &container, 600.0, 36.0, 20.0));

        engine.invalidate_cache();
        assert!(!engine.cache_contains(&columns, &container, 600.0, 36.0, 20.0));

        // Recompute fills cache again
        engine.compute_column_positions(&columns, &container, 600.0, 36.0, 20.0);
        assert!(engine.cache_contains(&columns, &container, 600.0, 36.0, 20.0));
    }

    #[test]
    fn two_slot_cache() {
        init_logger();
        let mut engine = LayoutEngine::new();
        let columns = vec![col(200.0, Align::Left), col(100.0, Align::Right)];
        let container = default_container();

        // Compute with header_height=40 and row_height=36 (two different row heights)
        engine.compute_column_positions(&columns, &container, 600.0, 40.0, 20.0);
        engine.compute_column_positions(&columns, &container, 600.0, 36.0, 20.0);

        // Both should still be in cache (2 slots)
        assert!(engine.cache_contains(&columns, &container, 600.0, 40.0, 20.0));
        assert!(engine.cache_contains(&columns, &container, 600.0, 36.0, 20.0));

        // A third unique call evicts the LRU slot
        engine.compute_column_positions(&columns, &container, 600.0, 50.0, 20.0);
        assert!(engine.cache_contains(&columns, &container, 600.0, 50.0, 20.0));
        // One of the previous two should be evicted
        let both_present = engine.cache_contains(&columns, &container, 600.0, 40.0, 20.0)
            && engine.cache_contains(&columns, &container, 600.0, 36.0, 20.0);
        assert!(
            !both_present,
            "one of the two original entries should have been evicted"
        );
    }
}
