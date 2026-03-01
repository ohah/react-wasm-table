---
pageType: home
hero:
  name: react-wasm-table
  text: High-performance React Table
  tagline: Powered by Rust/WASM
  image:
    src: /react-wasm-table/logo.svg
    alt: react-wasm-table logo
  actions:
    - theme: brand
      text: Benchmark
      link: /benchmark
    - theme: brand
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/table
    - theme: alt
      text: Architecture
      link: /guide/architecture
features:
  - title: Benchmark
    details: Same data, same schema. Compare initial render time and scroll FPS with TanStack React Table. Run 1K–1M rows sequentially.
    icon: "⚡"
    link: /benchmark
  - title: Canvas + WASM
    details: No DOM per cell. One canvas draws the viewport; layout and hit-test run in Rust/WASM for smooth scrolling at scale.
    icon: "🦀"
    link: /guide/architecture
  - title: TanStack-compatible API
    details: Use createColumnHelper, useReactTable, and the same column/state model. Swap headless logic; keep your table UX.
    icon: "🔌"
    link: /guide/getting-started
  - title: Canvas components
    details: Cell content as render instructions - Text, Badge, Flex, Box, Stack, Sparkline. Styled on canvas, no DOM.
    icon: "📐"
    link: /guide/canvas-components
  - title: Sorting, filtering, selection
    details: Built-in sorting, column filters, row/cell selection, clipboard, export. State stays in refs so scroll performance is unchanged.
    icon: "📋"
    link: /api/table
---

import { Benchmark } from "demo";

<Benchmark />
