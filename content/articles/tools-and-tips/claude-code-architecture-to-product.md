---
title: "从 Claude Code 源码看 AI 产品架构：10 大设计模式与产品化路径"
excerpt: "深入分析 Claude Code 1884 个 TypeScript 文件背后的 10 大架构模式，从 Tool 工厂到多 Agent 协作，从分层权限到记忆蒸馏，提炼可复用的架构思想，并探索每个模式的产品化方向。"
category: "tools-and-tips"
tags: ["claude-code", "architecture", "ai-product", "multi-agent", "mcp", "source-code-analysis"]
publishedAt: "2026-04-07"
readTime: 25
---

> 创建日期: 2026-04-07
> 关联文章: [Claude Code 源码分析：万行代码背后的 AI Harness 编码操作系统](/articles/tools-and-tips/claude-code-source-analysis-harness-os)
> 定位差异: 上篇聚焦"源码怎么写的"，本篇聚焦"架构思想能做什么产品"

---

## 写在前面

Claude Code 是 Anthropic 官方的 CLI 开发工具，源码约 1884 个 TypeScript/TSX 文件。上一篇文章我们做了全面的源码分析，但分析源码不是目的——**提炼架构思想、思考产品化方向**才是。

本文从 10 个核心架构模式出发，每个模式讲三件事：
1. **它是怎么设计的**（架构精髓，不是代码细节）
2. **为什么这样设计**（背后的取舍）
3. **能用它做什么产品**（产品化路径）

---

## 一、Tool System：自描述、自渲染的工具工厂

### 架构精髓

Claude Code 的 Tool 不是简单的函数，而是一个**自包含的能力单元**。每个 Tool 通过 `buildTool()` 工厂函数创建，携带：

```typescript
// 伪代码，展示 Tool 的核心接口
type Tool<Input, Output> = {
  name: string
  inputSchema: ZodSchema        // Zod schema，运行时校验
  call(args, context): Output   // 执行逻辑
  checkPermissions(input): PermissionResult  // 权限检查
  prompt(): string              // 自我描述（给 AI 看的）
  renderToolUseMessage(input): ReactNode     // 调用时的 UI
  renderToolResultMessage(output): ReactNode // 结果的 UI
  isReadOnly(input): boolean    // 是否只读
  isConcurrencySafe(input): boolean  // 是否可并发
}
```

关键点：**一个 Tool 同时承担了 API 定义、校验、执行、权限、文档、UI 渲染六个职责**。这和传统的 Controller → Service → DAO 分层完全不同。

### 为什么这样设计

传统分层的问题是：**一个能力的信息分散在 5 个文件里**。API 定义在 Swagger，校验在 Controller，逻辑在 Service，权限在拦截器，UI 在前端。

Claude Code 选择了"高内聚"——**一个 Tool 就是一个完整的能力**。这带来两个好处：
- **AI 友好**：AI 只需要读 `prompt()` 就知道这个工具能做什么、怎么用
- **可组合**：工具之间没有耦合，可以自由增删，支持延迟加载（`shouldDefer`）

### 延迟加载的巧思

60+ 个工具不可能全部塞进 system prompt（太多 token），Claude Code 用了 `shouldDefer` 标记：非核心工具在 AI 首次通过 `ToolSearch` 发现它们之前不会加载。这是一个优雅的**按需发现**机制。

### 产品化方向：自描述 API Gateway

**痛点**：内部 HSF/HTTP 接口文档和实际行为不一致，联调调试痛苦。

**方案**：把每个内部接口封装为 Tool 格式：
- `inputSchema` 用 Zod 做运行时参数校验
- `prompt()` 自动生成 AI 可读的接口描述
- `renderToolResultMessage()` 自动生成调试 UI
- `checkPermissions()` 做调用权限控制

这样一个接口同时是：API 定义、参数校验、文档、调试界面、权限入口。**接口即文档即调试器**。

---

## 二、Agent/Team：AsyncGenerator Pipeline + 后端抽象

### 架构精髓

多 Agent 协作的核心是 `runAgent()` 函数，它是一个 **async generator**：

```
创建隔离的 ToolUseContext
  → 配置模型、工具、system prompt
    → 运行 query() 循环
      → yield 每条消息给父级
        → finally 清理资源
```

Agent 之间通过 `SendMessageTool` 通信，消息路由支持三种方式：
- `to: "name"` → 按名称发给队友
- `to: "*"` → 广播给全团队
- `to: "uds:<socket>"` → Unix Domain Socket 跨进程通信

Team 的运行后端是可插拔的：
- **InProcess**：同一个 Node.js 进程内，用 AsyncLocalStorage 隔离上下文
- **Tmux**：每个 Agent 一个 tmux pane
- **iTerm2**：利用 iTerm2 的 API 创建标签页

### 为什么这样设计

Agent 系统面临一个核心矛盾：**隔离性 vs 效率**。

- 完全隔离（每个 Agent 独立进程）：安全但通信开销大
- 完全共享（同一进程同一状态）：高效但容易互相污染

Claude Code 的选择是 **"逻辑隔离 + 物理共享"**——同一进程内运行，但通过 `no-op setAppState` 和独立的 `AbortController` 实现状态隔离。异步 Agent 不能修改父级的 React 状态，但可以通过 `setAppStateForTasks` 写入全局任务状态。

### 产品化方向：多 Agent 状态隔离框架

**痛点**：你在做 1688 选品的多 Agent 系统时，如果多个 Agent 共享状态，一个 Agent 的异常会影响其他 Agent。

**方案**：提取 Claude Code 的隔离模式为通用框架：

```typescript
// 伪代码
const agent = createAgent({
  name: "market-analyst",
  tools: [searchTool, analyzeTool],
  state: createIsolatedState(parentState),  // DeepImmutable 隔离
  onMessage: (msg) => teamBus.send(msg),    // 消息总线通信
})
```

核心是 `DeepImmutable<T>` 类型约束 + `useSyncExternalStore` 的细粒度订阅。

---

## 三、Bridge：零入站端口的远程控制

### 架构精髓

Bridge 让本地 CLI 变成"服务器"，但**不开任何端口**。工作原理：

```
1. CLI 向 claude.ai 注册一个 "environment"
2. CLI 通过长轮询 (pollForWork) 等待任务
3. 用户在 claude.ai 发起 session
4. 服务端返回 WorkResponse（含 WorkSecret）
5. CLI 创建子进程，通过 WebSocket 传输会话
6. 权限提示通过 sendPermissionResponseEvent 转发回 Web
```

关键设计：
- **无入站连接**：只有出站轮询，穿透任何 NAT/防火墙
- **WorkSecret**：每个任务携带独立的 token、认证信息、MCP 配置
- **SpawnMode**：single-session / worktree / same-dir，支持不同的并发策略

### 为什么这样设计

传统远程工具要么需要开端口（安全风险），要么需要 VPN（配置复杂）。长轮询模式巧妙地绕过了这两个问题——**你的机器只需要能上网就行**。

### 产品化方向

这个模式可以用于**钉钉→本地 AI 的 Bridge**：
- 开发者本地运行 Bridge 服务
- 钉钉群消息通过 Webhook → 云端队列
- Bridge 长轮询获取任务 → 本地 AI 处理 → 结果推回钉钉
- 无需公网 IP，无需部署服务器

---

## 四、Permission：分层规则管道 + AI 分类器兜底

### 架构精髓

权限判断不是简单的 allow/deny，而是一个 **8 级管道**：

```
1a. alwaysDenyRules → deny
1b. alwaysAskRules → ask
1c. Tool 自身 checkPermissions()
1d. Tool 实现拒绝 → deny
1e. 需要用户交互 → ask
1f. 内容级 ask 规则 (e.g., "Bash(npm publish:*)")
1g. 安全检查 (.git/, .claude/) → 不可绕过
2a. bypassPermissions 模式 → allow
2b. alwaysAllowRules → allow
3.  passthrough → ask
```

最精彩的是 **auto 模式**的兜底机制：当规则无法判断时，Claude Code 发起一个**独立的 AI 请求**（`classifyYoloAction()`），让另一个 Claude 判断"这个操作是否安全"。

规则来源有 7 层优先级：`policySettings > flagSettings > projectSettings > userSettings > localSettings > cliArg > command > session`。

### 为什么这样设计

AI 操作的权限问题不同于传统 RBAC：
- **操作不可预知**：AI 可能执行任意 bash 命令，无法预先枚举
- **上下文相关**：`rm -rf ./test-output` 安全，`rm -rf /` 致命
- **规则不可穷举**：总有新的危险操作出现

所以需要一个**确定性规则 + 概率性 AI 判断**的混合方案。确定性规则处理已知场景，AI 分类器处理未知场景。

### 产品化方向：AI 用 AI 做安全判断

**痛点**：AI Agent 在生产环境执行操作时，如何保证安全？

**方案**：提取 `classifyYoloAction()` 模式：
1. 把操作描述 + 上下文打包成 compact prompt
2. 用一个轻量模型（如 Haiku）快速判断 `{ shouldBlock, reason }`
3. 高危操作自动拦截 + 人工审批
4. 连续拦截超过阈值时降级为全人工模式

这个模式的核心洞察是：**用快模型守护慢模型**。主 Agent 用 Opus 做复杂推理，安全判断用 Haiku 做毫秒级拦截。

---

## 五、Plugin/Skill：Markdown 即能力定义

### 架构精髓

Skill 就是一个 Markdown 文件，YAML frontmatter 声明元数据：

```yaml
---
description: "选品专家"
tools: [searchTool, analyzeTool]
model: "claude-sonnet-4-6"
whenToUse: "当用户说选品、推荐商品时触发"
userInvocable: true  # 是否可作为斜杠命令
---

# Skill 正文就是 prompt
你是一个选品专家...
```

插件分发通过 git 仓库：
- 插件仓库包含 `claude-plugin.json` manifest
- `PluginInstallationManager` 启动时后台同步
- 支持市场浏览、一键安装、版本管理

### 为什么这样设计

传统插件需要写代码、打包、发布。Claude Code 的 Skill 只是一个 Markdown 文件——**降低创作门槛到最低**。任何人都能用自然语言定义一个 AI 能力。

### 产品化方向：团队 Skill 共享市场

这个已经在你的 1688 选品项目中实践了（100+ skills）。可以进一步标准化为内部平台。

---

## 六、State Management：Bootstrap 单例 + DeepImmutable Store

### 架构精髓

两层状态：

**Layer 1 - Bootstrap State**：全局单例，存储基础设施状态（session ID、费用、token 计数）。代码注释直接写了："DO NOT ADD MORE STATE HERE"。

**Layer 2 - AppState Store**：自研轻量 Store，100+ 字段，全部标记为 `DeepImmutable<T>`：

```typescript
type AppState = DeepImmutable<{
  settings: Settings
  tasks: Record<string, TaskState>
  teamContext: TeamContext
  todos: Record<AgentId, TodoList>
  plugins: PluginState
  // ...100+ fields
}>
```

用 `useSyncExternalStore` 做 React 集成，selector 变化才触发重渲染。

### 为什么这样设计

- **DeepImmutable** 在类型层面强制不可变更新，防止状态突变
- **两层分离** 避免单一 Store 过于臃肿
- **子 Agent no-op setAppState** 防止状态污染

这是 AI 应用特有的问题——多个 Agent 并发运行时，状态管理比传统 Web 应用复杂得多。

---

## 七、Memory：分层文件记忆 + KAIROS 日志蒸馏

### 架构精髓

记忆是一个四层文件系统：

```
~/.claude/memory/<project>/
├── MEMORY.md          # 索引层（max 200 行，每行一个指针）
├── user_*.md          # 用户记忆（角色、偏好、知识水平）
├── feedback_*.md      # 反馈记忆（纠正、确认、偏好）
├── project_*.md       # 项目记忆（进度、决策、约束）
├── reference_*.md     # 引用记忆（外部系统指针）
└── team/              # 团队共享记忆
```

**KAIROS 模式**（高级功能）：
- 白天：追加原始交互日志到 `logs/YYYY/MM/YYYY-MM-DD.md`
- 夜间：AI 自动蒸馏日志为结构化知识，更新 `MEMORY.md`
- 定期：归档过期记忆

### 为什么这样设计

AI 的记忆问题本质是**信息密度问题**：
- 原始对话太多太杂（低密度）
- 但有价值的信息只是一小部分（高密度）
- KAIROS 模式就是一个**信息蒸馏管道**

MEMORY.md 作为索引的设计也很巧妙——它被加载到每次对话的 context 中，但只占 200 行。具体内容按需读取。这是**索引与内容分离**的经典模式。

### 产品化方向

#### 方向 A：团队知识沉淀引擎

**痛点**：团队知识在人的脑子里，靠文档沉淀效率低。

**方案**：
1. 每次技术讨论（钉钉群/会议）自动提取四类记忆
2. 按 project/team 维度组织，MEMORY.md 做索引
3. 新人入职时，AI 读取团队记忆，快速了解项目背景
4. 支持记忆衰减——长期不引用的记忆自动降级归档

#### 方向 B：客户画像自进化系统

**痛点**：1688 跨境客户的信息散落在各个系统。

**方案**：
每个客户一个 memory 目录：
```
customers/<customer_id>/
├── MEMORY.md         # 客户概览索引
├── user_profile.md   # 基本画像
├── feedback_*.md     # 历次反馈和偏好
├── project_*.md      # 合作项目进展
└── reference_*.md    # 关联的内部系统链接
```

每次交互自动更新，AI 读取客户记忆后能说出"上次你对 XX 品类感兴趣，那个供应商后来怎么样了？"

#### 方向 C：KAIROS 日志蒸馏系统

**痛点**：线上日志、告警、事件太多，有价值的信息淹没在噪声中。

**方案**：
1. 日间：收集原始日志/告警/事件到日志层
2. 夜间 AI 蒸馏：提取关键事件、趋势、异常模式
3. 蒸馏结果写入结构化知识库
4. 晨会时 AI 播报"昨日要闻"

---

## 八、MCP 集成：协议无关的工具生态

### 架构精髓

MCP（Model Context Protocol）是连接 AI 和外部工具的标准协议。Claude Code 的 MCP 集成支持 5 种传输：

| 传输方式 | 场景 | 特点 |
|---------|------|------|
| stdio | 本地子进程 | JSON-RPC over stdin/stdout |
| sse | 远程 HTTP | Server-Sent Events |
| http | 远程 HTTP | Streamable HTTP（MCP 标准） |
| ws | 远程 WebSocket | 全双工 |
| sdk | 进程内 | InProcessTransport |

每个 MCP 工具被包装为标准 `Tool` 接口，名称格式 `mcp__serverName__toolName`。

**Elicitation 机制**：当 MCP 服务端需要额外信息时，发送 `ElicitRequest`（协议错误码 -32042），客户端通过 UI 或回调向用户提问，再把答案回传。

### 产品化方向：Elicitation 交互引擎

**痛点**：AI Agent 执行任务时遇到信息不足，要么猜测（可能错），要么中断（体验差）。

**方案**：标准化"AI 向人提问"的协议：
1. Agent 遇到信息缺口 → 构造 ElicitRequest
2. 路由到合适的渠道（CLI 弹窗 / 钉钉消息 / Web 弹窗）
3. 用户回答 → 结果回传 Agent → 继续执行
4. 支持超时自动降级（用默认值继续）

这本质上是把 AI 从"自主执行"扩展到**"人机协作执行"**的标准协议。

---

## 九、Coordinator：Prompt 驱动的编排

### 架构精髓

Coordinator 不是一个新进程或新模块，而是**同一个 Claude 实例切换角色**。通过环境变量 `CLAUDE_CODE_COORDINATOR_MODE=1` 激活，注入 350 行的 Coordinator system prompt。

这个 prompt 的核心指令：
- 收到任务后立即拆分并**并行**派发给 Worker Agent
- 不要等一个完成再启动下一个
- 通过 `<task-notification>` XML 接收 Worker 结果
- 汇总时不要编造 Worker 没说过的内容
- 验证 = 证明代码能工作，不是橡皮图章

### 为什么这样设计

传统的工作流编排（Airflow、Step Functions）需要预定义 DAG。但 AI 任务的 DAG 往往是**运行时才能确定的**——你不知道市场分析会发现什么，不知道需要几轮迭代。

Prompt 驱动的编排把 DAG 定义交给 AI，让它根据实际情况动态调整。

### 产品化方向：Prompt 驱动的微服务编排

**痛点**：传统编排系统配置复杂，不够灵活。

**方案**：
```
用户: "帮我分析这个品类在美国市场的机会"

Coordinator（自然语言编排）:
├── Worker A: 调用 Google Trends API 获取搜索趋势
├── Worker B: 调用 Amazon API 获取竞品数据
├── Worker C: 调用 1688 API 获取供应链数据
└── Coordinator: 等待 A/B/C 完成 → 综合分析 → 生成报告
```

编排逻辑不是 YAML/JSON 配置，而是一段 system prompt。

---

## 十、自研终端 UI：React Reconciler + Yoga 布局

### 架构精髓

Claude Code 不用原版 Ink，而是 fork 了一个自研版本：
- **React Reconciler**：自定义 host config，渲染到虚拟 DOM
- **Yoga 布局引擎**：Facebook 的 Flexbox 实现，用于终端布局
- **帧渲染**：按 `FRAME_INTERVAL_MS` 间隔渲染，只写入变化的 cell（diff 写入）
- **高级特性**：鼠标追踪、文本选择、超链接（OSC 8）、双向文本、图片显示

### 为什么这样设计

终端 UI 的传统做法是 ncurses 或字符串拼接，维护困难。用 React + Flexbox 的模式，终端 UI 和 Web UI 共享相同的组件化思维，开发效率大幅提升。

### 产品化方向

这个模式适合做**运维仪表盘 CLI**——用 JSX 写终端界面，支持实时数据刷新、鼠标交互、主题切换。

---

## 组合打法：1688 智能选品工作台 (P0)

将上述架构组合，可以构建一个完整的智能选品平台：

```
┌─────────────────────────────────────────────┐
│            1688 智能选品工作台                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Coordinator（Prompt 编排）──────────┐     │
│  │                                     │     │
│  │  ┌─ Agent: 市场分析师 ─┐            │     │
│  │  │  Tools: GoogleTrends │            │     │
│  │  │         AmazonAPI    │            │     │
│  │  │  Memory: 市场记忆    │            │     │
│  │  └──────────────────────┘            │     │
│  │                                     │     │
│  │  ┌─ Agent: 选品专家 ───┐            │     │
│  │  │  Tools: 1688Search   │            │     │
│  │  │         PriceCompare │            │     │
│  │  │  Memory: 选品记忆    │            │     │
│  │  └──────────────────────┘            │     │
│  │                                     │     │
│  │  ┌─ Agent: 竞品分析师 ─┐            │     │
│  │  │  Tools: CompAnalysis │            │     │
│  │  │         PatentSearch │            │     │
│  │  │  Memory: 竞品记忆    │            │     │
│  │  └──────────────────────┘            │     │
│  │                                     │     │
│  └─────────────────────────────────────┘     │
│                                             │
│  ┌─ Permission Layer ────────────────────┐   │
│  │  规则管道 + AI 安全判断（防误操作）      │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ MCP Gateway ─────────────────────────┐   │
│  │  HSF 接口 / HTTP API / 数据库 统一接入  │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Memory Layer ────────────────────────┐   │
│  │  客户画像 / 市场趋势 / 选品历史 自动沉淀 │   │
│  │  KAIROS: 日间记录 → 夜间蒸馏 → 晨会播报 │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Bridge ──────────────────────────────┐   │
│  │  钉钉群触发 → 本地AI处理 → 结果推回钉钉  │   │
│  └───────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 优先级排序

### P0：1688 智能选品工作台
组合 Tool + Agent/Team + Memory + MCP + Coordinator，构建端到端选品系统。

### P1：8 个模块独立建设
| 序号 | 模块 | 依赖 | 建议顺序 |
|------|------|------|---------|
| 1 | 自描述 API Gateway | Tool System | 第 1 批（基础设施） |
| 2 | Elicitation 交互引擎 | MCP | 第 1 批（基础设施） |
| 3 | 多 Agent 状态隔离框架 | State Management | 第 2 批（核心框架） |
| 4 | AI 安全判断引擎 | Permission | 第 2 批（核心框架） |
| 5 | 团队知识沉淀引擎 | Memory | 第 3 批（应用层） |
| 6 | 客户画像自进化系统 | Memory | 第 3 批（应用层） |
| 7 | KAIROS 日志蒸馏系统 | Memory | 第 3 批（应用层） |
| 8 | Prompt 驱动的微服务编排 | Coordinator | 第 4 批（高阶能力） |

建议按**基础设施 → 核心框架 → 应用层 → 高阶能力**的顺序逐步推进。

---

## 附录：架构对比表

| 架构模式 | Claude Code 实现 | 传统方案 | 优势 |
|---------|-----------------|---------|------|
| Tool | buildTool 工厂 + 自渲染 | Controller/Service/DAO 分层 | 高内聚、AI 友好 |
| Multi-Agent | AsyncGenerator + 状态隔离 | 微服务 + MQ | 轻量、免部署 |
| Remote Control | 长轮询 Bridge | VPN + 端口映射 | 零配置穿透 |
| Permission | 8 级管道 + AI 分类器 | RBAC + 白名单 | 处理未知操作 |
| Extension | Markdown Skill | npm 插件 | 零代码创建能力 |
| State | DeepImmutable Store | Redux/MobX | 类型级不可变保证 |
| Memory | 文件记忆 + KAIROS 蒸馏 | 数据库 + 全文检索 | 信息密度优化 |
| Protocol | MCP 5 种传输 | REST/gRPC | 统一协议、多传输 |
| Orchestration | Prompt 驱动编排 | Airflow/Step Functions | 运行时动态 DAG |
| Terminal UI | React Reconciler + Yoga | ncurses/blessed | 组件化、Flexbox 布局 |

---

## 总结

Claude Code 的源码不仅仅是一个 CLI 工具的实现——它是**一整套 AI 原生应用的架构范式**。

从 Tool 的自描述设计，到 Agent 的状态隔离，到 Memory 的信息蒸馏，到 Permission 的 AI 守护 AI——这些模式解决的都是**AI 时代特有的工程问题**。

传统软件工程的经验仍然重要，但 AI 应用需要新的架构思维：
- **工具不只是函数，而是自描述的能力单元**
- **编排不只是 DAG，而是 Prompt 驱动的动态决策**
- **权限不只是规则，而是确定性 + 概率性的混合判断**
- **记忆不只是存储，而是持续蒸馏的知识管道**

这些思想，值得每一个 AI 应用开发者深入理解和实践。
