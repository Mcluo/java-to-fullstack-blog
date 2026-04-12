---
title: "agtx：让多个 AI 编码 Agent 在终端看板上并行协作"
excerpt: "一个 AI Agent 不够用？agtx 用看板（Kanban）+ tmux + git worktree 编排多个编码 Agent 并行工作。Gemini 做研究、Claude 写代码、Codex 做 Review —— 你只需要定义任务，按一个键。"
category: "tools-and-tips"
tags: ["agtx", "multi-agent", "kanban", "claude-code", "codex", "gemini", "orchestrator", "tmux", "git-worktree"]
publishedAt: "2026-04-12"
readTime: 12
---

## 一个 Agent 的局限

我们都遇到过这种场景：Claude Code 正在帮你实现一个功能，你突然想到另一个 bug 需要修。等着？开新终端？手动切分支？

传统 AI 编码工具是 **"一个 Agent、一个任务、一个终端"** 的模式。但现实开发中，我们往往有多个并行任务。

**agtx** 的出现，把这个问题优雅地解决了。

---

## agtx 是什么

[agtx](https://github.com/fynnfluegge/agtx) 是一个 **Rust 编写的终端看板工具**，用来编排和管理多个 AI 编码 Agent 并行工作。

核心理念很简单：

> 你定义任务，放到看板上。每个任务自动获得独立的 git worktree 和 tmux 窗口。AI Agent 在各自的隔离环境中并行工作。一个 Orchestrator Agent 负责统筹全局。

用一句话总结：**AI Agent 管理其他 AI Agent**。

---

![agtx 工作流](/images/agtx/workflow.svg)

## 为什么值得关注

### 1. 真正的多 Agent 并行

不是"切换 tab"那种伪并行。agtx 为每个任务创建独立的：
- **git worktree** — 代码完全隔离，互不干扰
- **tmux window** — 独立的 Agent 会话
- **工作流状态** — Backlog → Planning → Running → Review → Done

```
┌─────────────────────────────────────────────────────────┐
│                      agtx TUI                           │
├─────────────────────────────────────────────────────────┤
│  Backlog  │  Planning  │  Running  │  Review  │  Done   │
│  ┌─────┐  │  ┌─────┐   │  ┌─────┐  │  ┌─────┐ │         │
│  │Task1│  │  │Task2│   │  │Task3│  │  │Task4│ │         │
│  └─────┘  │  └─────┘   │  └─────┘  │  └─────┘ │         │
└─────────────────────────────────────────────────────────┘
```

### 2. 不同阶段用不同 Agent

这是最让我兴奋的设计。你可以配置：

```toml
# ~/.config/agtx/config.toml
default_agent = "claude"

[agents]
research = "gemini"      # Gemini 做研究（上下文窗口大）
planning = "claude"      # Claude 做规划（推理能力强）
running = "claude"       # Claude 写实现
review = "codex"         # Codex 做 Review（独立视角）
```

**取各家之长**：Gemini 的海量上下文适合研究阶段，Claude 的推理能力适合规划和实现，Codex 作为独立的 reviewer 提供不同视角。

### 3. Orchestrator — AI 管理 AI

按下 `O` 键，启动 Orchestrator Agent。它会：

- 监控 Planning 和 Running 阶段的任务
- 阶段完成后自动推进（Planning → Running → Review）
- 检测卡住的任务（空闲 1 分钟以上），读取 Agent 输出诊断原因
- 自动回答 CLI 提示，或者升级给人类处理

```bash
agtx --experimental   # 启动后按 O
```

**你负责定义任务和最终 merge，中间的执行全部自动化。**

---

## 架构解析

![agtx 架构](/images/agtx/architecture.svg)

agtx 的架构设计相当精巧：

```
                    agtx TUI (ratatui)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          SQLite      tmux        git worktree
         (状态持久化)  (Agent 会话)  (代码隔离)
              │
              ▼
         MCP Server ← → Orchestrator Agent
        (JSON-RPC/stdio)
```

### 关键技术选型

| 组件 | 技术 | 为什么选它 |
|------|------|-----------|
| TUI | ratatui + crossterm | Rust 生态最成熟的终端 UI 框架 |
| 数据库 | SQLite (rusqlite) | 嵌入式，零配置，足够用 |
| 会话管理 | tmux | 成熟稳定，原生支持多窗口、后台运行 |
| 代码隔离 | git worktree | Git 原生特性，比 clone 轻量得多 |
| Agent 通信 | MCP (Model Context Protocol) | 标准协议，Claude Code 原生支持 |
| 异步运行时 | tokio | Rust 异步编程事实标准 |

### MCP 集成亮点

Orchestrator 通过 MCP 协议与 agtx 通信，暴露的工具包括：

- `list_tasks` / `get_task` — 查看任务状态
- `move_task` — 推进任务阶段
- `read_pane_content` — 读取 Agent 终端输出（用于诊断卡住原因）
- `send_to_task` — 向 Agent 发送消息
- `check_conflicts` — 非破坏性合并冲突检测

这意味着 Orchestrator 本身也是一个 AI Agent（Claude Code），但它操作的对象是其他 Agent 的任务状态。

---

## 插件系统

![插件生态和 Agent 兼容性](/images/agtx/plugin-system.svg)

agtx 内置 7 个插件，覆盖不同的开发方法论：

| 插件 | 说明 | 适用场景 |
|------|------|---------|
| **void** | 纯粹的 Agent 会话，无自动流程 | 想完全手动控制时 |
| **agtx** (默认) | 内置工作流，每个阶段有技能和提示 | 通用开发 |
| **gsd** | Get Shit Done — 结构化 spec 驱动 | 需要交互式规划 |
| **spec-kit** | GitHub 的 Spec-Driven Development | 规格即可执行产物 |
| **openspec** | 轻量级 AI 引导规格框架 | 快速原型 |
| **bmad** | AI 驱动的敏捷开发 | 结构化阶段管理 |
| **superpowers** | 头脑风暴、TDD、子 Agent 驱动 | 复杂项目 |

### 自定义插件

一个 TOML 文件就能定义完整工作流：

```toml
name = "my-plugin"
description = "My custom workflow"

[commands]
research = "/my-plugin:research {task}"
planning = "/my-plugin:plan"
running = "/my-plugin:execute"
review = "/my-plugin:review"

[artifacts]
planning = ".my-plugin/plan.md"
running = ".my-plugin/summary.md"

[prompts]
research = "Task: {task}"
```

插件中的命令使用 canonical 格式，agtx 自动翻译为各 Agent 的原生格式：

| Canonical | Claude/Gemini | Codex | OpenCode |
|-----------|--------------|-------|----------|
| `/agtx:plan` | `/agtx:plan` | `$agtx-plan` | `/agtx-plan` |

---

## 快速上手

### 安装

```bash
# 一键安装
curl -fsSL https://raw.githubusercontent.com/fynnfluegge/agtx/main/install.sh | bash

# 或从源码编译
cargo build --release
cp target/release/agtx ~/.local/bin/
```

**前置依赖**：tmux（必需），gh CLI（可选，用于 PR 操作）

### 使用

```bash
# 在任何 git 仓库中启动
cd your-project && agtx

# Dashboard 模式 — 管理所有项目
agtx -g

# Orchestrator 模式
agtx --experimental
```

### 常用快捷键

| 键 | 功能 |
|----|------|
| `o` | 创建新任务 |
| `m` | 推进任务到下一阶段 |
| `Enter` | 打开任务（查看 Agent 会话） |
| `R` | 进入研究模式 |
| `d` | 查看 git diff |
| `O` | 切换 Orchestrator |
| `P` | 切换插件 |
| `q` | 退出 |

---

## 适用场景

### 非常适合

- **多功能并行开发** — 同时推进 3-5 个独立功能
- **"放手"式开发** — 定义好任务，让 Agent 自动完成，回来只需 review 和 merge
- **多 Agent 混合使用** — 利用不同 AI 模型的各自优势
- **团队探索 AI 编排** — 理解 Agent 协作的最佳实践

### 不太适合

- **简单的单任务修改** — 杀鸡用牛刀
- **没有 tmux 的环境** — tmux 是硬依赖
- **非 Git 项目** — git worktree 是核心隔离机制

---

## 与其他工具的对比

| 特性 | Claude Code 单独使用 | agtx |
|------|---------------------|------|
| 并行任务 | 手动开多终端 | 自动管理，独立 worktree |
| Agent 切换 | 手动 | 按阶段自动切换 |
| 任务状态 | 心中默记 | 看板可视化 |
| 合并冲突 | 手动处理 | 自动检测，Agent 辅助解决 |
| 多项目管理 | 多个终端窗口 | 统一 Dashboard |

---

## 我的思考

agtx 代表了一个有趣的方向：**AI Agent 编排层**。

目前的 AI 编码工具都聚焦在"Agent 本身的能力"——更好的代码生成、更准确的上下文理解。但很少有人思考：当 Agent 足够强大后，**如何高效管理多个 Agent 协同工作**？

agtx 给出了一个答案：看板 + 隔离 + 自动化流程 + Orchestrator。

这让我想到了从"写代码"到"管理写代码的 AI"的范式转变。作为开发者，我们的角色正在从"执行者"变成"指挥者"——定义任务、设定标准、做最终决策。

agtx 虽然还是 0.1.0 版本，但设计理念和架构都很扎实。值得持续关注。

---

## 相关链接

- GitHub 仓库：[fynnfluegge/agtx](https://github.com/fynnfluegge/agtx)
- 许可证：Apache-2.0
- 兼容 Agent：Claude Code / Codex / Gemini CLI / OpenCode / Cursor Agent / Copilot

---

*本文基于 agtx v0.1.0 版本的源码分析撰写。*
