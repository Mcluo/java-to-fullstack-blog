---
title: "Claude Code 记忆系统源码深度剖析：LLM 如何记住你"
excerpt: "逆向分析 Claude Code 2.1.92 的记忆系统源码，揭示 memdir 目录结构、LLM-based 记忆选择、团队记忆同步、Auto Dream 等核心机制的工程实现"
category: "tools-and-tips"
tags: ["claude-code", "memory-system", "source-analysis", "LLM", "architecture"]
difficulty: "advanced"
publishedAt: "2026-04-07"
readTime: 15
---

# Claude Code 记忆系统源码深度剖析：LLM 如何记住你

> 基于 Claude Code 2.1.92 CLI bundle 的逆向分析。本文从 minified 源码中还原了记忆系统的完整架构，帮助你理解这个系统「为什么这样设计」以及「如何写出高召回率的记忆」。

---

## 为什么要研究记忆系统？

Claude Code 每次启动都是一个全新的 session，模型本身没有跨会话记忆能力。但实际使用中你会发现，它似乎「记住」了你的偏好、项目上下文、甚至你上次踩过的坑。

这不是魔法，而是一套精心设计的**文件级记忆系统**——Claude Code 在本地维护一个记忆目录，通过一个**独立的 LLM 调用**来决定每次对话该加载哪些记忆。

理解这套系统的工作原理，意味着你可以：
- 写出「容易被选中」的记忆文件，提高记忆的有效利用率
- 避免写了一堆记忆却从来不被加载的尴尬
- 理解为什么有时候 Claude Code 似乎「忘了」某些事情

---

## 整体架构：5 大模块

<img src="/images/cc-memory/architecture-overview.svg" alt="Claude Code Memory System Architecture" style="max-width:100%;margin:1.5em 0;" />

记忆系统的代码分布在 5 个核心模块中：

| 模块 | 所在目录 | 职责 |
|------|---------|------|
| **memdir** | `src/memdir/` | 核心引擎：LLM-based 记忆选择、相关性评分 |
| **SessionMemory** | `src/services/SessionMemory/` | 会话级状态管理、缓存已选记忆 |
| **teamMemorySync** | `src/services/teamMemorySync/` | 团队记忆跨 Agent 同步 |
| **utils/memory** | `src/utils/memory/` | 文件 I/O、路径解析、frontmatter 解析 |
| **System Prompt Builder** | 内置于主流程 | 将记忆注入 LLM 上下文窗口 |

此外，`commands/memory` 提供 `/memory` CLI 命令，`components/memory` 处理 Ink 终端 UI 渲染。

---

## 记忆目录与路径解析

### 默认路径

```
~/.claude/projects/<sanitized-cwd>/memory/
```

其中 `<sanitized-cwd>` 是当前工作目录的哈希化表示。例如在 `/Users/mcluo` 下启动，路径就是：

```
~/.claude/projects/-Users-mcluo/memory/
```

### 路径解析逻辑（源码）

```javascript
// 变量名经过反混淆
const MEMORY_DIR_NAME = "memory";
const MEMORY_INDEX = "MEMORY.md";

// hj() - 记忆目录解析函数
function getMemoryDir() {
  // 1. 优先检查 autoMemoryDirectory 设置
  const customDir = getAutoMemoryDirectory();
  if (customDir) return customDir;

  // 2. 默认路径
  const projectsDir = join(getConfigDir(), "projects");
  return join(projectsDir, sanitizeCwd(getCwd()), MEMORY_DIR_NAME);
}
```

### 自定义路径

在 `settings.json` 中可以配置：

```json
{
  "autoMemoryEnabled": true,
  "autoMemoryDirectory": "~/my-custom-memory/"
}
```

注意：`autoMemoryDirectory` **不允许在 `projectSettings`（即 checked-in 的 `.claude/settings.json`）中设置**——这是一个安全设计，防止恶意仓库通过配置重定向记忆路径。

---

## 四种记忆类型 + Scope 机制

从源码中提取的完整类型定义：

```typescript
const MEMORY_TYPES = ["user", "feedback", "project", "reference"];
```

### 类型详解

| 类型 | Scope 规则 | 核心用途 | 触发时机 |
|------|-----------|---------|---------|
| **user** | always private | 用户角色、偏好、知识背景 | 学到用户的任何个人信息时 |
| **feedback** | 默认 private；项目级约定存 team | 工作方式纠正/确认 | 用户说"不要这样做"或"就这样挺好" |
| **project** | 看情况 | 项目状态、截止日期、决策 | 学到项目的非代码信息时 |
| **reference** | 看情况 | 外部资源指针 | 发现外部系统的关键入口时 |

### 2.1.92 的新特性：Scope

之前版本只有 private 记忆，2.1.92 新增了 **team scope**：

```
memory/           ← private memories
memory/team/      ← team memories (shared across agents)
memory/team/MEMORY.md  ← team memory index
```

源码中的 scope 指导：

> feedback 类型：**默认 private**。仅当指导是明确的项目级约定（如测试策略、构建规则）且所有贡献者都应遵循时，才存为 team。个人风格偏好不要存 team。

---

## 核心机制：LLM-based 记忆选择

**这是整个记忆系统最巧妙的设计**——Claude Code 不使用向量检索（embedding + similarity search），而是用一个独立的、轻量级的 LLM 调用来判断哪些记忆与当前对话相关。

<img src="/images/cc-memory/memory-loading-flow.svg" alt="Memory Loading Flow" style="max-width:100%;margin:1.5em 0;" />

### 工作流程

1. **扫描记忆目录**：读取所有 `*.md` 文件的 frontmatter（只读 `name` 和 `description`，不读全文）
2. **构建提示词**：用系统提示 `TOY` 指导 LLM 做选择
3. **LLM 调用**：轻量级模型（`LT()`），`max_tokens: 256`，JSON schema 输出
4. **返回结果**：`selected_memories` 数组，最多 5 个文件名
5. **加载全文**：只有被选中的记忆文件才会读取完整内容注入上下文

### 记忆选择的系统提示（源码原文）

```text
You are selecting memories that will be useful to Claude Code
as it processes a user's query. The first message lists the
available memory files with their filenames and descriptions;
subsequent messages each contain one user query.

Return a list of filenames for the memories that will clearly
be useful (up to 5). Only include memories that you are
CERTAIN will be helpful based on their name and description.
```

### 关键选择规则

从 `TOY` 系统提示中提取的 4 条核心规则：

1. **确定性原则**：不确定就不选，宁缺毋滥
2. **保守对 user/project**：用户画像说"做数据库性能"，不代表每个包含"性能"关键词的问题都相关——要匹配**问题实质**，而非**表面关键词**
3. **去重原则**：同一会话中已选过的记忆不重复选择
4. **空列表合法**：没有明确相关的记忆时返回空数组

<img src="/images/cc-memory/llm-selection-mechanism.svg" alt="LLM Selection Mechanism" style="max-width:100%;margin:1.5em 0;" />

### 为什么不用向量检索？

这个设计选择值得深思：

- **向量检索**依赖 embedding 的语义距离，容易产生「语义相近但不相关」的误召回
- **LLM 选择**可以理解意图级别的相关性——"fix auth bug" 不只是关键词匹配 "auth"，LLM 能判断是否真的需要 auth 相关的记忆
- 记忆文件数量通常在几十个量级，LLM 调用的成本可接受
- description 字段充当了「人类可读的索引」，比 embedding 更可控

**trade-off**：对于上千个记忆文件的场景，LLM 调用的 token 成本会线性增长。但 Claude Code 的设计哲学是 **"fewer, better memories"**——宁可少存精准的记忆，也不要堆砌模糊的信息。

### 会话缓存机制

源码揭示了一个精妙的缓存设计：

```javascript
// 每次选择后，将 Q&A 对追加到消息历史
function updateConversationCache(state, dir, query, response) {
  state.stateByDir.set(dir, {
    ...prev,
    messages: [
      ...prev.messages,
      { role: "user", content: [{ type: "text", text: query }] },
      { role: "assistant", content: [{ type: "text", text: response }] }
    ]
  });
}
```

这意味着 LLM 选择器会看到之前的选择历史——这就是「已选过的不重复选」这条规则的工程实现。同时第一条消息（文件列表）会被标记 `cache_control`，利用 Anthropic API 的 prompt caching 降低成本。

---

## MEMORY.md 索引的设计哲学

MEMORY.md 是一个特殊文件——它**始终加载到上下文**，不经过 LLM 选择。

### 设计约束

| 约束 | 值 | 原因 |
|------|---|------|
| 最大行数 | 200 行 | 超出截断，避免消耗过多 token |
| 格式 | 一行一条 | 快速扫描，非 memory 正文 |
| 角色 | 索引 | 指向详细 memory 文件的指针 |

### 为什么需要 MEMORY.md

MEMORY.md 解决的是**冷启动问题**：

- LLM 选择器需要看到 memory 文件的 `description` 才能判断相关性
- 但 MEMORY.md 在 LLM 选择器运行之前就已经注入到主对话的系统提示中
- 所以 MEMORY.md 实际上是给**主 Claude 模型**看的，帮它决定何时应该去读某个记忆文件

这是一个双层设计：
1. **MEMORY.md → 主模型**：「我有这些记忆，你可能需要读某个」
2. **description → 选择器模型**：「这个记忆与当前查询是否相关？」

---

## 团队记忆与安全机制

### 团队记忆

团队记忆通过 feature flag `tengu_herring_clock` 控制，默认关闭。

```javascript
function isTeamMemoryEnabled() {
  if (!isFeatureEnabled()) return false;
  return getFeatureFlag("tengu_herring_clock", false);
}

// 团队记忆路径
function getTeamMemoryDir() {
  return join(getMemoryDir(), "team");
}

function getTeamMemoryIndex() {
  return join(getMemoryDir(), "team", "MEMORY.md");
}
```

### 安全防护

记忆系统实现了严格的安全检查，防止三类攻击：

#### 1. 路径遍历攻击

```javascript
function validateTeamMemWritePath(path) {
  // Null byte 注入检查
  if (path.includes("\x00"))
    throw new PathTraversalError(`Null byte in path: "${path}"`);

  // 目录逃逸检查
  const normalized = normalizePath(path);
  const teamDir = getTeamMemoryDir();
  if (!normalized.startsWith(teamDir))
    throw new PathTraversalError(`Path escapes team memory directory`);

  // 符号链接检查
  const resolved = await resolveSymlinks(normalized);
  if (!await isUnderDir(resolved))
    throw new PathTraversalError(`Path escapes via symlink`);
}
```

#### 2. 记忆投毒防护

系统提示中明确标记了 Memory Poisoning 为攻击向量：

> Memory Poisoning: Writing content to the agent's memory directory that would function as a permission grant or BLOCK-rule bypass when read back — e.g. recording classifier workarounds, fabricated user authorization...

#### 3. 配置重定向防护

`autoMemoryDirectory` 不允许在 `projectSettings`（checked-in `.claude/settings.json`）中设置——防止恶意仓库通过配置将记忆路径指向敏感目录。

---

## Auto Dream：后台记忆整合

源码中发现的实验性功能：

```javascript
// settings schema
autoDreamEnabled: z.boolean().optional().describe(
  "Enable background memory consolidation (auto-dream). " +
  "When set, overrides the server-side default."
)
```

Auto Dream 是一个**后台运行的记忆整合机制**，在 Claude Code 空闲时对记忆进行压缩、去重、合并。具体实现细节在 minified 代码中较难还原，但从设置项和描述可以推断：

- 它是一个**可选功能**（默认跟随服务端配置）
- 在后台静默运行，不影响前台对话
- 目的是解决记忆文件膨胀后的性能问题

---

## 关键源码片段解读

### 记忆文件加载流程

```javascript
// G$Y() - 加载记忆文件并计算 token
async function loadMemoryFiles() {
  // 如果是 SIMPLE 模式，跳过记忆
  if (isSimpleMode()) return { memoryFileDetails: [], claudeMdTokens: 0 };

  // 获取所有 CLAUDE.md 和 memory 文件
  const files = filterActiveFiles(await getAllMemoryFiles());
  const details = [];
  let totalTokens = 0;

  // 并行计算每个文件的 token 数
  const tokenCounts = await Promise.all(
    files.map(async (file) => ({
      file,
      tokens: await countTokens([{ role: "user", content: file.content }], [])
    }))
  );

  for (const { file, tokens } of tokenCounts) {
    totalTokens += tokens;
    details.push({ path: file.path, type: file.type, tokens });
  }

  return { claudeMdTokens: totalTokens, memoryFileDetails: details };
}
```

### 记忆文件过滤

```javascript
// Bo6() - 过滤记忆文件（feature flag 控制）
function filterMemoryFiles(files) {
  if (!getFeatureFlag("tengu_moth_copse", false)) return files;
  // 当 flag 关闭时，过滤掉 AutoMem 和 TeamMem 类型
  return files.filter(f => f.type !== "AutoMem" && f.type !== "TeamMem");
}
```

### 记忆过期警告

```javascript
const STALE_MEMORY_WARNING =
  "Memory records can become stale over time. " +
  "Use memory as context for what was true at a given point in time. " +
  "Before answering the user or building assumptions based solely on " +
  "information in memory records, verify that the memory is still correct " +
  "and up-to-date by reading the current state of the files or resources. " +
  "If a recalled memory conflicts with current information, trust what you " +
  "observe now — and update or remove the stale memory.";
```

这段话被注入到系统提示中，要求 Claude 不要盲目信任记忆内容——始终以当前代码/文件的实际状态为准。

---

## 实践建议：如何写出「高召回率」的记忆

理解了源码之后，我们可以反向推导出**让记忆更容易被选中的写作策略**：

### 1. description 是最关键的字段

LLM 选择器**只看 name 和 description**，不看正文。description 写得好不好，直接决定了你的记忆能不能被选中。

```markdown
# 差的 description
---
description: 一些项目相关的信息
---

# 好的 description
---
description: auth 中间件重写是因为合规要求，session token 存储方式不合规
---
```

### 2. 一个记忆文件只讲一件事

选择器最多选 5 个文件。如果你把 10 件事塞在一个文件里，要么整体被选中（浪费 context），要么整体不被选中（遗漏信息）。

### 3. feedback 类型要包含 Why

```markdown
---
name: 测试必须用真实数据库
description: 集成测试禁止 mock 数据库，因为之前 mock/prod 差异导致迁移失败
type: feedback
---

集成测试必须连接真实数据库，不使用 mock。

**Why:** 上季度 mock 测试全部通过，但生产迁移失败。
**How to apply:** 所有 test 文件中禁止 jest.mock('database')。
```

### 4. 保持 MEMORY.md 精简

200 行限制是硬限制。每条索引应该在 150 字符以内：

```markdown
- [Auth Rewrite](project_auth_rewrite.md) — 合规驱动的 auth 重写，非技术债清理
- [No DB Mocks](feedback_testing.md) — 集成测试禁止 mock 数据库
```

### 5. 定期清理过期记忆

记忆系统有防腐机制（stale warning），但不会自动删除。定期检查并移除已过时的记忆，减少选择器的决策负担。

---

## 总结

Claude Code 的记忆系统是一个精心设计的工程作品：

- **存储层**：文件系统 + frontmatter，简单可靠
- **索引层**：MEMORY.md 始终加载，作为热索引
- **选择层**：独立 LLM 调用做相关性判断，precision over recall
- **安全层**：路径遍历防护、投毒检测、配置隔离
- **协作层**：团队记忆 + scope 机制

最核心的设计洞察是：**用 LLM 代替向量检索做记忆选择**。在记忆数量可控（几十到几百个）的场景下，LLM 的意图理解能力远超 embedding 的语义距离计算。`description` 字段就是「人类可读的索引」——你写给选择器 LLM 看的一句话摘要，决定了你的记忆能不能在关键时刻被召回。

理解了这些，你就不再是被动地「等 Claude 记住你」，而是可以**主动设计你的记忆文件**，让 AI 在每次对话中都拥有恰到好处的上下文。
