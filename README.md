# Java 工程师全栈+AI 转型博客

一个专门帮助 Java 工程师转型为全栈开发工程师和 AI 工程师的教程博客平台。

## 🎯 项目目标

帮助 Java 工程师系统地学习：
- 🎨 **前端技术**: React、TypeScript、Next.js、Tailwind CSS
- 🔧 **后端扩展**: Node.js、数据库设计、API 最佳实践
- 🤖 **AI 技术**: Python、机器学习、LangChain、RAG 应用
- 🚀 **DevOps**: Docker、CI/CD、云服务部署

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **数据库**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **AI**: LangChain.js + Model Studio
- **部署**: Vercel

## 📚 学习路径

### 初级 (1-2 个月)
- JavaScript/TypeScript 基础
- React 核心概念
- Node.js 入门
- 第一个全栈项目

### 中级 (3-4 个月)
- React 高级特性和性能优化
- 数据库设计和 ORM
- RESTful API 最佳实践
- Python 基础

### 高级 (5-6 个月)
- 微服务架构
- 机器学习基础
- LangChain 和 RAG 应用
- AI 驱动的全栈项目

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
DATABASE_URL="your-supabase-database-url"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
OPENAI_API_KEY="your-ai-api-key"
```

### 初始化数据库

```bash
npm run db:push
```

### 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 📖 文章编写

文章使用 Markdown 格式，存放在 `content/articles/` 目录下。

### 文章模板

```markdown
---
title: "文章标题"
excerpt: "文章摘要"
category: "frontend" # frontend, backend, ai, devops, projects
tags: ["react", "typescript"]
difficulty: "beginner" # beginner, intermediate, advanced
publishedAt: "2026-03-22"
readTime: 15
notebook: "tutorial.ipynb" # 可选：关联的 Jupyter Notebook
---

# 文章内容

## 章节 1

内容...

\`\`\`typescript
// 代码示例
const example = "hello";
\`\`\`
```

### Jupyter Notebook 集成

文章可以关联 Jupyter Notebook，让读者在云端运行代码。详见 [JUPYTER_INTEGRATION.md](./JUPYTER_INTEGRATION.md)

**快速使用**：
1. 在 `public/notebooks/` 创建 `.ipynb` 文件
2. 在文章 frontmatter 添加 `notebook: "filename.ipynb"`
3. 自动显示 Google Colab、Binder、GitHub 链接

## 📂 目录结构

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🤝 贡献

欢迎提交文章、改进建议或 Bug 报告！

## 📄 许可

MIT License

## 🔗 相关链接

- [项目架构文档](./ARCHITECTURE.md)
- [学习地图文档](./LEARNING_MAP.md)
- [概念索引](./CONCEPTS.md)
- [Jupyter Notebook 集成指南](./JUPYTER_INTEGRATION.md)
- [AI 助手配置指南](./AI_SETUP.md)
- [Next.js 文档](https://nextjs.org/docs)
