---
title: "Ghostty vs Terminal：一个理由让你切换终端"
excerpt: "Ghostty 是 Mitchell Hashimoto（Vagrant/Terraform 创始人）开发的高性能终端模拟器，采用原生 Swift/Metal 渲染，相比 macOS Terminal.app 和 iTerm2 有显著的性能和体验优势。"
category: "tools-and-tips"
tags: ["ghostty", "terminal", "tools", "macos"]
publishedAt: "2026-04-25"
readTime: 5
---

## 概述

Ghostty 是 Mitchell Hashimoto（Vagrant/Terraform 创始人）开发的高性能终端模拟器，采用原生 Swift/Metal 渲染，相比 macOS Terminal.app 和 iTerm2 有显著的性能和体验优势。

---

## 相比 macOS Terminal.app

| 痛点 | Terminal.app | Ghostty |
|------|-------------|---------|
| 渲染速度 | 慢，复杂输出卡顿 | GPU 加速，丝滑 |
| 字体渲染 | 基础 | 原生 CoreText，连字支持 |
| 颜色支持 | 256色/有限真彩 | 完整 true color |
| 配置方式 | GUI 点来点去 | 纯文本配置文件 |
| 分屏 | 靠 tmux | 内置 split pane |

## 相比 iTerm2

- **启动速度**：秒开，iTerm2 越用越慢
- **内存占用**：轻量很多
- **无 Electron**：原生 Swift/Metal，不是套壳浏览器

## 真正解决的痛点

`cat` 大文件、`docker logs` 刷屏、`vim` 复杂配色 —— 这些在 Terminal.app/iTerm2 里会卡或者花屏，Ghostty 不会。

## 横向对比

| 场景 | 推荐 |
|------|------|
| 从 Terminal.app 迁移 | ✅ 强烈推荐，全面碾压 |
| 从 iTerm2 迁移 | ✅ 推荐，更快更干净（除非依赖 iTerm2 高级功能） |
| 从 Warp 迁移 | ⚠️ 不同定位，Warp 是 AI-first，Ghostty 是传统终端极致 |

## 安装

```bash
brew install --cask ghostty
```
