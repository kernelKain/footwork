#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NODE_VERSION="22.14.0"
if ! command -v npm >/dev/null 2>&1; then
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" \
    -o /tmp/node.tar.gz
  tar -xzf /tmp/node.tar.gz -C /tmp
  export PATH="/tmp/node-v${NODE_VERSION}-linux-x64/bin:${PATH}"
fi

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/0.12.5/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

npm ci --prefix frontend
npm run build --prefix frontend
uv python install 3.12.12
uv sync --project backend --frozen --no-dev
