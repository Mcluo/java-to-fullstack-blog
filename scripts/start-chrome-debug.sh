#!/bin/bash
# 启动 debug Chrome（用于小红书抓取）
# 首次使用需在弹出的窗口里登录小红书，之后登录状态会持久保存

# 检查是否已在运行
if curl -s http://127.0.0.1:9222/json/version &>/dev/null; then
  echo "✅ debug Chrome 已在运行 (port 9222)"
  exit 0
fi

rm -f "$HOME/.chrome-debug-profile/SingletonLock" "$HOME/.chrome-debug-profile/SingletonCookie" 2>/dev/null

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  '--remote-allow-origins=*' \
  --user-data-dir="$HOME/.chrome-debug-profile" \
  --no-first-run \
  --window-size=1280,900 \
  'https://www.xiaohongshu.com/' &

echo "⏳ 启动中..."
for i in $(seq 1 10); do
  sleep 1
  if curl -s http://127.0.0.1:9222/json/version &>/dev/null; then
    echo "✅ debug Chrome 已启动"
    exit 0
  fi
done
echo "❌ 启动失败"
exit 1
