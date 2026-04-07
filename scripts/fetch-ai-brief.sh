#!/bin/bash
# AI论文简报 每日爬取脚本
# 从 ai-brief.liziran.com 爬取文章并转为博客 Markdown
# 支持：首次运行补全历史文章 + 后续增量爬取

set -uo pipefail

BLOG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$BLOG_DIR/content/articles/ai-brief"
CONVERT_SCRIPT="$BLOG_DIR/scripts/convert-ai-brief.mjs"
TMP_DIR="/tmp/ai-brief-fetch"

mkdir -p "$OUTPUT_DIR" "$TMP_DIR"

cleanup() {
  agent-browser close >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[ai-brief] 开始爬取 AI论文简报..."

# Step 1: 打开存档页获取所有文章URL
echo "[ai-brief] 打开存档页获取文章列表..."
agent-browser open "https://ai-brief.liziran.com/zh/archive" >/dev/null 2>&1 || {
  agent-browser --headed open "https://ai-brief.liziran.com/zh/archive" >/dev/null 2>&1
}
sleep 3
agent-browser wait --load networkidle >/dev/null 2>&1 || true

# Step 2: 从存档页提取所有文章URL（排除 -sources，去掉 .html 后缀）
ALL_URLS=$(agent-browser eval 'JSON.stringify(Array.from(document.querySelectorAll("a[href*=daily]")).map(a=>a.href).filter(u=>!u.includes("-sources")).map(u=>u.replace(/\.html$/,"")))' 2>/dev/null | tr -d '"' | tr -d '[' | tr -d ']' | tr -d '\\' | tr ',' '\n')

if [ -z "$ALL_URLS" ]; then
  echo "[ai-brief] 未获取到文章列表，退出"
  exit 1
fi

TOTAL=$(echo "$ALL_URLS" | wc -l | tr -d ' ')
echo "[ai-brief] 发现 $TOTAL 篇文章"

# Step 3: 过滤出未爬取的文章
PENDING_URLS=""
PENDING_COUNT=0
for URL in $ALL_URLS; do
  DATE=$(echo "$URL" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}')
  if [ -z "$DATE" ]; then
    continue
  fi
  OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"
  if [ ! -f "$OUTPUT_FILE" ]; then
    PENDING_URLS="$PENDING_URLS $URL"
    PENDING_COUNT=$((PENDING_COUNT + 1))
  fi
done

if [ "$PENDING_COUNT" -eq 0 ]; then
  echo "[ai-brief] 所有文章已是最新，无需爬取"
  exit 0
fi

echo "[ai-brief] 需要爬取 $PENDING_COUNT 篇新文章"

# Step 4: 逐个爬取（保持同一浏览器会话，用 open 导航）
SUCCESS=0
FAIL=0
for URL in $PENDING_URLS; do
  DATE=$(echo "$URL" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}')
  OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"

  echo "[ai-brief] [$((SUCCESS + FAIL + 1))/$PENDING_COUNT] 爬取 $DATE ..."

  # 用 open 导航到文章页（在同一浏览器会话中）
  agent-browser open "$URL" >/dev/null 2>&1 || true
  sleep 2
  agent-browser wait --load networkidle >/dev/null 2>&1 || true

  # 验证URL
  CURRENT_URL=$(agent-browser get url 2>/dev/null || echo "")
  if ! echo "$CURRENT_URL" | grep -q "daily"; then
    echo "[ai-brief]   ⚠ 页面加载失败，跳过"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 提取内容
  TITLE=$(agent-browser get title 2>/dev/null | sed 's/ *$//' || echo "")
  RAW_TEXT_FILE="$TMP_DIR/$DATE-raw.txt"
  agent-browser get text body > "$RAW_TEXT_FILE" 2>/dev/null || true

  if [ ! -s "$RAW_TEXT_FILE" ]; then
    echo "[ai-brief]   ⚠ 内容为空，跳过"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 转换为 Markdown
  if node "$CONVERT_SCRIPT" "$RAW_TEXT_FILE" "$OUTPUT_FILE" "$DATE" "$TITLE" 2>/dev/null; then
    echo "[ai-brief]   ✓ $DATE.md"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "[ai-brief]   ⚠ 转换失败"
    FAIL=$((FAIL + 1))
  fi
done

echo "[ai-brief] 完成! 成功: $SUCCESS, 失败: $FAIL, 总计: $PENDING_COUNT"
