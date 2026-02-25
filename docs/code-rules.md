# Code Rules

## Legacy / Unused Code

- **Always remove legacy code**: Code replaced by a newer implementation must be deleted immediately. No dead code, no commented-out blocks, no backwards-compat shims.
- **Remove unused code**: Delete any function, type, or import that has no callers.

## Test Coverage

- **100% coverage required**: Every new feature must have full E2E and unit test coverage.
- E2E: Playwright (`e2e/tests/`) for user interaction scenario verification.
- Unit: Bun test (JS) + cargo test (Rust) for per-module isolation testing.
