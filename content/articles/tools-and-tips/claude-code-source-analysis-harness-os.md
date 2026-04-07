---
title: "【Claude Code 源码分析】万行代码背后的 AI Harness 编码操作系统"
excerpt: "深度剖析 Claude Code 38 万行 TypeScript 源码，揭示其整体架构、核心引擎、Harness 机制、工具系统、多 Agent 协作和性能优化策略。"
category: "tools-and-tips"
tags: ["claude-code", "source-code-analysis", "ai-coding", "architecture"]
publishedAt: "2026-04-07"
readTime: 45
---

> 原文来源: ATA - 孙翔宇(柏锦) | 分析日期: 2026-03-31
> 代码规模: 约 38 万行 TypeScript/TSX

---

## 一、整体架构

### 1.1 目录结构与模块划分

```
claude-code/
├── main.tsx                 # 主入口（CLI 参数解析、初始化、启动 REPL）
├── QueryEngine.ts           # 对话引擎（SDK/headless 路径）
├── query.ts                 # 核心查询循环（API 调用 → 工具执行 → 循环）
├── Tool.ts                  # 工具类型定义与接口
├── Task.ts                  # 任务类型定义
├── tools.ts                 # 工具注册表（内置工具列表）
├── commands.ts              # 斜杠命令注册表
├── context.ts               # 上下文构建（git status、CLAUDE.md）
├── ink.ts                   # Ink 渲染层封装
├── replLauncher.tsx         # REPL 启动器
│
├── entrypoints/             # 入口点
│   ├── cli.tsx              # CLI 引导
│   ├── init.ts              # 初始化（配置、遥测、安全、代理）
│   ├── sdk/                 # SDK 类型定义
│   └── mcp.ts               # MCP 入口
│
├── screens/                 # 界面屏幕
│   ├── REPL.tsx             # 主 REPL 界面（5005 行，最大的 UI 文件）
│   ├── Doctor.tsx           # 诊断界面
│   └── ResumeConversation.tsx
│
├── state/                   # 状态管理
│   ├── AppStateStore.ts     # AppState 类型定义
│   ├── store.ts             # Store 实现
│   └── selectors.ts         # 状态选择器
│
├── tools/                   # 工具实现（每个工具一个目录）
│   ├── BashTool/            # Bash 命令执行
│   ├── FileReadTool/        # 文件读取
│   ├── FileEditTool/        # 文件编辑
│   ├── FileWriteTool/       # 文件写入
│   ├── AgentTool/           # 子 Agent 调度
│   └── ...
```

### 1.2 核心入口流程

```
cli.tsx (entrypoint)
  ↓ 快速路径检查 (--version, --dump-system-prompt, --daemon-worker)
  ↓
main.tsx (main 函数, 4683 行)
  ├── 1. Side-effect imports（profileCheckpoint, MDM prefetch, keychain prefetch）
  ├── 2. Commander.js 解析 CLI 参数
  ├── 3. init() — 启用配置、环境变量、TLS、GracefulShutdown
  ├── 4. runMigrations() — 配置迁移（v1→v11）
  ├── 5. Trust Dialog — 首次使用信任确认
  ├── 6. 认证检查 — API Key / OAuth
  ├── 7. 加载 MCP 服务器、Skills、Plugins
  ├── 8. 构建 AppState 初始状态
  ├── 9. 分支：
  │   ├── --print（headless 模式）→ QueryEngine → 直接输出
  │   └── 交互模式 → launchRepl() → REPL.tsx
  └── 10. startDeferredPrefetches() — 延迟预取
```

**关键设计：启动时间优化**
- `profileCheckpoint` 在各阶段打点，追踪启动性能
- MDM 读取和 Keychain 读取并行化（macOS）
- `startDeferredPrefetches()` 将非关键预取推迟到首次渲染之后
- `--bare` 模式跳过所有预取，极限精简
- `feature()` 编译时死代码消除（DCE），外部构建移除内部功能

### 1.3 状态管理方式

Claude Code 使用**不可变状态树 + 函数式更新**模式：

```typescript
// AppState 是一个巨大的 DeepImmutable<> 类型
export type AppState = DeepImmutable<{
  settings: SettingsJson
  mainLoopModel: ModelSetting
  toolPermissionContext: ToolPermissionContext
  tasks: Record<string, TaskState>
  mcp: { tools: Tools; clients: MCPServerConnection[] }
  fastMode: FastModeState
  speculation: SpeculationState
  // ... 50+ 字段
}>

// 更新通过 setAppState(fn) 函数式传递
setAppState(prev => ({
  ...prev,
  toolPermissionContext: { ...prev.toolPermissionContext, mode: 'bypassPermissions' }
}))
```

Store 实现：自研的简单 Store，类似 zustand 但更轻量。无 Redux/MobX 依赖。

### 1.4 渲染层 — Ink/React CLI

Claude Code 深度定制了 Ink 框架（React CLI 渲染器），在 `ink/` 目录下维护了自己的分支：
- `reconciler.ts` — 自定义 React Reconciler
- `layout/` — 基于 Yoga 的终端布局引擎
- `termio/` — 低级终端 I/O（DEC escape codes、光标控制）
- `renderer.ts` — 帧渲染器
- `dom.ts` — 虚拟 DOM
- `components/` — 基础组件（Box, Text, Spinner 等）

---

## 二、核心引擎

### 2.1 QueryEngine — 对话引擎

`QueryEngine.ts`（~1300 行）是 SDK/headless 路径的核心，负责管理对话生命周期：

```
submitMessage(prompt)
  ├── 1. processUserInput() — 解析斜杠命令、附件
  ├── 2. 构建 SystemPrompt
  │   ├── fetchSystemPromptParts() — 默认系统提示
  │   ├── loadMemoryPrompt() — 记忆提示
  │   └── appendSystemPrompt — 追加提示
  ├── 3. recordTranscript() — 持久化用户消息
  ├── 4. yield buildSystemInitMessage() — SDK 系统初始化消息
  ├── 5. query() — 进入核心查询循环
  │   ├── yield stream_event — 流式事件
  │   ├── yield assistant — 助手消息
  │   ├── yield user — 工具结果
  │   └── yield progress — 进度
  └── 6. yield result — 最终结果
```

**关键设计：**
- **AsyncGenerator 模式** — 每个消息通过 yield 逐步发出，允许 SDK 消费者实时处理
- 消息在产生时立即持久化（recordTranscript），即使进程被 kill 也能 `--resume`
- 权限拒绝单独追踪，最终在 result 消息中报告

### 2.2 query.ts — 核心查询循环

`query.ts`（~1700 行）是 Claude Code 最核心的循环逻辑：

```
query()
  └── queryLoop()  // while(true) 循环
        ├── 1. snipCompactIfNeeded()     — Snip 压缩
        ├── 2. microcompact()            — 微压缩
        ├── 3. applyCollapsesIfNeeded()  — 上下文折叠
        ├── 4. applyToolResultBudget()   — 工具结果预算
        ├── 5. autocompact()             — 自动压缩
        ├── 6. claude.stream()           — 调 Anthropic API
        │   ├── 流式接收 content blocks
        │   ├── StreamingToolExecutor 并发执行工具
        │   └── 收集所有工具结果
        ├── 7. stopHooks / postSamplingHooks — 停止钩子
        ├── 8. 判断是否继续循环
        │   ├── stop_reason === 'tool_use' → 继续
        │   ├── stop_reason === 'end_turn' → 结束
        │   ├── 'max_tokens' → 恢复重试
        │   └── 'prompt_too_long' → reactive compact
        └── 9. 更新 state，continue
```

**亮点：多层上下文压缩策略**

| 层级 | 名称 | 触发条件 | 策略 |
|------|------|---------|------|
| L1 | Snip Compact | feature gate | 按 boundary 裁剪历史 |
| L2 | Micro Compact | 每次循环 | 微粒度压缩（按 tool_use_id） |
| L3 | Context Collapse | feature gate | AST 级上下文折叠 |
| L4 | Auto Compact | token 超阈值 | 对话摘要压缩 |
| L5 | Reactive Compact | prompt_too_long | 紧急压缩重试 |
| L6 | Tool Result Budget | 每次循环 | 大结果落盘，发送预览 |

### 2.3 任务系统

```typescript
type TaskType =
  | 'local_bash'           // 后台 Shell 命令
  | 'local_agent'          // 本地 Agent 子任务
  | 'remote_agent'         // 远程 Agent
  | 'in_process_teammate'  // 进程内 Teammate（Swarm）
  | 'local_workflow'       // 本地工作流
  | 'monitor_mcp'          // MCP 监控
  | 'dream'                // Dream（后台思考）

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'
```

- Task ID 使用加密安全随机字节生成（抵抗符号链接攻击）
- 输出写入磁盘文件，通过 TaskOutputTool 读取

### 2.4 工具系统

Tool 接口定义（~800 行）：

```typescript
export type Tool<Input, Output, P> = {
  name: string
  aliases?: string[]
  inputSchema: Input                     // Zod schema
  maxResultSizeChars: number             // 结果大小上限

  // 核心方法
  call(args, context, canUseTool, parentMessage, onProgress?): Promise<ToolResult<Output>>
  description(input, options): Promise<string>
  checkPermissions(input, context): Promise<PermissionResult>

  // 行为标记
  isEnabled(): boolean
  isReadOnly(input): boolean
  isDestructive?(input): boolean
  isConcurrencySafe(input): boolean
}
```

---

## 三、Harness 机制

### 3.1 什么是 Harness

"Harness" 在 Claude Code 中，是指对外暴露的完整控制层 — 外部系统可以通过这一层驱动 Claude Code 完成任务、响应事件、扩展能力，而不需要了解内部实现。

**Harness 由两个核心入口 + 三个扩展点组成：**

**核心入口：**
- **SDK 模式**（`entrypoints/sdk/` + `QueryEngine.ts`）：进程内 API，`@anthropic-ai/claude-code-sdk` npm 包
- **Bridge 模式**（`bridge/bridgeMain.ts`，3000+ 行）：远程控制协议，claude.ai 通过长轮询接入本地实例

**扩展点：**
- **Hooks**（`utils/hooks.ts`）：30+ 生命周期钩子
- **Plugins**（`plugins/`）：Skills、Hooks、MCP Servers、自定义命令
- **Coordinator 模式**（`coordinator/`）：多 Agent 场景

### 3.2 两种交互模式

**(1) SDK 模式（进程内）**

```typescript
import { query } from '@anthropic-ai/claude-code-sdk'
for await (const message of query({ prompt: '...' })) {
  // 处理 SDKMessage
}
```

底层流程：
```
SDK 调用 → 启动 Claude Code 子进程（--print --json）
  → QueryEngine.submitMessage()
  → AsyncGenerator<SDKMessage> 通过 stdout JSON 流式输出
  → SDK 解析并 yield 给调用者
```

**(2) Bridge 模式（远程）**

```
用户浏览器 (claude.ai)
    ↕ WebSocket
Bridge 服务器 (Anthropic)
    ↕ HTTPS 长轮询
bridgeMain.ts (本地)
    ↕ Session spawn
Claude Code 子进程
```

### 3.3 Hooks 系统 — 生命周期钩子

30+ 钩子覆盖全生命周期：

```
会话级钩子：
  executeSetupHooks()              — 设置阶段
  executeSessionStartHooks()       — 会话开始
  executeSessionEndHooks()         — 会话结束

工具级钩子（最核心）：
  executePreToolHooks()            — 工具执行前
  executePostToolHooks()           — 工具执行后
  executePostToolUseFailureHooks() — 工具执行失败后

压缩钩子：
  executePreCompactHooks()         — 压缩前
  executePostCompactHooks()        — 压缩后

Swarm 钩子：
  executeTeammateIdleHooks()       — Teammate 空闲
  executeTaskCreatedHooks()        — 任务创建
  executeTaskCompletedHooks()      — 任务完成
```

### 3.4 Plugins 系统

三种插件类型：
1. **Built-in Plugins** — 随 CLI 发布，可开关
2. **Marketplace Plugins** — 从插件市场安装，有版本管理
3. **Seed Dir Plugins** — 通过环境变量指定

### 3.5 Coordinator 模式

核心概念：
- **Coordinator** — 主控 Agent，负责任务分解和结果汇总
- **Workers** — 工作 Agent，执行具体编码任务

四阶段流水线：
1. **Research**（研究）：并行派多个 Worker 调研代码库
2. **Synthesis**（综合）：协调者阅读所有研究结果
3. **Implementation**（实施）：派 Worker 按具体 spec 修改代码
4. **Verification**（验证）：独立 Worker 验证修改

核心原则：**禁止懒惰委托** — 不能说"基于你的发现修复问题"，必须给出具体的实施规范。

---

## 四、工具系统深度分析

### 4.1 内置工具列表

| 分类 | 工具 | 说明 |
|------|------|------|
| 文件操作 | BashTool, FileReadTool, FileEditTool, FileWriteTool, GlobTool, GrepTool, NotebookEditTool | 核心文件操作 |
| 任务管理 | AgentTool, TaskCreate/Get/Update/List/Output/Stop | 子 Agent 和任务调度 |
| Web | WebFetchTool, WebSearchTool, WebBrowserTool | 网页交互 |
| 计划模式 | EnterPlanModeTool, ExitPlanModeV2Tool | 先计划后执行 |
| 交互 | AskUserQuestionTool, SendMessageTool | 用户和 Agent 间通信 |
| 协作 | TeamCreateTool, TeamDeleteTool, SkillTool | 多 Agent 协作 |
| MCP | MCPTool, ListMcpResourcesTool, ReadMcpResourceTool | MCP 协议工具 |

### 4.2 工具调用流程

```
LLM 输出 tool_use block
  ↓
StreamingToolExecutor.addTool(block, assistantMessage)
  ├── 查找工具定义：findToolByName(tools, block.name)
  ├── 判断并发安全性：tool.isConcurrencySafe(input)
  ├── 并发安全 → 加入并发队列
  └── 非并发安全 → 等待独占执行
  ↓
runToolUse(block, assistantMessage, canUseTool, context)
  ├── 1. tool.validateInput(input, context) — 输入验证
  ├── 2. canUseTool(tool, input, ...) — 权限检查
  ├── 3. PreToolUse hooks — 工具前钩子
  ├── 4. tool.call(input, context, ...) — 实际执行
  ├── 5. PostToolUse hooks — 工具后钩子
  └── 6. 返回 ToolResult → 构建 tool_result message
```

**并发模型：**
- 并发安全工具（FileRead、Grep）：并行执行
- 非并发安全工具（BashTool、FileEdit）：串行执行
- 最大并发度：默认 10

### 4.3 权限模型

| 模式 | 说明 |
|------|------|
| `default` | 危险操作需要用户确认 |
| `plan` | 只读操作允许，写操作阻塞 |
| `acceptEdits` | 自动接受文件编辑 |
| `bypassPermissions` | 绕过所有权限检查 |
| `auto` | AI 分类器决策 |

权限优先级链：
```
企业策略（MDM/Policy）→ 用户设置 → 项目设置 → CLI 参数
  → 工具自检 → AI 分类器 → 用户确认
```

---

## 五、为什么做得好

### 5.1 架构亮点

**1. AsyncGenerator 驱动的流式架构**

```
claude.stream() → query() → QueryEngine.submitMessage() → SDK consumer
```

每一层都是 `async function*`，天然支持背压、取消和增量处理。

**2. 编译时死代码消除（DCE）**

```typescript
import { feature } from 'bun:bundle'

const SleepTool = feature('PROACTIVE')
  ? require('./tools/SleepTool/SleepTool.js').SleepTool
  : null
```

外部构建不包含内部功能，显著减小包体积。

**3. 多层上下文压缩** — 6 层策略按需触发，从短对话到超长对话都有覆盖。

**4. 工具并发执行** — 读操作并行、写操作串行，大量文件搜索时显著提速。

**5. 状态持久化与恢复** — 每条消息立即写入 transcript，`--resume` 可从断点恢复。

### 5.2 用户体验设计

- **Vim Mode** — 完整的 Vim 键绑定（motions、operators、text objects）
- **语音输入** — 集成 STT，支持流式识别
- **渐进式权限** — default → acceptEdits → auto → bypass，按信任度放开
- **Plan Mode** — 先计划、用户审批后再执行
- **80+ 斜杠命令** — /compact、/vim、/model、/config 等

### 5.3 安全模型设计

- 多维度权限控制（企业策略 → 用户设置 → AI 分类器）
- 沙箱隔离（SandboxManager）
- Bash 安全分析（AST 解析、命令语义分析）
- 文件路径验证（防符号链接和路径遍历）
- Auto Mode 分类器（`yoloClassifier.ts`）

### 5.4 与竞品差异化

| 维度 | Claude Code | Codex (OpenAI) | Aider |
|------|------------|----------------|-------|
| 架构 | 完整 React CLI 应用 | 相对精简的 CLI | Python 脚本 |
| 多 Agent | Coordinator + Swarm | 单 Agent | 单 Agent |
| 权限 | 6 种模式 + AI 分类器 | 沙箱隔离 | 无 |
| 上下文管理 | 6 层压缩策略 | 基础 | git diff 为中心 |
| 远程控制 | Bridge + SDK | API 模式 | 无 |
| 扩展性 | Plugins + Skills + MCP + Hooks | 有限 | 有限 |
| Vim 支持 | 完整键绑定 | 无 | 无 |

---

## 六、对我们的启发

### 6.1 值得借鉴的设计

1. **AsyncGenerator 流式架构** — 天然支持流式输出、背压控制、取消传播
2. **多层上下文压缩** — 至少实现 Auto Compact + Tool Result Budget 两层
3. **工具权限模型** — 渐进式权限 + AI 分类器
4. **Hook 系统** — 30+ 生命周期钩子覆盖所有扩展点
5. **启动性能工程** — 并行预取、延迟加载、bare mode

### 6.2 可以直接复用的部分

- Bash 安全分析（AST 解析、命令语义分析）
- 文件操作工具（FileEditTool 精确替换逻辑）
- MCP 集成（客户端实现、配置管理）
- Token 估算和上下文窗口管理
- Git 操作工具函数

---

## 七、深度补充：CodeWiki 精华提炼

### 7.1 QueryEngine 三层重试机制

| 层级 | 触发条件 | 行为 |
|------|---------|------|
| 第一层 | FallbackTriggeredError | 自动切换备用模型，用户无感降级 |
| 第二层 | stop_reason === "max_tokens" | 最多 3 次恢复重试，注入"no apology, no recap"恢复提示 |
| 第三层 | prompt_too_long | context collapse → reactive compact → 报错 |

### 7.2 Agent 四种模式

| 模式 | 说明 |
|------|------|
| 同步子 Agent | 最简单的委托，等待结果返回 |
| 异步后台 Agent | `run_in_background=true`，结果写入磁盘 |
| Coordinator 模式 | 主 Agent 调度 Worker，四阶段流水线 |
| Team 模式（Swarm） | 平等 Teammate 协作，有持久状态 |

### 7.3 上下文压缩完整版

关键配置：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| AUTOCOMPACT_BUFFER_TOKENS | 13,000 | 压缩阈值缓冲 |
| WARNING_THRESHOLD_BUFFER_TOKENS | 20,000 | 警告阈值 |
| MAX_OUTPUT_TOKENS_FOR_SUMMARY | 20,000 | 摘要最大输出 |
| MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES | 3 | 断路器阈值 |

压缩提示的安全设计：
```
CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.
```
防止压缩模型"手痒"去调工具 — 设计很聪明。

---

## 附录：核心文件代码量

| 文件 | 行数 | 说明 |
|------|------|------|
| `screens/REPL.tsx` | 5005 | 最大的 UI 文件 |
| `main.tsx` | 4683 | 主入口 |
| `bridge/bridgeMain.ts` | 3000+ | Bridge 主循环 |
| `query.ts` | 1700+ | 核心查询循环 |
| `services/compact/compact.ts` | 1705 | 压缩逻辑 |
| `QueryEngine.ts` | 1300+ | 对话引擎 |
| `tools/BashTool/BashTool.tsx` | 1100+ | Bash 工具 |
| `Tool.ts` | 800+ | 工具类型定义 |

---

**分析结论：** Claude Code 是一个工程质量极高的项目。它不是简单的 "API wrapper"，而是一个完整的 AI 编码操作系统 — 自定义渲染器、多层上下文管理、并发工具执行、渐进式安全模型、多 Agent 协作。其架构深度和工程细节远超同类竞品。最值得学习的是它对**性能**（启动时间、缓存稳定性）和**可靠性**（消息持久化、优雅降级、多层压缩）的极致追求。
