#!/usr/bin/env sh
# Strip tool-attribution lines from a commit message file (for git commit -F).
# Usage: ./scripts/strip-commit-attribution.sh <path-to-commit-message-file>
set -e
[ -n "$1" ] || { echo "Usage: $0 <commit-message-file>" >&2; exit 1; }
msgfile="$1"
[ -f "$msgfile" ] || { echo "Not a file: $msgfile" >&2; exit 1; }
grep -v "Made-with: Cursor" "$msgfile" | grep -v "Made with Cursor" > "${msgfile}.tmp"
mv "${msgfile}.tmp" "$msgfile"
