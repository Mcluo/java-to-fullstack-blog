# Java 工程师全栈+AI 转型博客 - 技术架构设计

## 项目概述

这是一个专门帮助 Java 工程师转型为全栈+AI 工程师的教程博客网站。

## 技术栈选择

### 前端技术栈
- **框架**: Next.js 14 (App Router)
  - 理由：支持 SSR/SSG，SEO 友好，开发体验好
  - 内置 API Routes，减少额外后端复杂度
- **语言**: TypeScript
  - 为 Java 工程师提供类型安全的熟悉感
- **UI 框架**: Tailwind CSS + shadcn/ui
  - 快速开发，组件化设计
- **Markdown 渲染**: next-mdx-remote
  - 支持代码高亮、自定义组件
- **搜索**: Algolia 或本地 Fuse.js
  - 快速文章搜索和过滤

### 后端技术栈
- **方案**: Next.js API Routes + Serverless Functions
  - 简化架构，无需单独后端服务
- **数据库**: PostgreSQL (Supabase)
  - 关系型数据库，Java 工程师熟悉
  - Supabase 提供实时功能和认证
- **ORM**: Prisma
  - TypeScript 原生，类型安全
  - 迁移管理简单

### AI 功能技术栈
- **Chat 模型**: Claude Sonnet 4.6（通过内部代理）
  - 流式 SSE 输出，AI 学习助手问答
- **Embedding 模型**: Qwen3-Embedding-8B（ModelScope 免费 API）
  - 4096 维向量，中文语义优化
- **RAG 检索**: 本地 JSON + 余弦相似度
  - 文章分块（1000 字/块，200 字重叠）→ 向量化 → 运行时 top-5 检索
  - 同一文章最多取 2 个 chunk，防止单篇垄断
- **System Prompt 三层架构**:
  - 基础角色定义 + 动态文章目录（元数据层）+ RAG 上下文（内容层）
- **自动化**: 文章变更时自动重建 embedding（predev/prebuild + watch）
- **搜索**: Fuse.js 客户端模糊搜索（实时输入即搜索）

### DevOps
- **部署**: Vercel
  - 自动 CI/CD
  - 边缘网络加速
- **版本控制**: Git + GitHub
- **监控**: Vercel Analytics

## 核心功能列表

### 1. 文章管理
- [x] Markdown 文章存储
- [x] Frontmatter 元数据（标题、分类、标签、难度、日期）
- [x] 代码高亮（支持多语言）
- [ ] 文章评论系统

### 2. 内容组织
- [x] 学习路径（初级/中级/高级）
- [x] 分类系统
  - 前端技术（React、TypeScript、CSS）
  - 后端技术（Node.js、数据库、API）
  - AI 技术（Python、ML、LangChain）
  - DevOps（Docker、CI/CD、云服务）
  - 项目实战
- [x] 标签系统
- [x] 难度标记

### 3. 搜索和过滤
- [ ] 全文搜索
- [ ] 按分类过滤
- [ ] 按标签过滤
- [ ] 按难度过滤
- [ ] 语义搜索（AI 增强）

### 4. 学习追踪
- [ ] 用户登录（可选）
- [ ] 阅读进度保存
- [ ] 学习路径推荐
- [ ] 收藏功能

### 5. AI 功能
- [x] RAG 知识库问答（基于文章内容向量检索）
- [x] 学习助手聊天机器人（Claude Sonnet 4.6 + 流式输出）
- [x] 动态文章目录注入（解决元数据查询）
- [x] 文章变更自动重建 embedding
- [ ] 智能文章推荐（基于阅读历史）
- [ ] 学习路径个性化

## 项目目录结构

```
java-to-fullstack-blog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 首页
│   │   ├── articles/          # 文章列表和详情页
│   │   ├── roadmap/           # 学习路径页
│   │   ├── api/               # API Routes
│   │   │   ├── articles/      # 文章 API
│   │   │   ├── search/        # 搜索 API
│   │   │   └── chat/          # AI 聊天 API
│   │   └── layout.tsx         # 根布局
│   ├── components/            # React 组件
│   │   ├── ui/               # 基础 UI 组件
│   │   ├── article/          # 文章相关组件
│   │   ├── roadmap/          # 路径图组件
│   │   └── chat/             # 聊天组件
│   ├── lib/                   # 工具函数
│   │   ├── articles.ts       # 文章读取和分类
│   │   ├── rag.ts            # RAG 检索模块（余弦相似度 + context 构建）
│   │   ├── embeddings.json   # 向量数据（构建时生成，gitignore）
│   │   └── progress.ts       # 学习进度
│   └── styles/               # 全局样式
├── content/                   # Markdown 文章内容
│   └── articles/             # 按分类组织
│       ├── frontend/
│       ├── backend/
│       ├── ai/
│       ├── devops/
│       └── projects/
├── prisma/                    # 数据库 schema
│   └── schema.prisma
├── public/                    # 静态资源
│   └── images/
├── docs/                      # 项目文档
│   ├── ARCHITECTURE.md       # 本文档
│   └── API.md                # API 文档
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## 数据模型设计

### Article（文章）
```prisma
model Article {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  excerpt     String
  content     String   @db.Text
  category    String
  tags        String[]
  difficulty  String   // beginner, intermediate, advanced
  readTime    Int      // 阅读时间（分钟）
  publishedAt DateTime
  updatedAt   DateTime @updatedAt
  embedding   Float[]  // 向量 embeddings（语义搜索）
}
```

### UserProgress（学习进度）
```prisma
model UserProgress {
  id         String   @id @default(cuid())
  userId     String
  articleId  String
  completed  Boolean  @default(false)
  bookmark   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## 学习路径设计

### 初级路线（1-2 个月）
1. JavaScript/TypeScript 基础
2. React 入门
3. Node.js 基础
4. 第一个全栈项目

### 中级路线（3-4 个月）
1. React 高级特性
2. 数据库设计
3. RESTful API 最佳实践
4. 前端工程化
5. Python 基础
6. 全栈项目实战

### 高级路线（5-6 个月）
1. 性能优化
2. 微服务架构
3. 机器学习入门
4. LangChain 和 RAG
5. AI 驱动的全栈应用

## 开发阶段

### Phase 1: 基础搭建（完成）
- [x] 项目初始化
- [x] 技术栈选型
- [x] 架构设计

### Phase 2: 前端开发
- [ ] Next.js 项目搭建
- [ ] 基础组件开发
- [ ] 文章渲染系统
- [ ] 响应式布局

### Phase 3: 后端开发
- [ ] 数据库设计
- [ ] API 开发
- [ ] 文章管理接口

### Phase 4: 内容编写
- [ ] 核心教程文章（10+ 篇）
- [ ] 代码示例
- [ ] 项目案例

### Phase 5: AI 功能集成
- [x] RAG 向量检索知识库
- [x] AI 学习助手（Claude + 流式输出）
- [x] 文章 embedding 自动化构建
- [ ] 智能推荐

### Phase 6: 部署和优化
- [ ] Vercel 部署
- [ ] SEO 优化
- [ ] 性能优化
- [ ] 监控和分析

## 技术亮点

1. **对 Java 工程师友好**
   - TypeScript 类型系统
   - 结构化项目组织
   - 熟悉的概念映射

2. **现代化全栈架构**
   - SSR/SSG 混合渲染
   - Serverless 架构
   - 类型安全的端到端开发

3. **AI 原生体验**
   - RAG 向量检索：基于 Qwen3-Embedding-8B 将文章内容向量化，用户提问时检索最相关片段注入 Claude 上下文
   - System Prompt 三层架构：角色定义 + 文章目录（元数据）+ RAG 上下文（内容），覆盖所有问题类型
   - 防幻觉设计：检索到内容时引用来源，无相关内容时明确告知
   - 实时搜索：Fuse.js 客户端模糊匹配，输入即搜索
   - 文章变更自动化：predev/prebuild 自动重建 embedding，watch 模式实时监听

4. **可扩展性**
   - 模块化设计
   - 清晰的关注点分离
   - 易于添加新功能

## 参考资源

- Next.js 文档: https://nextjs.org/docs
- Supabase 文档: https://supabase.com/docs
- LangChain.js: https://js.langchain.com/
- shadcn/ui: https://ui.shadcn.com/
