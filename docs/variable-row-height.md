# Variable Row Height

## Status: Planned

## Background

현재 그리드는 고정 행 높이(`rowHeight=36`)를 전제로 설계되어 있다.
가상 스크롤에서 보이는 행 범위를 `scrollTop / rowHeight` (O(1))로 계산하기 때문이다.

flex-wrap 등 컬럼이 여러 줄로 나뉘는 레이아웃을 지원하려면
행 높이가 동적으로 결정될 수 있어야 한다.

## 성능 영향

고정 높이를 풀어도 성능 문제는 크지 않다.

| 방식                                   | 시간 복잡도 | 메모리            |
| -------------------------------------- | ----------- | ----------------- |
| 고정 높이 (현재)                       | O(1) 나눗셈 | 없음              |
| 가변 높이 (prefix sum + binary search) | O(log n)    | O(n) — float 배열 |

| 행 수 | prefix sum 메모리 | binary search 횟수 |
| ----- | ----------------- | ------------------ |
| 10K   | 40KB              | ~14                |
| 100K  | 400KB             | ~17                |
| 1M    | 4MB               | ~20                |

react-virtualized, TanStack Virtual 등 주요 가상 스크롤 라이브러리가 같은 방식으로 가변 높이를 지원한다.

## 변경 범위

### 1. virtual_scroll (crates/core)

- `visible_range()` 계산을 prefix sum + binary search로 변경
- `Vec<f32>` 누적 높이 배열 유지
- 높이 변경 시 부분 갱신 (해당 행 이후만 재계산)

### 2. LayoutBuffer (crates/core)

- 현재: `y = row_index * row_height`로 계산
- 변경: `y = cumulative_heights[row_index]`로 배열 참조
- stride(12) 자체는 변경 불필요 — y, height 필드에 가변 값만 넣으면 됨

### 3. updateViewport 인터페이스 (crates/wasm)

- 행별 높이 정보를 WASM에 전달하는 방법 결정 필요
- 옵션 A: JS에서 높이 배열을 SharedArrayBuffer로 전달
- 옵션 B: Taffy 레이아웃 결과에서 행 높이를 역산

### 4. 행 높이 결정 로직 (핵심 난관)

DOM은 브라우저가 자동으로 높이를 계산해 주지만, Canvas에서는 직접 측정해야 한다.

가능한 접근:

- **Taffy 기반**: flex-wrap 등 레이아웃 결과로 행이 몇 줄에 걸치는지 계산 → 행 높이 결정
- **콘텐츠 기반**: 텍스트 줄바꿈 등 셀 내용에 따라 높이 측정 (measureText)
- **사용자 지정**: 행별 높이를 콜백으로 받음 (`rowHeight: (rowIndex) => number`)

## 나중에 옮길 계획: Flex → Rust

가변 행 높이를 넣을 때, **행 높이 = 그 행 셀들(Flex 등) 중 최대 높이**로 두고, 그 계산을 Rust 쪽에서 하려면 셀 내용(Flex 트리) 정보가 WASM에 필요하다. 그때까지 지금처럼 Flex 레이아웃은 JS(캔버스 셀 렌더러)에서만 한다.

**옮기는 시점·목표**

- 고정 행 높이를 제거한 뒤.
- Rust에서 행 높이 + Flex 자식 위치를 한 번에 계산해서, JS에서 Flex 레이아웃을 두 번(행 높이용 + 그리기용) 돌리지 않게 한다.

**통신 방식**

- **반드시 바이너리만 사용.** `serde_json` / JSON으로 셀 내용을 넘기지 않는다.
- JS는 Flex 입력을 **고정 레이아웃의 ArrayBuffer**에 쓴 뒤, **포인터 + 길이**만 WASM에 넘긴다.
- Rust는 그 메모리를 직접 읽어 해석(zero-copy). 반환도 기존 layout 버퍼 확장 또는 별도 바이너리 버퍼로.

**규모 감각 (참고)**

- 프레임당: visible + overscan 구간만 넘기면 수 KB~수십 KB 수준. 메모리/부담 무시 가능.
- 전체 10만 행 한 번에 계산하면 Flex 셀만 해도 수 MB급이라, **한 프레임 예산(16ms) 안에 끝나지 않음.**  
  → 전체 높이 계산이 필요하면 **배치 단위**(예: 2천 행씩)로 나누고, 작은 버퍼를 재사용해서 처리하는 식으로 설계.

**문서화 목적**

- 나중에 구현할 때 “Flex를 Rust로 옮긴다”는 방향과 “바이너리 ArrayBuffer 포인터만 쓴다 / 전체 행은 배치 처리”를 일관되게 따르기 위함.

## 관련 이슈

- flex-wrap 데모에서 Canvas/CSS 비교 결과가 다르게 나오는 문제
  - Canvas 쪽: `compute_column_positions()`가 y좌표를 무시하여 wrap된 컬럼이 한 줄에 표시됨
  - CSS 쪽: flexWrap이 각 행 div에 적용되어 셀이 행 내부에서 wrap → 겹침
