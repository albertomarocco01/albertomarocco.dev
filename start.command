#!/bin/zsh
# macOS: double-click to install deps (if missing) and start the dev server.
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm ci || exit 1
(sleep 4 && open http://localhost:3000) &
npm run dev
