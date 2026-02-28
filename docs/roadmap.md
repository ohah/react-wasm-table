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

### 1-2. Column Feature API — State ✅ / Rendering ✅

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
| Pinning     | ✅        | ✅          | clip-based region 렌더링 (Phase 3-3)                       |

**구현 내역 (Ordering + Drag Resize):**

- `ColumnOrderState`, `ColumnOrderUpdater` 타입 추가 (`tanstack-types.ts`)
- `resolveColumns`에서 `columnOrder` 옵션으로 컬럼 순서 재배치 (order에 없는 컬럼은 뒤로)
- `EventManager`에 resize handle hit-test (`findResizeHandle`, 5px zone) + resize drag 시퀀스
- `useColumnResize` 훅: controlled/uncontrolled 모드, min/max width clamp, 커서 변경
- `useEventAttachment`에 resize 핸들러 연결
- 테스트: resolve-columns ordering 4개, event-manager resize 5개, use-column-resize 7개

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

### 3-1. Custom Cell Renderer API ✅ (구현 완료)

현재 RenderInstruction(Text, Badge, Flex, Stub)을 확장 가능하게.

```ts
// 사용자가 커스텀 렌더러 등록
const progressRenderer: CellRenderer<ProgressInstruction> = {
  type: "progress",
  draw(instruction, { ctx, buf, cellIdx, theme }) {
    // Canvas 2D API로 직접 그리기 + layout reader로 위치 읽기
    const x = readCellX(buf, cellIdx);
    // ... progress bar 그리기 로직
  },
};

<Grid cellRenderers={[progressRenderer]} ... />
```

- 기본 렌더러(Text, Badge, Flex, Stub)는 built-in, `CellRendererRegistry`로 관리
- 사용자가 커스텀 렌더러를 등록하면 `cell` render prop에서 해당 타입의 instruction을 반환 가능
- 동일 type 등록 시 built-in override 가능
- Sparkline, ProgressBar, Heatmap 등은 **예제/레시피**로 제공 (내장 X)

**구현 내역:**

- `CellRenderer<T>` 인터페이스 + `InstructionLike` 타입 (커스텀 instruction 타입 허용)
- `CellRendererRegistry` 클래스 (`Map<string, CellRenderer>` 기반)
- `createCellRendererRegistry(userRenderers?)` 팩토리 (built-in 4개 + 사용자 merge)
- `canvas-renderer.ts` switch문 → registry dispatch 리팩토링
- `resolveInstruction()` 커스텀 타입 passthrough 수정
- `GridProps.cellRenderers` prop + `useRenderLoop` useMemo registry 생성
- Layout reader helpers (`readCellX` 등) public export (커스텀 렌더러 작성용)
- 23 cell-renderer 테스트 + 2 canvas-renderer 테스트 추가 (총 807 통과)
- 데모: ProgressBar 커스텀 렌더러 + badge override 토글

### 3-2. Layer System ✅ (구현 완료)

Canvas에 레이어를 쌓을 수 있는 구조.

```ts
<Grid
  layers={[
    headerLayer(),        // 헤더 행 그리기 (built-in)
    dataLayer(),          // 데이터 행 그리기 (built-in)
    gridLinesLayer(),     // 그리드 라인 (built-in)
    selectionLayer(),     // 선택 하이라이트 (built-in)
    // 사용자 커스텀 레이어 삽입 가능
  ]}
/>
```

- 현재 CanvasRenderer의 draw 순서를 레이어 개념으로 추상화
- 사용자가 렌더 파이프라인에 끼어들 수 있음
- Column Pinning의 "고정 영역 렌더링"도 레이어 하나일 뿐

**구현 내역:**

- `GridLayer`, `LayerContext`, `LayerSpace` public 타입
- `InternalLayerContext` — built-in 레이어 전용 내부 확장 (public 노출 없음)
- 4개 built-in 레이어 팩토리: `headerLayer()`, `dataLayer()`, `gridLinesLayer()`, `selectionLayer()`
- `DEFAULT_LAYERS` — 기존 하드코딩 draw 순서와 동일한 기본 스택
- `createAfterDrawLayer(callback)` — `onAfterDraw` 콜백을 viewport-space 레이어로 래핑
- Space 기반 자동 transform: content-space 레이어는 scroll translate 자동 적용, viewport-space 레이어는 screen coords
- `GridProps.layers` prop — 커스텀 레이어 스택 지정 시 기본 파이프라인 대체
- `onAfterDraw` 콜백은 레이어와 별도로 유지 (기존 호환)
- 15 layer 테스트, 전체 822 JS 테스트 통과
- 데모: Watermark(viewport) + Row Highlight(content) + 레이어 토글 체크박스

### 3-3. Virtual Canvas Region ✅ (구현 완료)

하나의 Grid에 여러 가상 영역을 둘 수 있는 primitive.
Column Pinning의 실제 구현체.

- Left frozen region + scrollable region + right frozen region
- 각 region은 독립적으로 스크롤/렌더
- Canvas `clip()` + `translate()` 기반 region 분할

**구현 내역:**

- `resolveColumns`에서 `columnPinning` 옵션으로 left→center→right 컬럼 재배치
- `computePinningInfo()` 헬퍼: visible 컬럼 기준 left/right/center count 계산
- `CanvasRegion` 타입 (name, clipRect, translateX) + `RegionLayout` 타입
- `buildRegions()` 함수: header cell width 기반으로 left/center/right clip rect + translate 계산
- Render loop: region별 `clip()` + `translate()` → layer 파이프라인 실행 → `restore()`
- `EventManager.toContentX()`: region-aware viewport→content 좌표 변환 (left: 고정, center: +scrollLeft, right: +totalContentWidth-canvasWidth)
- `StringTable` ID 기반 키: 컬럼 순서 변경에 무관한 데이터 조회
- `useDataIngestion` `columnRegistry.onChange` 구독: 컬럼 ID 순서 변경 시 WASM 데이터 재적재 (리사이즈 시 skip)
- Background fill `contentRight` (max cell edge) 사용: pinned region에서도 배경/그리드라인 정확 커버
- Pinning 미지정 시 단일 center region → 기존 동작과 동일 (regression 없음)
- 테스트: resolve-columns pinning 10개, region 9개, event-manager region 5개, data-ingestion reorder 5개 (전체 852 JS 테스트)
- 데모: Column Pinning 페이지 (7컬럼, Pin L/R 토글, 가로 스크롤, 정렬 연동)

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

## 완료 항목

| 항목                          | 카테고리 | 비고                                                                                                        |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| Row Model Abstraction (1-1)   | Core     | 이후 모든 기능의 토대                                                                                       |
| Column Feature API (1-2)      | Core     | 기능별 독립 모듈화 기반 (Pinning 렌더링 제외)                                                               |
| Column Ordering State (2-1)   | State    | Ordering ✅, Visibility ✅, Pinning State ✅ / 렌더링 ✅                                                    |
| Expanding State (2-2)         | State    | getExpandedRowModel ✅, getGroupedRowModel ❌                                                               |
| Column Visibility State (2-3) | State    | resolveColumns에서 hidden 컬럼 제외                                                                         |
| Data Access API (4-1)         | Utility  | exportToCSV/TSV/JSON + ExportOptions. 20 테스트                                                             |
| Clipboard Utilities (4-2)     | Utility  | copyToClipboard, pasteFromClipboard, buildCSV/buildHTML, parseClipboardText. onCopy/onPaste 연결. 15 테스트 |
| Event System 미들웨어 (1-3)   | Core     | composeMiddleware + GridProps.eventMiddleware. 8 테스트                                                     |
| Layout Cache (5-3)            | Perf     | 2-slot LRU Rust 캐시 + invalidateLayout() API. 6 테스트                                                     |
| Custom Cell Renderer (3-1)    | Render   | CellRendererRegistry + built-in 4개 + GridProps.cellRenderers. 25 테스트                                    |
| Layer System (3-2)            | Render   | GridLayer pipeline + space-based transform + 4 built-in factories. 15 테스트                                |
| Virtual Canvas Region (3-3)   | Render   | clip-based 3-region + buildRegions + region-aware hit-test. 29 테스트                                       |
| Pinning 렌더링 (1-2 잔여)     | Render   | resolveColumns reorder + StringTable ID 키 + data re-ingestion. 데모 포함                                   |
| Context Menu (6-5)            | UX       | EventManager contextmenu, GridProps.onContextMenu, GridContextMenuEvent, 미들웨어 "contextMenu". 4 테스트   |

---

## 구현 순서 (남은 항목)

### Tier 1 — 기존 기반 확장 ✅ (완료)

| 순서 | 항목                  | 참조 | 상태 | 이유                                                                                       |
| ---- | --------------------- | ---- | ---- | ------------------------------------------------------------------------------------------ |
| 1    | Data Access API       | 4-1  | ✅   | `exportToCSV()`, `exportToTSV()`, `exportToJSON()` 헬퍼 + `ExportOptions` 제공. 20 테스트  |
| 2    | Event System 미들웨어 | 1-3  | ✅   | `composeMiddleware()` + `EventMiddleware` 타입. `GridProps.eventMiddleware` prop. 8 테스트 |
| 3    | Layout Cache          | 5-3  | ✅   | 2-slot LRU 캐시 (Rust), 해시 기반 무효화, `invalidateLayout()` WASM 바인딩. 6 Rust 테스트  |

### Tier 2 — 렌더링 파이프라인 (순서 의존성 있음, 순차 진행 필수)

| 순서 | 항목                     | 참조     | 상태 | 이유                                                                               |
| ---- | ------------------------ | -------- | ---- | ---------------------------------------------------------------------------------- |
| 4    | Custom Cell Renderer API | 3-1      | ✅   | `CellRendererRegistry` + built-in 4개 + `GridProps.cellRenderers`. 25 테스트       |
| 5    | Layer System             | 3-2      | ✅   | `GridLayer` pipeline + space-based transform + 4 built-in factories. 15 테스트     |
| 6    | Virtual Canvas Region    | 3-3      | ✅   | clip+translate 기반 3-region 분리. buildRegions + region-aware hit-test. 29 테스트 |
| 7    | Pinning 렌더링           | 1-2 잔여 | ✅   | resolveColumns pinning reorder + StringTable ID 키 + data re-ingestion. 데모 포함  |

### Tier 3 — 유틸리티 (Tier 2와 독립, 언제든 가능)

| 순서 | 항목                | 참조     | 상태 | 이유                                                                                                               |
| ---- | ------------------- | -------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| 8    | Clipboard Utilities | 4-2      | ✅   | copyToClipboard/pasteFromClipboard + buildCSV/buildHTML, parseClipboardText. onPaste 클립보드 읽기 연결. 15 테스트 |
| 9    | getGroupedRowModel  | 2-2 잔여 | ❌   | Row Model 인프라 위에 추가. 독립적이지만 그룹핑 로직 자체가 복잡 (aggregate 함수 등)                               |

### Tier 4 — 고급 성능 (아키텍처 변경, 기존 기능 안정 후 마지막)

| 순서 | 항목                            | 참조                                             | 상태   | 이유                                                                                                                                                             |
| ---- | ------------------------------- | ------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10   | Worker Bridge                   | 5-1                                              | ❌     | SharedArrayBuffer + Worker 통신 구조 전면 변경. 기존 기능 안정 후 opt-in 추가                                                                                    |
| 11   | Streaming Data                  | 5-2                                              | ❌     | ColumnarStore chunk append + 가상화 데이터 소스. Worker Bridge와 시너지                                                                                          |
| —    | Variable Row Height / Flex→Rust | [variable-row-height.md](variable-row-height.md) | 계획만 | 고정 행 높이 제거 후, 행 높이 = 셀(Flex) 최대 높이. Flex 레이아웃을 Rust로 옮길 계획(바이너리 ArrayBuffer 포인터만 사용, 전체 행은 배치 처리). 상세는 문서 참고. |

### Tier 5 — UX Primitive (렌더링 파이프라인 완성 후, 독립 진행 가능)

| 순서 | 항목                      | 참조 | 상태 | 이유                                                                                   |
| ---- | ------------------------- | ---- | ---- | -------------------------------------------------------------------------------------- |
| 12   | Row Pinning               | 6-1  | ✅   | State/API/타입 ✅, WASM pinned layout ✅, buildRowRegions clip 렌더링 ✅               |
| 13   | Column DnD Reorder        | 6-2  | ✅   | EventManager 헤더 드래그 + useColumnDnD + 고스트/드롭 인디케이터. enableColumnDnD prop |
| 14   | Cell Editing 고도화       | 6-3  | ❌   | EditorManager + DOM overlay 완성. editCell render prop                                 |
| 15   | Multi-level Column Header | 6-4  | ❌   | helper.group() + 다단 헤더 레이아웃. 복잡도 높음                                       |
| 16   | Context Menu              | 6-5  | ✅   | EventManager contextmenu + hit-test. GridProps.onContextMenu, GridContextMenuEvent. 4 테스트 |

### 의존성 그래프

```
1. Data Access API ✅ ───────→ 8. Clipboard Utilities ✅
2. Event System 미들웨어 ✅
3. Layout Cache ✅
4. Custom Cell Renderer ✅ ──→ 5. Layer System ✅ ──→ 6. Virtual Canvas Region ✅ ──→ 7. Pinning 렌더링 ✅
9. getGroupedRowModel (독립, 복잡도 높음)
10. Worker Bridge ──→ 11. Streaming Data (시너지)
7. Pinning 렌더링 ✅ ──→ 12. Row Pinning
2. Event System ✅ ──→ 13. Column DnD Reorder
                   ──→ 14. Cell Editing 고도화
                   ──→ 16. Context Menu
15. Multi-level Column Header (독립, 복잡도 높음)
```

---

## Phase 6 — UX Primitive

사용자 인터랙션을 위한 primitive. 기능을 내장하지 않고 조합 가능한 블록을 제공.

### 6-1. Row Pinning

Column Pinning과 대칭. 상단/하단에 행을 고정하는 primitive.

```ts
const [rowPinning, setRowPinning] = useState<RowPinningState>({
  top: ["summary-row"],
  bottom: ["total-row"],
});

<Grid
  rowPinning={rowPinning}
  onRowPinningChange={setRowPinning}
/>
```

- Column Pinning의 세로 버전 — clip 기반 top/scrollable/bottom region
- Summary row, 합계 행 등 고정 행 유스케이스
- `resolveRows`에서 row reorder + `buildRowRegions()` 수평 clip
- 기존 Virtual Canvas Region 인프라 재사용

### 6-2. Column DnD Reorder

헤더 드래그로 컬럼 순서 변경.

```ts
<Grid
  columnOrder={columnOrder}
  onColumnOrderChange={setColumnOrder}
  enableColumnDnD  // 드래그 리오더 활성화
/>
```

- `columnOrder` state는 이미 존재 (2-1 ✅)
- EventManager에 drag 시퀀스 (mousedown → move → drop) 추가
- 드래그 중 시각적 피드백: 고스트 컬럼 + 드롭 위치 인디케이터 (레이어)
- 사용자가 `onColumnOrderChange`로 최종 순서 제어

### 6-3. Cell Editing 고도화

현재 stub 수준인 inline editor를 완성.

```ts
helper.accessor("name", {
  enableEditing: true,
  editCell: (info) => <input value={info.getValue()} onChange={...} />,
});

<Grid
  onCellEdit={(rowIndex, columnId, newValue) => {
    // 사용자가 데이터 업데이트 처리
  }}
/>
```

- EditorManager가 셀 위에 DOM overlay 배치 (이미 editorRef div 존재)
- 더블클릭 → edit mode 진입, Escape/Enter → 종료
- 사용자가 `editCell` render prop으로 에디터 UI 결정
- 유효성 검증은 `onCellEdit` 콜백에서 사용자가 처리

### 6-4. Multi-level Column Header (Column Grouping)

다단 헤더를 지원하는 컬럼 그룹 구조.

```ts
const columns = [
  helper.group({
    header: "Personal Info",
    columns: [
      helper.accessor("name", { header: "Name", size: 200 }),
      helper.accessor("age", { header: "Age", size: 80 }),
    ],
  }),
  helper.group({
    header: "Work",
    columns: [
      helper.accessor("dept", { header: "Department", size: 150 }),
      helper.accessor("salary", { header: "Salary", size: 120 }),
    ],
  }),
];
```

- `helper.group()` — 중첩 가능한 그룹 컬럼 정의
- WASM layout에서 다단 헤더 행 높이 계산
- 그룹 헤더 클릭 → 하위 컬럼 전체 선택/정렬 등은 사용자 구현
- 그룹 경계에 맞춘 그리드 라인 + 병합 셀 렌더링

### 6-5. Context Menu ✅

우클릭 메뉴 primitive.

```ts
<Grid
  onContextMenu={(event: GridContextMenuEvent) => {
    // event.hitTest: { type: "cell", cell } | { type: "header", colIndex } | { type: "resize-handle", colIndex } | { type: "empty" }
    showMenu(event.nativeEvent.clientX, event.nativeEvent.clientY, [
      { label: "Copy", action: () => ... },
      { label: "Sort Ascending", action: () => ... },
    ]);
  }}
/>
```

- Grid는 hit-test 결과만 제공 (`event.hitTest`). `onContextMenu` 등록 시 브라우저 기본 메뉴는 자동 `preventDefault`.
- 메뉴 UI는 사용자가 구현 (또는 선택적 유틸리티)
- EventManager `contextmenu` 리스너 + 미들웨어 채널 `"contextMenu"` 지원

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
