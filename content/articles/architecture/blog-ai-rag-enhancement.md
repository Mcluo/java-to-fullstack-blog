---
title: "博客 AI 助手 RAG 增强实战：从纯 Prompt 到向量检索的完整改造"
excerpt: "记录将博客项目（Next.js 14 + Claude API）的 AI 助手从纯 Prompt 硬编码升级为 RAG 向量检索 + 动态文章目录的完整过程。涵盖方案选型、Embedding 模型踩坑、langchain 兼容性问题、以及 RAG 无法覆盖的元数据问题的补充方案。"
category: "architecture"
tags: ["rag", "embedding", "ai-assistant", "next.js", "qwen"]
publishedAt: "2026-04-06"
readTime: 15
---

## 概述

记录将博客项目（Next.js 14 + Claude API）的 AI 助手从"纯 Prompt 硬编码"升级为"RAG 向量检索 + 动态文章目录"的完整过程。涵盖方案选型、Embedding 模型踩坑、langchain 兼容性问题、以及 RAG 无法覆盖的元数据问题的补充方案。

---

## 一、改造前的问题

### 原始架构

<img src="/images/rag/architecture-before.svg" alt="改造前架构：纯 Prompt 硬编码" style="max-width:100%;margin:1em 0;" />

原来的 `route.ts` 中，system prompt 里硬编码了一份文章列表：

```typescript
const SYSTEM_PROMPT = `...
**前端教程**：
- TypeScript快速入门 (/articles/frontend/01-typescript-for-java-developers)
- React核心概念 (/articles/frontend/02-react-vs-spring)
...`
```

### 三个致命缺陷

1. **AI 不知道文章内容** — 只知道"有这些文章"，不知道写了什么。用户问"你那篇文章里提到的 xxx 是什么意思"时，只能凭通用知识瞎猜
2. **新增文章需要手动更新 prompt** — 每加一篇文章就要改代码
3. **无法引用具体段落** — 回答缺乏来源支撑，用户无法验证

---

## 二、方案选型

### 三个候选方案

| 方案 | 复杂度 | 效果 | 适用场景 |
|------|--------|------|----------|
| A. 构建时注入文章摘要到 system prompt | 低 | 中 | 文章 < 20 篇 |
| B. **简单 RAG（向量检索 + context 注入）** | 中 | 高 | 文章多、内容深 |
| C. Fork knowledge-agent-template | 高 | 高 | 需要完整重写 |

**最终选择方案 B**，原因：
- 博客已有 23 篇文章、~216KB 内容，纯摘要注入会撑爆 context
- 项目已安装 `langchain`、`@langchain/openai` 等依赖，改造成本低
- 不需要 Supabase/pgvector 等外部服务 — 21 篇文章用 JSON 文件 + 内存余弦相似度足够

---

## 三、技术架构

### 改造后的架构

<img src="/images/rag/architecture-after.svg" alt="改造后架构：RAG 向量检索 + 动态目录 + Claude 生成" style="max-width:100%;margin:1em 0;" />

### 关键技术选型

| 组件 | 选型 | 原因 |
|------|------|------|
| Embedding 模型 | Qwen3-Embedding-8B (ModelScope) | 免费、中文优化、4096 维 |
| 向量存储 | 本地 JSON 文件 | 23 篇文章无需数据库 |
| 检索算法 | 余弦相似度 | 简单高效，内存计算 |
| 文本分块 | langchain RecursiveCharacterTextSplitter | 按标题层级智能切分 |
| 生成模型 | Claude Sonnet 4.6 | 已有的 chat 模型 |

---

## 四、实现细节

### 4.1 文章分块策略

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // 每块约 1000 字符
  chunkOverlap: 200,    // 块间重叠 200 字符，保证上下文连贯
  separators: ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', ' '],
  // 优先在标题处切分，保持语义完整
})
```

**关键设计：每个 chunk 前缀文章标题**

```typescript
const textWithTitle = `[文章: ${article.title}]\n\n${doc.pageContent}`
```

这样即使 chunk 被单独检索到，模型也知道它来自哪篇文章。

### 4.2 Embedding 生成脚本

`scripts/build-embeddings.ts` 的核心流程：

```
23 篇文章 → 237 个 chunks → 批量调用 API(每批20个) → embeddings.json(18.68MB)
```

输出格式：
```json
{
  "model": "Qwen/Qwen3-Embedding-8B",
  "dimensions": 4096,
  "totalArticles": 23,
  "totalChunks": 237,
  "chunks": [
    {
      "text": "[文章: TypeScript 快速入门]\n\n...",
      "metadata": { "title": "...", "category": "frontend", "slug": "..." },
      "embedding": [0.012, -0.034, ...]
    }
  ]
}
```

### 4.3 RAG 检索模块

`src/lib/rag.ts` 的三个核心函数：

**1) 查询向量生成** — 直接 fetch，不走 langchain

```typescript
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen3-Embedding-8B',
      input: query,
      encoding_format: 'float',  // Qwen3 要求必传此参数
    }),
  })
  // ...
}
```

**2) 余弦相似度检索** — 内存计算，同一文章最多取 2 个 chunk

```typescript
// 去重：防止单篇文章垄断检索结果
const articleCounts: Record<string, number> = {}
for (const item of scored) {
  const key = `${item.metadata.category}/${item.metadata.slug}`
  if ((articleCounts[key] || 0) >= 2) continue
  articleCounts[key] = (articleCounts[key] || 0) + 1
  deduped.push(item)
  if (deduped.length >= topK) break
}
```

**3) Context 构建** — 格式化为带来源链接的文本

```
### 来源 1: 为什么架构师是不可被 AI 替代的
**链接**: /articles/personal-growth/why-architects-irreplaceable-by-ai
**相关度**: 87%

[文章内容片段...]
```

### 4.4 System Prompt 三层组装

<img src="/images/rag/prompt-layers.svg" alt="System Prompt 三层架构" style="max-width:100%;margin:1em 0;" />

```typescript
// 改造后的 prompt 结构
const systemPrompt = [
  BASE_SYSTEM_PROMPT,     // 角色定义 + 回答风格 + 防幻觉指令
  buildArticleCatalog(),  // 动态文章目录（解决元数据问题）
  ragContext,             // RAG 检索到的相关片段
].filter(Boolean).join('\n\n')
```

---

## 五、踩坑记录

### 坑 1：ModelScope API Token 认证

**现象**：调用 `Qwen/Qwen3-Embedding-8B` 时报 `"Please bind your Alibaba Cloud account before use."`

**排查过程**：
1. 最初使用的 token 未绑定阿里云账号 → 绑定后仍报错
2. 发现需要重新生成 token（绑定后旧 token 不会自动生效）
3. 新 token 依然报错 → 原来 ModelScope 免费推理 API 根本不支持 Embedding 模型！
4. 最终使用的是 ModelScope **付费/高级** API token，才调通

**教训**：ModelScope 的 `/v1/models` 列出的 60 个模型中没有任何 embedding 模型。Embedding 需要单独的 token 权限。

### 坑 2：Qwen3-Embedding 的 encoding_format 参数

**现象**：`"encoding_format must be 'float' or 'base64', got ''"`

**原因**：Qwen3-Embedding-8B 要求请求中必须包含 `encoding_format: "float"` 参数，而 OpenAI 原版 API 这个参数是可选的。

**解决**：放弃 langchain 的 `OpenAIEmbeddings` 类（它不发送此参数），改用原生 `fetch` 调用 API，手动传递 `encoding_format`。

```typescript
// langchain OpenAIEmbeddings 不支持 encoding_format
// ❌ const embeddings = new OpenAIEmbeddings({ ... })

// ✅ 直接 fetch
body: JSON.stringify({
  model: 'Qwen/Qwen3-Embedding-8B',
  input: texts,
  encoding_format: 'float',  // 关键！
})
```

### 坑 3：内部代理的模型名不兼容

**现象**：Chat API 报 `"The provided model identifier is invalid."`

**原因**：代码中写的 `claude-3-5-sonnet-20241022`，但内部代理只支持新版模型名 `claude-sonnet-4-6`。

**解决**：模型名改为环境变量，代理配置统一放 `.env.local`。

```typescript
model: process.env.CHAT_MODEL || 'claude-sonnet-4-6'
```

### 坑 4：bun vs node 环境

**现象**：`npx tsx scripts/build-embeddings.ts` 报 `Cannot find module './cjs/index.cjs'`

**原因**：系统 `node` 被 symlink 到了 bun，tsx 的 CJS 模块解析与 bun 不兼容。

**解决**：直接用 `bun run scripts/build-embeddings.ts`。

### 坑 5：RAG 无法回答元数据问题

**现象**：问"博客系统有多少篇文章"，AI 说"我没有检索到相关信息"。

**根因**："有多少篇文章"是元数据统计问题，不在任何文章内容里。RAG 只能检索文章**内容片段**，无法回答关于文章集合本身的问题。

**解决**：在 system prompt 中动态注入文章目录概览：

```typescript
function buildArticleCatalog(): string {
  const articles = getAllArticles()
  // 生成格式化的文章列表，包含分类、数量、标题、链接
  return `## 网站文章目录（共 ${articles.length} 篇）\n...`
}
```

**架构启示**：RAG 不是银弹。**内容检索 + 元数据注入**双管齐下才能覆盖所有问题类型。

---

## 六、最终文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/build-embeddings.ts` | 新建 | 文章分块 + embedding 生成 |
| `src/lib/rag.ts` | 新建 | RAG 检索模块（余弦相似度 + context 构建） |
| `src/app/api/chat/route.ts` | 重构 | 三层 prompt 组装 + RAG pipeline |
| `src/lib/embeddings.json` | 生成 | 237 chunks, 4096 维, 18.68MB |
| `.env.local` | 修改 | Embedding API + Claude 代理配置 |
| `package.json` | 修改 | 添加 `build:embeddings` 脚本 |
| `.gitignore` | 修改 | 排除 embeddings.json |

---

## 七、效果对比

### 改造前

```
问：架构师为什么不可被AI替代？
答：（凭通用知识泛泛而谈，无法引用博客文章内容）

问：博客有多少篇文章？
答：我无法获取这个信息。
```

### 改造后

```
问：架构师为什么不可被AI替代？
答：根据网站文章《为什么架构师是不可被 AI 替代的》，核心原因有五点：
    1. 约束空间的取舍判断...
    2. 问题定义能力...
    来源：/articles/personal-growth/why-architects-irreplaceable-by-ai

问：博客有多少篇文章？
答：博客目前共有 23 篇文章，分布在以下分类：
    - 前端 (2篇)、后端 (1篇)、AI (1篇)...
```

---

## 八、关键设计决策总结

### 为什么用 JSON 文件而不是向量数据库？

23 篇文章、237 个 chunks、18.68MB — 完全可以内存加载。引入 Supabase pgvector 或 Pinecone 是过度工程化。当文章超过 500 篇时再考虑迁移。

### 为什么放弃 langchain 的 OpenAIEmbeddings？

langchain 的封装不支持 `encoding_format` 参数，而 Qwen3-Embedding 强制要求它。与其 hack langchain 内部逻辑，不如用 30 行 fetch 代码替代。**不要为了用框架而用框架。**

### 为什么同时注入文章目录和 RAG 上下文？

RAG 解决"文章内容检索"，目录解决"文章元数据查询"。两者互补，缺一不可：

```
System Prompt = 基础角色定义
              + 文章目录（元数据层：多少篇、什么分类）
              + RAG 上下文（内容层：具体段落和知识点）
```

### 为什么每个 chunk 前缀文章标题？

没有标题前缀时，检索到的 chunk 是孤立的段落，模型不知道它来自哪篇文章，也就无法生成准确的来源引用。前缀标题成本极低（多几十个 token），但对回答质量的提升是质的飞跃。

---

## 九、后续优化方向

1. **查询改写** — 用户问"TS 咋学"时，先改写为"TypeScript 学习入门教程"再检索
2. **混合检索** — 向量检索 + Fuse.js 关键词检索，取并集
3. **缓存查询向量** — 相同问题不重复调用 embedding API
4. **增量更新** — 新增文章时只生成新文章的 embedding，不全量重建
5. **相关度阈值自适应** — 根据最高分动态调整 minScore

---

**文档版本**：v1.0
**最后更新**：2026-04-06
**来源**：Claude Code 对话实战