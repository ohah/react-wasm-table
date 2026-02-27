Create a git commit for the current changes.

Instructions:

1. Run `git status` and `git diff --staged` to see what's changed
2. If nothing is staged, stage the relevant changed files (avoid staging unrelated files)
3. **Before committing, run checks:**
   - `bun run lint` (oxlint)
   - `bun run format:check` (oxfmt)
   - `cargo fmt --all -- --check` (rustfmt)
   - `cargo clippy --workspace -- -D warnings` (clippy)
   - `cargo test --workspace` (Rust tests)
   - If any check fails, fix the issues first before proceeding
4. Write a clear, concise commit message following conventional commits format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code restructuring
   - `docs:` for documentation
   - `chore:` for build/tooling changes
   - `test:` for test additions/changes
5. The commit message should be in English, 1-2 sentences focusing on "why" not "what"
6. **Never include any \"Made with Cursor\" / \"Made-with: Cursor\" or similar tool attribution text in the commit message.**
7. Create the commit
