# Plan: CSS Grid Layout 지원

Taffy 0.9의 CSS Grid 기능을 활용하여 웹 CSS Grid와 동일한 레이아웃 속성을 전체 스택에 노출한다.
Flex 구현과 동일한 패턴: **TS types → React props → WASM serde → Rust enums → Taffy**

## Taffy CSS Grid 지원 범위

Taffy 0.9는 CSS Grid Level 1을 거의 완벽 지원한다.

**지원**: `fr`, `px`, `%`, `auto`, `minmax()`, `repeat(N/auto-fill/auto-fit)`,
`min-content`, `max-content`, `fit-content()`, named lines, `grid-template-areas`,
line number/span/negative placement, dense flow

**미지원**: `subgrid` (Level 2), `masonry` (Level 3), `inline-grid`

---

## 1. Cargo.toml — Taffy grid feature 활성화

**파일**: `crates/core/Cargo.toml`

```toml
# 변경 전
taffy = "0.9"

# 변경 후
taffy = { version = "0.9", features = ["grid"] }
```

---

## 2. TypeScript 타입 (`packages/grid/src/types.ts`)

### 2-1. CssDisplay 확장

```typescript
// 변경 전
export type CssDisplay = "flex" | "block" | "none";

// 변경 후
export type CssDisplay = "flex" | "grid" | "block" | "none";
```

### 2-2. 새 타입 추가

```typescript
/** Track sizing: "200px" | "1fr" | "auto" | "min-content" | "max-content" | "minmax(100px, 1fr)" */
export type CssGridTrackSize =
  | number                    // px
  | `${number}fr`
  | `${number}%`
  | "auto"
  | "min-content"
  | "max-content"
  | `minmax(${string})`
  | `fit-content(${string})`;

/** Track list: single value or array. repeat() is a string: "repeat(3, 1fr)" */
export type CssGridTrackList = CssGridTrackSize | (CssGridTrackSize | `repeat(${string})`)[];

/** Grid auto flow */
export type CssGridAutoFlow = "row" | "column" | "row dense" | "column dense";

/** Grid placement: line number, span, or named line */
export type CssGridPlacement =
  | number                    // line number (positive or negative)
  | `span ${number}`          // span N tracks
  | `span ${string}`          // span named line
  | string                    // named line
  | "auto";

/** Grid line (start/end pair) */
export type CssGridLine = CssGridPlacement | [CssGridPlacement, CssGridPlacement];

/** Grid template areas: array of row strings */
export type CssGridTemplateAreas = string[];
```

### 2-3. GridProps 확장 (컨테이너)

```typescript
// 기존 flex props에 추가:
export interface GridProps extends BoxModelProps {
  // ... 기존 flex props ...

  // Grid container props (display="grid"일 때 사용)
  gridTemplateRows?: CssGridTrackList;
  gridTemplateColumns?: CssGridTrackList;
  gridAutoRows?: CssGridTrackSize | CssGridTrackSize[];
  gridAutoColumns?: CssGridTrackSize | CssGridTrackSize[];
  gridAutoFlow?: CssGridAutoFlow;
  gridTemplateAreas?: CssGridTemplateAreas;
  justifyItems?: CssAlignItems;
}
```

### 2-4. ColumnProps 확장 (자식)

```typescript
export interface ColumnProps extends BoxModelProps {
  // ... 기존 flex child props ...

  // Grid child props (부모가 display="grid"일 때 사용)
  gridRow?: CssGridLine;
  gridColumn?: CssGridLine;
  justifySelf?: CssAlignItems;
}
```

---

## 3. Rust Core 타입 (`crates/core/src/layout.rs`)

### 3-1. 새 Enum 타입

```rust
#[derive(Debug, Clone, PartialEq, Default)]
pub enum GridAutoFlowValue {
    #[default]
    Row,
    Column,
    RowDense,
    ColumnDense,
}

/// Track sizing function (단일 트랙)
#[derive(Debug, Clone, PartialEq)]
pub enum TrackSizeValue {
    Length(f32),
    Percent(f32),
    Fr(f32),
    Auto,
    MinContent,
    MaxContent,
    MinMax(Box<TrackSizeValue>, Box<TrackSizeValue>),
    FitContentPx(f32),
    FitContentPercent(f32),
}

/// Grid placement
#[derive(Debug, Clone, PartialEq)]
pub enum GridPlacementValue {
    Auto,
    Line(i16),
    Span(u16),
}

/// Grid line (start, end)
#[derive(Debug, Clone, PartialEq)]
pub struct GridLineValue {
    pub start: GridPlacementValue,
    pub end: GridPlacementValue,
}

/// Track list (template 또는 auto)
#[derive(Debug, Clone, PartialEq)]
pub enum TrackListItem {
    Single(TrackSizeValue),
    Repeat(RepeatValue, Vec<TrackSizeValue>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum RepeatValue {
    Count(u16),
    AutoFill,
    AutoFit,
}
```

### 3-2. DisplayValue 확장

```rust
pub enum DisplayValue {
    Flex,
    Grid,    // 추가
    Block,
    None,
}
```

### 3-3. ContainerLayout 확장

```rust
pub struct ContainerLayout {
    // ... 기존 flex 필드 ...

    // Grid container
    pub grid_template_rows: Vec<TrackListItem>,
    pub grid_template_columns: Vec<TrackListItem>,
    pub grid_auto_rows: Vec<TrackSizeValue>,
    pub grid_auto_columns: Vec<TrackSizeValue>,
    pub grid_auto_flow: GridAutoFlowValue,
    pub grid_template_areas: Vec<String>,
    pub justify_items: Option<AlignValue>,
}
```

### 3-4. ColumnLayout 확장

```rust
pub struct ColumnLayout {
    // ... 기존 flex child 필드 ...

    // Grid child
    pub grid_row: Option<GridLineValue>,
    pub grid_column: Option<GridLineValue>,
    pub justify_self: Option<AlignValue>,
}
```

### 3-5. Taffy 변환 함수 추가

```rust
fn track_size_to_taffy(v: &TrackSizeValue) -> TrackSizingFunction { ... }
fn track_list_to_taffy(items: &[TrackListItem]) -> Vec<GridTemplateComponent> { ... }
fn grid_placement_to_taffy(v: &GridPlacementValue) -> GridPlacement { ... }
fn grid_line_to_taffy(v: &GridLineValue) -> Line<GridPlacement> { ... }
fn grid_auto_flow_to_taffy(v: &GridAutoFlowValue) -> GridAutoFlow { ... }
```

`build_container_style()` 확장:
```rust
DisplayValue::Grid => {
    style.display = Display::Grid;
    style.grid_template_rows = track_list_to_taffy(&container.grid_template_rows);
    style.grid_template_columns = track_list_to_taffy(&container.grid_template_columns);
    style.grid_auto_rows = ...;
    style.grid_auto_columns = ...;
    style.grid_auto_flow = grid_auto_flow_to_taffy(&container.grid_auto_flow);
}
```

`column_style()` 확장:
```rust
if let Some(ref grid_row) = col.grid_row {
    style.grid_row = grid_line_to_taffy(grid_row);
}
if let Some(ref grid_column) = col.grid_column {
    style.grid_column = grid_line_to_taffy(grid_column);
}
```

---

## 4. WASM Serde 구조체 (`crates/wasm/src/lib.rs`)

### 4-1. JsContainerLayout 확장

```rust
struct JsContainerLayout {
    // ... 기존 flex 필드 ...

    #[serde(rename = "gridTemplateRows")]
    grid_template_rows: Option<JsGridTrackList>,
    #[serde(rename = "gridTemplateColumns")]
    grid_template_columns: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoRows")]
    grid_auto_rows: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoColumns")]
    grid_auto_columns: Option<JsGridTrackList>,
    #[serde(rename = "gridAutoFlow")]
    grid_auto_flow: Option<String>,
    #[serde(rename = "gridTemplateAreas")]
    grid_template_areas: Option<Vec<String>>,
    #[serde(rename = "justifyItems")]
    justify_items: Option<String>,
}
```

### 4-2. JsColumnLayout 확장

```rust
struct JsColumnLayout {
    // ... 기존 flex child 필드 ...

    #[serde(rename = "gridRow")]
    grid_row: Option<JsGridLine>,
    #[serde(rename = "gridColumn")]
    grid_column: Option<JsGridLine>,
    #[serde(rename = "justifySelf")]
    justify_self: Option<String>,
}
```

### 4-3. 새 Serde 구조체

```rust
/// Track list: 단일 값(String/Number) 또는 배열
#[derive(Deserialize)]
#[serde(untagged)]
enum JsGridTrackList {
    Single(JsGridTrackSize),
    Array(Vec<JsGridTrackSize>),
}

/// Track size: number(px) 또는 string("1fr", "auto", "minmax(...)", "repeat(...)")
#[derive(Deserialize)]
#[serde(untagged)]
enum JsGridTrackSize {
    Number(f32),
    Str(String),
}

/// Grid line: number, string, 또는 [start, end] 배열
#[derive(Deserialize)]
#[serde(untagged)]
enum JsGridLine {
    Single(JsGridPlacement),
    Pair(JsGridPlacement, JsGridPlacement),
}

#[derive(Deserialize)]
#[serde(untagged)]
enum JsGridPlacement {
    Number(i16),
    Str(String),
}
```

### 4-4. 파싱 함수

```rust
fn parse_grid_track_size(v: &JsGridTrackSize) -> TrackSizeValue { ... }
fn parse_grid_track_list(v: &JsGridTrackList) -> Vec<TrackListItem> { ... }
fn parse_grid_placement(v: &JsGridPlacement) -> GridPlacementValue { ... }
fn parse_grid_line(v: &JsGridLine) -> GridLineValue { ... }
```

문자열 파싱 예시:
- `"1fr"` → `TrackSizeValue::Fr(1.0)`
- `"auto"` → `TrackSizeValue::Auto`
- `"minmax(100px, 1fr)"` → `TrackSizeValue::MinMax(...)`
- `"repeat(3, 1fr)"` → `TrackListItem::Repeat(Count(3), [Fr(1.0)])`
- `"span 2"` → `GridPlacementValue::Span(2)`
- `-1` → `GridPlacementValue::Line(-1)`

---

## 5. React 컴포넌트 (`packages/grid/src/react/`)

### 5-1. Grid.tsx — props 해체 + containerLayout 빌드

```typescript
// 추가 destructure
const {
  gridTemplateRows, gridTemplateColumns,
  gridAutoRows, gridAutoColumns, gridAutoFlow,
  gridTemplateAreas, justifyItems,
  ...rest
} = props;

// containerLayout 객체에 추가
const containerLayout = {
  // ... 기존 flex ...
  gridTemplateRows, gridTemplateColumns,
  gridAutoRows, gridAutoColumns, gridAutoFlow,
  gridTemplateAreas, justifyItems,
};
```

### 5-2. Column.tsx — grid child props 등록

```typescript
const {
  gridRow, gridColumn, justifySelf,
  ...rest
} = props;
```

### 5-3. index.ts — 새 타입 export

```typescript
export type {
  CssGridTrackSize, CssGridTrackList, CssGridAutoFlow,
  CssGridPlacement, CssGridLine, CssGridTemplateAreas,
} from "./types";
```

---

## 6. 테스트

### 6-1. Rust 단위 테스트 (`crates/core/src/layout.rs`)

- `display_grid_basic`: 3열 그리드 (`1fr 1fr 1fr`) 레이아웃 검증
- `grid_template_fixed_and_fr`: `200px 1fr` 혼합
- `grid_template_minmax`: `minmax(100px, 1fr)` 동작
- `grid_template_repeat`: `repeat(3, 1fr)`, `repeat(auto-fill, minmax(200px, 1fr))`
- `grid_auto_flow_column`: column flow 배치 순서
- `grid_auto_flow_dense`: dense packing 동작
- `grid_placement_line`: 라인 번호 배치
- `grid_placement_span`: span 배치
- `grid_placement_negative`: 음수 라인 배치
- `grid_gap`: gap 적용 검증
- `grid_alignment`: justify-items/align-items 검증
- `grid_child_justify_self`: 개별 아이템 정렬
- `grid_template_areas`: named area 배치
- `grid_into_buffer`: 버퍼 출력 검증

### 6-2. JS 단위 테스트

- WASM serde 파싱 (문자열 → Rust enum 변환 검증은 Rust 테스트에서)
- Grid.tsx에서 containerLayout에 grid props 전달 확인
- Column.tsx에서 gridRow/gridColumn 등록 확인

### 6-3. E2E 테스트 (`e2e/tests/`)

- Grid Layout 데모 페이지 스냅샷 테스트

---

## 7. 데모 앱 (`examples/demo/`)

### 7-1. GridTemplate 페이지

`display="grid"` + `gridTemplateColumns/Rows` 인터랙티브 조작

### 7-2. GridPlacement 페이지

`gridRow/gridColumn` placement 인터랙티브 조작

### 7-3. GridAutoFlow 페이지

`gridAutoFlow` (`row`, `column`, `dense`) 비교

---

## 구현 순서

1. Cargo.toml grid feature 활성화
2. Rust core: 타입 + Taffy 변환 + 테스트
3. WASM: serde 구조체 + 파싱 함수
4. TS types 추가
5. React Grid/Column props 확장
6. 데모 페이지 추가
7. E2E 테스트
