# Testing Strategy

Every module is testable in complete isolation. No test requires another module to be
built, running, or available.

## Principle: Test at the Boundary

Each module has a clear input/output contract. Tests verify that contract, not
internal implementation. This means modules can be refactored freely as long as
their contract holds.

## Module Test Matrix

| Module          | Runner           | Environment                 | Mock deps?              | Key technique                  |
| --------------- | ---------------- | --------------------------- | ----------------------- | ------------------------------ |
| **core** (Rust) | `cargo test`     | Native                      | None needed             | Pure functions, no I/O         |
| **wasm** (Rust) | `wasm-pack test` | Headless browser            | None needed             | Round-trip serialization       |
| **adapter**     | `bun test`       | happy-dom                   | WASM module mocked      | Class unit tests               |
| **renderer**    | `bun test`       | happy-dom + OffscreenCanvas | None needed             | Draw call recording            |
| **react**       | `bun test`       | happy-dom                   | Adapter/renderer mocked | React Testing Library patterns |
| **integration** | `bun test`       | Playwright                  | Real WASM + real canvas | Pixel/interaction tests        |

---

## 1. core (Rust) — `cargo test -p react-wasm-table-core`

No mocks, no browser, no WASM. Pure Rust unit tests.

### sorting

```rust
#[test]
fn sort_ascending_numbers() {
    let mut rows = vec![vec![json!(3)], vec![json!(1)], vec![json!(2)]];
    let configs = vec![SortConfig { column_index: 0, direction: Ascending }];
    apply_sort(&mut rows, &configs);
    assert_eq!(rows, vec![vec![json!(1)], vec![json!(2)], vec![json!(3)]]);
}
```

Coverage targets:

- Each sort direction
- Each value type (number, string, bool, null)
- Multi-column sort (primary + secondary)
- Sort stability (equal elements preserve order)
- Empty input

### filtering

Coverage targets:

- Each operator: `Equals`, `NotEquals`, `Contains`, `GreaterThan`, `LessThan`, `GreaterThanOrEqual`, `LessThanOrEqual`
- Type coercion (string "100" vs number 100)
- Case-insensitive `Contains`
- Multiple conditions (all must match — AND)
- Empty result set

### virtual_scroll

Coverage targets:

- Basic viewport calculation
- Scrolled position (middle of data)
- Near-end boundary (don't overshoot total rows)
- Overscan clamping (don't go below 0 or above total)
- Edge cases: 0 rows, 1 row, fewer rows than viewport

### layout (Taffy)

```rust
#[test]
fn fixed_width_columns_match_viewport() {
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
fn flex_grow_distributes_remaining_space() {
    let mut engine = LayoutEngine::new();
    let columns = vec![
        ColumnLayout { width: 100.0, flex_grow: 0.0, .. },
        ColumnLayout { width: 0.0, flex_grow: 1.0, .. },  // takes remaining
    ];
    let viewport = Viewport { width: 500.0, .. };
    let layouts = engine.compute_header_layout(&columns, &viewport);

    assert_eq!(layouts[0].width, 100.0);
    assert_eq!(layouts[1].width, 400.0);  // 500 - 100
}
```

Coverage targets:

- Fixed width columns
- Flex-grow distribution
- Flex-shrink compression
- Min/max width constraints
- Multiple row layout (y-offset accumulation)
- Alignment (left/center/right)

### data_store (integration of above)

Coverage targets:

- Full pipeline: set data → set sort → set filter → query → verify result
- State management (changing sort doesn't lose data)
- Empty data edge case
- Large data (10K+ rows) — performance regression test

---

## 2. wasm — `wasm-pack test --headless --chrome`

Tests the serialization boundary between JS types and Rust types.

```rust
#[wasm_bindgen_test]
fn round_trip_columns() {
    let engine = TableEngine::new();
    let columns = JsValue::from_serde(&json!([
        {"key": "name", "header": "Name", "width": 200}
    ])).unwrap();
    engine.set_columns(columns).unwrap();
    assert_eq!(engine.row_count(), 0);
}
```

Coverage targets:

- Column definition round-trip
- Data loading (various types: string, number, bool, null)
- Sort config serialization (camelCase JS → snake_case Rust)
- Filter condition serialization
- Query result deserialization (Rust → JsValue)
- Error cases: malformed JSON, missing fields, wrong types

---

## 3. adapter — `bun test packages/grid/src/adapter/`

### ColumnRegistry tests

```typescript
import { describe, it, expect } from "bun:test";
import { ColumnRegistry } from "./column-registry";

describe("ColumnRegistry", () => {
  it("maintains insertion order", () => {
    const registry = new ColumnRegistry();
    registry.register({ id: "b", width: 100, header: "B" });
    registry.register({ id: "a", width: 200, header: "A" });
    expect(registry.getAll().map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("notifies subscribers on change", () => {
    const registry = new ColumnRegistry();
    const calls: number[] = [];
    registry.subscribe(() => calls.push(1));
    registry.register({ id: "x", width: 100, header: "X" });
    expect(calls.length).toBe(1);
  });

  it("cleans up on unregister", () => {
    const registry = new ColumnRegistry();
    registry.register({ id: "a", width: 100, header: "A" });
    registry.unregister("a");
    expect(registry.getAll()).toEqual([]);
  });
});
```

### EventManager tests

Uses happy-dom with synthetic events. Mock `requestAnimationFrame`.

```typescript
describe("EventManager", () => {
  it("resolves click to cell coordinate", () => {
    const canvas = document.createElement("canvas");
    const manager = new EventManager(canvas);
    manager.setLayoutResolver((x, y) => ({ rowIndex: 0, columnId: "name" }));

    let clicked: CellCoord | null = null;
    manager.onCellClick((coord) => {
      clicked = coord;
    });
    manager.attach();

    canvas.dispatchEvent(new MouseEvent("click", { clientX: 50, clientY: 50 }));
    expect(clicked).toEqual({ rowIndex: 0, columnId: "name" });
  });
});
```

### EditorManager tests

```typescript
describe("EditorManager", () => {
  it("creates and positions input overlay", () => {
    const container = document.createElement("div");
    const manager = new EditorManager(container);

    manager.open(
      { rowIndex: 0, columnId: "name" },
      { type: "text", value: "Alice", position: { x: 10, y: 40, width: 200, height: 36 } },
    );

    const input = container.querySelector("input");
    expect(input).toBeTruthy();
    expect(input!.value).toBe("Alice");
    expect(manager.isOpen()).toBe(true);
  });

  it("commits value on enter", () => {
    // ...
  });

  it("cancels on escape", () => {
    // ...
  });
});
```

---

## 4. renderer — `bun test packages/grid/src/renderer/`

### Approach: Draw Call Recording

Instead of checking pixels, we spy on `CanvasRenderingContext2D` methods.

```typescript
function createMockCanvas(): { canvas: HTMLCanvasElement; calls: DrawCall[] } {
  const canvas = document.createElement("canvas");
  const calls: DrawCall[] = [];
  const ctx = canvas.getContext("2d")!;

  // Proxy draw calls
  const original = ctx.fillText.bind(ctx);
  ctx.fillText = (text: string, x: number, y: number) => {
    calls.push({ method: "fillText", args: [text, x, y] });
    original(text, x, y);
  };
  // ... same for fillRect, strokeRect, etc.

  return { canvas, calls };
}

describe("CanvasRenderer", () => {
  it("draws text cell at correct position", () => {
    const { canvas, calls } = createMockCanvas();
    const renderer = new CanvasRenderer(canvas);

    renderer.render({
      headerLayouts: [],
      headerContents: [],
      bodyLayouts: [{ row: 0, col: 0, x: 10, y: 40, width: 200, height: 36, contentAlign: "left" }],
      bodyContents: [{ type: "text", value: "Alice" }],
      // ...
    });

    const textCall = calls.find((c) => c.method === "fillText" && c.args[0] === "Alice");
    expect(textCall).toBeTruthy();
  });
});
```

### HitTest tests

```typescript
describe("hitTest", () => {
  it("returns correct cell for click inside cell bounds", () => {
    const renderer = new CanvasRenderer(canvas);
    renderer.render(frame); // set up layout data
    expect(renderer.hitTest(50, 55)).toEqual({ rowIndex: 0, columnId: "name" });
  });

  it("returns null for click outside grid", () => {
    expect(renderer.hitTest(9999, 9999)).toBeNull();
  });
});
```

---

## 5. react — `bun test packages/grid/src/react/`

### Component tests (React Testing Library-style)

```typescript
import { renderToString } from "react-dom/server";

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

  it("passes column configs to adapter", () => {
    // render Grid with Columns → verify adapter receives correct configs
  });
});
```

The react module tests mock the adapter and renderer to test React behavior only.

---

## 6. Integration Tests

**Runner:** Playwright (headless Chromium)
**Path:** `tests/integration/`

End-to-end tests that wire all modules together with a real canvas.

```typescript
test("scroll renders correct rows", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // Verify initial render
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  // Scroll down
  await canvas.evaluate((el) => el.dispatchEvent(new WheelEvent("wheel", { deltaY: 500 })));

  // Verify rendered content changed (via accessibility overlay or screenshot)
});

test("sort changes column order", async ({ page }) => {
  // Click header → verify data re-renders in sorted order
});

test("editor opens on double-click", async ({ page }) => {
  // Double-click cell → verify input overlay appears
  // Type new value → press Enter → verify cell updated
});
```

---

## Performance Tests

**Path:** `tests/perf/`

Benchmark critical hot paths to prevent regressions.

```rust
// Rust benchmarks (cargo bench)
#[bench]
fn bench_sort_100k_rows(b: &mut Bencher) {
    let rows = generate_rows(100_000);
    b.iter(|| {
        let mut data = rows.clone();
        apply_sort(&mut data, &[SortConfig { column_index: 0, direction: Ascending }]);
    });
}

#[bench]
fn bench_layout_30_visible_rows(b: &mut Bencher) {
    let mut engine = LayoutEngine::new();
    let columns = generate_columns(10);
    let viewport = Viewport { width: 1200.0, height: 600.0, row_height: 36.0, .. };
    b.iter(|| {
        engine.compute_rows_layout(&columns, &viewport, 0..30);
    });
}
```

```typescript
// JS benchmarks (bun)
Bun.bench("canvas render 30 rows × 10 cols", () => {
  renderer.render(frame300cells);
});

Bun.bench("hitTest lookup", () => {
  renderer.hitTest(500, 300);
});
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

  wasm-tests:
    - wasm-pack test --headless --chrome

  integration:
    needs: [rust-tests, js-tests, wasm-tests]
    - bun run build
    - bun run test:integration
```

Rust, JS, and WASM tests run in parallel. Integration tests run only after all
unit tests pass.
