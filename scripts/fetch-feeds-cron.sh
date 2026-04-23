#!/bin/bash
# 定时爬取订阅源脚本 (launchd 调用)
# 日志输出到 ~/Library/Logs/feed-fetcher.log

LOG_FILE="$HOME/Library/Logs/feed-fetcher.log"
PROJECT_DIR="$HOME/java-to-fullstack-blog"
VENV_BIN="$HOME/.agent-reach-venv/bin"

echo "$(date '+%Y-%m-%d %H:%M:%S') === 开始爬取订阅源 ===" >> "$LOG_FILE"

# Ensure PATH includes needed tools
export PATH="$VENV_BIN:/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$PROJECT_DIR" || { echo "$(date) ERROR: 无法进入项目目录" >> "$LOG_FILE"; exit 1; }

npx tsx scripts/fetch-feeds.ts >> "$LOG_FILE" 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') === 爬取完成 ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
