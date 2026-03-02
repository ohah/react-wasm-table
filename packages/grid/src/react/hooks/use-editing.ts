import { useCallback, useEffect, useRef } from "react";
import type { ColumnRegistry } from "../../adapter/column-registry";
import { EditorManager } from "../../adapter/editor-manager";
import {
	readCellAlign,
	readCellCol,
	readCellHeight,
	readCellRow,
	readCellWidth,
	readCellX,
	readCellY,
} from "../../adapter/layout-reader";
import type { SelectionManager } from "../../adapter/selection-manager";
import type { CellCoord, CellLayout, TableMeta } from "../../types";

export interface UseEditingParams {
	editorRef: React.RefObject<HTMLDivElement | null>;
	columnRegistry: ColumnRegistry;
	data: Record<string, unknown>[];
	selectionManagerRef: React.RefObject<SelectionManager>;
	getLayoutBuf: () => Float32Array | null;
	getHeaderCount: () => number;
	getTotalCellCount: () => number;
	editorManager?: EditorManager;
	meta?: TableMeta;
	/** Number of header rows (not cells). Used to convert unified row → data row index. */
	headerRowCount?: number;
	/** When to open the cell editor. @default "dblclick" */
	editTrigger?: "click" | "dblclick";
}

export function useEditing({
	editorRef,
	columnRegistry,
	data,
	selectionManagerRef,
	getLayoutBuf,
	getHeaderCount,
	getTotalCellCount,
	editorManager,
	meta,
	headerRowCount = 1,
	editTrigger = "dblclick",
}: UseEditingParams) {
	// Adapter DI: prefer external prop, lazy-create fallback only when needed
	const fallbackEmRef = useRef<EditorManager | null>(null);
	const editorManagerRef = useRef<EditorManager>(null!);
	if (editorManager) {
		editorManagerRef.current = editorManager;
	} else {
		if (!fallbackEmRef.current) fallbackEmRef.current = new EditorManager();
		editorManagerRef.current = fallbackEmRef.current;
	}

	// Keep meta ref fresh so the onCommit closure always sees the latest value
	const metaRef = useRef(meta);
	metaRef.current = meta;

	// headerRowCount ref — keeps onCommit closure fresh without re-running useEffect
	const headerRowCountRef = useRef(headerRowCount);
	headerRowCountRef.current = headerRowCount;

	// Ref for data so navigation closure always sees the latest value
	const dataRef = useRef(data);
	dataRef.current = data;

	/** Open editor at a specific cell coordinate (shared by double-click and Tab navigation). */
	const openEditorAt = useCallback(
		(coord: CellCoord) => {
			if (coord.row < headerRowCount) return;

			const columns = columnRegistry.getAll();
			const col = columns[coord.col];
			if (!col?.editor) return;

			// Find the matching cell layout from buffer
			const buf = getLayoutBuf();
			let layout: CellLayout | undefined;
			if (buf) {
				const hc = getHeaderCount();
				const tc = getTotalCellCount();
				for (let i = hc; i < tc; i++) {
					if (
						readCellRow(buf, i) === coord.row &&
						readCellCol(buf, i) === coord.col
					) {
						layout = {
							row: coord.row,
							col: coord.col,
							x: readCellX(buf, i),
							y: readCellY(buf, i),
							width: readCellWidth(buf, i),
							height: readCellHeight(buf, i),
							contentAlign: readCellAlign(buf, i),
						};
						break;
					}
				}
			}
			if (!layout) return;

			const rowData = dataRef.current[coord.row - headerRowCount];
			if (!rowData) return;
			const currentValue = rowData[col.id];

			editorManagerRef.current.open(coord, layout, col.editor, currentValue);
			selectionManagerRef.current.clear();
		},
		[
			columnRegistry,
			headerRowCount,
			selectionManagerRef,
			getLayoutBuf,
			getHeaderCount,
			getTotalCellCount,
		],
	);

	// Ref so useEffect closure always calls the latest openEditorAt
	const openEditorAtRef = useRef(openEditorAt);
	openEditorAtRef.current = openEditorAt;

	// Set editor container + wire onCommit / onNavigate
	useEffect(() => {
		const em = editorManagerRef.current;
		if (editorRef.current) {
			em.setContainer(editorRef.current);
		}
		em.onCommit = (coord, value) => {
			const m = metaRef.current;
			if (!m?.updateData) return;
			const dataRowIndex = coord.row - headerRowCountRef.current;
			const columns = columnRegistry.getAll();
			const col = columns[coord.col];
			if (col && dataRowIndex >= 0) {
				m.updateData(dataRowIndex, col.id, value);
			}
		};
		em.onNavigate = (coord, direction) => {
			const columns = columnRegistry.getAll();
			const totalCols = columns.length;
			const hrc = headerRowCountRef.current;
			const totalRows = dataRef.current.length + hrc;

			let { row, col } = coord;
			// Step once in the direction
			if (direction === "next") col++;
			else col--;

			while (row >= hrc && row < totalRows) {
				if (direction === "next") {
					for (; col < totalCols; col++) {
						if (columns[col]?.editor) {
							openEditorAtRef.current({ row, col });
							return;
						}
					}
					row++;
					col = 0;
				} else {
					for (; col >= 0; col--) {
						if (columns[col]?.editor) {
							openEditorAtRef.current({ row, col });
							return;
						}
					}
					row--;
					col = totalCols - 1;
				}
			}
		};
		return () => {
			em.onCommit = undefined;
			em.onNavigate = undefined;
		};
	}, [editorRef, columnRegistry]);

	const handleCellDoubleClick = useCallback(
		(coord: CellCoord) => {
			if (editTrigger === "dblclick") openEditorAt(coord);
		},
		[editTrigger, openEditorAt],
	);

	/** Single-click handler: opens editor when editTrigger="click", otherwise cancels. */
	const handleCellClick = useCallback(
		(coord: CellCoord) => {
			if (editTrigger === "click") {
				const columns = columnRegistry.getAll();
				const col = columns[coord.col];
				if (col?.editor && coord.row >= headerRowCount) {
					openEditorAt(coord);
					return;
				}
			}
			// Cancel active editor when clicking non-editable cell or when editTrigger="dblclick"
			if (editorManagerRef.current.isEditing) {
				editorManagerRef.current.cancel();
			}
		},
		[editTrigger, columnRegistry, headerRowCount, openEditorAt],
	);

	/** Check if a cell coordinate refers to an editable column. */
	const isCellEditable = useCallback(
		(coord: CellCoord): boolean => {
			if (coord.row < headerRowCount) return false;
			const columns = columnRegistry.getAll();
			return !!columns[coord.col]?.editor;
		},
		[columnRegistry, headerRowCount],
	);

	return {
		editorManagerRef,
		handleCellDoubleClick,
		handleCellClick,
		isCellEditable,
	};
}
