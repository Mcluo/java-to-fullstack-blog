---
title: "Claude Code 2.1.98-100 更新详解：Worktree 安全增强与多选交互升级"
excerpt: "ExitWorktree 防误删机制、Agent worktree 隔离开发、记忆验证强化、AskUserQuestion 多选预览支持，以及定时任务自动过期机制。"
category: "product-design"
tags: ["claude-code", "更新日志", "worktree", "安全"]
publishedAt: "2026-04-11"
readTime: 8
---

**检测时间**: 2026-04-11
**版本范围**: 2.1.98 → 2.1.100 (next: 2.1.101)
**dist-tags**: latest=2.1.100, next=2.1.101, stable=2.1.89

---

## 核心更新一览

| 更新项 | 影响面 | 重要度 |
|--------|--------|--------|
| ExitWorktree 安全校验 | Worktree 用户 | P0 |
| Agent worktree 隔离 | 团队协作 | P0 |
| 记忆验证机制 | 所有用户 | P1 |
| AskUserQuestion 多选+预览 | 交互体验 | P1 |
| 定时任务 7 天过期 | Cron 用户 | P2 |

---

## 1. ExitWorktree 防误删机制

### 问题背景

Worktree（工作树）是 Git 的一个功能，允许你在同一个仓库中创建多个独立的工作目录。Claude Code 的 `EnterWorktree` 会自动创建一个临时 worktree 和对应的分支，用于隔离实验性开发。

之前的问题是：当你在 worktree 中修改了代码但忘记提交，执行 `ExitWorktree(action: "remove")` 会**直接删除所有未保存的工作**，没有任何提示。

### 现在的行为

```
ExitWorktree(action: "remove")
  ├─ 检测到未提交文件或未合并 commit
  │   → 拒绝执行，返回变更列表
  │   → 必须显式传 discard_changes: true 才能强制删除
  └─ 没有未保存变更
      → 正常删除 worktree 和分支
```

### 实际场景

假设你在做一个实验性重构：

```
1. EnterWorktree(name: "try-new-auth")     # 创建隔离环境
2. 修改了 5 个文件，但还没 commit
3. ExitWorktree(action: "remove")           # 想放弃实验
   → 系统提示："发现 5 个未提交文件，确认要丢弃吗？"
4. 你可以选择：
   - 先 commit 保存 → 再 remove
   - ExitWorktree(action: "keep") → 保留 worktree 以后再说
   - ExitWorktree(action: "remove", discard_changes: true) → 确认放弃
```

### 为什么重要

这是一个**防止数据丢失**的安全机制。在快节奏的开发中，很容易忘记自己在 worktree 中做了什么修改。这个校验相当于一个安全网。

---

## 2. Agent Worktree 隔离

### 是什么

在使用 Agent 工具（子代理）时，新增了 `isolation: "worktree"` 参数。设置后，子代理会在一个**临时的 git worktree** 中工作，拥有完全独立的仓库副本。

### 解决什么问题

当你用多个 Agent 并行处理任务时（比如一个改前端、一个改后端），它们默认共享同一个工作目录。这可能导致：

- 文件冲突：Agent A 改了 `config.ts`，Agent B 也在改
- 状态污染：Agent A 安装了依赖，影响了 Agent B 的构建
- 调试困难：不清楚哪个 Agent 做了哪些改动

### 使用方式

```
Agent(
  name: "frontend-dev",
  subagent_type: "Frontend Developer",
  isolation: "worktree",    # 关键参数
  prompt: "实现用户登录页面"
)
```

### 行为细节

| 场景 | 行为 |
|------|------|
| Agent 没有做任何修改 | worktree 自动清理，无痕 |
| Agent 做了修改并提交 | 返回 worktree 路径和分支名，你可以手动合并 |
| Agent 做了修改但未提交 | worktree 保留，你可以手动处理 |

### 适用场景

- 让多个 Agent 并行开发不同功能，互不干扰
- 实验性任务：不确定结果，希望随时丢弃
- 代码审查：在隔离环境中测试 PR 的变更

---

## 3. 记忆验证机制强化

### 是什么

Claude Code 的记忆系统（`~/.claude/projects/{project}/memory/`）会跨会话保存用户偏好、项目信息等。这次更新要求：**在基于记忆推荐任何文件、函数或配置前，必须先验证它们是否仍然存在**。

### 为什么需要这个

记忆是"某个时间点的快照"。代码库在不断变化——文件可能被重命名、函数可能被删除、配置可能被移除。如果 Claude Code 盲目地基于过时记忆给出建议，会导致：

- 推荐一个已删除的函数
- 指向一个已移动的文件路径
- 建议使用一个已废弃的配置项

### 现在的规则

| 记忆内容 | 验证方式 |
|----------|----------|
| 文件路径 | 检查文件是否存在 |
| 函数/方法名 | grep 搜索代码库 |
| CLI flag/配置项 | 确认仍可用 |
| 仓库状态摘要 | 优先用 `git log` 获取当前状态 |

### 关键原则

> **"记忆说 X 存在" 不等于 "X 现在存在"**

这是一个很好的工程实践——在分布式系统中，缓存（记忆就是一种缓存）的过期和验证是必须处理的问题。

---

## 4. AskUserQuestion 多选与预览

### 是什么

Claude Code 在需要用户做选择时，会弹出交互式问题。这次更新新增了两个能力：

**多选支持 (`multiSelect: true`)**

之前只能单选，现在可以同时勾选多个选项。适合"你想启用哪些功能？"这类问题。

**预览面板 (`preview` 字段)**

选项可以附带预览内容，当鼠标悬停/选中时，右侧显示对应的代码片段、UI 布局或配置示例。支持 Markdown 渲染。

### 使用示例

```
AskUserQuestion(
  questions: [{
    question: "选择哪种 UI 布局？",
    header: "Layout",
    multiSelect: false,
    options: [
      {
        label: "侧边栏布局 (推荐)",
        description: "左侧导航，右侧内容区",
        preview: "┌──────┬────────────┐\n│ Nav  │  Content   │\n│      │            │\n└──────┴────────────┘"
      },
      {
        label: "顶部导航布局",
        description: "顶部导航栏，下方内容区",
        preview: "┌────────────────────┐\n│    Navigation      │\n├────────────────────┤\n│     Content        │\n└────────────────────┘"
      }
    ]
  }]
)
```

### 为什么有用

- 减少来回沟通："你说的侧边栏是什么样的？"——直接看预览
- 多选减少多轮对话：一次性选好所有需要的特性
- 选项上限从 3 扩展到 4，覆盖更多场景

---

## 5. 定时任务 7 天自动过期

### 是什么

通过 `CronCreate` 创建的 recurring（循环）定时任务，现在有 **7 天自动过期**机制。到期后会触发最后一次执行，然后自动删除。

### 为什么这样设计

Claude Code 是一个 CLI 工具，不是一个长期运行的服务。定时任务只在 REPL 空闲时触发——如果你关闭了 Claude Code，任务就不会执行。7 天过期是为了：

- 防止"僵尸任务"无限堆积
- 明确 session 的生命周期边界
- 鼓励用户审视和更新定时任务

### 持久化 vs 临时

| 类型 | 参数 | 行为 |
|------|------|------|
| 临时任务 | `durable: false` (默认) | 当前会话结束后消失 |
| 持久任务 | `durable: true` | 写入 `.claude/scheduled_tasks.json`，下次启动自动恢复 |
| 一次性任务 | `recurring: false` | 触发一次后自动删除 |

### 注意

设置 recurring 任务时，Claude Code 现在**必须**告知用户 7 天过期限制，避免用户以为任务会永远运行。

---

## 总结

这一轮更新的主题是**安全与交互体验**：

- **安全**: ExitWorktree 防误删、Agent 隔离开发、记忆验证——三管齐下防止数据丢失和错误建议
- **交互**: 多选问题、预览面板——减少沟通轮次，提升决策效率
- **治理**: 定时任务过期——防止资源泄漏

---

[返回 Claude Code 更新汇总](/articles/product-design/claude-code-updates-summary)
