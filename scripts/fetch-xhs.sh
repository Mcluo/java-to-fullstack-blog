#!/bin/bash
# fetch-xhs.sh <url>
# 通过 debug Chrome CDP 获取小红书笔记内容
# 前提：debug Chrome 需已用 ~/.chrome-debug-profile 登录过小红书
#       启动命令见 start-chrome-debug.sh

set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo '{"ok":false,"error":"missing url"}' >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PY="$HOME/.agent-reach-venv/bin/python3"

exec "$VENV_PY" "$SCRIPT_DIR/fetch-xhs.py" "$URL"
