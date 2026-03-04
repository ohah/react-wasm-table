/// Conversion helpers: JS bridge types → core layout types.
use crate::types::{
    JsColumnLayout, JsContainerLayout, JsDimension, JsFilterValue, JsGridLine, JsGridPlacement,
    JsGridTrackList, JsGridTrackSize, JsRect,
};
use react_wasm_table_core::layout::{
    Align, AlignValue, BoxSizingValue, ColumnLayout, ContainerLayout, DimensionValue, DisplayValue,
    FlexDirectionValue, FlexWrapValue, GridAutoFlowValue, GridLineValue, GridPlacementValue,
    LengthAutoValue, LengthValue, OverflowValue, PositionValue, RectValue, RepeatValue,
    TrackListItem, TrackSizeValue,
};
use react_wasm_table_core::types::FilterValue;

pub fn convert_filter_value(v: &JsFilterValue) -> FilterValue {
    match v {
        JsFilterValue::Bool(b) => FilterValue::Bool(*b),
        JsFilterValue::Float64(f) => FilterValue::Float64(*f),
        JsFilterValue::String(s) => FilterValue::String(s.clone()),
    }
}

pub fn parse_dimension(d: Option<&JsDimension>) -> DimensionValue {
    match d {
        None => DimensionValue::Auto,
        Some(JsDimension::Number(v)) => DimensionValue::Length(*v),
        Some(JsDimension::Str(s)) => {
            if s == "auto" {
                DimensionValue::Auto
            } else if let Some(pct) = s.strip_suffix('%') {
                pct.parse::<f32>()
                    .map_or(DimensionValue::Auto, |v| DimensionValue::Percent(v / 100.0))
            } else {
                s.parse::<f32>()
                    .map_or(DimensionValue::Auto, DimensionValue::Length)
            }
        }
    }
}

pub fn parse_length(d: Option<&JsDimension>) -> LengthValue {
    match d {
        None => LengthValue::Zero,
        Some(JsDimension::Number(v)) => LengthValue::Length(*v),
        Some(JsDimension::Str(s)) => s.strip_suffix('%').map_or_else(
            || {
                s.parse::<f32>()
                    .map_or(LengthValue::Zero, LengthValue::Length)
            },
            |pct| {
                pct.parse::<f32>()
                    .map_or(LengthValue::Zero, |v| LengthValue::Percent(v / 100.0))
            },
        ),
    }
}

fn parse_length_auto(d: Option<&JsDimension>) -> LengthAutoValue {
    match d {
        None => LengthAutoValue::Auto,
        Some(JsDimension::Number(v)) => LengthAutoValue::Length(*v),
        Some(JsDimension::Str(s)) => {
            if s == "auto" {
                LengthAutoValue::Auto
            } else if let Some(pct) = s.strip_suffix('%') {
                pct.parse::<f32>().map_or(LengthAutoValue::Auto, |v| {
                    LengthAutoValue::Percent(v / 100.0)
                })
            } else {
                s.parse::<f32>()
                    .map_or(LengthAutoValue::Auto, LengthAutoValue::Length)
            }
        }
    }
}

fn parse_length_rect(r: Option<&JsRect>) -> RectValue<LengthValue> {
    r.map_or_else(RectValue::default, |r| RectValue {
        top: parse_length(r.top.as_ref()),
        right: parse_length(r.right.as_ref()),
        bottom: parse_length(r.bottom.as_ref()),
        left: parse_length(r.left.as_ref()),
    })
}

fn parse_length_auto_rect(r: Option<&JsRect>) -> RectValue<LengthAutoValue> {
    r.map_or_else(RectValue::zero_auto, |r| RectValue {
        top: parse_length_auto(r.top.as_ref()),
        right: parse_length_auto(r.right.as_ref()),
        bottom: parse_length_auto(r.bottom.as_ref()),
        left: parse_length_auto(r.left.as_ref()),
    })
}

#[allow(clippy::single_option_map)]
pub fn parse_align_value(s: Option<&String>) -> Option<AlignValue> {
    s.map(|v| match v.as_str() {
        "end" => AlignValue::End,
        "flex-start" => AlignValue::FlexStart,
        "flex-end" => AlignValue::FlexEnd,
        "center" => AlignValue::Center,
        "baseline" => AlignValue::Baseline,
        "stretch" => AlignValue::Stretch,
        "space-between" => AlignValue::SpaceBetween,
        "space-evenly" => AlignValue::SpaceEvenly,
        "space-around" => AlignValue::SpaceAround,
        _ => AlignValue::Start,
    })
}

/// Decode numeric align value from f32 (for composite layout).
/// 0=start, 1=end, 2=center, 3=stretch, NaN=none.
pub fn decode_align(v: f32) -> Option<AlignValue> {
    if v.is_nan() {
        return None;
    }
    Some(match v as u32 {
        1 => AlignValue::End,
        2 => AlignValue::Center,
        3 => AlignValue::Stretch,
        _ => AlignValue::Start,
    })
}

/// Decode numeric justify value from f32 (for composite layout).
/// 0=start, 1=end, 2=center, 3=space-between, NaN=none.
pub fn decode_justify(v: f32) -> Option<AlignValue> {
    if v.is_nan() {
        return None;
    }
    Some(match v as u32 {
        1 => AlignValue::End,
        2 => AlignValue::Center,
        3 => AlignValue::SpaceBetween,
        _ => AlignValue::Start,
    })
}

fn parse_grid_track_size(v: &JsGridTrackSize) -> TrackSizeValue {
    match v {
        JsGridTrackSize::Number(n) => TrackSizeValue::Length(*n),
        JsGridTrackSize::Str(s) => {
            let s = s.trim();
            if s == "auto" {
                TrackSizeValue::Auto
            } else if s == "min-content" {
                TrackSizeValue::MinContent
            } else if s == "max-content" {
                TrackSizeValue::MaxContent
            } else if let Some(fr) = s.strip_suffix("fr") {
                fr.trim()
                    .parse::<f32>()
                    .map_or(TrackSizeValue::Auto, TrackSizeValue::Fr)
            } else if let Some(pct) = s.strip_suffix('%') {
                pct.trim()
                    .parse::<f32>()
                    .map_or(TrackSizeValue::Auto, TrackSizeValue::Percent)
            } else if s.starts_with("minmax(") && s.ends_with(')') {
                let inner = &s[7..s.len() - 1];
                if let Some((min_s, max_s)) = inner.split_once(',') {
                    let min =
                        parse_grid_track_size(&JsGridTrackSize::Str(min_s.trim().to_string()));
                    let max =
                        parse_grid_track_size(&JsGridTrackSize::Str(max_s.trim().to_string()));
                    TrackSizeValue::MinMax(Box::new(min), Box::new(max))
                } else {
                    TrackSizeValue::Auto
                }
            } else if s.starts_with("fit-content(") && s.ends_with(')') {
                let inner = &s[12..s.len() - 1];
                inner.strip_suffix('%').map_or_else(
                    || {
                        inner
                            .trim()
                            .strip_suffix("px")
                            .unwrap_or_else(|| inner.trim())
                            .parse::<f32>()
                            .map_or(TrackSizeValue::Auto, TrackSizeValue::FitContentPx)
                    },
                    |pct| {
                        pct.trim()
                            .parse::<f32>()
                            .map_or(TrackSizeValue::Auto, TrackSizeValue::FitContentPercent)
                    },
                )
            } else {
                // Try parsing as px value (strip optional "px" suffix)
                s.strip_suffix("px")
                    .unwrap_or(s)
                    .parse::<f32>()
                    .map_or(TrackSizeValue::Auto, TrackSizeValue::Length)
            }
        }
    }
}

fn parse_grid_track_list_item(s: &str) -> TrackListItem {
    let s = s.trim();
    if s.starts_with("repeat(") && s.ends_with(')') {
        let inner = &s[7..s.len() - 1];
        if let Some((count_s, tracks_s)) = inner.split_once(',') {
            let count = match count_s.trim() {
                "auto-fill" => RepeatValue::AutoFill,
                "auto-fit" => RepeatValue::AutoFit,
                n => n
                    .parse::<u16>()
                    .map_or(RepeatValue::Count(1), RepeatValue::Count),
            };
            let tracks: Vec<TrackSizeValue> = tracks_s
                .split_whitespace()
                .map(|t| parse_grid_track_size(&JsGridTrackSize::Str(t.to_string())))
                .collect();
            TrackListItem::Repeat(count, tracks)
        } else {
            TrackListItem::Single(TrackSizeValue::Auto)
        }
    } else {
        TrackListItem::Single(parse_grid_track_size(&JsGridTrackSize::Str(s.to_string())))
    }
}

pub fn parse_grid_track_list(v: Option<&JsGridTrackList>) -> Vec<TrackListItem> {
    match v {
        None => Vec::new(),
        Some(JsGridTrackList::Single(t)) => {
            // A single string might contain space-separated values like "1fr 1fr 1fr"
            // or a repeat() function
            if let JsGridTrackSize::Str(s) = t {
                let s = s.trim();
                if s.contains(' ') {
                    // Space-separated track list — parse each token
                    // parse_space_separated_tracks handles parenthesized expressions
                    // (e.g. "minmax(100px, 1fr) 2fr 1fr") via paren-depth tracking.
                    return parse_space_separated_tracks(s);
                }
            }
            vec![TrackListItem::Single(parse_grid_track_size(t))]
        }
        Some(JsGridTrackList::Array(arr)) => arr
            .iter()
            .map(|t| {
                if let JsGridTrackSize::Str(s) = t {
                    let s = s.trim();
                    if s.starts_with("repeat(") {
                        return parse_grid_track_list_item(s);
                    }
                }
                TrackListItem::Single(parse_grid_track_size(t))
            })
            .collect(),
    }
}

fn parse_space_separated_tracks(s: &str) -> Vec<TrackListItem> {
    let mut items = Vec::new();
    let mut current = String::new();
    let mut paren_depth: u32 = 0;

    for ch in s.chars() {
        match ch {
            '(' => {
                paren_depth += 1;
                current.push(ch);
            }
            ')' => {
                paren_depth = paren_depth.saturating_sub(1);
                current.push(ch);
            }
            ' ' | '\t' if paren_depth == 0 => {
                let trimmed = current.trim().to_string();
                if !trimmed.is_empty() {
                    items.push(parse_grid_track_list_item(&trimmed));
                }
                current.clear();
            }
            _ => current.push(ch),
        }
    }
    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        items.push(parse_grid_track_list_item(&trimmed));
    }
    items
}

pub fn parse_auto_tracks(v: Option<&JsGridTrackList>) -> Vec<TrackSizeValue> {
    match v {
        None => Vec::new(),
        Some(JsGridTrackList::Single(t)) => vec![parse_grid_track_size(t)],
        Some(JsGridTrackList::Array(arr)) => arr.iter().map(parse_grid_track_size).collect(),
    }
}

fn parse_grid_placement(v: &JsGridPlacement) -> GridPlacementValue {
    match v {
        JsGridPlacement::Number(n) => GridPlacementValue::Line(*n),
        JsGridPlacement::Str(s) => {
            let s = s.trim();
            if s == "auto" {
                GridPlacementValue::Auto
            } else if let Some(span_s) = s.strip_prefix("span ") {
                span_s
                    .trim()
                    .parse::<u16>()
                    .map_or(GridPlacementValue::Auto, GridPlacementValue::Span)
            } else {
                s.parse::<i16>()
                    .map_or(GridPlacementValue::Auto, GridPlacementValue::Line)
            }
        }
    }
}

fn parse_grid_line(v: Option<&JsGridLine>) -> Option<GridLineValue> {
    match v {
        None => None,
        Some(JsGridLine::Single(p)) => Some(GridLineValue {
            start: parse_grid_placement(p),
            end: GridPlacementValue::Auto,
        }),
        Some(JsGridLine::Pair(arr)) => {
            let start = arr
                .first()
                .map_or(GridPlacementValue::Auto, parse_grid_placement);
            let end = arr
                .get(1)
                .map_or(GridPlacementValue::Auto, parse_grid_placement);
            Some(GridLineValue { start, end })
        }
    }
}

pub fn convert_column(c: &JsColumnLayout) -> ColumnLayout {
    ColumnLayout {
        width: c.width,
        flex_grow: c.flex_grow,
        flex_shrink: c.flex_shrink,
        min_width: c.min_width,
        max_width: c.max_width,
        align: match c.align.as_deref() {
            Some("center") => Align::Center,
            Some("right") => Align::Right,
            _ => Align::Left,
        },
        flex_basis: parse_dimension(c.flex_basis.as_ref()),
        height: parse_dimension(c.height.as_ref()),
        min_height: parse_dimension(c.min_height.as_ref()),
        max_height: parse_dimension(c.max_height.as_ref()),
        align_self: parse_align_value(c.align_self.as_ref()),
        padding: parse_length_rect(c.padding.as_ref()),
        margin: parse_length_auto_rect(c.margin.as_ref()),
        border: parse_length_rect(c.border.as_ref()),
        box_sizing: match c.box_sizing.as_deref() {
            Some("content-box") => BoxSizingValue::ContentBox,
            _ => BoxSizingValue::BorderBox,
        },
        aspect_ratio: c.aspect_ratio,
        position: match c.position.as_deref() {
            Some("absolute") => PositionValue::Absolute,
            _ => PositionValue::Relative,
        },
        inset: parse_length_auto_rect(c.inset.as_ref()),
        grid_row: parse_grid_line(c.grid_row.as_ref()),
        grid_column: parse_grid_line(c.grid_column.as_ref()),
        justify_self: parse_align_value(c.justify_self.as_ref()),
    }
}

pub fn convert_container(c: &JsContainerLayout) -> ContainerLayout {
    ContainerLayout {
        display: match c.display.as_deref() {
            Some("grid") => DisplayValue::Grid,
            Some("none") => DisplayValue::None,
            Some("block") => DisplayValue::Block,
            _ => DisplayValue::Flex,
        },
        flex_direction: match c.flex_direction.as_deref() {
            Some("column") => FlexDirectionValue::Column,
            Some("row-reverse") => FlexDirectionValue::RowReverse,
            Some("column-reverse") => FlexDirectionValue::ColumnReverse,
            _ => FlexDirectionValue::Row,
        },
        flex_wrap: match c.flex_wrap.as_deref() {
            Some("wrap") => FlexWrapValue::Wrap,
            Some("wrap-reverse") => FlexWrapValue::WrapReverse,
            _ => FlexWrapValue::NoWrap,
        },
        gap: parse_length(c.gap.as_ref()),
        row_gap: c.row_gap.as_ref().map(|d| parse_length(Some(d))),
        column_gap: c.column_gap.as_ref().map(|d| parse_length(Some(d))),
        align_items: parse_align_value(c.align_items.as_ref()),
        align_content: parse_align_value(c.align_content.as_ref()),
        justify_content: parse_align_value(c.justify_content.as_ref()),
        overflow_x: match c.overflow_x.as_deref() {
            Some("clip") => OverflowValue::Clip,
            Some("hidden") => OverflowValue::Hidden,
            Some("scroll") => OverflowValue::Scroll,
            _ => OverflowValue::Visible,
        },
        overflow_y: match c.overflow_y.as_deref() {
            Some("clip") => OverflowValue::Clip,
            Some("hidden") => OverflowValue::Hidden,
            Some("scroll") => OverflowValue::Scroll,
            _ => OverflowValue::Visible,
        },
        scrollbar_width: c.scrollbar_width.unwrap_or(0.0),
        padding: parse_length_rect(c.padding.as_ref()),
        margin: parse_length_auto_rect(c.margin.as_ref()),
        border: parse_length_rect(c.border.as_ref()),
        grid_template_rows: parse_grid_track_list(c.grid_template_rows.as_ref()),
        grid_template_columns: parse_grid_track_list(c.grid_template_columns.as_ref()),
        grid_auto_rows: parse_auto_tracks(c.grid_auto_rows.as_ref()),
        grid_auto_columns: parse_auto_tracks(c.grid_auto_columns.as_ref()),
        grid_auto_flow: match c.grid_auto_flow.as_deref() {
            Some("column") => GridAutoFlowValue::Column,
            Some("row dense") => GridAutoFlowValue::RowDense,
            Some("column dense") => GridAutoFlowValue::ColumnDense,
            _ => GridAutoFlowValue::Row,
        },
        justify_items: parse_align_value(c.justify_items.as_ref()),
    }
}
