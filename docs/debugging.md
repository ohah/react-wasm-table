# Debugging

Canvas와 WASM은 DOM처럼 DevTools로 바로 볼 수 없다.
모든 레이어에 디버그 로그를 내장하여 데이터 흐름을 항상 추적 가능하게 한다.

## Debug Mode 활성화

```tsx
<Grid data={data} debug>
  <Column id="name" width={200} />
</Grid>
```

`debug` prop 하나로 전체 파이프라인 로그가 켜진다.
프로덕션 빌드에서는 tree-shake로 제거된다.

## 레이어별 로그

### Layer 1: React — `[grid:react]`

Column 등록/해제, props 변경 추적.

```
[grid:react] Column registered: { id: "name", width: 200 }
[grid:react] Column registered: { id: "price", width: 100, align: "right" }
[grid:react] Column updated: "price" { width: 100 → 150 }
[grid:react] Column unregistered: "price"
[grid:react] Grid mount: { width: 800, height: 600, columns: 3, rows: 10000 }
[grid:react] Grid unmount
```

### Layer 2: Adapter — `[grid:adapter]`

이벤트 해석, 에디터 라이프사이클.

```
[grid:adapter] Click → hitTest(412, 187) → { row: 4, col: "name" }
[grid:adapter] Scroll → scrollTop: 1440 (rAF batched, 3 events merged)
[grid:adapter] Editor open: { row: 4, col: "price", type: "number", value: 200 }
[grid:adapter] Editor commit: { row: 4, col: "price", value: 200 → 350 }
[grid:adapter] Editor cancel: { row: 4, col: "price" }
[grid:adapter] Sort change: [{ col: "name", dir: "asc" }]
[grid:adapter] Filter change: [{ col: "price", op: "gt", value: 100 }]
```

### Layer 3: WASM Core — `[grid:wasm]`

데이터 파이프라인 + Taffy 레이아웃 결과.

```
[grid:wasm] setData: 10000 rows, 5 columns
[grid:wasm] query(scrollTop=1440):
  → filter: 10000 → 3200 rows (2 conditions, 0.8ms)
  → sort: 3200 rows by [name ASC] (1.2ms)
  → virtualSlice: rows 40..70 (visible: 30, overscan: 5)
  → layout: 30 rows × 5 cols = 150 cells (0.1ms)
  → total: 2.1ms
[grid:wasm] layout result sample:
  [0] { row: 40, col: 0, x: 0, y: 0, w: 200, h: 36 }
  [1] { row: 40, col: 1, x: 200, y: 0, w: 100, h: 36 }
  ...
```

### Layer 4: Renderer — `[grid:renderer]`

프레임 렌더링 성능 + draw call 수.

```
[grid:renderer] render frame:
  → clear: 800×600
  → header: 5 cells
  → body: 150 cells (30 rows × 5 cols)
  → selection: 1 range highlight
  → grid lines: 35 horizontal + 6 vertical
  → total draw calls: 197
  → frame time: 1.4ms
[grid:renderer] hitTest(412, 187):
  → scan 150 cells → match { row: 4, col: 1, x: 200, y: 144, w: 100, h: 36 }
```

## 시각적 디버그 오버레이

`debug` 모드에서 canvas 위에 오버레이를 그린다.

```tsx
<Grid data={data} debug debugOverlay>
```

| 오버레이               | 표시 내용                                          |
| ---------------------- | -------------------------------------------------- |
| **셀 경계**            | 각 셀의 Taffy 레이아웃 결과를 빨간 테두리로        |
| **셀 좌표**            | 각 셀 좌상단에 `(row, col)` 표시                   |
| **가상 스크롤 윈도우** | 전체 높이 대비 현재 보이는 영역 표시               |
| **히트 영역**          | 마우스 호버 시 해당 셀 하이라이트 + 좌표 표시      |
| **FPS 카운터**         | 우상단에 프레임 레이트 표시                        |
| **파이프라인 타이밍**  | 좌하단에 filter/sort/layout/render 각 단계 ms 표시 |

```
┌──────────────────────────────────────────────┐
│ (0,0) Name    │ (0,1) Price │ (0,2) Status   │  FPS: 60
├───────────────┼─────────────┼────────────────┤
│ (1,0) Alice   │ (1,1) 100   │ (1,2) active   │
│ (2,0) Bob     │ (2,1) 200   │ (2,2) inactive │
│ ▓▓▓▓▓▓▓▓▓▓▓▓ │ ← hover     │                │
│ (4,0) Dave    │ (4,1) 150   │ (4,2) active   │
│ (5,0) Eve     │ (5,1) 300   │ (5,2) active   │  ┃ ← scroll
├───────────────┴─────────────┴────────────────┤  ┃    indicator
│ filter: 0.8ms | sort: 1.2ms | layout: 0.1ms │  ┃
│ render: 1.4ms | total: 3.5ms                 │
└──────────────────────────────────────────────┘
```

## DevTools 연동

### Grid Inspector

`window.__GRID_DEBUG__`로 런타임 상태에 접근 가능.

```js
// 브라우저 콘솔에서
__GRID_DEBUG__.getState();
// → { columns: [...], rowCount: 10000, sort: [...], filters: [...], scrollTop: 1440 }

__GRID_DEBUG__.getVisibleRows();
// → [{ index: 40, data: { name: "Alice", ... } }, ...]

__GRID_DEBUG__.getLayout();
// → [{ row: 40, col: 0, x: 0, y: 0, w: 200, h: 36 }, ...]

__GRID_DEBUG__.getCellAt(412, 187);
// → { row: 4, col: "price", value: 200, layout: { x: 200, y: 144, w: 100, h: 36 } }

__GRID_DEBUG__.profile(5000);
// → 5초간 프레임 프로파일링 후 결과 출력
// { frames: 300, avg: 1.2ms, p95: 2.8ms, p99: 4.1ms, dropped: 0 }
```

### Performance Timeline

`debug` 모드에서 `performance.mark`/`performance.measure`로 Chrome DevTools
Performance 탭에 타이밍이 표시된다.

```
grid:query           ├──── 2.1ms ────┤
  grid:filter        ├─ 0.8ms ─┤
  grid:sort                     ├ 1.2ms ┤
  grid:layout                            ├ 0.1ms┤
grid:render                                       ├── 1.4ms ──┤
```

Chrome DevTools → Performance → Record → 스크롤 → 각 단계별 병목 확인 가능.

## 로그 레벨

```tsx
<Grid debug="warn">   {/* warn + error만 */}
<Grid debug="info">   {/* info + warn + error */}
<Grid debug="verbose"> {/* 모든 로그 (기본값 when debug=true) */}
<Grid debug={false}>  {/* 로그 없음 (기본값) */}
```

## 구현 패턴

각 모듈은 자체 logger 인스턴스를 가진다.

```typescript
// 공통 logger
function createLogger(namespace: string) {
  return {
    verbose: (...args: unknown[]) =>
      logLevel >= VERBOSE && console.log(`[grid:${namespace}]`, ...args),
    info: (...args: unknown[]) => logLevel >= INFO && console.log(`[grid:${namespace}]`, ...args),
    warn: (...args: unknown[]) => logLevel >= WARN && console.warn(`[grid:${namespace}]`, ...args),
    error: (...args: unknown[]) =>
      logLevel >= ERROR && console.error(`[grid:${namespace}]`, ...args),
    time: (label: string) => logLevel >= VERBOSE && console.time(`[grid:${namespace}] ${label}`),
    timeEnd: (label: string) =>
      logLevel >= VERBOSE && console.timeEnd(`[grid:${namespace}] ${label}`),
  };
}

// 각 모듈에서
const log = createLogger("adapter");
log.info("Click → hitTest(%d, %d) → %o", x, y, coord);
```

Rust 쪽은 `web_sys::console::log_1`로 브라우저 콘솔에 직접 출력.
`#[cfg(feature = "debug")]`로 릴리스 빌드에서 완전 제거.

```rust
#[cfg(feature = "debug")]
macro_rules! grid_log {
    ($($arg:tt)*) => {
        web_sys::console::log_1(&format!("[grid:wasm] {}", format!($($arg)*)).into());
    };
}

#[cfg(not(feature = "debug"))]
macro_rules! grid_log {
    ($($arg:tt)*) => {};  // 컴파일 시 완전 제거
}
```
