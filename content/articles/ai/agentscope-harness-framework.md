---
title: "首个 Harness Framework 发布 —— 把 OpenClaw 的「持续进化」体验，装进企业级的安全边界"
excerpt: "AgentScope Java 1.1.0 正式发布，完整实现 Harness Framework 规划。Workspace 驱动、持续进化、沙箱执行、分布式部署，从本地助手到企业级分布式智能体，一套 Harness 到底。"
category: "ai"
tags: ["agentscope", "harness", "java", "enterprise-agent", "workspace", "openclaw", "multi-agent"]
publishedAt: "2026-05-13"
readTime: 18
---

书接上回，我在之前的一篇文章中深入分析了 OpenClaw 及其背后的 Harness Engineering 实践，同时构想了一套 "Harness Framework" 来讲解如何将这套理念应用到企业级智能体开发中。

随着 **AgentScope Java 1.1.0** 版本里程碑版本的正式发布，我们已经完整的实现了这套 "Harness Framework" 规划。开发者可以基于 1.1 版本快速实践 Harness，开发面向个人提效的 XxxClaw、Coding Agent 等本地应用，尤其是开发面向分布式场景的 DataAgent、SRE Agent 等企业级应用。

**Workspace 驱动、持续进化、沙箱执行、分布式部署，从本地助手到企业级分布式智能体，一套 Harness 到底。**

---

## AgentScope Java 1.1.0 核心能力

在这个版本中交付了四项核心能力：

1. **工作区驱动的 Agent 运行环境**：Agent 的人格、知识、技能、记忆、子 Agent 规格统一沉淀在一个结构化工作区里，每次运行自动从工作区加载上下文、结束后自动回写记忆，Agent 的能力随时间持续演化。

2. **可插拔的抽象文件系统**：工作区的物理存储可以自由切换——本机磁盘、远端共享存储、隔离沙箱均通过同一套接口操作，同一份 Agent 逻辑无需修改即可适配个人开发环境与企业分布式部署。

3. **开箱即用的上下文管理**：内置对话压缩、双层记忆沉淀与全文检索，解决长对话上下文膨胀和跨会话记忆丢失两个顽固问题，并通过后台维护机制保证记忆库不随时间失控增长。

4. **子 Agent 编排与隔离执行**：支持声明式定义子 Agent、同步或异步委派子任务；工具执行可配置在隔离沙箱内完成，并在多轮对话间保持沙箱状态可恢复，兼顾多租户场景的会话与用户维度隔离。

---

## OpenClaw/Hermes 很好，但在企业级智能体场景却用不起来？

过去一段时间，OpenClaw、Hermes、Claude Code 等智能体产品掀起了一波热潮，也带火了这些产品背后的 Harness Engineering 理念——用结构化的工作区、上下文管理与工具约定，替代"每次对话各自为战"的原始使用方式。越来越多的团队开始把这套思路搬进自己的 Agent 开发中。

然而，真正动手落地的开发者往往会发现，这条路走到"企业级"就开始卡壳。我们梳理了来自一线开发者最常提到的五个障碍：

### 问题一：多用户、多副本，工作区怎么办？

OpenClaw 用一个本地目录做工作区，单机单用户完全没问题。但服务要对外，多个用户的工作空间要隔离，Agent 水平扩容到多台机器后，同一用户的工作区又要在副本间共享——本地目录这套假设直接崩掉了。

### 问题二：Tool 和 Skill Script 不能在宿主机上跑，怎么隔离执行？

Agent 调用 Shell 或运行用户提供的代码，放在本地可信开发机上无所谓，一旦上服务，把任意用户输入的命令直接在宿主机上执行就是安全漏洞。沙箱是必须的，但"有沙箱"只是第一步：沙箱里的 Tool 还需要看到完整的上下文，多轮对话中同一个沙箱实例要可恢复，而不是每次都从零开始。

### 问题三："workspace + 文件系统"的组合如何搬到分布式环境？

文件系统驱动的工作区是 Harness Engineering 里最直觉、也最有效的模式，但这套模式的前提是"文件系统"。分布式场景下没有统一的本地磁盘，远端存储、KV 服务、对象存储各有各的接口，重写一遍等于把 Agent 逻辑和基础设施耦合死了。

### 问题四：Multi-Agent 怎么做才对？

子任务分发、上下文隔离、异步执行、结果回收、超时取消——每一项单独做都不难，但要拼成一个可管理的编排层，代码复杂度会快速上升，而且大多数框架只提供原语，工程上的"怎么声明子 Agent、什么时候 spawn、怎么管理状态"全靠自己摸索。

### 问题五：上下文压缩和分层记忆有没有开箱即用的实现？

Harness Engineering 把这两件事讲得很清楚，但真正做起来要处理的细节非常多：压缩时机、压缩策略、压缩前的事实提取、历史的可检索性、跨进程重启后的恢复……大多数框架只给了 short/long memory 的抽象接口，具体实现还是要自己来。

### 根本原因：两种不同的工程形态

| 维度 | 个人助手 | 企业级 Agent |
|------|---------|-------------|
| 部署形态 | 单用户单进程，状态可以放在一台机器上 | 水平扩容、多租户、服务不中断，状态必须分布式存储和恢复 |
| 安全边界 | 本机工具执行没有风险 | 生产环境任意 Shell 执行是攻击面，沙箱是上线前提 |
| 运维可观测性 | 自己看日志就行 | 记忆落盘、会话可审计、状态变更可追踪 |
| Token 消耗 | 对延迟和费用不敏感 | 每一次无效的上下文重推都是真实成本 |

AgentScope Java 1.1.0 的 Harness 模块（入口类 `HarnessAgent`）就是围绕这个目标设计的：它不替换 ReActAgent 的推理循环，而是在循环的关键时机插入 Hook，补齐一组工具与工作区约定，把上面五个问题的工程答案打包进来，让你专注于 Agent 的业务逻辑，而不是基础设施。

---

## AgentScope Harness 设计理念

AgentScope Java Harness 的设计哲学可以用一句话概括：**把"下一轮怎么办、下一天怎么办、上下文爆了怎么办、状态丢了怎么办"的工程答案打包进来，而不是让每个 Agent 项目各自发明一遍。**

### 核心支柱一：Workspace 作为唯一事实来源

Harness 为每个 Agent 引入了 workspace 工作空间的概念——一个结构化目录，用于承载 Agent 运行所需的一切持久化内容：

- **人格定义**（AGENTS.md）
- **长期记忆**（MEMORY.md）
- **领域知识**（knowledge/）
- **可复用技能**（skills/）
- **子 Agent 规格**（subagents/）
- **会话历史**（agents/\<agentId\>/）

工作区是 Agent 的**唯一事实来源（Source of Truth）**，所有状态的读写都围绕工作区展开，而不是散落在代码、数据库和内存的各个角落。

实际运行中：
- 每次推理开始前，`WorkspaceContextHook` 会把 AGENTS.md、MEMORY.md、knowledge/ 等关键文件自动注入到 system prompt 里
- Agent 运行结束后，`MemoryFlushHook` 会提炼本次对话的新事实写入记忆文件
- 后台的 `MemoryConsolidator` 再周期性地把流水账合并成精炼的长期记忆
- 工作区在对话中持续演化，每一次运行都比上一次"更了解"用户和任务

### 核心支柱二：AbstractFilesystem 让工作区可以运行在任何环境

AgentScope Java Harness 用 `AbstractFilesystem` 抽象层来解决分布式场景的工作区问题：

- 对上层：Agent 只需要调用统一的 `read/write/ls/grep` 等接口，不关心"文件"实际落在哪
- 对下层：可以适配到本机磁盘、远端对象存储（OSS）、KV 数据库（Redis）、沙箱文件系统等任意介质，甚至通过 `CompositeFilesystem` 把不同路径路由到不同后端

![AbstractFilesystem 架构图 — 三种实现模式](https://oss-ata.alibaba.com/article/2026/05/4026a354-e230-4975-a3c8-6bfd52fe4ec3.png)

如上图所示，基于 AbstractFilesystem 接口，AgentScope Java 内置提供了三种拓展实现，对应三种使用模式。

![三种文件系统后端对比](https://oss-ata.alibaba.com/article/2026/05/38fe2be4-0f50-4eef-a219-c75d0394217e.png)

基于这一层抽象，AgentScope Java 直接为智能体开发带来了三大工程能力：

**安全与隔离**：Shell/Code/Skill 的执行通过沙箱后端隔离，工具的注册与暴露由框架统一管理，execute 工具仅在后端实现了沙箱接口时才出现。

**分布式部署**：Agent 可以多副本对等部署，MEMORY.md、会话日志等关键文件通过 Remote 后端路由到共享存储，天然实现跨节点同步。通过 `IsolationScope`（SESSION / USER / AGENT / GLOBAL）与 `RuntimeContext` 组合，在代码不变的前提下实现多种租户策略。

**Subagent 与异步任务**：子 Agent 的工作区、文件系统、会话状态都从父 Agent 继承或独立配置，编排策略由规格声明，异步任务的状态机（PENDING/RUNNING/COMPLETED/FAILED/CANCELLED）开箱即用。

---

## 三种典型使用场景

### 场景一：个人代理 Agent — 典型如 OpenClaw 类应用

**特点**：单用户、本机运行、需要操作本地文件或执行脚本，典型产品是个人助理、笔记机器人、本地 Coding Agent。

**核心能力**：
- **持续记忆**：对话结束后自动将新事实提炼写入工作区，长期记忆随使用积累
- **本地 Shell 执行**：在本机可信环境下，Agent 可直接运行脚本、操作文件
- **工作区即配置**：修改 AGENTS.md 调整人格，在 skills/ 目录里新增技能，改一个文件等于升级一次 Agent
- **会话跨进程恢复**：只要 sessionId 不变，上次对话的状态全部还原

### 场景二：企业级数据服务 — 典型如 DataAgent

**特点**：服务多个用户、需要执行 SQL / Python / Shell、任务耗时较长、输入来自不可信的外部用户。

**核心能力**：
- **隔离沙箱执行**：所有代码与命令在隔离环境内运行，安全边界清晰
- **多轮沙箱状态恢复**：每轮对话结束后自动保存沙箱状态，用户的工作现场不丢失
- **分布式记忆共享**：多节点部署下所有副本读到同一份用户记忆，体验一致
- **子 Agent 并行编排**：长任务可拆解为多个子 Agent 并发执行
- **多租户隔离**：按会话或用户维度隔离工作区与执行环境

### 场景三：企业在线服务 — 典型如淘天交易 Agent

**特点**：主要通过调用业务 API 完成任务，不需要在服务器上执行 Shell，但需要多实例运行、会话状态可持久。

**核心能力**：
- **默认安全边界**：不开启沙箱执行时框架不暴露 Shell 工具，安全策略由配置决定
- **多实例共享记忆**：任意服务实例都能读到同一份上下文
- **会话跨请求连续**：Agent 自动恢复上次的对话状态，实现真正的多轮连续对话体验
- **并行子任务支持**：子任务委派给子 Agent 并行执行，不影响主流程响应速度

---

## 快速开始 - Quick Start

上手 Harness 只需三步：引入依赖、准备工作区、构建并调用 Agent。

### 1. 引入依赖

```xml
<dependency>
    <groupId>io.agentscope</groupId>
    <artifactId>agentscope-harness</artifactId>
    <version>1.1.0-RC1</version>
</dependency>
```

### 2. 准备工作区

在磁盘上选一个目录作为 workspace，并在其中创建 `AGENTS.md`。这不是"可选的初始化步骤"，而是 Harness 的核心入口——Agent 的人格、记忆、技能、子 Agent 规格全部围绕这个目录展开。

### 3. 构建 HarnessAgent 并调用

```java
HarnessAgent agent = HarnessAgent.builder()
    .name("my-agent")
    .model(model)
    .workspace(Paths.get(".agentscope/workspace"))
    .compaction(CompactionConfig.builder()
        .triggerMessages(50)
        .keepMessages(20)
        .build())
    .build();

RuntimeContext ctx = RuntimeContext.builder()
    .sessionId("user-session-001")   // 相同 sessionId 的多次 call 自动续接上下文
    .userId("alice")                 // 多用户场景必传，用于命名空间隔离
    .build();

Msg reply = agent.call(userMessage, ctx).block();
```

运行后检查工作区目录：`AGENTS.md`、`memory/`、`agents/<agentId>/` 三个路径都应该存在，说明 Agent 已经在正常写入记忆和持久化会话状态了。

### 工作区目录结构

```
workspace/
├── AGENTS.md              ← Agent 人格与行为约定，每次推理前自动注入 system prompt
├── MEMORY.md              ← 精炼的长期记忆，由后台自动维护，随使用积累
├── knowledge/             ← 领域知识，随 AGENTS.md 一起注入
├── skills/                ← 可复用技能，自动装配到 Agent 的工具集
├── subagents/             ← 子 Agent 规格声明，自动被发现和加载
└── agents/<agentId>/
    ├── context/           ← 会话状态快照（进程重启后恢复用）
    ├── sessions/          ← 对话 JSONL 与压缩上下文，供审计与检索
    └── memory/            ← 每日记忆流水账
```

---

## 核心功能详解

### 记忆管理：从对话到长期知识的自动沉淀

AgentScope Java 的做法是双层分离：

**第一层——每日流水账**：每次对话结束后，框架用 LLM 从当次对话中提炼"新增事实"，以 bullet point 形式追加到当日的记忆文件（`memory/YYYY-MM-DD.md`）。只追加、不修改，保证任何新事实都不会丢失。

**第二层——长期记忆**：后台调度器周期性读取近期日流水账，用 LLM 把它们与现有的 MEMORY.md 合并、去重、精炼，输出在 Token 预算内的"可注入版"写回 MEMORY.md。

> **两层关系**：第一层保证不丢，第二层保证可用。新事实先落在流水账，等积累够了由后台搬进长期记忆，推理时模型优先看长期记忆，找不到时用 `memory_search` 工具做全文检索（基于 SQLite FTS5）。

对话压缩配置：

```java
.compaction(CompactionConfig.builder()
    .triggerMessages(50)    // 消息数超过 50 触发压缩
    .keepMessages(20)       // 保留最近 20 条
    .flushBeforeCompact(true) // 压缩前先提炼记忆（默认已开启）
    .build())
```

### 内置工具一览

HarnessAgent 构建时会自动注册一套工具，无需手动配置：

| 工具类别 | 工具列表 |
|---------|---------|
| 文件操作 | read_file、write_file、edit_file、grep_files、glob_files、list_files |
| 记忆检索 | memory_search、memory_get |
| 会话查询 | session_search、session_list、session_history |
| 子任务管理 | agent_spawn、agent_send、agent_list、task_output、task_list、task_cancel |
| Shell 执行 | execute（条件性注册，仅沙箱/本机模式） |

### 文件系统三种模式

**模式一：本机 + Shell（默认）**：工作区是本机上的一个目录，可以执行 Shell 命令。适合个人本机应用和开发测试环境。

**模式二：远端共享存储**：配置 `RemoteFilesystemSpec`，记忆、会话日志等关键数据路由到远端 KV（如 Redis）。默认不注册 Shell 工具，适合多副本在线服务。

**模式三：沙箱执行**：配置 `sandboxSpec`，文件读写和命令执行全部在隔离的沙箱环境里完成，宿主进程不受影响。适合执行不可信代码的场景。

> 同一套 Agent 代码逻辑，切换 filesystem 配置就能在三种模式间迁移。

### 子 Agent 编排

子 Agent 的声明方式有四种（灵活度从低到高）：
1. **内置 general-purpose Agent**：镜像主 Agent 配置，适合临时委派任意子任务
2. **工作区文件驱动**：在 `workspace/subagents/` 下放 Markdown 文件，框架自动发现并加载（推荐）
3. **代码声明**：用 `builder.subagent(spec)` 编程式指定
4. **自定义工厂**：完全控制子 Agent 的构建逻辑

调用方式分**同步**（主 Agent 阻塞等待）和**异步**（提交任务拿到 ID，后续轮询结果）两种。对于耗时超过几秒的任务，强烈建议用异步，避免主 Agent 白白阻塞消耗时间与 Token。

---

## 总结

AgentScope Java 1.1 把 Harness Engineering 里大家最想要、却最难自己拼装的一组能力，收敛成了 `HarnessAgent + 工作区约定 + 可插拔文件系统 + Hook 管线`：

- **个人场景下**：它是"带记忆、带压缩、带子任务"的加强版 ReAct Agent
- **企业场景下**：它是能把隔离、多租户、分布式记忆与子 Agent 编排变成配置项的基础设施

若你正在评估从个人助手原型演进到可上线的企业智能体，建议从 Harness 概览的快速开始跑通，再按 Filesystem 选择一种声明式模式，然后按需打开压缩、沙箱与子 Agent——每一步都有对应文档与示例模块可对照，而不必从零发明一套"工作区即真理"的运行时。

目前这套框架在 **MaaS、淘天、蚂蚁国际、盒马** 等都有推进中的深度合作落地案例，欢迎交流。

---

> **原文来源**：[首个Harness Framework发布](https://ata.atatech.org/articles/11020626959) — 刘军（陆龟），云智能集团，2026-05-11
