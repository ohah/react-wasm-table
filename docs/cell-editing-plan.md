# Cell Editing 고도화 — 구현 계획

> **목표:** 현재 stub 수준의 inline editing을 완성된 편집 시스템으로 고도화
>
> **설계 원칙:** TanStack Table의 `meta.updateData` 패턴을 따르되,
> Canvas 기반 특성상 DOM overlay 관리는 그리드가 담당

---

## 현재 상태 (구현 완료)

| 항목                             | 상태 | 비고                                                         |
| -------------------------------- | ---- | ------------------------------------------------------------ |
| EditorManager 클래스             | ✅   | native input createElement 방식. text/number 지원            |
| useEditing 훅                    | ✅   | 더블클릭/클릭 → open, layout buffer에서 위치 계산            |
| DOM overlay (editorRef)          | ✅   | absolute positioned div, input에 pointerEvents: auto         |
| EventManager 더블클릭            | ✅   | hit-test → onCellDoubleClick 발화                            |
| 클릭/드래그 시 에디터 커밋       | ✅   | onCanvasEvent("mousedown")에서 commit() 호출                 |
| Column.editor prop               | ✅   | `"text" \| "number" \| "select"` (select 미구현)             |
| editorManager DI                 | ✅   | GridProps.editorManager로 외부 주입 가능 (테스트용)          |
| meta.updateData 파이프라인       | ✅   | EditorManager.onCommit → use-editing → meta.updateData       |
| Tab/Shift+Tab 네비게이션         | ✅   | EditorManager.onNavigate → 다음/이전 editable 셀 자동 이동   |
| editTrigger prop                 | ✅   | `"dblclick"` (기본) / `"click"` 모드 지원                    |
| click 모드 셀→셀 전환            | ✅   | pointerEvents를 input에만 적용, 컨테이너는 클릭 통과         |
| isCellEditable + text cursor     | ✅   | editable 셀 hover 시 마우스 커서 text로 변경                 |
| onCanvasEvent mousedown → commit | ✅   | 캔버스 어디든 mousedown 시 활성 에디터 commit (빈 영역 포함) |
| 이중 호출 방지                   | ✅   | cleanup()에서 state를 먼저 null → blur 재진입 시 no-op       |

---

## Step 1: meta.updateData + 값 커밋 파이프라인 ✅ 완료

**목표:** 에디터에서 커밋된 값이 데이터 소스까지 전달되는 파이프라인 완성

### 구현 내역

1. **GridProps에 `meta` prop 추가** — `TableMeta` 타입 (`types.ts`)
2. **EditorManager.onCommit 콜백** — commit() 시 coord/value와 함께 호출
3. **EditorManager.onNavigate 콜백** — Tab/Shift+Tab 시 방향과 함께 호출
4. **use-editing에서 onCommit → meta.updateData 연결** — coord → rowIndex/columnId 변환
5. **editTrigger prop** — `"click"` / `"dblclick"` 모드 (계획 외 추가)
6. **isCellEditable** — editable 셀 hover 시 text 커서 (계획 외 추가)
7. **onCanvasEvent("mousedown") commit** — 캔버스 전체 mousedown에서 에디터 commit (계획 외 추가)

### 변경 파일

- `types.ts` — `TableMeta` 타입, `GridProps.meta`, `GridProps.editTrigger` prop
- `editor-manager.ts` — `onCommit`/`onNavigate` 콜백, pointerEvents 수정
- `use-editing.ts` — meta 연결, Tab 네비게이션, editTrigger, isCellEditable
- `use-event-attachment.ts` — onCellHover cursor, onCanvasEvent commit
- `event-manager.ts` — onCellHover 핸들러 추가
- `Grid.tsx` — props wiring

### 테스트

- EditorManager: onCommit/onNavigate 콜백, 이중 호출 방지 (20개)
- use-editing: isCellEditable, editTrigger (7개)
- use-event-attachment: onCanvasEvent commit, cursor (14개)

---

## Step 2: editCell render prop + React 컴포넌트 에디터 — ✅ 완료

**목표:** 사용자가 React 컴포넌트로 에디터 UI를 자유롭게 결정

### 구현 내역

1. **editCell render prop 타입 정의** (`types.ts`, `tanstack-types.ts`)

   ```ts
   interface CellEditRenderProps {
     value: unknown;
     onCommit: (newValue: unknown) => void;
     onCancel: () => void;
     onCommitAndNavigate: (newValue: unknown, direction: "next" | "prev") => void;
     layout: CellLayout;
     initialChar: string | null;
   }

   // ColumnProps / ColumnDefBase에 추가
   editCell?: (props: CellEditRenderProps) => React.ReactNode;
   editorOptions?: { options: { label: string; value: unknown }[] };
   ```

2. **EditorManager 리팩토링** — DOM 생성 코드 전체 제거, 순수 상태 관리자로 전환
   - `open(coord, layout, editorType, currentValue, initialChar?)` — 상태 설정 + `onStateChange()` 호출
   - `commitValue(value)` — React 에디터에서 값을 받아 onCommit 호출
   - `commitAndNavigate(value, direction)` — commit + Tab 네비게이션
   - `cancel()` — 상태 초기화, onCommit 미호출
   - `onStateChange` 콜백으로 React 상태 동기화

3. **editCell / editor 우선순위**
   - `editCell` 제공 시 → 사용자 React 컴포넌트 렌더링
   - `editCell` 미제공 + `editor` 제공 시 → built-in 에디터 (TextEditor/NumberEditor/SelectEditor)
   - 둘 다 없으면 → 편집 불가

4. **built-in React 에디터 컴포넌트** (`react/editors/built-in-editors.tsx`)
   - `TextEditor` — `<input type="text">`, committedRef 패턴
   - `NumberEditor` — `<input type="number">`, Number() 변환
   - `SelectEditor` — `<select>`, editorOptions.options 기반
   - `editorStyle(layout)` — 셀 경계 내 absolute 포지셔닝 스타일 유틸리티

5. **createPortal 기반 렌더링** (`use-editing.tsx`)
   - `useState<EditorState>` + `EditorManager.onStateChange` → React 상태 동기화
   - `createPortal(editorElement, editorRef.current)` — editorRef div에 에디터 포탈 렌더링
   - editorState에 따라 editCell 커스텀 컴포넌트 또는 built-in 에디터 분기

### 변경 파일

- `types.ts` — `CellEditRenderProps`, `ColumnProps.editCell`, `ColumnProps.editorOptions`
- `tanstack-types.ts` — `ColumnDefBase.editCell`, `ColumnDefBase.editorOptions`
- `editor-manager.ts` — 순수 상태 관리자로 전면 리팩토링
- `use-editing.ts` → `use-editing.tsx` — createPortal 기반 렌더링, editCell 호출
- `resolve-columns.ts` — editCell/editorOptions passthrough
- `Grid.tsx` — editorPortal JSX 삽입
- `Column.tsx` — editCell/editorOptions props
- `index.ts` — CellEditRenderProps, TextEditor, NumberEditor, SelectEditor, editorStyle export
- 새 파일: `react/editors/built-in-editors.tsx`, `react/editors/index.ts`

### 테스트

- EditorManager: 상태 기반 테스트 (open/commitValue/cancel/onStateChange/initialChar)
- use-editing: editCell 우선순위, isCellEditable, commitAndNavigate
- use-event-attachment: mousedown cancel (commit → cancel 변경)

---

## Step 3: 에디터 UX 완성 — ✅ 완료

**목표:** 편집 경험의 세부 동작 완성

### 구현 내역

- ✅ Tab → commit + 다음 editable 셀로 이동
- ✅ Shift+Tab → commit + 이전 editable 셀로 이동
- ✅ Enter → commit
- ✅ Escape → cancel
- ✅ 편집 중 셀 border 하이라이트 (2px solid #1976d2)
- ✅ **type-to-edit**: 셀 선택 상태에서 printable key 입력 시 자동 edit mode 진입 (initialChar 전달)
- ✅ **스크롤 cancel**: 편집 중 스크롤 시 에디터 자동 cancel (`use-event-attachment.ts` onScroll)
- ✅ **select 에디터**: `editor: "select"` + `editorOptions.options` → built-in `<select>` 렌더링
- ✅ **에디터 크기 제한**: `editorStyle(layout)` — maxWidth/maxHeight = 셀 크기, overflow: hidden

### 변경 파일

- `use-event-attachment.ts` — handleTypingKeyDown 연결, 스크롤 시 cancel, mousedown → cancel
- `use-editing.tsx` — handleTypingKeyDown 구현 (single printable char + single cell selected)
- `react/editors/built-in-editors.tsx` — SelectEditor, editorStyle maxWidth/maxHeight
- `Grid.tsx` — handleTypingKeyDown handlers 전달

---

## Step 별 진행 상태

| Step | 핵심 내용                       | 상태    | 변경 파일 수 | 신규 파일 |
| ---- | ------------------------------- | ------- | ------------ | --------- |
| 1    | meta.updateData 파이프라인      | ✅ 완료 | 6            | 0         |
| 2    | editCell render prop + 리팩토링 | ✅ 완료 | 9            | 2         |
| 3    | 키보드/스크롤/select UX         | ✅ 완료 | 4            | 0         |

---

## 사용 예시 (최종 형태)

```tsx
// 기본 사용 (built-in editor) — ✅ 현재 동작
<Grid
  data={data}
  meta={{
    updateData: (rowIndex, columnId, value) => {
      setData((old) =>
        old.map((row, i) => (i === rowIndex ? { ...old[rowIndex]!, [columnId]: value } : row)),
      );
    },
  }}
  editTrigger="dblclick" // "dblclick" (기본) | "click"
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

// 커스텀 에디터 (editCell render prop) — ✅ 구현 완료
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
Step 1: meta.updateData ✅ ← 독립 (기존 코드에 추가만)
         ↓
Step 2: editCell render prop ✅ ← Step 1 필요 (onCommit → meta.updateData 연결)
         ↓
Step 3: UX 완성 ✅ ← Step 2 필요 (editCell 기반 위에 UX 추가)
```
