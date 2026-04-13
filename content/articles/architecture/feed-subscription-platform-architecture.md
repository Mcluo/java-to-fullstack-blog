---
title: "订阅源管理平台架构设计 — B站/YouTube 视频 AI 总结系统"
excerpt: "在博客项目中构建完整的订阅源管理平台：B站/YouTube/RSS 订阅 + 本地 whisper-cpp 语音转录 + Claude 结构化 JSON 总结（章节/时间戳/大纲），包含 5 种 ASR 方案对比和 Prompt 调优实战。"
category: "architecture"
tags: ["feeds", "bilibili", "youtube", "whisper", "ai-summary", "next.js", "architecture"]
publishedAt: "2026-04-13"
readTime: 15
---

## 概述

在博客项目（java-to-fullstack-blog）中构建了一个完整的订阅源管理平台，支持 B站/YouTube/RSS 订阅、CLI 爬取、本地语音转录（whisper-cpp）和 AI 结构化总结。参考了 VideoSeek.ai 的产品设计。

---

## 整体架构

```
┌─────────────────────────────────────────────────┐
│              /feeds 页面 (Next.js)               │
├─────────┬──────────┬────────────┬───────────────┤
│ 快速总结 │ 我的收藏 │  订阅内容   │  管理订阅源   │
│ (URL输入) │ (favorites)│ (items列表) │ (config CRUD)│
└────┬─────┴────┬─────┴─────┬──────┴───────┬───────┘
     │          │           │              │
     ▼          ▼           ▼              ▼
 /api/feeds/  /api/feeds/ /api/feeds/   /api/feeds/
 quick-       favorites   items +       config +
 summarize               summarize     discover
     │
     ▼
┌─────────────────────────────────────────────────┐
│              转录 + 总结 Pipeline                 │
│                                                  │
│  bili audio → WAV片段 → whisper-cpp → 文字       │
│  yt-dlp → VTT字幕 → 文字                        │
│  Jina Reader → 网页正文                          │
│         ↓                                        │
│  Claude API → 结构化 JSON 总结                    │
│  (chapters + timestamps + keyPoints)             │
└─────────────────────────────────────────────────┘
```

## 核心技术决策

### B站视频转录方案选型

| 方案 | 结论 |
|------|------|
| yt-dlp --write-auto-sub | B站不支持自动字幕，仅 YouTube 可用 |
| B站 AI 字幕 API | 需要登录 Cookie，不稳定 |
| Groq Whisper API | 国内无法访问 |
| ModelScope SenseVoice | API 不支持音频文件上传 |
| **whisper-cpp (最终方案)** | brew 安装，本地运行，Apple Silicon 加速，零成本 |

**最终链路**: `bili audio BVxxx` → 25s WAV 片段 → `whisper-cli -m ggml-small.bin -l zh` → 文字

### AI 总结输出格式

从纯文本演进到结构化 JSON，解决了截断和结构不清的问题：

```json
{
  "overview": "一句话概括",
  "chapters": [
    {
      "timestamp": "00:00",
      "title": "章节标题",
      "summary": "详细总结",
      "keyPoints": ["要点1", "要点2"]
    }
  ],
  "takeaway": "价值判断"
}
```

### Prompt 调优关键参数

| 参数 | 初始值 | 最终值 | 原因 |
|------|-------|-------|------|
| max_tokens | 500 | 4000 | 中文 500 token 只约 300 字，会截断 |
| 输入文本限制 | 6000 chars | 15000 chars | 长视频需要更多上下文 |
| 输出格式 | "3-5句话" | 结构化 JSON | 支持章节/时间戳/大纲视图 |

### 踩坑记录

1. **B站缩略图防盗链** — img 标签需要 `referrerPolicy="no-referrer"`
2. **AI 输出 JSON 中文引号** — `""` 破坏 JSON 解析，需替换为 `「」`
3. **yt-dlp 不在系统 PATH** — 脚本需用完整路径 `~/.agent-reach-venv/bin/yt-dlp`
4. **B站空间页需要 Cookie** — 改用 `bili search` 按作者名搜索

## 前端展示设计（参考 VideoSeek）

借鉴 VideoSeek.ai 的四个核心特性：

1. **章节分段** — 按视频话题自动分段，每段带标题和详细总结
2. **时间戳导航** — 点击时间戳直接跳转到 B站/YouTube 对应位置
3. **大纲视图** — 树状结构展示章节 + 要点，一目了然
4. **原文对照** — 总结和转录文本可切换查看，带时间戳的逐段文字

## 功能模块

| 模块 | 说明 |
|------|------|
| 快速总结 | 粘贴 URL 一键总结（B站/YouTube/网页） |
| 我的收藏 | 收藏喜欢的视频和总结，支持搜索和删除 |
| 订阅内容 | 爬取列表，支持 AI 总结/收藏/删除/批量总结 |
| 管理订阅源 | 增删改查订阅源（RSS/B站/YouTube） |
| 定时拉取 | macOS launchd 每天 8:30 自动爬取 |

## 依赖清单

```bash
brew install whisper-cpp ffmpeg
# whisper 模型
curl -L -o ~/.local/share/whisper-cpp/ggml-small.bin \
  https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
# Agent Reach
pip install agent-reach bilibili-cli av
# npm
npm install xml2js @types/xml2js
```

---

*本文基于实际开发过程撰写，所有方案选型均经过实际验证。*
