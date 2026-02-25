use crate::layout::Align;

/// Number of f32 fields per cell in the layout buffer.
pub const LAYOUT_STRIDE: usize = 16;

// Field offsets within each cell's stride
pub const FIELD_ROW: usize = 0;
pub const FIELD_COL: usize = 1;
pub const FIELD_X: usize = 2;
pub const FIELD_Y: usize = 3;
pub const FIELD_WIDTH: usize = 4;
pub const FIELD_HEIGHT: usize = 5;
pub const FIELD_ALIGN: usize = 6; // 0.0=left, 1.0=center, 2.0=right
pub const FIELD_PADDING_TOP: usize = 7;
pub const FIELD_PADDING_RIGHT: usize = 8;
pub const FIELD_PADDING_BOTTOM: usize = 9;
pub const FIELD_PADDING_LEFT: usize = 10;
pub const FIELD_BORDER_TOP: usize = 11;
pub const FIELD_BORDER_RIGHT: usize = 12;
pub const FIELD_BORDER_BOTTOM: usize = 13;
pub const FIELD_BORDER_LEFT: usize = 14;
pub const FIELD_RESERVED: usize = 15;

/// Write a single cell's layout data into the flat buffer at `cell_idx`.
#[allow(clippy::too_many_arguments)]
#[inline]
pub fn write_cell(
    buf: &mut [f32],
    cell_idx: usize,
    row: usize,
    col: usize,
    x: f32,
    y: f32,
    w: f32,
    h: f32,
    align: Align,
    padding: [f32; 4],
    border: [f32; 4],
) {
    let base = cell_idx * LAYOUT_STRIDE;
    buf[base + FIELD_ROW] = row as f32;
    buf[base + FIELD_COL] = col as f32;
    buf[base + FIELD_X] = x;
    buf[base + FIELD_Y] = y;
    buf[base + FIELD_WIDTH] = w;
    buf[base + FIELD_HEIGHT] = h;
    buf[base + FIELD_ALIGN] = match align {
        Align::Left => 0.0,
        Align::Center => 1.0,
        Align::Right => 2.0,
    };
    buf[base + FIELD_PADDING_TOP] = padding[0];
    buf[base + FIELD_PADDING_RIGHT] = padding[1];
    buf[base + FIELD_PADDING_BOTTOM] = padding[2];
    buf[base + FIELD_PADDING_LEFT] = padding[3];
    buf[base + FIELD_BORDER_TOP] = border[0];
    buf[base + FIELD_BORDER_RIGHT] = border[1];
    buf[base + FIELD_BORDER_BOTTOM] = border[2];
    buf[base + FIELD_BORDER_LEFT] = border[3];
    buf[base + FIELD_RESERVED] = 0.0;
}

/// Read a cell's row index from the buffer.
#[inline]
pub fn read_row(buf: &[f32], cell_idx: usize) -> usize {
    buf[cell_idx * LAYOUT_STRIDE + FIELD_ROW] as usize
}

/// Read a cell's column index from the buffer.
#[inline]
pub fn read_col(buf: &[f32], cell_idx: usize) -> usize {
    buf[cell_idx * LAYOUT_STRIDE + FIELD_COL] as usize
}

/// Required buffer length (in f32 elements) for `cell_count` cells.
#[inline]
pub const fn buf_len(cell_count: usize) -> usize {
    cell_count * LAYOUT_STRIDE
}

#[cfg(test)]
mod tests {
    use super::*;

    const NO_PADDING: [f32; 4] = [0.0; 4];
    const NO_BORDER: [f32; 4] = [0.0; 4];

    #[test]
    fn write_and_read_cell() {
        let mut buf = vec![0.0_f32; buf_len(2)];
        write_cell(
            &mut buf,
            0,
            3,
            1,
            10.0,
            20.0,
            100.0,
            36.0,
            Align::Left,
            NO_PADDING,
            NO_BORDER,
        );
        write_cell(
            &mut buf,
            1,
            4,
            2,
            110.0,
            20.0,
            200.0,
            36.0,
            Align::Right,
            [4.0, 8.0, 4.0, 8.0],
            [1.0, 2.0, 1.0, 2.0],
        );

        assert_eq!(read_row(&buf, 0), 3);
        assert_eq!(read_col(&buf, 0), 1);
        assert!((buf[FIELD_X] - 10.0).abs() < f32::EPSILON);
        assert!((buf[FIELD_Y] - 20.0).abs() < f32::EPSILON);
        assert!((buf[FIELD_WIDTH] - 100.0).abs() < f32::EPSILON);
        assert!((buf[FIELD_HEIGHT] - 36.0).abs() < f32::EPSILON);
        assert!((buf[FIELD_ALIGN] - 0.0).abs() < f32::EPSILON); // Left
        assert!((buf[FIELD_PADDING_TOP] - 0.0).abs() < f32::EPSILON);
        assert!((buf[FIELD_BORDER_TOP] - 0.0).abs() < f32::EPSILON);

        let base1 = LAYOUT_STRIDE;
        assert_eq!(read_row(&buf, 1), 4);
        assert_eq!(read_col(&buf, 1), 2);
        assert!((buf[base1 + FIELD_X] - 110.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_ALIGN] - 2.0).abs() < f32::EPSILON); // Right
        assert!((buf[base1 + FIELD_PADDING_TOP] - 4.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_PADDING_RIGHT] - 8.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_PADDING_BOTTOM] - 4.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_PADDING_LEFT] - 8.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_BORDER_TOP] - 1.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_BORDER_RIGHT] - 2.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_BORDER_BOTTOM] - 1.0).abs() < f32::EPSILON);
        assert!((buf[base1 + FIELD_BORDER_LEFT] - 2.0).abs() < f32::EPSILON);
    }

    #[test]
    fn buf_len_calculation() {
        assert_eq!(buf_len(0), 0);
        assert_eq!(buf_len(1), LAYOUT_STRIDE);
        assert_eq!(buf_len(10), 10 * LAYOUT_STRIDE);
    }
}
