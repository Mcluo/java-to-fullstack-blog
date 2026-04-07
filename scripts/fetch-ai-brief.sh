#!/bin/bash
# AI论文简报 每日爬取脚本
# 从 ai-brief.liziran.com 爬取最新文章并转为博客 Markdown

set -euo pipefail

BLOG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$BLOG_DIR/content/articles/ai-brief"
CONVERT_SCRIPT="$BLOG_DIR/scripts/convert-ai-brief.mjs"
TMP_DIR="/tmp/ai-brief-fetch"

mkdir -p "$OUTPUT_DIR" "$TMP_DIR"

echo "[ai-brief] 开始爬取 AI论文简报..."

# Step 1: 打开首页
echo "[ai-brief] 打开首页..."
agent-browser open "https://ai-brief.liziran.com/zh" >/dev/null 2>&1 || {
  # 如果 daemon 没启动，用 headed 模式启动
  agent-browser --headed open "https://ai-brief.liziran.com/zh" >/dev/null 2>&1
}
sleep 2
agent-browser wait --load networkidle >/dev/null 2>&1

# Step 2: 点击第一篇文章（最新的）
echo "[ai-brief] 获取最新文章..."
SNAPSHOT=$(agent-browser snapshot -i 2>/dev/null)

# 找到包含日期的文章链接 ref（通常是 e8）
ARTICLE_REF=$(echo "$SNAPSHOT" | grep -E '^\- link "20[0-9]{2}年' | head -1 | grep -oP 'ref=\K[a-z0-9]+')

if [ -z "$ARTICLE_REF" ]; then
  echo "[ai-brief] 未找到文章链接，退出"
  agent-browser close >/dev/null 2>&1
  exit 1
fi

agent-browser click "@$ARTICLE_REF" >/dev/null 2>&1
sleep 2
agent-browser wait --load networkidle >/dev/null 2>&1

# Step 3: 获取文章 URL 和日期
CURRENT_URL=$(agent-browser get url 2>/dev/null)
echo "[ai-brief] 文章URL: $CURRENT_URL"

if ! echo "$CURRENT_URL" | grep -q "daily"; then
  echo "[ai-brief] URL不包含daily，退出"
  agent-browser close >/dev/null 2>&1
  exit 1
fi

DATE=$(echo "$CURRENT_URL" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}')
OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"

# 幂等检查
if [ -f "$OUTPUT_FILE" ]; then
  echo "[ai-brief] $DATE 文章已存在，跳过"
  agent-browser close >/dev/null 2>&1
  exit 0
fi

# Step 4: 提取内容
TITLE=$(agent-browser get title 2>/dev/null | sed 's/ *$//')
RAW_TEXT_FILE="$TMP_DIR/$DATE-raw.txt"
agent-browser get text body > "$RAW_TEXT_FILE" 2>/dev/null

echo "[ai-brief] 提取完成: $TITLE"

# Step 5: 转换为 Markdown
echo "[ai-brief] 转换为博客格式..."
node "$CONVERT_SCRIPT" "$RAW_TEXT_FILE" "$OUTPUT_FILE" "$DATE" "$TITLE"

echo "[ai-brief] 已生成: $OUTPUT_FILE"

# Step 6: 关闭浏览器
agent-browser close >/dev/null 2>&1

echo "[ai-brief] 完成!"
