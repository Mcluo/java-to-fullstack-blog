# 安装部署指南

> 面向零基础迁移用户，从环境准备到全功能跑通，一步不漏。

---

## 目录

- [环境准备](#环境准备)
- [一键部署](#一键部署)
- [API 密钥申请](#api-密钥申请)
- [Supabase 数据库配置](#supabase-数据库配置)
- [功能验证](#功能验证)
- [常见问题](#常见问题)
- [可选功能配置](#可选功能配置)

---

## 环境准备

### 1. 安装 Node.js 20+

**macOS (推荐用 nvm 管理版本):**

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 重启终端后
nvm install 20
nvm use 20

# 验证
node -v  # 应输出 v20.x.x
npm -v   # 应输出 9.x.x 或 10.x.x
```

**或直接下载安装包:** https://nodejs.org/en/download (选 LTS 版本)

**Windows:**
- 下载 https://nodejs.org/ LTS 安装包
- 或用 winget: `winget install OpenJS.NodeJS.LTS`

### 2. 安装 Git

```bash
# macOS (大概率已有)
git --version

# 如果没有，安装 Xcode Command Line Tools
xcode-select --install
```

**Windows:** https://git-scm.com/download/win

### 3. 安装 Bun (可选，加速 Embedding 构建)

```bash
curl -fsSL https://bun.sh/install | bash
```

没有 Bun 也能跑，脚本会自动 fallback 到 `npx tsx`。

---

## 一键部署

```bash
# 克隆项目
git clone https://github.com/Mcluo/java-to-fullstack-blog.git
cd java-to-fullstack-blog

# 运行一键部署脚本
bash setup.sh
```

脚本会交互式引导你填入 API 密钥。如果暂时没有某个 Key，直接按回车跳过即可。

**手动部署（如果不想用脚本）：**

```bash
npm install
cp .env.example .env.local
# 手动编辑 .env.local 填入密钥
npm run build:embeddings
npm run dev
```

---

## API 密钥申请

### 1. Claude API Key（必须 - AI 对话功能）

Claude API 用于博客内置的 AI 对话助手。

**申请步骤：**

1. 打开 https://console.anthropic.com/
2. 注册账号（需要海外手机号或邮箱验证）
3. 进入 Dashboard → **API Keys**
4. 点击 **Create Key**，复制生成的 `sk-ant-...` 开头的密钥

**填入 .env.local：**
```env
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CHAT_MODEL=claude-sonnet-4-6
```

**阿里内部员工替代方案：**
```env
ANTHROPIC_BASE_URL=https://1688openai.alibaba-inc.com/api/anthropic
ANTHROPIC_API_KEY=你的内部token
```

**费用：** 注册送 $5 额度，个人博客用量每月约 $1-3。

---

### 2. ModelScope Token（必须 - RAG 向量搜索）

ModelScope 提供免费的 Embedding 模型 API，用于将文章转为向量，实现语义搜索。

**申请步骤：**

1. 打开 https://modelscope.cn/
2. 点击右上角注册/登录（支持支付宝、GitHub）
3. 登录后点击右上角头像 → **API Inference**
4. 或直接访问 https://modelscope.cn/my/myaccesstoken
5. 点击 **创建新的 Access Token**
6. 名称随便填，权限选"读取"即可
7. 复制 `ms-` 开头的 Token

**填入 .env.local：**
```env
EMBEDDING_API_KEY=ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EMBEDDING_API_BASE=https://api-inference.modelscope.cn/v1
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-8B
```

**费用：** 完全免费，有速率限制但个人博客绰绰有余。

**配置完成后构建索引：**
```bash
npm run build:embeddings
```

首次构建约 1-3 分钟（取决于文章数量），之后文章变更会自动重建。

---

### 3. Supabase（可选 - 评论 / 聊天记录 / Todo）

Supabase 是免费的云端 PostgreSQL 数据库，用于持久化存储。

**不配置的影响：** 博客正常使用，但评论、AI 聊天记录、待办事项不会保存。

**申请步骤：**

1. 打开 https://supabase.com/
2. 点击 **Start your project** → 用 GitHub 登录
3. 点击 **New Project**
   - Organization: 选默认的或新建一个
   - Project Name: 随意，如 `my-blog`
   - Database Password: 设一个密码（记住，后续可能用到）
   - Region: 选 `Northeast Asia (Tokyo)` 或离你最近的
4. 等待约 1 分钟，项目创建完成

**获取 URL 和 Key：**

1. 进入项目 Dashboard
2. 左侧菜单 → **Settings** → **API**
3. 复制：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...` 开头的长字符串

**初始化数据库表：**

1. 左侧菜单 → **SQL Editor**
2. 点击 **New Query**
3. 将项目中 `supabase/schema.sql` 的全部内容粘贴进去
4. 点击 **Run** 执行
5. 应该看到 "Success. No rows returned" 表示成功

**填入 .env.local：**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**费用：** 免费版额度: 500MB 数据库 + 5GB 带宽 + 50MB 文件存储，个人博客完全够用。

---

### 4. Groq API Key（可选 - 视频转录）

Groq 提供免费的 Whisper 语音识别 API，用于将 B 站等视频转录为文字。

**不配置的影响：** 视频转录脚本不可用，其他功能不受影响。

**申请步骤：**

1. 打开 https://console.groq.com/
2. 用 Google 或 GitHub 账号登录
3. 左侧 → **API Keys**
4. 点击 **Create API Key**
5. 复制 `gsk_...` 开头的密钥

**填入 .env.local：**
```env
GROQ_API_KEY=gsk_xxxxx
```

**费用：** 完全免费，每日限额约 14,400 请求。

---

## Supabase 数据库配置

> 如果你选择不用 Supabase，跳过此节。

### schema.sql 包含的表

| 表名 | 用途 |
|------|------|
| `comments` | 文章评论 |
| `highlights` | 划线评论（选中文字评论） |
| `chat_sessions` | AI 聊天会话列表 |
| `chat_messages` | AI 聊天消息内容 |
| `todos` | 待办事项 |

### 验证数据库是否初始化成功

在 Supabase Dashboard → **Table Editor** 中应能看到上述 5 张表。

### RLS 安全策略说明

schema.sql 默认开启 Row Level Security 且允许匿名读写。这对个人博客是安全的：
- anon key 是前端公开的，但只能执行 policy 允许的操作
- 如需更严格控制（如只允许登录用户评论），可自行修改 policy

---

## 功能验证

部署完成后逐项检查：

```bash
# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 ，逐项验证：

| 功能 | 如何验证 | 依赖 |
|------|----------|------|
| 文章列表和阅读 | 首页能看到文章卡片，点击可阅读 | 无 |
| RSS 订阅中心 | 导航栏"订阅"页面有内容 | 无 |
| AI 对话 | 文章页右下角 AI 按钮，能对话 | Claude Key |
| RAG 搜索 | AI 对话中提问文章相关问题，回答引用文章内容 | Claude Key + ModelScope Token |
| 评论 | 文章底部可发表评论 | Supabase |
| 聊天记录 | 刷新页面后 AI 对话历史还在 | Supabase |

---

## 常见问题

### Q: `npm install` 报错 node 版本不兼容

```
确保 node -v 输出 v20.x.x 或更高
如果用 nvm: nvm use 20
```

### Q: `build:embeddings` 报错 401 Unauthorized

ModelScope Token 无效或过期，重新去 https://modelscope.cn/my/myaccesstoken 生成。

### Q: `build:embeddings` 报错 429 Too Many Requests

ModelScope 免费版有速率限制，等 1 分钟重试：
```bash
npm run build:embeddings
```

### Q: AI 对话报错 "API key not valid"

检查 `.env.local` 中：
- `ANTHROPIC_API_KEY` 是否正确（`sk-ant-` 开头）
- `ANTHROPIC_BASE_URL` 是否匹配你的 key（官方 key 用官方 URL）

### Q: 评论发送后看不到

1. 检查浏览器控制台有无报错
2. 确认 Supabase URL 和 Key 填写正确
3. 确认 `supabase/schema.sql` 已执行

### Q: `npm run dev` 端口被占用

```bash
# 杀掉占用 3000 端口的进程
lsof -ti:3000 | xargs kill -9

# 或指定其他端口
PORT=3001 npm run dev
```

### Q: Windows 下 setup.sh 跑不了

用 Git Bash 运行，或手动按"手动部署"步骤操作：
```bash
# 在 Git Bash 中
bash setup.sh

# 或使用 WSL
wsl bash setup.sh
```

### Q: 文章内容是空的 / 看不到文章

文章存放在 `content/articles/` 目录下，克隆时已包含。如果为空检查 git clone 是否完整。

### Q: 想更换 AI 模型

编辑 `.env.local`：
```env
CHAT_MODEL=claude-sonnet-4-6    # 默认
CHAT_MODEL=claude-haiku-4-5-20251001   # 更快更便宜
CHAT_MODEL=claude-opus-4-6      # 更强但更贵
```

---

## 可选功能配置

### 个人笔记同步

将你本地的 Markdown 笔记同步到博客"学习笔记"板块：

```env
# .env.local
NOTES_DIRS=~/notes,~/Documents/tech-notes
```

```bash
npm run sync-notes
```

### RSS Feed 刷新

手动拉取最新订阅源内容：

```bash
npm run fetch:feeds
```

### Hacker News 日报

拉取 HN 热门文章的 AI 摘要：

```bash
npm run fetch:hn
```

### 文章变更监听（开发时）

自动监听文章文件变更并重建 Embedding：

```bash
npm run watch:articles
```

### 部署到 Vercel（生产环境）

1. 在 https://vercel.com/ 导入 GitHub 仓库
2. 在 Vercel 项目 Settings → Environment Variables 中添加 `.env.local` 中的所有变量
3. 部署会自动触发

注意：Vercel 环境下 `build:embeddings` 会在 prebuild 中自动跳过（由 CI 环境标记控制），需要在本地构建后提交 `src/lib/embeddings.json`，或在 Vercel 中配置 Embedding API 让构建时生成。

---

## 完整 .env.local 示例

```env
# === 必填 ===
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CHAT_MODEL=claude-sonnet-4-6

EMBEDDING_API_KEY=ms-xxxxx
EMBEDDING_API_BASE=https://api-inference.modelscope.cn/v1
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-8B

# === 可选 ===
NOTES_DIRS=~/notes

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

GROQ_API_KEY=gsk_xxxxx
```

---

## 技术架构速览

```
┌─────────────────────────────────────────────┐
│                  Next.js 14                   │
├──────────┬──────────┬───────────┬───────────┤
│ 文章系统  │ AI 助手   │  订阅中心  │  行情模块  │
│ MDX渲染  │ Claude   │  RSS解析  │  数据展示  │
├──────────┴──────────┴───────────┴───────────┤
│              RAG Pipeline                     │
│  文章→分块→Embedding→向量搜索→上下文注入      │
├─────────────────────────────────────────────┤
│           Supabase (PostgreSQL)              │
│     评论 │ 聊天记录 │ 待办事项                │
└─────────────────────────────────────────────┘
```

---

**有问题？** 检查 `ARCHITECTURE.md` 了解项目结构，或在 GitHub Issues 中提问。
