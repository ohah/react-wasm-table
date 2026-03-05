# react-wasm-table

Rust/WASM 기반 고성능 React 테이블 컴포넌트. 모든 셀 렌더링이 단일 `<canvas>`에서 이루어지며, 레이아웃과 히트 테스팅은 WebAssembly(Taffy flexbox 엔진)를 통해 Rust에서 실행됩니다.

```
React Headless API -> JS Adapter -> WASM Core (Rust/Taffy) -> Canvas Renderer
```

[문서](https://ohah.github.io/react-wasm-table/) | [English](./README.md)

## 주요 특징

- **Canvas 렌더링** - 셀당 DOM 없이 하나의 canvas로 전체 뷰포트 렌더링
- **WASM 레이아웃 엔진** - Taffy(Rust)가 flexbox/grid 레이아웃과 히트 테스팅 처리
- **TanStack 호환 API** - `createColumnHelper`, `useReactTable` 등 동일한 컬럼/상태 모델
- **Canvas 컴포넌트** - Text, Badge, Flex, Box, Stack, Sparkline, Color, Tag, Rating, Chip, Link, Avatar, DatePicker, Dropdown
- **내장 기능** - 정렬, 필터링, 선택, 클립보드(복사/붙여넣기), CSV/TSV/JSON 내보내기
- **60fps 스크롤** - 스크롤 핫 경로가 React 외부에서 실행
- **가상 스크롤** - 100만 행 이상 처리 가능

## 빠른 시작

### 설치

```bash
npm install @ohah/react-wasm-table
# 또는
bun add @ohah/react-wasm-table
```

### 기본 사용법

```tsx
import { Grid, createColumnHelper } from "@ohah/react-wasm-table";

type Person = { name: string; age: number };

const helper = createColumnHelper<Person>();

const columns = [
  helper.accessor("name", { header: "이름" }),
  helper.accessor("age", { header: "나이" }),
];

const data: Person[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

function App() {
  return <Grid data={data} columns={columns} width={600} height={400} />;
}
```

### 셀에서 Canvas 컴포넌트 사용

```tsx
import { Grid, createColumnHelper, Flex, Badge, Rating } from "@ohah/react-wasm-table";

const columns = [
  helper.accessor("name", { header: "이름" }),
  helper.accessor("status", {
    header: "상태",
    cell: ({ getValue }) => <Badge value={getValue()} backgroundColor="#d1fae5" color="#065f46" />,
  }),
  helper.accessor("rating", {
    header: "평점",
    cell: ({ getValue }) => <Rating value={getValue()} max={5} />,
  }),
];
```

## 아키텍처

| 레이어             | 역할                                             |
| ------------------ | ------------------------------------------------ |
| React Headless API | 설정 수집 (`Grid`, `Column`, hooks)              |
| JS Adapter         | 컬럼 레지스트리, 데이터 수집, 이벤트 관리        |
| WASM Core (Rust)   | 컬럼 저장소, Taffy 레이아웃, 가상 스크롤, 정렬   |
| Canvas Renderer    | 셀 그리기, 헤더 렌더링, 그리드 라인, 히트 테스트 |

## Canvas 컴포넌트

| 컴포넌트   | 설명                             |
| ---------- | -------------------------------- |
| Text       | 한 줄 텍스트                     |
| Badge      | 배경이 있는 pill/chip            |
| Flex       | Taffy 호환 flex 컨테이너         |
| Box        | padding/margin/border 컨테이너   |
| Stack      | gap이 있는 행/열 레이아웃        |
| Sparkline  | 인라인 미니 라인/영역 차트       |
| Color      | 중앙 정렬 색상 견본              |
| Tag        | 테두리가 있는 텍스트             |
| Rating     | 별점 (채움/빈)                   |
| Chip       | 닫기 버튼 옵션이 있는 pill       |
| Link       | 밑줄이 있는 클릭 가능 텍스트     |
| Avatar     | 원형 아바타 (이미지 또는 이니셜) |
| DatePicker | DOM 오버레이 날짜 입력           |
| Dropdown   | DOM 오버레이 선택 입력           |

모든 컴포넌트는 이벤트 핸들러를 지원합니다: `onClick`, `onDoubleClick`, `onMouseDown`, `onMouseUp`, `onMouseEnter`, `onMouseLeave`.

## Hooks

| Hook            | 설명                          |
| --------------- | ----------------------------- |
| `useReactTable` | TanStack 호환 테이블 인스턴스 |
| `useGridTable`  | Grid 전용 테이블 인스턴스     |
| `useSorting`    | 컬럼 정렬 상태                |
| `useFiltering`  | 컬럼/글로벌 필터링            |
| `useSelection`  | 셀/행 선택                    |

## Row Models

- `getCoreRowModel` - 기본 row model
- `getSortedRowModel` - 정렬된 행
- `getFilteredRowModel` - 필터링된 행
- `getExpandedRowModel` - 트리/확장 가능 행
- `getPaginationRowModel` - 페이지네이션 행
- `getGroupedRowModel` - 그룹화된 행
- `getFacetedRowModel` - 패싯 행

## 기여하기

개발 환경 설정 및 가이드라인은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고하세요.

## 라이선스

MIT
