// wasm_bindgen is incompatible with const fn
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::doc_markdown)]

mod convert;
mod types;

use convert::{
    convert_column, convert_container, convert_filter_value, decode_align, decode_justify,
};
use types::{JsColumnFilter, JsColumnLayout, JsContainerLayout, JsSortConfig, JsViewport};

use react_wasm_table_core::columnar_store::ColumnarStore;
use react_wasm_table_core::layout::{
    ColumnLayout, ContainerLayout, FlexDirectionValue, LayoutEngine, Viewport,
};
use react_wasm_table_core::layout_buffer;
use react_wasm_table_core::types::{
    ColumnFilter, FilterOp, GlobalFilter, SortConfig, SortDirection,
};
use wasm_bindgen::prelude::*;

/// The main WASM-exposed table engine.
#[wasm_bindgen]
pub struct TableEngine {
    layout: LayoutEngine,
    layout_buf: Vec<f32>,
    layout_cell_count: usize,
    columnar: ColumnarStore,
}

#[wasm_bindgen]
impl TableEngine {
    /// Create a new `TableEngine` instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            layout: LayoutEngine::new(),
            layout_buf: Vec::new(),
            layout_cell_count: 0,
            columnar: ColumnarStore::new(),
        }
    }

    // ── Layout buffer ─────────────────────────────────────────────────

    /// Return [pointer_offset, f32_count] for the layout buffer.
    /// JS creates: `new Float32Array(wasmMemory.buffer, offset, len)`
    #[wasm_bindgen(js_name = getLayoutBufferInfo)]
    pub fn get_layout_buffer_info(&self) -> Vec<usize> {
        vec![
            self.layout_buf.as_ptr() as usize,
            self.layout_cell_count * layout_buffer::LAYOUT_STRIDE,
        ]
    }

    /// Get Float64 column pointer info: [offset, length].
    /// Returns empty vec if column is not Float64.
    #[wasm_bindgen(js_name = getColumnFloat64Info)]
    pub fn get_column_float64_info(&self, col_idx: usize) -> Vec<usize> {
        self.columnar
            .get_float64_ptr(col_idx)
            .map_or_else(Vec::new, |(ptr, len)| vec![ptr as usize, len])
    }

    // ── TypedArray direct ingestion (serde bypass) ────────────────────

    /// Initialize columnar store for direct TypedArray ingestion.
    #[wasm_bindgen(js_name = initColumnar)]
    pub fn init_columnar(&mut self, col_count: usize, row_count: usize) {
        self.columnar.init(col_count, row_count);
    }

    /// Ingest a Float64 column directly from a TypedArray (no serde).
    #[wasm_bindgen(js_name = ingestFloat64Column)]
    pub fn ingest_float64_column(&mut self, col_idx: usize, values: &[f64]) {
        self.columnar.set_column_float64(col_idx, values);
    }

    /// Ingest a Bool column as Float64 (0.0/1.0/NaN) directly.
    #[wasm_bindgen(js_name = ingestBoolColumn)]
    pub fn ingest_bool_column(&mut self, col_idx: usize, values: &[f64]) {
        self.columnar.set_column_bool(col_idx, values);
    }

    /// Ingest a String column: unique strings via JsValue + intern IDs via Uint32Array.
    #[wasm_bindgen(js_name = ingestStringColumn)]
    pub fn ingest_string_column(
        &mut self,
        col_idx: usize,
        unique_strings: JsValue,
        ids: &[u32],
    ) -> Result<(), JsError> {
        let unique: Vec<String> = serde_wasm_bindgen::from_value(unique_strings)?;
        self.columnar.set_column_strings(col_idx, &unique, ids);
        Ok(())
    }

    /// Finalize columnar ingestion (marks view dirty).
    #[wasm_bindgen(js_name = finalizeColumnar)]
    pub fn finalize_columnar(&mut self) {
        self.columnar.finalize();
    }

    // ── Incremental append (streaming Phase 2) ────────────────────────

    /// Begin appending rows (does not clear existing data).
    #[wasm_bindgen(js_name = beginAppendColumnar)]
    pub fn begin_append_columnar(&mut self, new_row_count: usize) {
        self.columnar.begin_append(new_row_count);
    }

    /// Append Float64 values starting at offset.
    #[wasm_bindgen(js_name = appendFloat64Column)]
    pub fn append_float64_column(&mut self, col_idx: usize, offset: usize, values: &[f64]) {
        self.columnar.append_column_float64(col_idx, offset, values);
    }

    /// Append Bool values (as f64) starting at offset.
    #[wasm_bindgen(js_name = appendBoolColumn)]
    pub fn append_bool_column(&mut self, col_idx: usize, offset: usize, values: &[f64]) {
        self.columnar.append_column_bool(col_idx, offset, values);
    }

    /// Append String column with intern table merge.
    #[wasm_bindgen(js_name = appendStringColumn)]
    pub fn append_string_column(
        &mut self,
        col_idx: usize,
        offset: usize,
        unique_strings: JsValue,
        ids: &[u32],
    ) -> Result<(), JsError> {
        let unique: Vec<String> = serde_wasm_bindgen::from_value(unique_strings)?;
        self.columnar
            .append_column_strings(col_idx, offset, &unique, ids);
        Ok(())
    }

    /// Finalize append (marks view dirty).
    #[wasm_bindgen(js_name = finalizeAppendColumnar)]
    pub fn finalize_append_columnar(&mut self) {
        self.columnar.finalize_append();
    }

    // ── Hot path ──────────────────────────────────────────────────────

    /// Set sort configuration on the columnar store.
    #[wasm_bindgen(js_name = setColumnarSort)]
    pub fn set_columnar_sort(&mut self, configs: JsValue) -> Result<(), JsError> {
        let configs: Vec<JsSortConfig> = serde_wasm_bindgen::from_value(configs)?;
        let configs: Vec<SortConfig> = configs
            .into_iter()
            .map(|c| SortConfig {
                column_index: c.column_index,
                direction: match c.direction.as_str() {
                    "Descending" | "desc" => SortDirection::Descending,
                    _ => SortDirection::Ascending,
                },
            })
            .collect();
        self.columnar.set_sort(configs);
        Ok(())
    }

    /// Set column filters on the columnar store.
    #[wasm_bindgen(js_name = setColumnarFilters)]
    pub fn set_columnar_filters(&mut self, filters: JsValue) -> Result<(), JsError> {
        let filters: Vec<JsColumnFilter> = serde_wasm_bindgen::from_value(filters)?;
        let filters: Vec<ColumnFilter> = filters
            .into_iter()
            .map(|f| ColumnFilter {
                column_index: f.column_index,
                op: match f.op.as_str() {
                    "neq" => FilterOp::Neq,
                    "gt" => FilterOp::Gt,
                    "gte" => FilterOp::Gte,
                    "lt" => FilterOp::Lt,
                    "lte" => FilterOp::Lte,
                    "contains" => FilterOp::Contains,
                    "startsWith" => FilterOp::StartsWith,
                    "endsWith" => FilterOp::EndsWith,
                    _ => FilterOp::Eq,
                },
                value: convert_filter_value(&f.value),
            })
            .collect();
        self.columnar.set_column_filters(filters);
        Ok(())
    }

    /// Set global filter on the columnar store.
    #[wasm_bindgen(js_name = setGlobalFilter)]
    pub fn set_global_filter(&mut self, query: Option<String>) {
        self.columnar
            .set_global_filter(query.map(|q| GlobalFilter { query: q }));
    }

    /// Set pagination state on the columnar store.
    #[wasm_bindgen(js_name = setPagination)]
    pub fn set_pagination(&mut self, page_index: Option<u32>, page_size: Option<u32>) {
        self.columnar.set_pagination(page_index, page_size);
    }

    /// Set scroll configuration on the columnar store.
    #[wasm_bindgen(js_name = setColumnarScrollConfig)]
    pub fn set_columnar_scroll_config(
        &mut self,
        row_height: f64,
        viewport_height: f64,
        overscan: usize,
    ) {
        self.columnar
            .set_scroll_config(row_height, viewport_height, overscan);
    }

    /// Rebuild view indices only (for row pinning: call before getViewIndices, then updateViewportColumnar with skipRebuild=true).
    #[wasm_bindgen(js_name = rebuildView)]
    pub fn rebuild_view_only(&mut self) {
        self.columnar.rebuild_view();
    }

    /// Unified hot path: rebuild view + virtual slice + layout buffer.
    /// Returns metadata as Float64Array:
    /// [cell_count, visible_start, visible_end, total_height, filtered_count, generation, total_count, visible_count, effective_row_height, filtered_total]
    /// filtered_total ([9]) = row count after filter+sort but before pagination.
    /// Optional 5th/6th: pinnedTop, pinnedBottom. Optional 7th: skipRebuild (when true, skip rebuild_view; use after rebuildView() for row pinning).
    #[allow(clippy::too_many_arguments, clippy::too_many_lines)]
    #[wasm_bindgen(js_name = updateViewportColumnar)]
    pub fn update_viewport_columnar(
        &mut self,
        scroll_top: f64,
        viewport_js: JsValue,
        columns_js: JsValue,
        container_js: JsValue,
        pinned_top_js: Option<f64>,
        pinned_bottom_js: Option<f64>,
        skip_rebuild_js: Option<bool>,
    ) -> Result<Vec<f64>, JsError> {
        if !skip_rebuild_js.unwrap_or(false) {
            self.columnar.rebuild_view();
        }

        let filtered_count = self.columnar.view_indices().len();
        log::debug!(
            "[wasm] updateViewport: scroll_top={:.1}, total_rows={}, filtered={}",
            scroll_top,
            self.columnar.row_count,
            self.columnar.view_indices().len(),
        );

        // 2. Parse viewport + columns + container BEFORE virtual scroll
        let vp: JsViewport = serde_wasm_bindgen::from_value(viewport_js)?;
        let cols: Vec<JsColumnLayout> = serde_wasm_bindgen::from_value(columns_js)?;

        let container = if container_js.is_undefined() || container_js.is_null() {
            ContainerLayout::default()
        } else {
            let jc: JsContainerLayout = serde_wasm_bindgen::from_value(container_js)?;
            convert_container(&jc)
        };

        let viewport = Viewport {
            width: vp.width,
            height: vp.height,
            row_height: vp.row_height,
            header_height: vp.header_height,
            scroll_top: vp.scroll_top,
            line_height: vp.line_height,
        };

        let columns: Vec<ColumnLayout> = cols.into_iter().map(|c| convert_column(&c)).collect();

        // 3. Compute effective row height
        let effective_row_height = f64::from(self.layout.compute_effective_row_height(
            &columns,
            &container,
            viewport.width,
            viewport.row_height,
            viewport.line_height,
        ));

        // 4. Row pinning: optional pinned_top, pinned_bottom (row counts)
        let pinned_top = pinned_top_js.map_or(0, |v| v as usize);
        let pinned_bottom = pinned_bottom_js.map_or(0, |v| v as usize);

        let total_count = self.columnar.row_count;
        let col_count = columns.len();

        let header_row_count: usize = vp.header_row_count.max(1);

        if pinned_top > 0 || pinned_bottom > 0 {
            // Row pinning path: three segments (top, middle visible, bottom)
            let scroll_state = react_wasm_table_core::virtual_scroll::ScrollState {
                scroll_top,
                viewport_height: self.columnar.viewport_height(),
                row_height: effective_row_height,
                total_rows: filtered_count,
                overscan: self.columnar.overscan(),
                pinned_top: Some(pinned_top),
                pinned_bottom: Some(pinned_bottom),
            };
            let virtual_slice =
                react_wasm_table_core::virtual_scroll::compute_virtual_slice(&scroll_state);

            let middle_range = virtual_slice.start_index..virtual_slice.end_index;
            let total_cells = col_count
                + pinned_top * col_count
                + middle_range.len() * col_count
                + pinned_bottom * col_count;
            let needed = layout_buffer::buf_len(total_cells);

            if self.layout_buf.len() < needed {
                self.layout_buf.resize(needed, 0.0);
            }

            let row_pinned_params = react_wasm_table_core::layout::RowPinnedLayoutParams {
                viewport: &viewport,
                container: &container,
                pinned_top,
                pinned_bottom,
                scroll_top: scroll_top as f32,
                total_rows: filtered_count,
                middle_range,
                header_row_count,
            };
            self.layout_cell_count = self.layout.compute_into_buffer_row_pinned(
                &columns,
                &row_pinned_params,
                &mut self.layout_buf,
            );

            Ok(vec![
                self.layout_cell_count as f64,
                virtual_slice.start_index as f64,
                virtual_slice.end_index as f64,
                virtual_slice.total_height,
                filtered_count as f64,
                self.columnar.generation as f64,
                total_count as f64,
                virtual_slice.visible_count as f64,
                effective_row_height,
                self.columnar.filtered_total() as f64,
            ])
        } else {
            // Default path: single visible range
            let scroll_state = react_wasm_table_core::virtual_scroll::ScrollState {
                scroll_top,
                viewport_height: self.columnar.viewport_height(),
                row_height: effective_row_height,
                total_rows: filtered_count,
                overscan: self.columnar.overscan(),
                pinned_top: None,
                pinned_bottom: None,
            };
            let virtual_slice =
                react_wasm_table_core::virtual_scroll::compute_virtual_slice(&scroll_state);

            let row_count = virtual_slice
                .end_index
                .saturating_sub(virtual_slice.start_index);
            let total_cells = col_count + row_count * col_count;
            let needed = layout_buffer::buf_len(total_cells);

            if self.layout_buf.len() < needed {
                self.layout_buf.resize(needed, 0.0);
            }

            self.layout_cell_count = self.layout.compute_into_buffer(
                &columns,
                &viewport,
                &container,
                virtual_slice.start_index..virtual_slice.end_index,
                &mut self.layout_buf,
                header_row_count,
            );

            Ok(vec![
                self.layout_cell_count as f64,
                virtual_slice.start_index as f64,
                virtual_slice.end_index as f64,
                virtual_slice.total_height,
                filtered_count as f64,
                self.columnar.generation as f64,
                total_count as f64,
                virtual_slice.visible_count as f64,
                effective_row_height,
                self.columnar.filtered_total() as f64,
            ])
        }
    }

    /// Return [pointer_offset, length] for the view indices buffer.
    #[wasm_bindgen(js_name = getColumnarViewIndicesInfo)]
    pub fn get_columnar_view_indices_info(&self) -> Vec<usize> {
        let indices = self.columnar.view_indices();
        vec![indices.as_ptr() as usize, indices.len()]
    }

    // ── Layout cache ──────────────────────────────────────────────

    /// Invalidate cached layout results. Forces recomputation on next frame.
    #[wasm_bindgen(js_name = invalidateLayout)]
    pub fn invalidate_layout(&mut self) {
        self.layout.invalidate_cache();
    }

    // ── Composite (in-cell) layout ──────────────────────────────────

    /// Compute flexbox layout for children inside a composite cell container.
    ///
    /// Input encoding (f32 array):
    /// ```text
    /// [0]  containerWidth
    /// [1]  containerHeight
    /// [2]  flexDirection    (0=row, 1=column, 2=row-reverse, 3=column-reverse)
    /// [3]  gap
    /// [4]  alignItems       (0=start, 1=end, 2=center, 3=stretch, NaN=none)
    /// [5]  justifyContent   (0=start, 1=end, 2=center, 3=space-between, NaN=none)
    /// [6]  paddingTop
    /// [7]  paddingRight
    /// [8]  paddingBottom
    /// [9]  paddingLeft
    /// [10] childCount
    /// [11..] child0Width, child0Height, child1Width, child1Height, ...
    /// ```
    ///
    /// Output (f32 array): `[x0, y0, w0, h0, x1, y1, w1, h1, ...]`
    #[wasm_bindgen(js_name = computeCompositeLayout)]
    pub fn compute_composite_layout(&mut self, input: &[f32]) -> Vec<f32> {
        let container_w = input[0];
        let container_h = input[1];
        let flex_direction = match input[2] as u32 {
            1 => FlexDirectionValue::Column,
            2 => FlexDirectionValue::RowReverse,
            3 => FlexDirectionValue::ColumnReverse,
            _ => FlexDirectionValue::Row,
        };
        let gap = input[3];
        let align_items = decode_align(input[4]);
        let justify_content = decode_justify(input[5]);
        let padding = [input[6], input[7], input[8], input[9]];
        let child_count = input[10] as usize;

        let mut children = Vec::with_capacity(child_count);
        for i in 0..child_count {
            let base = 11 + i * 2;
            children.push(react_wasm_table_core::layout::ChildSize {
                width: input[base],
                height: input[base + 1],
            });
        }

        let params = react_wasm_table_core::layout::CompositeLayoutParams {
            container_w,
            container_h,
            flex_direction,
            gap,
            align_items,
            justify_content,
            padding,
        };
        let positions = self.layout.compute_composite_layout(&params, &children);

        let mut out = Vec::with_capacity(positions.len() * 4);
        for p in &positions {
            out.push(p.x);
            out.push(p.y);
            out.push(p.width);
            out.push(p.height);
        }
        out
    }

    // ── Debug logging ──────────────────────────────────────────────

    /// Initialize console_log backend and enable Debug-level logging.
    #[cfg(feature = "debug-log")]
    #[wasm_bindgen(js_name = enableDebugLog)]
    pub fn enable_debug_log(&self) {
        console_log::init_with_level(log::Level::Debug).ok();
    }

    /// Disable all log output at runtime.
    #[cfg(feature = "debug-log")]
    #[wasm_bindgen(js_name = disableDebugLog)]
    pub fn disable_debug_log(&self) {
        log::set_max_level(log::LevelFilter::Off);
    }
}

impl Default for TableEngine {
    fn default() -> Self {
        Self::new()
    }
}
