# Table

The main table component.

## Props

| Prop             | Type                                   | Default  | Description                 |
| ---------------- | -------------------------------------- | -------- | --------------------------- |
| `columns`        | `ColumnDef[]`                          | required | Column definitions          |
| `data`           | `unknown[][]`                          | required | Row data (row-major arrays) |
| `rowHeight`      | `number`                               | `40`     | Row height in pixels        |
| `height`         | `number`                               | `600`    | Viewport height in pixels   |
| `overscan`       | `number`                               | `5`      | Overscan rows count         |
| `onSortChange`   | `(sorts: SortConfig[]) => void`        | -        | Sort change callback        |
| `onFilterChange` | `(filters: FilterCondition[]) => void` | -        | Filter change callback      |
| `className`      | `string`                               | -        | Additional CSS class        |
