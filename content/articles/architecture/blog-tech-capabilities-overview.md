---
title: "本站技术全景：一个后端工程师用 Next.js + AI 搭的博客长什么样"
excerpt: "这个博客本身就是一个全栈 + AI 项目的实战案例。本文介绍它的技术架构：Next.js 14 SSG/SSR、RAG 向量检索 AI 助手（聊天记录 Supabase 持久化）、评论系统、Markdown 驱动内容管理，以及每个技术选型背后的理由。"
category: "architecture"
tags: ["Next.js", "RAG", "Supabase", "博客架构", "全栈", "AI"]
publishedAt: "2026-04-07"
readTime: 12
---

## 这篇文章讲什么

这个博客不只是一个写文章的地方——它本身就是我从 Java 后端转型全栈 + AI 的实战项目。

与其写一篇干巴巴的技术选型文档，不如把这个博客拆开，讲讲每个部分是怎么做的、为什么这么做。如果你也是后端工程师想搭自己的博客，可以直接参考。

---

## 一、整体架构

```
┌──────────────────────────────────────────────────┐
│                    Vercel 部署                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ SSG 页面 │  │ SSR 页面  │  │ API Routes     │  │
│  │(静态生成) │  │(动态渲染) │  │(Serverless Fn) │  │
│  └────┬────┘  └────┬─────┘  └───────┬────────┘  │
│       │            │                │            │
│       └────────────┼────────────────┘            │
│                    │                             │
│            ┌───────┴───────┐                     │
│            │  Next.js 14   │                     │
│            │  App Router   │                     │
│            └───────┬───────┘                     │
│                    │                             │
│  ┌─────────┬───────┼───────┬──────────┐          │
│  │         │       │       │          │          │
│  ▼         ▼       ▼       ▼          ▼          │
│ Markdown  Fuse.js  RAG   Claude    Supabase          │
│ 文章管理   搜索   检索引擎  API   评论/认证/聊天持久化 │
│                                                  │
└──────────────────────────────────────────────────┘
```

用一句话概括：**Markdown 文件当数据库，Next.js 当框架，Claude 当 AI 大脑，Supabase 当用户系统 + 聊天持久化，Vercel 当运维。**

---

## 二、技术栈一览

| 职责 | 技术 | Java 生态等价物 |
|------|------|----------------|
| 框架 | Next.js 14 (App Router) | Spring Boot |
| 语言 | TypeScript | Java（都有类型系统） |
| UI | Tailwind CSS | — |
| 文章存储 | Markdown 文件 + gray-matter | 相当于把数据存在 YAML 文件里 |
| 搜索 | Fuse.js（客户端模糊搜索） | Elasticsearch（但轻量得多） |
| AI 模型 | Claude Sonnet 4.6（对话）| — |
| Embedding | Qwen3-Embedding-8B（向量化） | — |
| RAG 检索 | 本地 JSON + 余弦相似度 | 相当于简版 Elasticsearch 向量检索 |
| 数据库 | Supabase (PostgreSQL) | Spring Data JPA + PostgreSQL |
| 聊天持久化 | Supabase + localStorage 双模式 | Redis Session + MySQL |
| 认证 | Supabase Auth (GitHub OAuth) | Spring Security + OAuth2 |
| 部署 | Vercel (已上线) | 阿里云 ECS + Nginx + Jenkins |

---

## 三、六大技术能力详解

### 能力一：Markdown 驱动的内容管理

文章不存数据库，直接用 Markdown 文件管理：

```
content/articles/
├── frontend/
│   ├── 01-typescript-for-java-developers.md
│   ├── 02-react-vs-spring.md
│   └── 03-tailwind-css-for-backend-devs.md
├── backend/
│   └── 01-nodejs-async-programming.md
├── architecture/
│   ├── alphashop-sse-streaming-rendering-architecture.md
│   └── blog-ai-rag-enhancement.md
├── tools-and-tips/
├── work-logs/
└── ... (13 个分类，29 篇文章)
```

每篇文章的头部有 frontmatter 元数据：

```yaml
---
title: "写给后端的 Vercel 指南"
excerpt: "用后端工程师熟悉的概念讲清楚 Vercel 是什么..."
category: "tools-and-tips"
tags: ["Vercel", "部署", "Serverless"]
publishedAt: "2026-04-07"
readTime: 10
---
```

**为什么不用数据库？**

- 文章是静态内容，不需要频繁增删改查
- Markdown 文件可以用 Git 管理版本，每次修改都有历史记录
- 本地编辑体验好（任何编辑器都支持 Markdown）
- 构建时读取文件生成静态页面，访问速度极快（不需要查数据库）

**后端类比**：相当于 Spring Boot 的 `resources/` 目录存静态配置，启动时加载到内存。只不过这里的"配置"是文章内容。

### 能力二：AI 助手（RAG 向量检索增强 + 聊天持久化）

博客右下角有一个 AI 聊天助手，你可以问它任何关于博客内容的问题。它不是直接把问题丢给大模型，而是先检索相关文章内容，再让大模型基于检索结果回答。

#### 聊天记录持久化

GitHub 登录后，聊天记录自动同步到 Supabase 数据库，跨设备可用。未登录用户的聊天记录仍保存在浏览器 localStorage 中。

**双模式存储架构**：

```
┌──────────────────────────────────────────────┐
│              AIAssistant.tsx                  │
│                    │                         │
│                    ▼                         │
│           chat-storage.ts                    │
│          （存储抽象层）                        │
│                    │                         │
│         ┌─────────┴──────────┐               │
│         │                    │               │
│    已登录用户?             未登录?            │
│         │                    │               │
│         ▼                    ▼               │
│   Supabase DB          localStorage          │
│  (跨设备同步)          (仅当前浏览器)         │
│                                              │
│  chat_sessions 表      ai_chat_sessions key  │
│  chat_messages 表      ai_session_{id} key   │
└──────────────────────────────────────────────┘
```

核心设计：

- **存储抽象层** (`src/lib/chat-storage.ts`)：对组件透明，根据 `githubId` 是否存在自动选择后端。所有方法都是 async，Supabase 走网络请求，localStorage 走同步调用但用 Promise 包装保持接口一致。
- **自动迁移**：用户首次 GitHub 登录时，`syncFromLocal()` 将 localStorage 中的所有会话和消息批量写入 Supabase，然后清理本地数据。通过 `ai_chat_synced_{githubId}` flag 确保只迁移一次。
- **会话保存策略**：消息变更时触发 `saveCurrentSession()`，对 Supabase 采用"删旧插新"（delete + insert）而非 diff，避免消息顺序和内容不一致。
- **RLS 策略**：使用 anon key + 宽松 RLS（任何人可读写），安全性依赖 `user_github_id` 字段过滤。个人博客场景下足够，生产环境应使用 `auth.uid()` 绑定。

**后端类比**：相当于 Spring Boot 里用策略模式（Strategy Pattern）切换 Redis Session 和 Cookie Session，通过一个 `SessionStore` 接口屏蔽底层差异。

#### 整体流程

```
用户提问："SSE 和 WebSocket 有什么区别？"
    │
    ▼
1. 向量化查询（Qwen3-Embedding）
    │  把问题转成 4096 维向量
    ▼
2. 检索相关文章片段（余弦相似度 top-5）
    │  命中：alphashop-sse-streaming-rendering-architecture.md 的第 3、5 段
    ▼
3. 构建 System Prompt（三层架构）
    │  ├─ 第一层：角色定义（"你是一个帮助 Java 工程师转型的助手"）
    │  ├─ 第二层：文章目录（所有文章的标题+分类+链接）
    │  └─ 第三层：RAG 上下文（检索到的文章片段原文）
    ▼
4. 调用 Claude Sonnet 4.6（流式输出）
    │
    ▼
5. 返回答案，引用原文出处
```

#### 技术细节

- **Embedding 模型**：Qwen3-Embedding-8B（通过 ModelScope DashScope API，免费）
- **向量维度**：4096 维
- **分块策略**：每篇文章按 1000 字分块，块间 200 字重叠（保证上下文不断裂）
- **检索规则**：取 top-5 最相关片段，同一文章最多取 2 个（防止单篇垄断）
- **存储**：构建时生成 `embeddings.json`（本地 JSON 文件，不需要向量数据库）
- **自动化**：文章新增或修改时，`predev` / `prebuild` 脚本自动重建 embedding

**后端类比**：相当于 Elasticsearch 的语义检索。区别是我们用本地 JSON 文件代替了 ES 集群，用余弦相似度计算代替了 ES 的 kNN 查询。对 40 篇文章来说，这种方案足够了。

### 能力三：Supabase 评论 + 划线评注

读者可以对文章发表评论，也可以选中文章中的一段文字添加"划线评注"（类似 Medium 的 Highlight 功能）。

```
┌─────────────────────────────────┐
│         Supabase (PostgreSQL)    │
│                                 │
│  comments 表                    │
│  ├─ article_slug                │
│  ├─ user_name / user_avatar     │
│  ├─ content                     │
│  └─ created_at                  │
│                                 │
│  highlights 表                  │
│  ├─ article_slug                │
│  ├─ selected_text (选中的原文)   │
│  ├─ comment (评注内容)          │
│  ├─ start_offset / end_offset   │
│  └─ user_name                   │
│                                 │
│  chat_sessions 表               │
│  ├─ id / user_github_id         │
│  ├─ title / preview             │
│  └─ created_at / updated_at     │
│                                 │
│  chat_messages 表               │
│  ├─ session_id (→ chat_sessions)│
│  ├─ role (user / assistant)     │
│  ├─ content / contexts (jsonb)  │
│  └─ created_at                  │
│                                 │
│  todos 表                       │
│  ├─ id / title / description    │
│  ├─ status / priority / category│
│  └─ created_at / completed_at   │
│                                 │
│  认证：GitHub OAuth             │
└─────────────────────────────────┘
```

**为什么用 Supabase 不用自建数据库？**

- 免费 PostgreSQL 实例（500 MB 存储、50,000 月活用户）
- 内置 Auth 系统，GitHub OAuth 几行代码搞定
- 实时订阅（Realtime）：新评论自动推送，不需要轮询
- Row Level Security（RLS）：数据库层面的权限控制，前端直连也安全

**后端类比**：Supabase = Spring Data JPA + Spring Security + WebSocket 推送，但不需要你写 Controller/Service/DAO。

### 能力四：全文搜索（双模式）

文章列表页顶部有一个搜索框，支持两种搜索模式：

**客户端搜索（默认）：**
- 使用 **Fuse.js**（客户端模糊搜索库）
- 搜索范围：文章标题、摘要、标签
- 输入即搜索，不需要回车，不需要请求后端
- 支持模糊匹配（"typscrpt" 也能匹配到 "TypeScript"）

**服务端搜索 API（`/api/search`）：**
- Next.js API Route，支持 GET 请求
- 服务端读取所有文章内容进行全文匹配
- 适用于外部调用和更精确的内容搜索

**为什么不用 Elasticsearch？**

40 篇文章的搜索，在浏览器里用 Fuse.js 做毫秒级返回。引入 ES 是杀鸡用牛刀——需要额外的服务器、索引管理、同步机制，完全没必要。

**后端类比**：相当于把数据全部加载到内存里，用 `Stream.filter()` 搜索。数据量小的时候，这比任何搜索引擎都快。

### 能力五：阅读体验组件

除了基本的文章渲染，还做了几个增强阅读体验的组件：

| 组件 | 功能 | 后端类比 |
|------|------|----------|
| **TableOfContents** | 文章右侧目录导航，滚动高亮当前章节 | 类似 Javadoc 的侧边栏导航 |
| **ArticleProgress** | 顶部阅读进度条 | — |
| **ArticleNavigation** | 文章底部的"上一篇/下一篇" | 类似分页器 |
| **ArticleTags** | 标签展示和按标签筛选 | — |
| **NotebookLinks** | 关联的 Jupyter Notebook 链接 | — |
| **HighlightComments** | 选中文字添加评注 | — |

### 能力六：自动化脚本

```
scripts/
├── build-embeddings.ts    # 构建文章 embedding 向量
├── watch-articles.ts      # 监听文章变更，自动重建 embedding
├── sync-notes.ts          # 从技术笔记库同步文章到博客
├── convert-ai-brief.mjs   # AI 简报格式转换
└── fetch-ai-brief.sh      # 拉取 AI 简报数据
```

- `build-embeddings.ts`：读取所有 Markdown 文章 → 分块 → 调用 Qwen3-Embedding API → 保存为 `embeddings.json`
- `watch-articles.ts`：用 `fs.watch` 监听 `content/articles/` 目录变更，有新增或修改时自动触发 embedding 重建
- `sync-notes.ts`：从 `~/docs/tech-notes/` 同步文章到博客的 `content/articles/` 目录

**自动化链路**：

```
写文章 / 改文章
    │
    ▼
watch-articles.ts 检测到变更
    │
    ▼
build-embeddings.ts 重建向量
    │
    ▼
git push
    │
    ▼
Vercel 自动构建部署
    │
    ▼
线上博客更新，AI 助手的知识库也同步更新
```

---

## 四、技术选型决策记录

| 决策点 | 选了什么 | 没选什么 | 为什么 |
|--------|---------|---------|--------|
| 框架 | Next.js 14 | Gatsby / Hugo | 需要 SSR + API Routes，不是纯静态站 |
| 语言 | TypeScript | JavaScript | 后端工程师习惯类型系统 |
| 样式 | Tailwind CSS | CSS Modules / styled-components | 快速开发，不想写 CSS 文件 |
| 文章存储 | Markdown 文件 | 数据库 / CMS | Git 版本管理 + 编辑器友好 |
| 搜索 | Fuse.js | Algolia / Elasticsearch | 29 篇文章用不着外部搜索服务 |
| AI 对话 | Claude Sonnet 4.6 | GPT-4 / Qwen | 中文能力强，代码理解好 |
| Embedding | Qwen3-Embedding-8B | OpenAI text-embedding | 免费、中文优化、4096 维精度高 |
| 向量存储 | 本地 JSON | Pinecone / pgvector | 数据量小，不需要向量数据库 |
| 数据库 | Supabase | PlanetScale / 自建 PostgreSQL | 免费、内置 Auth、实时推送 |
| 部署 | Vercel | 阿里云 ECS / Netlify | Next.js 官方平台，零配置 |

**核心原则**：个人博客不需要企业级架构。能用文件就不用数据库，能在浏览器跑就不建后端服务，能免费就不花钱。

---

## 五、项目数据

| 指标 | 数值 |
|------|------|
| 文章分类 | 14 个 |
| 文章数量 | 40 篇 |
| React 组件 | 20 个 |
| API 接口 | 2 个（AI 聊天 + 搜索） |
| 数据库表 | 5 个（评论 + 划线 + 聊天会话 + 聊天消息 + 待办事项） |
| 自动化脚本 | 5 个 |

---

## 六、还想做的事

- [x] Vercel 部署上线（已完成，域名：java-to-fullstack-blog.vercel.app）
- [x] AI 助手聊天记录持久化（Supabase，登录用户跨设备同步）
- [x] GitHub OAuth 登录（Supabase Auth）
- [x] 全文搜索 API（/api/search）
- [ ] SEO 优化（sitemap、Open Graph）
- [ ] RSS 订阅
- [ ] 暗色模式
- [ ] 文章阅读数据统计
- [ ] 基于阅读历史的智能推荐
- [ ] 国际化（中英双语）
- [ ] AI 助手外网 API 接入（当前内网代理外网不可达）

---

## 最后

这个博客项目的源码在 [GitHub](https://github.com/Mcluo/java-to-fullstack-blog) 上，欢迎参考。

如果你也是后端工程师想搭自己的技术博客，这个项目可以作为一个起点——它展示了一个 Java 工程师如何用 Next.js + TypeScript + AI 构建一个完整的全栈应用，所有技术选型都是从"后端工程师怎么快速上手"的角度出发的。
