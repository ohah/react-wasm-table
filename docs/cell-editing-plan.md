# Cell Editing 고도화 — 구현 계획

> **목표:** 현재 stub 수준의 inline editing을 완성된 편집 시스템으로 고도화
>
> **설계 원칙:** TanStack Table의 `meta.updateData` 패턴을 따르되,
> Canvas 기반 특성상 DOM overlay 관리는 그리드가 담당

---

## 현재 상태 (이미 구현된 것)

| 항목                       | 상태 | 비고                                                |
| -------------------------- | ---- | --------------------------------------------------- |
| EditorManager 클래스       | ✅   | native input createElement 방식. text/number 지원   |
| useEditing 훅              | ✅   | 더블클릭 → open, layout buffer에서 위치 계산        |
| DOM overlay (editorRef)    | ✅   | absolute positioned div, pointerEvents 토글         |
| EventManager 더블클릭      | ✅   | hit-test → onCellDoubleClick 발화                   |
| 클릭/드래그 시 에디터 취소 | ✅   | useEventAttachment에서 cancel() 호출                |
| Column.editor prop         | ✅   | `"text" \| "number" \| "select"` (select 미구현)    |
| editorManager DI           | ✅   | GridProps.editorManager로 외부 주입 가능 (테스트용) |

---

## Step 1: meta.updateData + 값 커밋 파이프라인

**목표:** 에디터에서 커밋된 값이 데이터 소스까지 전달되는 파이프라인 완성

### 할 일

1. **GridProps에 `meta` prop 추가**

   ```ts
   interface TableMeta<TData> {
     updateData?: (rowIndex: number, columnId: string, value: unknown) => void;
     [key: string]: unknown; // 사용자 확장 가능
   }

   interface GridProps {
     meta?: TableMeta<TData>;
   }
   ```

2. **EditorManager.commit() → meta.updateData() 연결**
   - useEditing에서 commit 결과를 받아 `meta.updateData(rowIndex, columnId, value)` 호출
   - EditorManager에 `onCommit` 콜백을 주입하는 방식으로 연결

3. **기존 EditorManager 로직 유지** (native input 방식 그대로)

### 변경 파일

- `types.ts` — `TableMeta` 타입, `GridProps.meta` prop 추가
- `use-editing.ts` — commit 시 `meta.updateData` 호출 연결
- `editor-manager.ts` — `onCommit` 콜백 지원 추가

### 테스트

- meta.updateData가 commit 시 올바른 인자로 호출되는지
- meta 미제공 시 에러 없이 동작하는지
- number 타입 변환 (string → number) 확인

---

## Step 2: editCell render prop + React 컴포넌트 에디터

**목표:** 사용자가 React 컴포넌트로 에디터 UI를 자유롭게 결정

### 할 일

1. **editCell render prop 타입 정의**

   ```ts
   interface CellEditRenderProps<TData = unknown> {
     value: unknown;
     row: Row<TData>;
     column: ColumnDef;
     onCommit: (newValue: unknown) => void;
     onCancel: () => void;
   }

   // ColumnDef에 추가
   interface ColumnProps {
     editCell?: (props: CellEditRenderProps) => React.ReactNode;
     // 기존 editor?: "text" | "number" | "select" 유지 (built-in 단축)
   }
   ```

2. **EditorManager 리팩토링**
   - 현재: input createElement + DOM 직접 조작
   - 변경: 편집 상태(editingCell, cellLayout)만 관리
   - React가 `createPortal`로 editorRef div에 editCell 컴포넌트 렌더링

3. **editCell / editor 우선순위**
   - `editCell` 제공 시 → 사용자 컴포넌트 렌더링
   - `editCell` 미제공 + `editor` 제공 시 → built-in 에디터 (text/number/select)
   - 둘 다 없으면 → 편집 불가

4. **built-in 에디터를 editCell 기반으로 재구현**
   - `defaultTextEditor`, `defaultNumberEditor`, `defaultSelectEditor` 컴포넌트
   - 기존 EditorManager의 native input 로직을 React 컴포넌트로 전환

5. **onCommit → meta.updateData 연결**
   - editCell의 `onCommit(newValue)` 호출 → 그리드가 `meta.updateData(rowIndex, columnId, newValue)` 발화
   - 에디터 자동 닫힘

### 변경 파일

- `types.ts` — `CellEditRenderProps`, `ColumnProps.editCell` 추가
- `editor-manager.ts` — 상태 관리자로 리팩토링 (DOM 생성 제거)
- `use-editing.ts` — createPortal 기반 렌더링, editCell 호출
- `Grid.tsx` — portal 마운트 포인트 연결
- 새 파일: `built-in-editors.tsx` — 기본 에디터 컴포넌트들

### 테스트

- editCell render prop이 올바른 props로 호출되는지
- onCommit 호출 시 meta.updateData 연결 확인
- onCancel 호출 시 에디터 닫힘 확인
- built-in editor fallback 동작
- editCell + editor 동시 제공 시 editCell 우선

---

## Step 3: 에디터 UX 완성

**목표:** 편집 경험의 세부 동작 완성

### 할 일

1. **키보드 네비게이션**
   - Enter → commit + 아래 셀로 이동 (선택적)
   - Tab → commit + 오른쪽 셀로 이동 (선택적)
   - Escape → cancel
   - 셀 선택 상태에서 타이핑 시작 → 자동 edit mode 진입

2. **스크롤 동기화**
   - 편집 중 스크롤 시 에디터 위치 업데이트 또는 자동 cancel
   - 결정: 자동 cancel이 더 단순하고 안전 (AG Grid도 이 방식)

3. **select 에디터 구현**
   - `editor: "select"` 시 built-in select 컴포넌트 렌더링
   - ColumnProps에 `editorOptions?: { options: { label: string; value: unknown }[] }` 추가

4. **편집 중 시각적 피드백**
   - 편집 중인 셀 하이라이트 (border 등)
   - 에디터가 셀 경계를 넘지 않도록 크기 제한

### 변경 파일

- `editor-manager.ts` — 키보드 네비게이션 상태 관리
- `use-editing.ts` — 스크롤 이벤트 감지 + cancel
- `built-in-editors.tsx` — select 에디터 추가
- `types.ts` — editorOptions 타입

### 테스트

- Enter/Tab/Escape 키보드 동작
- 스크롤 시 에디터 cancel 확인
- select 에디터 옵션 렌더링 + 선택 commit

---

## Step 별 예상 규모

| Step | 핵심 내용                       | 변경 파일 수 | 신규 파일 |
| ---- | ------------------------------- | ------------ | --------- |
| 1    | meta.updateData 파이프라인      | 3            | 0         |
| 2    | editCell render prop + 리팩토링 | 4-5          | 1         |
| 3    | 키보드/스크롤/select UX         | 3-4          | 0         |

---

## 사용 예시 (최종 형태)

```tsx
// 기본 사용 (built-in editor)
<Grid
  data={data}
  meta={{
    updateData: (rowIndex, columnId, value) => {
      setData((old) =>
        old.map((row, i) => (i === rowIndex ? { ...old[rowIndex]!, [columnId]: value } : row)),
      );
    },
  }}
>
  <Column id="name" editor="text" />
  <Column id="price" editor="number" />
  <Column
    id="status"
    editor="select"
    editorOptions={{
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    }}
  />
</Grid>;

// 커스텀 에디터 (editCell render prop)
const columns = [
  helper.accessor("name", {
    editCell: ({ value, onCommit, onCancel }) => (
      <input
        defaultValue={value as string}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
    ),
  }),
  helper.accessor("date", {
    editCell: ({ value, onCommit, onCancel }) => (
      <DatePicker value={value as Date} onChange={(date) => onCommit(date)} onClose={onCancel} />
    ),
  }),
];
```

---

## 의존성

```
Step 1: meta.updateData ← 독립 (기존 코드에 추가만)
         ↓
Step 2: editCell render prop ← Step 1 필요 (onCommit → meta.updateData 연결)
         ↓
Step 3: UX 완성 ← Step 2 필요 (editCell 기반 위에 UX 추가)
```
