/// Input parameters for virtual scroll calculation.
#[derive(Debug, Clone)]
pub struct ScrollState {
    pub scroll_top: f64,
    pub viewport_height: f64,
    pub row_height: f64,
    pub total_rows: usize,
    pub overscan: usize,
    /// When set, only the middle segment (between top and bottom pinned rows) is scrollable.
    pub pinned_top: Option<usize>,
    pub pinned_bottom: Option<usize>,
}

/// The computed virtual slice indicating which rows to render.
#[derive(Debug, Clone)]
pub struct VirtualSlice {
    pub start_index: usize,
    pub end_index: usize,
    pub total_height: f64,
    pub visible_count: usize,
    /// When row pinning is used: number of rows in the scrollable (middle) segment.
    pub scrollable_count: usize,
}

/// Compute which rows should be rendered given the current scroll state.
/// When pinned_top/pinned_bottom are set, only the middle segment is scrolled;
/// start_index/end_index refer to the visible middle rows; top and bottom are always fully included by the caller.
pub fn compute_virtual_slice(state: &ScrollState) -> VirtualSlice {
    if state.total_rows == 0 || state.row_height <= 0.0 {
        return VirtualSlice {
            start_index: 0,
            end_index: 0,
            total_height: 0.0,
            visible_count: 0,
            scrollable_count: 0,
        };
    }

    let pinned_top = state.pinned_top.unwrap_or(0);
    let pinned_bottom = state.pinned_bottom.unwrap_or(0);
    let scrollable_count = state
        .total_rows
        .saturating_sub(pinned_top)
        .saturating_sub(pinned_bottom);

    let total_height = state.total_rows as f64 * state.row_height;
    let visible_count = (state.viewport_height / state.row_height).ceil() as usize;

    if scrollable_count == 0 || pinned_top + pinned_bottom >= state.total_rows {
        return VirtualSlice {
            start_index: pinned_top,
            end_index: pinned_top,
            total_height,
            visible_count: 0,
            scrollable_count,
        };
    }

    let first_visible_middle = (state.scroll_top / state.row_height).floor() as usize;

    let start_index = pinned_top
        + first_visible_middle
            .saturating_sub(state.overscan)
            .min(scrollable_count.saturating_sub(1));
    let end_index = (pinned_top + first_visible_middle + visible_count + state.overscan)
        .min(state.total_rows.saturating_sub(pinned_bottom));

    VirtualSlice {
        start_index,
        end_index,
        total_height,
        visible_count,
        scrollable_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_virtual_slice() {
        let state = ScrollState {
            scroll_top: 0.0,
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 1000,
            overscan: 5,
            pinned_top: None,
            pinned_bottom: None,
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 0);
        assert_eq!(slice.end_index, 15); // 10 visible + 5 overscan
        assert_eq!(slice.total_height, 40000.0);
        assert_eq!(slice.visible_count, 10);
        assert_eq!(slice.scrollable_count, 1000);
    }

    #[test]
    fn test_scrolled_virtual_slice() {
        let state = ScrollState {
            scroll_top: 2000.0, // scrolled to row 50
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 1000,
            overscan: 5,
            pinned_top: None,
            pinned_bottom: None,
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 45); // 50 - 5 overscan
        assert_eq!(slice.end_index, 65); // 50 + 10 visible + 5 overscan
    }

    #[test]
    fn test_near_end_virtual_slice() {
        let state = ScrollState {
            scroll_top: 39600.0, // near the end (row 990)
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 1000,
            overscan: 5,
            pinned_top: None,
            pinned_bottom: None,
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 985); // 990 - 5 overscan
        assert_eq!(slice.end_index, 1000); // capped at total_rows
    }

    #[test]
    fn test_empty_data() {
        let state = ScrollState {
            scroll_top: 0.0,
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 0,
            overscan: 5,
            pinned_top: None,
            pinned_bottom: None,
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 0);
        assert_eq!(slice.end_index, 0);
        assert_eq!(slice.total_height, 0.0);
        assert_eq!(slice.visible_count, 0);
        assert_eq!(slice.scrollable_count, 0);
    }

    #[test]
    fn test_few_rows() {
        let state = ScrollState {
            scroll_top: 0.0,
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 3,
            overscan: 5,
            pinned_top: None,
            pinned_bottom: None,
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 0);
        assert_eq!(slice.end_index, 3);
        assert_eq!(slice.total_height, 120.0);
    }

    #[test]
    fn test_row_pinning_middle_slice() {
        let state = ScrollState {
            scroll_top: 0.0,
            viewport_height: 200.0,
            row_height: 40.0,
            total_rows: 100,
            overscan: 2,
            pinned_top: Some(2),
            pinned_bottom: Some(3),
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.scrollable_count, 95);
        assert_eq!(slice.start_index, 2); // pinned_top
        assert_eq!(slice.end_index, 9); // 2 + 5 visible + 2 overscan
    }
}
