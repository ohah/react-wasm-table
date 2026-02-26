/// Input parameters for virtual scroll calculation.
#[derive(Debug, Clone)]
pub struct ScrollState {
    pub scroll_top: f64,
    pub viewport_height: f64,
    pub row_height: f64,
    pub total_rows: usize,
    pub overscan: usize,
}

/// The computed virtual slice indicating which rows to render.
#[derive(Debug, Clone)]
pub struct VirtualSlice {
    pub start_index: usize,
    pub end_index: usize,
    pub total_height: f64,
    pub visible_count: usize,
}

/// Compute which rows should be rendered given the current scroll state.
pub fn compute_virtual_slice(state: &ScrollState) -> VirtualSlice {
    if state.total_rows == 0 || state.row_height <= 0.0 {
        return VirtualSlice {
            start_index: 0,
            end_index: 0,
            total_height: 0.0,
            visible_count: 0,
        };
    }

    let total_height = state.total_rows as f64 * state.row_height;
    let visible_count = (state.viewport_height / state.row_height).ceil() as usize;

    let first_visible = (state.scroll_top / state.row_height).floor() as usize;

    let start_index = first_visible.saturating_sub(state.overscan);
    let end_index = (first_visible + visible_count + state.overscan).min(state.total_rows);

    VirtualSlice {
        start_index,
        end_index,
        total_height,
        visible_count,
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
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 0);
        assert_eq!(slice.end_index, 15); // 10 visible + 5 overscan
        assert_eq!(slice.total_height, 40000.0);
        assert_eq!(slice.visible_count, 10);
    }

    #[test]
    fn test_scrolled_virtual_slice() {
        let state = ScrollState {
            scroll_top: 2000.0, // scrolled to row 50
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 1000,
            overscan: 5,
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
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 0);
        assert_eq!(slice.end_index, 0);
        assert_eq!(slice.total_height, 0.0);
        assert_eq!(slice.visible_count, 0);
    }

    #[test]
    fn test_few_rows() {
        let state = ScrollState {
            scroll_top: 0.0,
            viewport_height: 400.0,
            row_height: 40.0,
            total_rows: 3,
            overscan: 5,
        };

        let slice = compute_virtual_slice(&state);

        assert_eq!(slice.start_index, 0);
        assert_eq!(slice.end_index, 3);
        assert_eq!(slice.total_height, 120.0);
    }
}
