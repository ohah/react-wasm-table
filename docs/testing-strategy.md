# Testing Strategy

Every module is testable in complete isolation. No test requires another module to be
built, running, or available.

## Principle: Test at the Boundary

Each module has a clear input/output contract. Tests verify that contract, not
internal implementation. This means modules can be refactored freely as long as
their contract holds.

## Module Test Matrix

| Module          | Runner       | Environment   | Mock deps?              | Key technique            |
| --------------- | ------------ | ------------- | ----------------------- | ------------------------ |
| **core** (Rust) | `cargo test` | Native        | None needed             | Pure functions, no I/O   |
| **adapter**     | `bun test`   | happy-dom     | WASM module mocked      | Class unit tests         |
| **renderer**    | `bun test`   | happy-dom     | None needed             | Draw call recording      |
| **react**       | `bun test`   | happy-dom     | Adapter/renderer mocked | Component lifecycle      |

---

## 1. core (Rust) — `cargo test -p react-wasm-table-core`

No mocks, no browser, no WASM. Pure Rust unit tests.

### columnar_store

The primary data store. Tests cover both `ingest_rows` (serde path) and direct
column setters (`init` → `set_column_*` → `finalize`).

```rust
#[test]
fn direct_ingestion_roundtrip_with_sort() {
    let mut store = ColumnarStore::new();
    store.init(3, 4);
    store.set_column_strings(0, &["Alice","Bob","Carol","Dave"], &[0,1,2,3]);
    store.set_column_float64(1, &[30.0, 25.0, 35.0, 28.0]);
    store.set_column_bool(2, &[1.0, 0.0, 1.0, f64::NAN]);
    store.finalize();

    store.set_sort(vec![SortConfig { column_index: 1, direction: Ascending }]);
    store.rebuild_view();
    assert_eq!(store.view_indices(), &[1, 3, 0, 2]);  // sorted by age ascending
}
```

Coverage targets:

- Column type detection (Float64, String, Bool)
- Float64 values stored correctly
- String interning (unique table + ID resolution)
- Bool encoding (true→1.0, false→0.0, null→NaN)
- Direct column setters: `init`, `set_column_float64`, `set_column_bool`, `set_column_strings`, `finalize`
- Sort on columnar data (`sort_indices_columnar`)
- Filter on columnar data (`filter_indices_columnar`)
- View rebuild idempotency (second `rebuild_view` is a no-op when not dirty)
- Scroll config stored correctly
- Generation tracking (increments on each ingest)
- Float64 pointer access for zero-copy

### sorting

```rust
#[test]
fn sort_ascending_numbers() {
    let mut rows = vec![vec![json!(3)], vec![json!(1)], vec![json!(2)]];
    let configs = vec![SortConfig { column_index: 0, direction: Ascending }];
    apply_sort(&mut rows, &configs, &columns);
    assert_eq!(rows, vec![vec![json!(1)], vec![json!(2)], vec![json!(3)]]);
}
```

Coverage targets:

- Ascending/descending sort
- String sort
- Multi-column sort (primary + secondary)

### filtering

Coverage targets:

- Each operator: `Equals`, `Contains`, `GreaterThan`
- Multiple conditions (AND logic)

### virtual_scroll

Coverage targets:

- Basic viewport calculation
- Scrolled position (middle of data)
- Near-end boundary (don't overshoot total rows)
- Overscan clamping (don't go below 0 or above total)
- Edge cases: 0 rows, fewer rows than viewport

### index_ops

Tests index indirection — sorting/filtering on `u32` indices without cloning row data.

Coverage targets:

- Identity indices generation
- `filter_indices` with Equals, Contains
- `sort_indices` ascending/descending
- Pipeline: filter then sort in sequence
- Cross-validation against `apply_sort` output

### layout (Taffy)

```rust
#[test]
fn fixed_width_columns() {
    let mut engine = LayoutEngine::new();
    let columns = vec![
        ColumnLayout { width: 200.0, flex_grow: 0.0, .. },
        ColumnLayout { width: 300.0, flex_grow: 0.0, .. },
    ];
    let viewport = Viewport { width: 500.0, .. };
    let layouts = engine.compute_header_layout(&columns, &viewport);

    assert_eq!(layouts[0].x, 0.0);
    assert_eq!(layouts[0].width, 200.0);
    assert_eq!(layouts[1].x, 200.0);
    assert_eq!(layouts[1].width, 300.0);
}

#[test]
fn flex_grow_column_fills_remaining_space() {
    let mut engine = LayoutEngine::new();
    let columns = vec![
        ColumnLayout { width: 100.0, flex_grow: 0.0, .. },
        ColumnLayout { width: 0.0, flex_grow: 1.0, .. },  // takes remaining
    ];
    let viewport = Viewport { width: 600.0, .. };
    let layouts = engine.compute_header_layout(&columns, &viewport);

    assert_eq!(layouts[0].width, 100.0);
    assert_eq!(layouts[1].width, 400.0);  // fill remaining
}
```

Coverage targets:

- Fixed-width columns
- Flex-grow distribution
- Min/max width constraints
- Row layout y-offset accumulation
- Scroll offsets (y-position shifts, x/width unchanged)
- Partial-row scroll offsets
- Header always pinned at y=0 regardless of scroll
- `compute_into_buffer` matches struct-based API output
- Empty range handling

### layout_buffer

Coverage targets:

- `write_cell` / `read_cell` round-trip (all 8 stride fields)
- Alignment enum encoding (0.0=Left, 1.0=Center, 2.0=Right)
- `buf_len` calculation (0→0, 1→8, 10→80)

### data_store

Row-major store with index indirection. Internal module, not used by WASM layer.

Coverage targets:

- Data loading and query
- Sort and filter integration via `query_indexed`
- View indices correctness after sort/filter
- Generation tracking
- `rebuild_view` idempotency

---

## 2. wasm — `crates/wasm/`

The WASM crate is a thin binding layer. All business logic is tested in `core`.
No `wasm_bindgen_test` tests exist — correctness is verified through:

1. Core Rust tests (all logic lives in `core`)
2. JS adapter tests with engine mocks (verifying call sequences)
3. Manual demo testing with real WASM module

---

## 3. adapter — `bun test packages/grid/src/adapter/`

### ColumnRegistry tests

```typescript
describe("ColumnRegistry", () => {
  it("registers and retrieves a column", () => {
    const reg = new ColumnRegistry();
    reg.register("name", { id: "name", width: 200, header: "Name" });
    expect(reg.get("name")).toBeDefined();
    expect(reg.size).toBe(1);
  });

  it("calls onChange listeners on register", () => {
    const reg = new ColumnRegistry();
    const calls: number[] = [];
    reg.onChange(() => calls.push(1));
    reg.register("x", { id: "x", width: 100, header: "X" });
    expect(calls.length).toBe(1);
  });

  it("unsubscribes onChange listener", () => {
    const reg = new ColumnRegistry();
    const calls: number[] = [];
    const unsub = reg.onChange(() => calls.push(1));
    unsub();
    reg.register("x", { id: "x", width: 100, header: "X" });
    expect(calls.length).toBe(0);
  });

  it("setAll replaces all columns at once", () => {
    const reg = new ColumnRegistry();
    reg.register("old", { id: "old", width: 100, header: "Old" });
    reg.setAll([
      { id: "a", width: 200, header: "A" },
      { id: "b", width: 300, header: "B" },
    ]);
    expect(reg.get("old")).toBeUndefined();
    expect(reg.size).toBe(2);
  });
});
```

Coverage targets:

- Register/unregister ordering
- `getAll` preserves insertion order
- Update on re-register (same ID replaces, size stays same)
- `onChange` notification on register/unregister
- `onChange` unsubscribe function works
- `setAll` bulk replace (clears previous, sets new)
- `setAll` notifies listeners once
- `setAll` with empty array clears all

### DataIngestor tests

```typescript
describe("classifyColumns", () => {
  it("detects float64 columns", () => {
    const data = [{ id: 1, salary: 50000 }];
    expect(classifyColumns(data, ["id", "salary"])).toEqual(["float64", "float64"]);
  });

  it("skips null to find real type", () => {
    const data = [{ x: null }, { x: 42 }];
    expect(classifyColumns(data, ["x"])).toEqual(["float64"]);
  });

  it("defaults to string for all-null columns", () => {
    const data = [{ x: null }];
    expect(classifyColumns(data, ["x"])).toEqual(["string"]);
  });
});

describe("ingestData", () => {
  it("calls engine methods in correct order", () => {
    const engine = {
      initColumnar: mock(),
      ingestFloat64Column: mock(),
      ingestBoolColumn: mock(),
      ingestStringColumn: mock(),
      finalizeColumnar: mock(),
    };
    ingestData(engine, data, columnIds);
    expect(engine.initColumnar).toHaveBeenCalledWith(colCount, rowCount);
    expect(engine.finalizeColumnar).toHaveBeenCalled();
  });
});
```

Coverage targets:

- Type classification: float64, string, bool, null-skip, all-null default
- `buildFloat64Column`: correct values, NaN for null
- `buildBoolColumn`: true→1.0, false→0.0, null→NaN
- `buildStringColumn`: string interning, deduplication, null→empty string (ID 0)
- `ingestData`: engine method call order (init → ingest per column → finalize)

### InstructionBuilder tests

Coverage targets:

- Text instruction for plain string values
- Number-to-text conversion
- Null/undefined → empty string
- Render prop (`children` function) execution → custom instruction
- Error fallback to text when render prop throws
- Invalid return fallback to text

### Scroll tests

Tests extracted pure functions for scroll clamping and layout splitting.

```typescript
describe("scroll clamping", () => {
  it("does not scroll below zero", () => {
    expect(clampScroll(0, -100, 1000, 36, 460)).toBe(0);
  });

  it("does not scroll past maximum", () => {
    const max = 1000 * 36 - 460;
    expect(clampScroll(0, 999999, 1000, 36, 460)).toBe(max);
  });
});

describe("layout split", () => {
  it("splits header from rows by column count", () => {
    const { header, rows } = splitLayouts(allLayouts, colCount);
    expect(header.length).toBe(colCount);
  });
});
```

Coverage targets:

- Scroll clamping: zero floor, max ceiling, accumulation
- Content-fits-in-viewport case (max = 0)
- Layout split: header vs rows by column count
- Empty layout handling
- Alignment normalization ("Center"→"center", "Left"→"left", etc.)

---

## 4. renderer — `bun test packages/grid/src/renderer/`

### Approach: Draw Call Recording

Instead of checking pixels, spy on `CanvasRenderingContext2D` methods.

```typescript
describe("CanvasRenderer", () => {
  it("draws text cell at correct position", () => {
    const { canvas, calls } = createMockCanvas();
    const renderer = new CanvasRenderer();
    renderer.attach(canvas);

    renderer.drawRowsFromBuffer(buf, 0, cellCount, getInstruction, theme, headerHeight);

    const textCall = calls.find((c) => c.method === "fillText" && c.args[0] === "Alice");
    expect(textCall).toBeTruthy();
  });
});
```

Coverage targets:

- Buffer-based header drawing (`drawHeaderFromBuffer`)
- Buffer-based row drawing (`drawRowsFromBuffer`)
- Grid line drawing (`drawGridLinesFromBuffer`)
- Theme application (colors, fonts)
- Text cell positioning
- Badge cell rendering

---

## 5. react — `bun test packages/grid/src/react/`

### Component tests

```typescript
describe("Column", () => {
  it("registers on mount and unregisters on unmount", () => {
    const registry = new ColumnRegistry();
    // render Column inside Grid context → verify registration
    // unmount → verify unregistration
  });
});

describe("Grid", () => {
  it("renders a canvas element", () => {
    // render Grid → verify canvas exists in container
  });

  it("accepts columns prop for object-based API", () => {
    // render Grid with columns prop → verify columnRegistry.setAll called
  });
});
```

The react module tests mock the adapter and renderer to test React behavior only.

---

## Performance Tests (planned)

Benchmark critical hot paths to prevent regressions.

```rust
// Rust benchmarks (cargo bench)
#[bench]
fn bench_sort_columnar_100k(b: &mut Bencher) {
    let store = generate_columnar_store(100_000);
    let mut indices = identity_indices(100_000);
    b.iter(|| {
        sort_indices_columnar(&mut indices, &store, &configs);
    });
}

#[bench]
fn bench_layout_30_visible_rows(b: &mut Bencher) {
    let mut engine = LayoutEngine::new();
    let columns = generate_columns(10);
    let viewport = Viewport { width: 1200.0, height: 600.0, row_height: 36.0, .. };
    let mut buf = vec![0.0f32; buf_len(10 * 31)];  // 30 rows + header × 10 cols
    b.iter(|| {
        engine.compute_into_buffer(&columns, &viewport, 0..30, &mut buf);
    });
}
```

---

## CI Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  rust-tests:
    - cargo test --workspace
    - cargo clippy --workspace -- -D warnings
    - cargo fmt --check

  js-tests:
    - bun test packages/
    - bun run lint:all

  build:
    needs: [rust-tests, js-tests]
    - bun run build  # wasm + lib
```

Rust and JS tests run in parallel. Build runs only after all unit tests pass.
