# AGENTS.md

Canvas-based high-performance React grid. Rust/WASM (Taffy flexbox) layout engine.

```
React Headless API → JS Adapter → WASM Core (Rust) → Canvas Renderer
```

## Docs

- [Architecture](docs/architecture.md) — layer diagram, data flow, Taffy integration
- [API Design](docs/api-design.md) — React component API, render props, editors
- [Canvas Components](docs/canvas-components.md) — Flex/Taffy style, style prop, ReactNode children rules
- [Canvas Component List](docs/canvas-component-list.md) — supported vs planned (stub) components
- [Module Specs](docs/module-specs.md) — per-module interfaces, types, responsibilities
- [Testing Strategy](docs/testing-strategy.md) — isolation testing, CI pipeline
- [Code Rules](docs/code-rules.md) — legacy/unused code removal policy, test coverage requirements
