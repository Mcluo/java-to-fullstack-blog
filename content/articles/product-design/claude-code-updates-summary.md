---
title: "Claude Code 更新汇总"
excerpt: "Claude Code 版本更新追踪与功能索引。每次更新的详细解读、功能说明、使用场景一站式查阅。"
category: "product-design"
tags: ["claude-code", "更新日志", "版本追踪"]
publishedAt: "2026-04-14"
updatedAt: "2026-04-14"
readTime: 5
---

**持续更新** | 当前最新版本: 2.1.105 (latest) | 稳定版: 2.1.92 (stable)

---

## 更新日志

每次版本更新的详细解读，点击标题查看完整分析。

| 日期 | 版本范围 | 更新主题 | 详细文章 |
|------|----------|----------|----------|
| 2026-04-13 | 2.1.100 → 2.1.104 | TaskCreate 交互优化、Skill 触发强制化、跨境选品 Skill | [查看详情](/articles/product-design/claude-code-update-2.1.100-104) |
| 2026-04-11 | 2.1.98 → 2.1.100 | Worktree 安全增强、Agent 隔离开发、多选交互 | [查看详情](/articles/product-design/claude-code-update-2.1.98-100) |
| 2026-04-09 | 2.1.93 → 2.1.97 | 1M Context Window 标注、模型 ID 标准化 | [查看详情](/articles/product-design/claude-code-update-2.1.93-97) |

---

## 版本通道说明

Claude Code 通过 npm 发布，有三个分发通道：

| 通道 | 当前版本 | 适用场景 | 安装命令 |
|------|----------|----------|----------|
| **latest** | 2.1.105 | 尝鲜，体验最新功能 | `npm i -g @anthropic-ai/claude-code` |
| **next** | 2.1.105 | 预览版，通常与 latest 一致 | `npm i -g @anthropic-ai/claude-code@next` |
| **stable** | 2.1.92 | 稳定优先，适合团队统一 | `npm i -g @anthropic-ai/claude-code@stable` |

---

## 功能全景

<img src="/images/cc-updates/claude-code-mindmap.svg" alt="Claude Code 功能全景思维导图" style="max-width:100%;margin:1em 0;" />

### 模型能力

| 模型 | ID | 定位 | Context |
|------|----|------|---------|
| Opus 4.6 | `claude-opus-4-6` | 最强能力，复杂任务 | 1M tokens |
| Sonnet 4.6 | `claude-sonnet-4-6` | 平衡性能与速度 | - |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | 快速响应，轻量任务 | - |

- **Fast Mode** (`/fast`): 使用同一个 Opus 4.6 模型，输出更快，不降级

### 多平台支持

- CLI 工具 (Mac/Linux/Windows)
- 桌面应用 (Mac/Windows)
- Web 应用 (claude.ai/code)
- IDE 插件 (VS Code, JetBrains)

### 核心工具

| 类别 | 工具 | 说明 |
|------|------|------|
| **团队协作** | TeamCreate / Agent | 多 Agent 并行开发，[详细指南](/articles/product-design/claude-code-agent-teams-guide) |
| **隔离开发** | EnterWorktree / ExitWorktree | Git worktree 自动管理，支持实验性开发 |
| **任务管理** | TaskCreate / TaskList / TaskUpdate | 结构化任务追踪，状态流转 pending → in_progress → completed |
| **规划模式** | EnterPlanMode / ExitPlanMode | 复杂任务先探索、设计方案、用户审批后实施 |
| **定时任务** | CronCreate / CronList / CronDelete | 循环/一次性调度，支持持久化，7天自动过期 |
| **记忆系统** | Auto Memory | 跨 session 持久化用户偏好、项目信息、工作指导 |

### 扩展生态

| 类别 | 说明 |
|------|------|
| **MCP 服务器** | Context7 (技术文档)、Sequential Thinking (复杂推理)、21st Magic (UI 组件)、Yuque、ODPS 等 |
| **Skill 系统** | 100+ 开箱即用，支持自定义 (`~/.claude/skills/`)，`/skill-name` 快速调用 |
| **Agent 子类型** | 50+ 专业角色：Frontend Developer、Backend Architect、Security Engineer、AI Engineer 等 |

---

## 最佳实践速查

### 工具选择

| 场景 | 推荐 | 避免 |
|------|------|------|
| 读文件 | `Read` | `cat` / `head` / `tail` |
| 编辑文件 | `Edit` | `sed` / `awk` |
| 创建文件 | `Write` | `echo >` / heredoc |
| 搜索文件 | `Glob` | `find` / `ls` |
| 搜索内容 | `Grep` | `grep` / `rg` |

### 开发原则

- **只做必要修改**：不添加未请求的特性，不过度重构
- **安全优先**：破坏性操作前确认，尊重 pre-commit hooks
- **先验证后推荐**：基于记忆推荐前，确认文件/函数仍然存在

---

## 版本历史

| 版本 | 日期 | 通道 |
|------|------|------|
| 2.1.105 | 04-13 | latest, next |
| 2.1.104 | 04-12 | - |
| 2.1.101 | 04-10 | - |
| 2.1.100 | 04-10 | - |
| 2.1.98 | 04-09 | - |
| 2.1.97 | 04-08 | - |
| 2.1.96 | 04-07 | - |
| 2.1.94 | 04-06 | - |
| 2.1.92 | 04-04 | stable |
| 2.1.91 | 04-03 | - |
| 2.1.90 | 04-02 | - |
| 2.1.89 | 04-01 | - |

> Claude Code 保持高频更新节奏（几乎每日一版），部分版本号会被跳过（内部测试版）。

---

## 相关文章

- [Hermes Agent vs Claude Code：两种设计哲学的碰撞](/articles/research/hermes-agent-vs-claude-code-comparison)
- [Claude Code 多 Agent 团队协作指南](/articles/product-design/claude-code-agent-teams-guide)
- [Claude Code CLI 痛点分析](/articles/product-design/claude-code-cli-pain-points-analysis)

---

**最后更新**: 2026-04-14 | **更新方式**: 每日检查 + 手动补充
