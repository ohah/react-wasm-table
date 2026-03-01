---
pageType: home
hero:
  name: react-wasm-table
  text: 고성능 React 테이블
  tagline: Rust/WASM 기반
  image:
    src: /react-wasm-table/logo.svg
    alt: react-wasm-table 로고
  actions:
    - theme: brand
      text: 벤치마크
      link: /benchmark
    - theme: brand
      text: 시작하기
      link: /guide/getting-started
    - theme: alt
      text: API 레퍼런스
      link: /api/table
    - theme: alt
      text: 아키텍처
      link: /guide/architecture
features:
  - title: 벤치마크
    details: 동일 데이터·동일 스키마로 TanStack React Table와 초기 렌더 시간, 스크롤 FPS를 비교합니다. 500~10K 행을 나란히 실행할 수 있습니다.
    icon: "⚡"
    link: /benchmark
  - title: Canvas + WASM
    details: 셀당 DOM 없음. 하나의 캔버스가 뷰포트를 그리며, 레이아웃과 히트 테스트는 Rust/WASM에서 실행되어 대량 데이터에서도 부드럽게 스크롤됩니다.
    icon: "🦀"
    link: /guide/architecture
  - title: TanStack 호환 API
    details: createColumnHelper, useReactTable와 동일한 컬럼·상태 모델. 헤드리스 로직만 교체하고 테이블 UX는 유지하세요.
    icon: "🔌"
    link: /guide/getting-started
  - title: 캔버스 컴포넌트
    details: 셀 내용을 렌더 인스트럭션으로 Text, Badge, Flex, Box, Stack, Sparkline. 캔버스에 스타일링, DOM 없음.
    icon: "📐"
    link: /guide/canvas-components
  - title: 정렬, 필터, 선택
    details: 헤더 클릭 정렬, 컬럼 필터, 행/셀 선택, 클립보드, 내보내기 내장. 상태는 ref에 두어 스크롤 성능이 유지됩니다.
    icon: "📋"
    link: /api/table
---
