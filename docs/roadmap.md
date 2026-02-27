# Feature Roadmap

> **철학: "TanStack Table의 자유도 + Canvas/WASM의 성능"**
>
> AG Grid처럼 기능을 내장하지 않는다.
> 사용자가 조합할 수 있는 **primitive와 hook**을 제공하고,
> WASM/Canvas가 줄 수 있는 **성능 이점**에 집중한다.

---

## 설계 원칙

1. **Headless first** — 로직과 상태만 제공, UI 결정은 사용자 몫
2. **Controlled & Uncontrolled** — 모든 상태는 `state` + `onStateChange` 패턴 (TanStack 방식)
3. **Primitive over Feature** — "Column Pinning 기능"이 아니라 "multi-region render primitive"
4. **Zero-copy by default** — WASM 메모리 직접 접근이 기본, 복사는 사용자 선택
5. **Tree-shakeable** — 안 쓰는 기능은 번들에 포함되지 않음

---

---

## Phase 1 — Core Primitive 강화

현재 아키텍처의 기반 primitive를 더 열어서 조합성을 높인다.

### 1-1. Row Model Abstraction ✅ (구현 완료)

현재 WASM 쪽 index indirection(정렬/필터)이 내부에 묶여 있다.
이걸 **Row Model** 개념으로 추상화하면 그 위에 모든 기능이 조합 가능해진다.

```ts
// 사용자가 Row Model을 선택/조합
const table = useGridTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(), // 기본
  getSortedRowModel: getSortedRowModel(), // 정렬
  getFilteredRowModel: getFilteredRowModel(), // 필터
  // 향후 확장:
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
});
```

- WASM 내부의 IndexOps를 Row Model 단위로 분리
- 각 Row Model은 독립적으로 tree-shake 가능
- 사용자가 커스텀 Row Model을 만들 수 있는 인터페이스

**구현 내역:**

- Rust: `FilterOp`, `FilterValue`, `ColumnFilter`, `GlobalFilter` 타입 + 필터 로직
- WASM: `setColumnarFilters()`, `setGlobalFilter()` 바인딩
- TS: `Row<TData>`, `RowModel<TData>` 인터페이스 + `buildRow`/`buildRowModel` 빌더
- TS: `getCoreRowModel()`, `getSortedRowModel()`, `getFilteredRowModel()` 팩토리
- Hook: `useFiltering` (controlled/uncontrolled, column ID→index 변환)
- GridInstance: `getRowModel()`, `getCoreRowModel()`, `getRow()`, filter 메서드
- 175 Rust 테스트, 571 JS 테스트 통과

### 1-2. Column Feature API — State ✅ / Rendering ✅ (Pinning 제외)

컬럼별 기능(정렬, 선택, 크기 조절 등)을 Feature 단위로 분리.

```ts
const columns = [
  helper.accessor("name", {
    size: 200,
    enableSorting: true,
    enableResizing: true,
    enableSelection: true,
    // 사용자가 커스텀 feature를 끼울 수 있는 구조
  }),
];
```

- 각 Feature는 독립 모듈 (sorting, resizing, selection, ...)
- Feature 간 의존성 없음 — 필요한 것만 import
- Feature마다 `getCanX()`, `getIsX()`, `toggleX()` 패턴 통일

**구현 상태:**

| 기능        | State API | 렌더링 연결 | 비고                                                       |
| ----------- | --------- | ----------- | ---------------------------------------------------------- |
| Visibility  | ✅        | ✅          | `resolveColumns`에서 hidden 컬럼 제외                      |
| Sizing      | ✅        | ✅          | `resolveColumns`에서 width override                        |
| Ordering    | ✅        | ✅          | `resolveColumns`에서 `columnOrder` 기준 정렬               |
| Drag Resize | ✅        | ✅          | EventManager resize handle hit-test + `useColumnResize` 훅 |
| Pinning     | ✅        | ❌          | state만 존재, multi-region 렌더링 필요 (→ Phase 3-3)       |

**구현 내역 (Ordering + Drag Resize):**

- `ColumnOrderState`, `ColumnOrderUpdater` 타입 추가 (`tanstack-types.ts`)
- `resolveColumns`에서 `columnOrder` 옵션으로 컬럼 순서 재배치 (order에 없는 컬럼은 뒤로)
- `EventManager`에 resize handle hit-test (`findResizeHandle`, 5px zone) + resize drag 시퀀스
- `useColumnResize` 훅: controlled/uncontrolled 모드, min/max width clamp, 커서 변경
- `useEventAttachment`에 resize 핸들러 연결
- 테스트: resolve-columns ordering 4개, event-manager resize 5개, use-column-resize 7개

**미구현 항목:**

- **Pinning 렌더링**: `columnPinning` state를 읽어 left/right frozen region에 고정 렌더링. Phase 3-3 Virtual Canvas Region 선행 필요.

### 1-3. Event System 개방

현재 EventManager가 내부에서 이벤트를 소비한다.
이를 **미들웨어 체인**으로 열어서 사용자가 이벤트 파이프라인에 끼어들 수 있게 한다.

```ts
<Grid
  onCellClick={(e, cell) => { /* 사용자 핸들러 */ }}
  onCellDoubleClick={(e, cell) => { /* ... */ }}
  onHeaderClick={(e, header) => { /* ... */ }}
  // 저수준 접근
  onCanvasEvent={(e) => { /* raw canvas event + hit-test 결과 */ }}
/>
```

- hit-test 결과를 포함한 enriched event 제공
- 이벤트 버블링/캡처 단계 지원
- 사용자가 기본 동작을 `preventDefault()`로 막을 수 있음

---

## Phase 2 — 상태 관리 Primitive

### 2-1. Column Ordering State ✅ (구현 완료)

Column Pinning, Reorder를 "기능"으로 만들지 않고 **상태**로 노출.

```ts
const [columnOrder, setColumnOrder] = useState<string[]>(["name", "price", "status"]);
const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
  left: ["name"],
  right: [],
});

<Grid
  columnOrder={columnOrder}
  onColumnOrderChange={setColumnOrder}
  columnPinning={columnPinning}
  onColumnPinningChange={setColumnPinning}
/>
```

- Pinning = "어떤 컬럼이 어느 영역에 속하는지" 상태일 뿐
- Reorder = "컬럼 순서" 상태일 뿐
- 렌더링은 Grid가 상태를 읽어서 multi-region으로 처리
- 드래그 UI는 사용자가 구현 (또는 선택적 유틸리티 제공)

**구현 내역:**

- `ColumnOrderState` (`string[]`), `ColumnOrderUpdater` 타입
- `GridProps.columnOrder`, `GridProps.onColumnOrderChange` prop
- `resolveColumns()`에서 flatten 후 `columnOrder` 기준 재정렬
- visibility와 ordering 조합 동작 (hidden → 제거 → 순서 정렬)

### 2-2. Expanding State (Row Grouping / Tree 기반) — getExpandedRowModel ✅

Row Grouping이나 Tree를 "기능"으로 내장하지 않는다.
**expanded 상태 + Row Model 조합**으로 사용자가 구현한다.

```ts
const [expanded, setExpanded] = useState<ExpandedState>({});

const table = useGridTable({
  data,
  columns,
  getSubRows: (row) => row.children, // Tree
  getGroupedRowModel: getGroupedRowModel(), // 또는 Grouping (미구현)
  getExpandedRowModel: getExpandedRowModel(),
  expanded,
  onExpandedChange: setExpanded,
});
```

- `getSubRows` — 사용자가 계층 구조를 정의
- `getGroupedRowModel` — 그룹핑 로직 (미구현, 별도 Phase)
- expanded state — 어떤 행이 펼쳐져 있는지
- 시각적 표현(들여쓰기, 아이콘)은 `cell` render prop에서 사용자가 결정

**구현 내역 (getExpandedRowModel):**

- `ExpandedState` (`true | Record<string, boolean>`), `ExpandedUpdater` 타입
- `Row<TData>` 트리 필드: `subRows`, `depth`, `parentId`, `getCanExpand()`, `getIsExpanded()`, `toggleExpanded()`, `getLeafRows()`
- `getExpandedRowModel()` 팩토리 + `buildExpandedRowModel()` 빌더
- `GridInstance` expanding 메서드: `setExpanded`, `resetExpanded`, `getIsAllRowsExpanded`, `toggleAllRowsExpanded`, `getExpandedRowModel`
- `useGridTable`: controlled/uncontrolled expanded state, `getSubRows` 옵션
- 테스트: 38 row-model, 95 grid-instance, 63 use-grid-table (총 715 JS 테스트)

### 2-3. Column Visibility State ✅ (구현 완료)

```ts
const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
  price: false,  // 숨김
});

<Grid
  columnVisibility={columnVisibility}
  onColumnVisibilityChange={setColumnVisibility}
/>
```

- 토글 UI는 사용자 구현
- Grid는 visible 컬럼만 WASM에 전달

---

## Phase 3 — 렌더링 Primitive

Canvas 렌더링이라는 강점을 극대화하는 primitive.

### 3-1. Custom Cell Renderer API

현재 RenderInstruction(Text, Badge, Flex, Stub)을 확장 가능하게.

```ts
// 사용자가 커스텀 렌더러 등록
const sparklineRenderer: CellRenderer<SparklineInstruction> = {
  type: "sparkline",
  draw(ctx, layout, instruction) {
    // Canvas 2D API로 직접 그리기
    const { values, color } = instruction;
    // ... sparkline 그리기 로직
  },
  measure(ctx, instruction) {
    return { width: 80, height: 20 };
  },
};

<Grid cellRenderers={[sparklineRenderer]}>
```

- 기본 렌더러(Text, Badge, Flex)는 built-in
- 사용자가 커스텀 렌더러를 등록하면 `cell` render prop에서 해당 타입의 instruction을 반환 가능
- Sparkline, ProgressBar, Heatmap 등은 **예제/레시피**로 제공 (내장 X)

### 3-2. Layer System

Canvas에 레이어를 쌓을 수 있는 구조.

```ts
<Grid
  layers={[
    gridLayer(),          // 기본 셀 그리기 (built-in)
    selectionLayer(),     // 선택 하이라이트
    frozenColumnsLayer(), // 고정 컬럼 오버레이
    customLayer((ctx, viewport) => {
      // 사용자 커스텀 드로잉 (워터마크, 오버레이, etc.)
    }),
  ]}
/>
```

- 현재 CanvasRenderer의 draw 순서를 레이어 개념으로 추상화
- 사용자가 렌더 파이프라인에 끼어들 수 있음
- Column Pinning의 "고정 영역 렌더링"도 레이어 하나일 뿐

### 3-3. Virtual Canvas Region

하나의 Grid에 여러 가상 영역을 둘 수 있는 primitive.
Column Pinning의 실제 구현체.

- Left frozen region + scrollable region + right frozen region
- 각 region은 독립적으로 스크롤/렌더
- WASM layout은 region별로 분리 계산

---

## Phase 4 — 데이터 접근 API

"Export" 같은 기능을 내장하지 않고, 데이터에 접근하는 API를 잘 열어준다.

### 4-1. Data Access API

```ts
const table = useGridTable({ ... });

// 현재 보이는 행 (필터/정렬 적용 후)
const visibleRows = table.getRowModel().rows;

// 모든 행 (원본)
const allRows = table.getCoreRowModel().rows;

// 특정 셀 값
const value = table.getRow(rowId).getValue("price");

// 선택된 범위의 데이터
const selectedData = table.getSelectedData();
```

- 이 API만 있으면 CSV/Excel/JSON export는 사용자가 10줄로 구현
- 공식 유틸리티로 `exportToCSV(table)`, `exportToTSV(table)` 헬퍼 선택 제공
- WASM Excel 생성은 별도 패키지(`@react-wasm-table/export-xlsx`)로 opt-in

### 4-2. Clipboard Utilities

Clipboard도 "기능"이 아닌 **유틸리티**.

```ts
import { copyToClipboard, pasteFromClipboard } from "@react-wasm-table/clipboard";

// Grid의 onCopy/onPaste에 연결
<Grid
  onCopy={(selection) => copyToClipboard(table, selection)}
  onPaste={(data, target) => pasteFromClipboard(table, data, target)}
/>
```

- 기본 TSV 복사는 이미 `buildTSV()` 존재
- HTML 포맷, Excel 호환 포맷은 유틸리티로 제공
- 사용자가 커스텀 포맷/변환 로직을 끼울 수 있음

---

## Phase 5 — 성능 Primitive

WASM/Canvas 아키텍처만이 줄 수 있는 성능 이점.

### 5-1. Worker Bridge

```ts
const engine = useWorkerEngine({
  wasmUrl: "/table_core_bg.wasm",
  // WASM 엔진을 Web Worker에서 실행
});

<Grid engine={engine} ... />
```

- 정렬/필터/레이아웃 연산을 Worker에서 실행
- SharedArrayBuffer로 결과 공유 (복사 없음)
- 메인 스레드는 렌더링만 담당
- opt-in — 기본은 메인 스레드

### 5-2. Streaming Data

대용량 데이터의 점진적 로딩.

```ts
<Grid
  data={streamingData}
  onFetchMore={(startIndex, count) => {
    // 사용자가 데이터 페칭 로직 구현
    return fetchPage(startIndex, count);
  }}
  totalCount={1_000_000}
/>
```

- 무한 스크롤 / 가상화 데이터 소스
- WASM 쪽 ColumnarStore에 chunk 단위 append
- 사용자가 데이터 소스(REST, GraphQL, WebSocket)를 자유롭게 선택

### 5-3. Layout Cache

WASM 레이아웃 결과를 캐싱해서 불필요한 재계산 방지.

- Generation 기반 캐시 무효화 (이미 MemoryBridge에 기반 존재)
- 컬럼 크기 변경 시에만 전체 재계산, 스크롤은 부분 계산
- 사용자가 `invalidateLayout()` 으로 수동 무효화 가능

---

## 패키지 구조 (향후)

```
@react-wasm-table/core          # Grid, Column, hooks, types
@react-wasm-table/wasm          # WASM 바이너리 + 로더
@react-wasm-table/sorting       # getSortedRowModel
@react-wasm-table/filtering     # getFilteredRowModel
@react-wasm-table/grouping      # getGroupedRowModel + expanding
@react-wasm-table/selection      # SelectionManager + hooks
@react-wasm-table/clipboard     # copy/paste utilities
@react-wasm-table/export-xlsx   # WASM Excel 생성 (opt-in)
@react-wasm-table/renderers     # Sparkline, ProgressBar 등 레시피
```

- 각 패키지는 독립 tree-shake 가능
- core만 있으면 기본 테이블 동작
- 나머지는 필요할 때 추가

---

## 우선순위 요약

| 순위 | 항목                          | 카테고리 | 상태 | 이유                                                               |
| ---- | ----------------------------- | -------- | ---- | ------------------------------------------------------------------ |
| 1    | Row Model Abstraction         | Core     | ✅   | 이후 모든 기능의 토대                                              |
| 2    | Column Feature API            | Core     | ✅\* | 기능별 독립 모듈화 기반 (\*Pinning 렌더링 제외)                    |
| 3    | Event System 개방             | Core     | 🔧   | 사용자 인터랙션 확장의 전제 (기본 콜백 존재, 미들웨어 체인 미구현) |
| 4    | Column Ordering/Pinning State | State    | ✅\* | Ordering ✅, Visibility ✅, Pinning State ✅ / 렌더링 ❌           |
| 5    | Custom Cell Renderer          | Render   | ❌   | Canvas 차별화의 핵심                                               |
| 6    | Data Access API               | Data     | 🔧   | getRowModel 등 기반 존재, export 유틸 미구현                       |
| 7    | Layer System                  | Render   | ❌   | Pinning 구현 + 확장성 (onAfterDraw 진입점만 존재)                  |
| 8    | Expanding State               | State    | ✅\* | getExpandedRowModel ✅, getGroupedRowModel ❌                      |
| 9    | Worker Bridge                 | Perf     | ❌   | WASM 성능 극대화                                                   |
| 10   | Streaming Data                | Perf     | ❌   | 대용량 데이터 시나리오                                             |

---

## TanStack Table과의 차이점 (포지셔닝)

|             | TanStack Table   | react-wasm-table                           |
| ----------- | ---------------- | ------------------------------------------ |
| 렌더링      | 없음 (headless)  | Canvas (성능)                              |
| 레이아웃    | 없음 (DOM 위임)  | Taffy flexbox (WASM)                       |
| 데이터 처리 | JS (메인 스레드) | Rust/WASM (+ Worker opt-in)                |
| 대용량      | 가상화 별도 구현 | 내장 가상 스크롤                           |
| 커스텀 셀   | JSX 자유         | Canvas RenderInstruction (+ 커스텀 렌더러) |
| 용도        | 범용 테이블      | **대용량 고성능 데이터 그리드**            |

> "TanStack Table처럼 자유롭지만, 10만 행도 60fps로 렌더링된다"
