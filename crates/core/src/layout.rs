use taffy::TaffyTree;

/// Text alignment within a cell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Align {
    #[default]
    Left,
    Center,
    Right,
}

/// Layout configuration for a single column.
#[derive(Debug, Clone)]
pub struct ColumnLayout {
    pub width: f32,
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub min_width: Option<f32>,
    pub max_width: Option<f32>,
    pub align: Align,
}

/// Viewport dimensions and scroll state.
#[derive(Debug, Clone)]
pub struct Viewport {
    pub width: f32,
    pub height: f32,
    pub row_height: f32,
    pub header_height: f32,
    pub scroll_top: f32,
}

/// Computed layout for a single cell.
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

/// Flexbox-based layout engine powered by Taffy.
#[allow(dead_code)]
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

    /// Compute header cell layouts for the given columns and viewport.
    pub fn compute_header_layout(
        &mut self,
        _columns: &[ColumnLayout],
        _viewport: &Viewport,
    ) -> Vec<CellLayout> {
        todo!()
    }

    /// Compute row cell layouts for visible rows.
    pub fn compute_rows_layout(
        &mut self,
        _columns: &[ColumnLayout],
        _viewport: &Viewport,
        _visible_range: std::ops::Range<usize>,
    ) -> Vec<CellLayout> {
        todo!()
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

    #[test]
    fn layout_engine_creation() {
        let engine = LayoutEngine::new();
        // Verify the engine is created with an empty tree
        assert_eq!(engine.tree.total_node_count(), 0);
    }
}
