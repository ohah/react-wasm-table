import { useWasm } from "../context";
import { useTable } from "../hooks/use-table";
import { useVirtualScroll } from "../hooks/use-virtual-scroll";
import { useSorting } from "../hooks/use-sorting";
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";
import type { TableProps } from "../types";

export function Table<T = unknown>({
  columns,
  data,
  rowHeight = 40,
  height = 600,
  overscan = 5,
  onSortChange,
  onFilterChange: _onFilterChange,
  className,
}: TableProps<T>) {
  const { ready, error } = useWasm();
  const {
    result,
    sortConfigs,
    setSortConfigs,
    handleScroll: onScrollUpdate,
  } = useTable({
    columns,
    data,
    rowHeight,
    viewportHeight: height,
    overscan,
  });

  const { containerRef, handleScroll } = useVirtualScroll({
    onScroll: onScrollUpdate,
  });

  const { toggleSort, getSortDirection } = useSorting({
    sortConfigs,
    onSortChange: (configs) => {
      setSortConfigs(configs);
      onSortChange?.(configs);
    },
  });

  if (error) {
    return <div>Failed to load WASM: {error.message}</div>;
  }

  if (!ready || !result) {
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      style={{
        height,
        overflow: "auto",
        position: "relative",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <TableHeader columns={columns} onSort={toggleSort} getSortDirection={getSortDirection} />
        <TableBody
          rows={result.rows}
          columns={columns}
          rowHeight={rowHeight}
          virtualSlice={result.virtualSlice}
        />
      </table>
    </div>
  );
}
