---
title: "Chrome MCP 探索与配置"
excerpt: "测试 chrome-mcp 能力（页面读取、弹幕抓取、钉钉文档解析），新增 aone-mix MCP"
category: "work-logs"
tags: ["chrome-mcp", "mcp", "钉钉文档", "bilibili"]
publishedAt: "2026-04-06"
readTime: 3
---

## 做了什么
- 测试 chrome-mcp 的各项能力：页面导航、内容提取、JS 执行、弹幕抓取、截图等
- 通过 chrome-mcp 读取 4 个钉钉文档内容（4.6 计划、复盘、CC 使用技巧、CC/Codex 实战分享）
- 从「Claude Code/Codex 实战经验分享」文档中提取推荐的 Skill 和 MCP 列表
- 对比已安装项，发现 aone-mix MCP 未安装
- 将 aone-mix 添加到 `~/.claude/mcp.json`
- 分析了魔改版 requesting-code-review skill 的工作机制

## 关键结论
1. chrome-mcp 通过 tabId 精准定位标签页，用户切换标签不影响后台操作
2. 钉钉文档正文在 iframe 中渲染，需要通过 JS 或 frameId 方式提取
3. B站弹幕可以通过 `.bpx-player-dm-wrap` 选择器抓取当前已渲染的弹幕
4. aone-km 之前已安装，aone-mix 新增（需重启 CC 生效）
5. 文档建议：MCP Less is More，会占据上下文影响模型性能
6. 魔改版 requesting-code-review 核心差异：与 subagent-driven-development 深度集成，每个 task 完成后自动触发 review
