---
title: "Agent Reach 安装与配置指南 — 让 AI Agent 一键获得互联网能力"
excerpt: "Agent Reach 让 Claude Code 等 AI Agent 能读 B站、YouTube、Twitter、微信公众号等 17 个平台。本文记录完整安装过程、组件清单和关键踩坑。"
category: "tools-and-tips"
tags: ["agent-reach", "bilibili", "youtube", "yt-dlp", "cli", "ai-agent"]
publishedAt: "2026-04-13"
readTime: 8
---

## 概述

Agent Reach 是一个让 AI Agent 一键获得互联网访问能力的工具，支持 17 个平台（B站/YouTube/Twitter/微信公众号/小红书等），零 API 费用。

GitHub: [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach) (17k+ stars)

## 安装方式

```bash
# venv 安装（推荐，避免 PEP 668 限制）
python3 -m venv ~/.agent-reach-venv
source ~/.agent-reach-venv/bin/activate
pip install https://github.com/Panniantong/agent-reach/archive/main.zip

# 核心安装（自动检测环境）
agent-reach install --env=auto

# 安装额外渠道
agent-reach install --env=auto --channels=bilibili
```

## 已安装组件

| 组件 | 版本 | 用途 |
|------|------|------|
| agent-reach | v1.4.0 | 安装器 + 健康检查 |
| yt-dlp | 2026.03.17 | 视频信息/字幕提取 |
| bilibili-cli | v0.6.2 | B站搜索/热门/音频下载 |
| mcporter | v0.7.3 | MCP 服务管理 |
| gh CLI | v2.89.0 | GitHub 操作 |

## 可用渠道

免配置即用：B站、YouTube、微信公众号、RSS、全网搜索(Exa)、任意网页(Jina Reader)

需配置 Cookie：Twitter、小红书、微博、雪球、抖音、LinkedIn

## 关键踩坑

1. **yt-dlp 不在系统 PATH** — 安装在 venv 中，脚本需用完整路径
2. **B站空间页需要 Cookie** — `yt-dlp --flat-playlist` 返回 352 错误，改用 `bili search`
3. **raw.githubusercontent.com 被墙** — 下载模型文件用 hf-mirror.com
4. **Groq console 国内无法访问** — ASR 改用本地 whisper-cpp

## 常用命令

```bash
bili search "关键词" --type video -n 10 --json   # B站搜索
bili audio BVxxx -o /tmp/output --segment 25      # 下载音频
yt-dlp --write-auto-sub --skip-download URL       # YouTube 字幕
agent-reach doctor                                 # 健康检查
```

---

*Agent Reach Skill 位置: `~/.claude/skills/agent-reach/SKILL.md`*
