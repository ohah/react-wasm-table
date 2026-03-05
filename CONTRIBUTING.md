# Contributing

## Prerequisites

- [Bun](https://bun.sh/) (package manager & runtime)
- [Rust](https://www.rust-lang.org/) toolchain with `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)

## Setup

```bash
# Install dependencies
bun install

# Build WASM + library
bun run build

# Run demo app
bun run dev:demo

# Run documentation site
bun run dev:docs
```

## Project Structure

```
react-wasm-table/
  crates/
    core/          # Pure Rust logic (layout, sort, filter)
    wasm/          # WASM bindings (JS interop)
  packages/
    react-wasm-table/ # React component library (@ohah/react-wasm-table)
  examples/
    demo/          # Demo application
  document/        # Rspress documentation site
  docs/            # Architecture & design docs
  e2e/             # Playwright E2E tests
```

## Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `bun run build`      | Build WASM + library          |
| `bun run dev:demo`   | Start demo dev server         |
| `bun run dev:docs`   | Start docs dev server         |
| `bun run test`       | Run JS/TS tests               |
| `bun run test:rust`  | Run Rust tests                |
| `bun run test:e2e`   | Run Playwright E2E tests      |
| `bun run lint:all`   | Run oxlint + clippy           |
| `bun run format:all` | Format with oxfmt + cargo fmt |

## Code Quality

Before submitting a PR, make sure all checks pass:

```bash
bun run check
```

This runs both linting (`oxlint` + `clippy`) and format checking (`oxfmt` + `cargo fmt`).

## Architecture Docs

For detailed design decisions, see the [docs/](./docs/) directory:

- [Architecture](./docs/architecture.md) - Layer diagram, data flow, Taffy integration
- [API Design](./docs/api-design.md) - React component API, render props, editors
- [Canvas Components](./docs/canvas-components.md) - Component system and style props
