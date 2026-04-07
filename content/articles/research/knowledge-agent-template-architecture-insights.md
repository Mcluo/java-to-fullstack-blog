---
title: "Knowledge Agent Template 架构思想分析"
excerpt: "分析 Vercel Labs 的 Knowledge Agent Template 项目中值得学习的 7 大架构思想。该项目是一个基于 RAG 的 AI 知识库问答模板，设计了 Chat（用户问答）和 Admin（管理监控）双角色系统。"
category: "research"
tags: ["ai-agent", "rag", "prompt-engineering", "architecture"]
publishedAt: "2026-04-06"
readTime: 5
---

## 概述

分析 Vercel Labs 的 Knowledge Agent Template 项目中值得学习的 7 大架构思想。该项目是一个基于 RAG 的 AI 知识库问答模板，设计了 Chat（用户问答）和 Admin（管理监控）双角色系统。

---

## 1. Prompt 即架构（Prompt as Architecture）

系统提示词不是随意拼接的字符串，而是**分层组合的模块化设计**：

```
BASE_SYSTEM_PROMPT（骨架）
  → applyTemporalContext()   // 注入时间上下文
  → applyAgentConfig()       // 注入业务配置
  → 最终 prompt
```

<img src="/images/knowledge-agent/knowledge-agent-architecture.svg" alt="Knowledge Agent Prompt 组合管道与降级链" style="max-width:100%;margin:1em 0;" />

**启发**：把 prompt 当代码写 — 有模板、有变量、有组合函数。这样不同场景（chat/admin）可以复用基础能力，又能各自扩展。

---

## 2. 角色隔离（Role Separation）

Chat 和 Admin 是两套完全独立的 prompt，不是靠一个 `if (isAdmin)` 分支控制：

- **Chat**: 文档检索 + 回答，工具集是 `bash_batch` + `search_web`
- **Admin**: 数据分析 + 监控，工具集是 `query_stats` + `chart` + `run_sql`

**启发**：不同角色给不同能力边界，而不是一个全能 prompt 加权限判断。**最小权限原则**在 AI Agent 设计中同样适用。

---

## 3. 防幻觉的系统性设计（Anti-Hallucination by Design）

不是靠一句 "don't hallucinate" 解决，而是**多层防线**：

| 层级 | 机制 |
|------|------|
| 原则层 | "ONLY answer based on what you find" |
| 行为层 | "NEVER make up information or guess" |
| 降级层 | 找不到 → 明确说 "I couldn't find this" |
| 引用层 | "Always cite the source file path" |
| 工具层 | Admin 要求 "use tools to fetch real data before answering" |

**启发**：可靠性不靠单一指令，靠**多层约束叠加**。每一层都假设上一层可能失效。

---

## 4. 性能导向的工具设计（Performance-Aware Tooling）

用 Good/Bad 示例对比，直接教模型**怎样调用是高效的**：

```
Bad: 5次串行调用（find → grep → grep → cat → cat）
Good: 1-2次 bash_batch 批量调用
```

**启发**：AI Agent 的性能瓶颈往往在工具调用轮次。Prompt 中直接编码调用模式，比事后优化有效得多。

---

## 5. 渐进式降级策略（Graceful Degradation）

```
沙箱文档（最可信）→ Web 搜索（次可信）→ 通用知识（最后兜底）
```

并且在每一层都有约束：
- 工具失败 → 只重试一次，不死循环
- 接近 step limit → 停止搜索，用已有信息回答
- 搜索无结果 → 切换策略而不是重复

**启发**：Agent 系统必须设计**退出条件**。无限重试和无限搜索是生产环境的大忌。

---

## 6. 输出导向约束（Output-Oriented Constraints）

Admin prompt 里的关键设计：

> "ALWAYS use the chart tool when data has a time dimension"

不是说 "可以用图表"，而是**强制规定什么时候必须用什么输出形式**。

**启发**：好的 Agent 设计不只约束"做什么"，还约束**"怎么呈现"**。用户体验是 prompt 工程的一部分。

---

## 7. 模板变量注入（Template Variable Injection）

```typescript
`{{TEMPORAL_CONTEXT}}`  // 占位符，运行时替换
```

通过 `applyTemporalContext()` 动态注入当前时间，让模型感知"现在"。

**启发**：Prompt 中的动态上下文（时间、用户身份、配置）应该通过**模板机制**注入，而不是硬编码。这让同一套 prompt 能适配不同部署环境。

---

## 总结对照表

| # | 思想 | 一句话 |
|---|------|--------|
| 1 | Prompt 模块化 | 把 prompt 当可组合的代码写 |
| 2 | 角色隔离 | 不同角色不同能力边界 |
| 3 | 多层防幻觉 | 每一层都假设上一层会失效 |
| 4 | 性能编码 | 在 prompt 里直接教高效调用模式 |
| 5 | 渐进降级 | 永远有退出条件，不死循环 |
| 6 | 输出约束 | 约束呈现形式，不只约束内容 |
| 7 | 模板注入 | 动态上下文通过变量机制注入 |

---

## 适用场景

这些架构思想不局限于此项目，适用于任何 **AI Agent / [RAG 系统](/articles/architecture/blog-ai-rag-enhancement)**的设计。重点关注：
- **#3 多层防幻觉** — 生产环境最容易踩坑
- **#5 渐进降级** — 决定系统稳定性的关键

---

**文档版本**：v1.0
**最后更新**：2026-04-06
**来源**：Claude Code 对话
