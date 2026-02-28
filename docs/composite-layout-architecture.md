# Composite Layout Architecture

셀 내부 복합 컴포넌트(Flex/Box/Stack)의 레이아웃을 Rust/Taffy로 통합한 아키텍처.

---

## Before vs After

```mermaid
graph LR
  subgraph "Before"
    direction LR
    T1[Taffy] -->|셀 레이아웃만| JS1[JS 자체 레이아웃 계산]
    JS1 --> C1[Canvas draw]
  end
```

```mermaid
graph LR
  subgraph "After"
    direction LR
    CM[Canvas measureText] -->|자식 크기| ENC[Float32Array 인코딩]
    ENC -->|WASM call| T2[Taffy 레이아웃]
    T2 -->|자식 위치 Float32Array| C2[Canvas draw]
  end
```

---

## 전체 흐름

```mermaid
sequenceDiagram
    participant Canvas as Canvas 2D API
    participant JS as Cell Renderer (JS)
    participant WASM as Taffy (Rust/WASM)

    Note over JS: Flex/Box/Stack 렌더러 진입

    rect rgb(240, 248, 255)
        Note over Canvas,JS: 1. 자식 측정 (JS only)
        JS->>Canvas: measureText(child.value, fontSize, fontFamily)
        Canvas-->>JS: width (px)
        JS->>JS: measureInstructionHeight() → 고정 22px
        Note right of JS: 폰트 메트릭은 Canvas API만 가능<br/>WASM에서는 접근 불가
    end

    rect rgb(255, 245, 238)
        Note over JS,WASM: 2. WASM 레이아웃 계산
        JS->>JS: encodeCompositeInput()<br/>컨테이너 스타일 + 자식 크기 → Float32Array
        JS->>WASM: computeCompositeLayout(input: Float32Array)
        WASM->>WASM: Taffy flexbox 계산<br/>(direction, gap, align, justify, padding)
        WASM-->>JS: Float32Array [x,y,w,h, x,y,w,h, ...]
    end

    rect rgb(245, 255, 245)
        Note over Canvas,JS: 3. Canvas 드로잉
        loop 각 자식
            JS->>JS: makeSubCellBuf(cellX + px, cellY + py, pw, ph)
            JS->>JS: drawChild(instruction, subContext)
            JS->>Canvas: fillText / roundRect / fillRect ...
        end
    end
```

---

## 데이터 인코딩

```mermaid
graph TD
    subgraph "Input Float32Array"
        I0["[0] containerWidth"]
        I1["[1] containerHeight"]
        I2["[2] flexDirection<br/>0=row, 1=column,<br/>2=row-reverse, 3=column-reverse"]
        I3["[3] gap"]
        I4["[4] alignItems<br/>0=start, 1=end, 2=center,<br/>3=stretch, NaN=none"]
        I5["[5] justifyContent<br/>0=start, 1=end, 2=center,<br/>3=space-between, NaN=none"]
        I6["[6-9] padding T,R,B,L"]
        I7["[10] childCount"]
        I8["[11..] childW₀, childH₀,<br/>childW₁, childH₁, ..."]
    end

    subgraph "Output Float32Array"
        O0["x₀, y₀, w₀, h₀"]
        O1["x₁, y₁, w₁, h₁"]
        O2["..."]
    end

    I0 --> WASM[Taffy compute]
    I8 --> WASM
    WASM --> O0
    WASM --> O1
```

---

## 컨텍스트 전달 경로

```mermaid
flowchart TD
    A[use-render-loop.ts] -->|"engine.computeCompositeLayout<br/>→ 클로저 생성"| B[InternalLayerContext<br/>_computeChildLayout]
    B --> C[dataLayer]
    C --> D["drawRowsFromBuffer()<br/>computeChildLayout 매개변수"]
    D --> E["CellRenderContext<br/>{ctx, buf, cellIdx, theme,<br/>computeChildLayout}"]
    E --> F[flexCellRenderer]
    E --> G[boxCellRenderer]
    E --> H[stackCellRenderer]
    F -->|재귀: drawChild| F
    G -->|재귀: drawChild| F
    H -->|재귀: drawChild| F

    style A fill:#e8f4fd
    style B fill:#fff3e0
    style E fill:#e8f5e9
    style F fill:#fce4ec
    style G fill:#fce4ec
    style H fill:#fce4ec
```

---

## 컴포넌트별 Taffy 매핑

| 컴포넌트  | flexDirection  | gap         | alignItems  | justifyContent | padding                         |
| --------- | -------------- | ----------- | ----------- | -------------- | ------------------------------- |
| **Flex**  | 사용자 지정    | 사용자 지정 | 사용자 지정 | 사용자 지정    | 셀 padding 사용                 |
| **Stack** | direction prop | gap prop    | `"center"`  | `"start"`      | 없음                            |
| **Box**   | `"column"`     | 0           | `"stretch"` | `"start"`      | 없음 (별도 border/padding 처리) |

---

## JS가 담당하는 것 vs WASM이 담당하는 것

```mermaid
graph TB
    subgraph "JS (Canvas API 필요)"
        M1[폰트 측정 — measureText]
        M2[배경/테두리 그리기 — fillRect]
        M3[텍스트 그리기 — fillText]
        M4[뱃지 그리기 — roundRect + fill]
        M5[클리핑 — clip/save/restore]
        M6[Float32Array 인코딩/디코딩]
    end

    subgraph "WASM/Taffy (레이아웃 엔진)"
        W1[Flexbox 레이아웃 계산]
        W2[방향 — row/column/reverse]
        W3[간격 — gap]
        W4[정렬 — align-items, justify-content]
        W5[패딩 처리]
        W6[자식 위치 결정 — x, y, w, h]
    end

    M1 -->|자식 크기| W1
    W6 -->|자식 위치| M2
    W6 -->|자식 위치| M3

    style M1 fill:#e3f2fd
    style W1 fill:#fff8e1
```

---

## 재귀 중첩 예시

`Flex > Box > Text` 같은 중첩 구조에서 각 레벨마다 독립적인 WASM 호출이 발생:

```mermaid
sequenceDiagram
    participant JS as JS Renderer
    participant WASM as Taffy (WASM)

    Note over JS: Flex 렌더러
    JS->>JS: 자식 측정 (Box=60px, Text=40px)
    JS->>WASM: computeCompositeLayout(Flex 컨테이너)
    WASM-->>JS: [Box위치, Text위치]

    Note over JS: Box 렌더러 (재귀)
    JS->>JS: Box 배경/테두리 그리기
    JS->>JS: Box 자식 측정 (Text=40px)
    JS->>WASM: computeCompositeLayout(Box 컨테이너)
    WASM-->>JS: [Text위치]

    Note over JS: Text 렌더러 (리프)
    JS->>JS: fillText — WASM 호출 없음
```

각 WASM 호출은 독립적이며, Taffy 트리를 생성→계산→클리어하므로 버퍼 충돌이 없습니다.
