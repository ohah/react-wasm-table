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
@react-wasm-table/renderers     # ProgressBar 등 레시피 (Sparkline 등은 core 내장)
```

- 각 패키지는 독립 tree-shake 가능
- core만 있으면 기본 테이블 동작
- 나머지는 필요할 때 추가

---

## Variable Row Height / Flex→Rust

고정 행 높이 제거 후, 행 높이 = 셀(Flex) 최대 높이. Flex 레이아웃을 Rust로 옮길 계획(바이너리 ArrayBuffer 포인터만 사용, 전체 행은 배치 처리). 상세는 [variable-row-height.md](variable-row-height.md) 참고.

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
