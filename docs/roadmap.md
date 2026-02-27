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

## Phase 0 — Grid.tsx 해체 (Headless 리팩토링)

Phase 1~5를 진행하려면 먼저 현재 Grid.tsx(965줄 God Component)를 분해해야 한다.
모든 로직이 Grid 내부에 하드코딩되어 있어서, primitive를 열기 전에 구조를 바꿔야 한다.

### 현재 문제

```
Grid.tsx (965줄)
├── WASM 초기화        → 내부 하드코딩, 외부 엔진 주입 불가
├── 어댑터 7개 생성     → new로 직접 생성, DI 불가
├── 이벤트 핸들러 체인   → 50줄+ 하드코딩, 인터셉트 불가
├── 렌더 루프           → 80줄+ 하드코딩, 커스텀 렌더 불가
├── 데이터 인제스트      → Grid 안에서만 호출
└── 정렬/선택/에디터    → 전부 Grid 내부 배선
```

### Step 0-1. Hook 추출 — Grid를 얇게 만들기 ✅ 완료

Grid.tsx의 로직을 **독립 hook**으로 추출. Grid는 조합기(thin shell)로만 남긴다.

```
결과: Grid.tsx 965줄 → 317줄 (67% 감소)
      378개 단위 테스트 pass, E2E 회귀 0건
```

**추출된 hook 목록** (`packages/grid/src/react/hooks/`):

| Hook                 | 파일                      | 역할                                            |
| -------------------- | ------------------------- | ----------------------------------------------- |
| `useWasmEngine`      | `use-wasm-engine.ts`      | WASM 초기화 + MemoryBridge 생성                 |
| `useSorting`         | `use-sorting.ts`          | 정렬 상태 (controlled/uncontrolled) + WASM sync |
| `useDataIngestion`   | `use-data-ingestion.ts`   | 데이터 인제스트 + StringTable 관리              |
| `useSelection`       | `use-selection.ts`        | SelectionManager + clipboard + 핸들러           |
| `useEditing`         | `use-editing.ts`          | EditorManager + double-click 핸들러             |
| `useGridScroll`      | `use-grid-scroll.ts`      | 스크롤 ref + auto-scroll + clamping             |
| `useEventAttachment` | `use-event-attachment.ts` | EventManager.attach 배선                        |
| `useRenderLoop`      | `use-render-loop.ts`      | RAF + WASM call + Canvas draw                   |

**추가 추출**:

- `packages/grid/src/react/css-utils.ts` — 7개 순수 CSS 변환 함수

**테스트**: 기존 343개 → 378개 (hook별 8개 테스트 파일 추가). E2E 회귀 0건.

### Step 0-1b. Hook 데모 페이지 추가 ✅ 완료

Step 0-1에서 추출한 hook들을 데모앱에서 활용하는 예제 페이지 작성.
각 hook의 독립 사용 가능성과 조합 패턴을 시각적으로 보여준다.

**구현된 페이지 목록**:

1. **`HooksOverview`** (`/hooks`) — 전체 hook 구성도와 데이터 흐름을 보여주는 인덱스 페이지
   - Grid.tsx thin shell 구조 다이어그램 (ASCII)
   - 각 hook 데모 페이지로의 카드 링크
   - 5가지 설계 원칙 표시

2. **`UseSortingDemo`** (`/hooks/sorting`) — `useSorting` controlled/uncontrolled 비교
   - Uncontrolled: Grid 내부 상태로 동작
   - Controlled: 외부 `useState`로 정렬 상태 관리 + 정렬 히스토리 UI
   - `onBeforeSortChange` 가드: max N컬럼 정렬 제한 (드롭다운 선택)

3. **`UseSelectionDemo`** (`/hooks/selection`) — `useSelection` 고급 사용 예제
   - Controlled selection: 외부에서 selection range 주입 (버튼으로 프로그래매틱 조작)
   - `onBeforeSelectionChange` 가드: 특정 행까지만 선택 허용
   - `onCopy` 커스텀: TSV 대신 JSON으로 복사 (드롭다운 선택)
   - `enableSelection`: per-column selectable 토글

4. **`HookCompositionDemo`** (`/hooks/composition`) — hook 조합 패턴 예제
   - Grid + 외부 hook 상태 연동 (정렬+선택 상태를 외부 패널에 실시간 표시)
   - 선택 범위의 salary 통계 (avg/min/max/total) 계산
   - 이벤트 로그 패널 (cellClick, headerClick, sortChange, selectionChange)

5. **`EventCallbacks`** (`/event-callbacks`) — Step 0-3 이벤트 콜백 데모
   - 6개 콜백 각각 블로킹 토글 체크박스
   - 실시간 이벤트 로그 (PASS/BLOCKED 상태 표시)
   - 코드 스니펫 실시간 업데이트

**변경 파일**:

- `examples/demo/src/pages/HooksOverview.tsx` — 신규
- `examples/demo/src/pages/UseSortingDemo.tsx` — 신규
- `examples/demo/src/pages/UseSelectionDemo.tsx` — 신규
- `examples/demo/src/pages/HookCompositionDemo.tsx` — 신규
- `examples/demo/src/pages/EventCallbacks.tsx` — 신규
- `examples/demo/src/App.tsx` — 5개 라우트 추가
- `examples/demo/src/components/Sidebar.tsx` — Hooks 섹션 + Event Callbacks 링크 추가

**참고**: UseWasmEngineDemo, UseGridScrollDemo는 현재 hook이 내부 전용(비공개)이라
Grid props를 통해서만 접근 가능. Phase 0-5(Adapter DI) 완료 후 외부 접근이 열리면 추가 예정.

### Step 0-2. WasmContext 제거 (TanStack 스타일) ✅ 완료

TanStack Table 벤치마킹 결과, Provider 패턴을 도입하지 않기로 결정.
WASM 초기화는 Grid 내부의 구현 세부사항으로 유지하고, 외부에 노출하지 않는다.

**설계 결정:**

- **No Provider**: TanStack Table처럼 Provider/Context 없이 각 Grid가 독립적으로 동작
- **No engine prop**: 엔진 인스턴스 외부 주입 불필요 — 상태가 섞이면 버그 유발
- **WASM 모듈 로딩**: `wasm-loader.ts`의 싱글턴 캐싱으로 자동 처리 (사용자 신경 X)
- **엔진 인스턴스**: Grid별 독립 생성 (`useWasmEngine` 내부 hook)

```tsx
// 사용자 API — Provider 없음, 그냥 Grid
<Grid data={data1} columns={columns1} width={800} height={600} />
<Grid data={data2} columns={columns2} width={400} height={300} />
// 각 Grid가 자체 엔진, WASM .wasm 로딩은 내부 싱글턴 캐싱
```

**변경 사항:**

- `WasmContext`, `WasmContextValue` 제거 (`context.tsx`)
- `useWasm()` hook 제거 (`hooks.ts`)
- Grid.tsx에서 `<WasmContext.Provider>` 래핑 제거
- 공개 API에서 `WasmContext`, `useWasm` export 제거
- `useWasmEngine`은 Grid 내부 hook으로만 유지 (비공개)

### Step 0-3. 이벤트 콜백 개방 ✅ 완료

Grid의 하드코딩된 이벤트 핸들러에 사용자 콜백 레이어 추가.

```tsx
<Grid
  // 셀/헤더 이벤트 — hit-test 결과 포함
  onCellClick={(coord) => { ... }}
  onCellDoubleClick={(coord) => { ... }}
  onHeaderClick={(colIndex) => { ... }}
  onKeyDown={(event) => { ... }}

  // 기본 동작 제어
  onBeforeSortChange={(next) => {
    // false 반환하면 정렬 취소
    return next.length <= 2; // 최대 2컬럼 정렬 제한
  }}
  onBeforeSelectionChange={(next) => { ... }}
/>
```

- 기존 내부 로직은 기본 동작으로 유지
- 사용자 콜백이 있으면 먼저 실행, `false` 반환 시 기본 동작 스킵
- breaking change 없음

**구현 결과:**

- 6개 콜백 prop 추가: `onCellClick`, `onCellDoubleClick`, `onHeaderClick`, `onKeyDown`, `onBeforeSortChange`, `onBeforeSelectionChange`
- `use-event-attachment.ts` — ref 패턴으로 4개 이벤트 콜백 주입 (재attach 방지)
- `use-sorting.ts` — `onBeforeSortChange` 가드 (next 계산 후, 상태 변경 전)
- `use-selection.ts` — `onBeforeSelectionChange` 가드 (mouseDown + Escape)
- 13개 신규 테스트 추가, 391개 전체 테스트 pass, E2E 회귀 0건

**변경 파일**:

- `packages/grid/src/types.ts` — GridProps에 6개 콜백 타입 추가
- `packages/grid/src/react/Grid.tsx` — prop 배선
- `packages/grid/src/react/hooks/use-sorting.ts` — onBeforeSortChange 가드
- `packages/grid/src/react/hooks/use-selection.ts` — onBeforeSelectionChange 가드
- `packages/grid/src/react/hooks/use-event-attachment.ts` — 4개 이벤트 콜백 ref 패턴

### Step 0-4. 렌더 루프 추출 ✅ 완료

Grid 내부의 80줄 렌더 루프를 hook으로 추출하고, `onAfterDraw` 콜백으로 사용자 커스텀 드로잉 레이어 진입점 제공.

```ts
// 렌더 루프 hook
const { invalidate } = useRenderLoop({
  engine,
  memoryBridgeRef,
  canvasRef,
  columnRegistry,
  stringTableRef,
  theme,
  onAfterDraw?: (ctx: AfterDrawContext) => void,
  // ... 기타 layout/scroll/selection refs
});
```

**구현 결과:**

- `useRenderLoop` hook (501줄) — RAF + dirty flag + 단일 WASM 호출 + Canvas draw + onAfterDraw
- `onAfterDraw` 콜백: 매 프레임 draw 후 viewport 좌표계에서 호출 (Phase 3 Layer System 진입점)
- `AfterDrawContext` 타입: `{ ctx, width, height, scrollTop, scrollLeft, headerHeight, rowHeight }`
- ref 래핑 (`onAfterDrawRef`) — 콜백 변경 시 effect 재시작 방지
- Grid.tsx는 `useRenderLoop` 호출만 담당 (렌더 루프 로직 0줄)
- 8개 신규 테스트: invalidate 안정성, dirtyRef 소유권, onAfterDraw × 3, edge cases
- 데모 페이지: `OnAfterDrawDemo.tsx` (watermark / row-highlight / crosshair / none 모드)

**변경 파일**:

- `packages/grid/src/react/hooks/use-render-loop.ts` — onAfterDraw 지원 추가
- `packages/grid/src/react/Grid.tsx` — `onAfterDraw` prop 배선
- `packages/grid/src/types.ts` — `AfterDrawContext` 타입 + `onAfterDraw` prop
- `packages/grid/src/index.ts` — `AfterDrawContext` export
- `packages/grid/src/react/__tests__/use-render-loop.test.ts` — 8개 테스트
- `examples/demo/src/pages/OnAfterDrawDemo.tsx` — 데모 페이지

### Step 0-5. Adapter DI (선택적 주입) ✅ 완료

어댑터를 외부에서 주입할 수 있는 prop 추가. 안 넘기면 내부 생성 (하위 호환).

```tsx
// 파워 유저: 직접 어댑터 관리
const [eventManager] = useState(() => new EventManager());
const [selectionManager] = useState(() => new SelectionManager());
const [editorManager] = useState(() => new EditorManager());

<Grid
  eventManager={eventManager}
  selectionManager={selectionManager}
  editorManager={editorManager}
  ...
/>

// 일반 사용자: 기존과 동일 (내부 생성)
<Grid data={data} columns={columns} ... />
```

**구현 결과:**

- 3개 어댑터 DI prop 추가: `eventManager`, `selectionManager`, `editorManager`
- Grid.tsx: `useRef(prop ?? new X())` 패턴 — 외부 인스턴스 우선, 없으면 내부 생성
- `useSelection`: `selectionManager?` 파라미터 추가 (주입 시 내부 생성 스킵)
- `useEditing`: `editorManager?` 파라미터 추가 (주입 시 내부 생성 스킵)
- `useEventAttachment`: Grid에서 생성한 `eventManagerRef` 수신 (DI 체인 완성)
- 3개 DI 테스트 추가 (SelectionManager × 2, EditorManager × 1)
- 데모 페이지: `AdapterDIDemo.tsx` (외부 매니저 상태 폴링, 프로그래매틱 제어)
- 모든 매니저 `index.ts`에서 export 완료 (EventManager, SelectionManager, EditorManager)

**용도:**

- 테스트 시 mock 주입 가능
- 여러 Grid 간 어댑터 공유 가능
- 외부에서 매니저 상태 직접 읽기/제어

**변경 파일**:

- `packages/grid/src/react/Grid.tsx` — 3개 어댑터 prop 수신 + ref 생성
- `packages/grid/src/types.ts` — GridProps에 3개 어댑터 prop 타입 추가
- `packages/grid/src/react/hooks/use-selection.ts` — `selectionManager?` 파라미터
- `packages/grid/src/react/hooks/use-editing.ts` — `editorManager?` 파라미터
- `packages/grid/src/react/__tests__/use-selection.test.ts` — DI 테스트 2개
- `packages/grid/src/react/__tests__/use-editing.test.ts` — DI 테스트 1개
- `examples/demo/src/pages/AdapterDIDemo.tsx` — 데모 페이지

### 리팩토링 순서 & 안전장치

```
Step 0-1 (Hook 추출)      ✅ 완료
  ↓
Step 0-1b (Hook 데모)     ✅ 완료
  ↓
Step 0-2 (WASM Provider)  ✅ 완료
  ↓
Step 0-3 (이벤트 개방)     ✅ 완료
  ↓
Step 0-4 (렌더 루프 추출)  ✅ 완료 — onAfterDraw + AfterDrawContext
  ↓
Step 0-5 (Adapter DI)     ✅ 완료 — EventManager/SelectionManager/EditorManager 주입
```

**각 Step마다**:

1. 기존 E2E 스냅샷 테스트 통과 확인 (시각적 회귀 없음)
2. 새 hook 단위 테스트 추가
3. 기존 Grid API(props) 하위 호환 유지 — breaking change 없음
4. 데모 앱이 동일하게 동작하는지 확인

### Phase 0 완료 결과

```
Grid.tsx: 965줄 → 412줄 (57% 감소)
테스트: 343개 → 511개 (168개 추가, hook별 테스트 파일 8개)
E2E 회귀: 0건
데모 페이지: 7개 추가 (Overview, Sorting, Selection, Composition, EventCallbacks, OnAfterDraw, AdapterDI)
```

### Phase 0 완료 후 Grid.tsx 목표 모습

```tsx
// Grid.tsx — ~150줄 (현재 965줄 → 85% 감소)
export function Grid(props: GridProps) {
  const { engine, isReady } = useWasmEngine(props.engine);
  const { columnRegistry } = useColumnRegistry(props.columns, props.children);
  const { stringTable } = useDataIngestion(engine, props.data, columnRegistry);
  const { sorting } = useSorting(engine, props);
  const { selection } = useSelection(props);
  const { editing } = useEditing(props);
  const { handlers } = useEventHandlers(canvasRef, {
    sorting,
    selection,
    editing,
    onCellClick: props.onCellClick,
    onHeaderClick: props.onHeaderClick,
    // ...
  });
  const { invalidate } = useRenderLoop(canvasRef, {
    engine,
    columnRegistry,
    stringTable,
    theme: props.theme,
    onAfterDraw: props.onAfterDraw,
  });

  return (
    <GridContext.Provider value={{ columnRegistry, engine }}>
      <div>
        <canvas ref={canvasRef} />
        <div ref={editorRef} />
        {needsVScroll && <ScrollBar />}
        {needsHScroll && <ScrollBar />}
      </div>
    </GridContext.Provider>
  );
}
```

---

## Phase 1 — Core Primitive 강화

현재 아키텍처의 기반 primitive를 더 열어서 조합성을 높인다.

### 1-1. Row Model Abstraction

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

### 1-2. Column Feature API

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

### 2-1. Column Ordering State

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

### 2-2. Expanding State (Row Grouping / Tree 기반)

Row Grouping이나 Tree를 "기능"으로 내장하지 않는다.
**expanded 상태 + Row Model 조합**으로 사용자가 구현한다.

```ts
const [expanded, setExpanded] = useState<ExpandedState>({});

const table = useGridTable({
  data,
  columns,
  getSubRows: (row) => row.children, // Tree
  getGroupedRowModel: getGroupedRowModel(), // 또는 Grouping
  getExpandedRowModel: getExpandedRowModel(),
  expanded,
  onExpandedChange: setExpanded,
});
```

- `getSubRows` — 사용자가 계층 구조를 정의
- `getGroupedRowModel` — 그룹핑 로직 (WASM에서 인덱스 연산)
- expanded state — 어떤 행이 펼쳐져 있는지
- 시각적 표현(들여쓰기, 아이콘)은 `cell` render prop에서 사용자가 결정

### 2-3. Column Visibility State

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

| 순위  | 항목                          | 카테고리     | 이유                          |
| ----- | ----------------------------- | ------------ | ----------------------------- |
| **0** | **Grid.tsx 해체 리팩토링**    | **Refactor** | **모든 Phase의 전제 조건**    |
| 1     | Row Model Abstraction         | Core         | 이후 모든 기능의 토대         |
| 2     | Column Feature API            | Core         | 기능별 독립 모듈화 기반       |
| 3     | Event System 개방             | Core         | 사용자 인터랙션 확장의 전제   |
| 4     | Column Ordering/Pinning State | State        | 가장 요청 많을 기본 상태      |
| 5     | Custom Cell Renderer          | Render       | Canvas 차별화의 핵심          |
| 6     | Data Access API               | Data         | Export/Clipboard 등의 기반    |
| 7     | Layer System                  | Render       | Pinning 구현 + 확장성         |
| 8     | Expanding State               | State        | Grouping/Tree의 headless 접근 |
| 9     | Worker Bridge                 | Perf         | WASM 성능 극대화              |
| 10    | Streaming Data                | Perf         | 대용량 데이터 시나리오        |

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
