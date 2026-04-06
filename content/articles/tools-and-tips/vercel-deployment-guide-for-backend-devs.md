---
title: "写给后端的 Vercel 指南 — 前端部署原来可以这么简单"
excerpt: "用后端工程师熟悉的概念讲清楚 Vercel 是什么：零运维的前端部署平台，Git push 即部署，Serverless Functions 替代传统后端，全球 CDN 自动加速。看完你就知道为什么前端同事再也不找你配 Nginx 了。"
category: "tools-and-tips"
tags: ["Vercel", "部署", "Next.js", "Serverless", "前端工程化"]
publishedAt: "2026-04-07"
readTime: 10
---

## 一句话解释

**Vercel 就是前端界的"宝塔面板 + 阿里云 + CI/CD"三合一**，但比它们加起来还简单。

你把 GitHub 仓库连上去，每次 `git push`，它就自动帮你：构建 → 部署 → 分配域名 → 配 HTTPS → 全球 CDN 分发。整个过程不需要你碰任何服务器。

---

## 为什么后端需要了解 Vercel

作为后端工程师，你可能觉得"部署不就是打包丢到服务器上吗"。但前端部署和后端有本质区别：

| | 后端部署（你熟悉的） | 前端部署（Vercel 做的） |
|---|---|---|
| 产物 | JAR/WAR，需要 JVM 运行 | HTML/CSS/JS 静态文件，浏览器直接运行 |
| 运行时 | 需要长驻进程（Tomcat/Nginx） | 大部分是静态文件，不需要进程 |
| 服务器 | 必须有（ECS/Docker） | **可以没有**（CDN 直接分发静态文件） |
| API 接口 | Spring Boot 处理 | Serverless Functions（按请求计费，不需要常驻服务器） |
| 扩容 | 手动加机器或配 K8s | **自动**（CDN + Serverless 天然弹性） |

所以前端部署的核心问题不是"怎么跑服务"，而是"怎么把静态文件快速分发到全球"。Vercel 就是解决这个问题的。

---

## Vercel 的核心能力

### 1. Git 驱动部署（最核心的功能）

连接 GitHub 仓库后，Vercel 会监听每一次 push：

```
git push origin main
    │
    ▼ Vercel 自动触发
    ├─ 1. 拉取代码
    ├─ 2. 安装依赖 (npm install)
    ├─ 3. 构建项目 (npm run build)
    ├─ 4. 部署到全球 CDN
    └─ 5. 分配 URL，HTTPS 自动配好

整个过程 30 秒 ~ 2 分钟
```

**类比**：相当于你配了一个 Jenkins Pipeline，监听 Git webhook，自动打包 + 部署到阿里云 SLB + CDN。但你一行配置都不用写。

### 2. 预览部署（Preview Deployments）

每个 Git 分支或 PR 都会自动生成一个独立的预览环境：

```
main 分支       → https://your-app.vercel.app          (生产环境)
feature/login  → https://your-app-abc123.vercel.app    (预览环境)
fix/bug-42     → https://your-app-def456.vercel.app    (预览环境)
```

**类比**：相当于每个分支自动部署一套日常环境。后端用 Aone 做这件事需要配流水线、申请机器、配路由——Vercel 自动完成。

PR 里还会自动贴上预览链接，Code Review 时可以直接点开看效果。

### 3. Serverless Functions

Next.js 项目里的 `src/app/api/` 目录下的文件，会自动变成 Serverless 函数：

```
你写的代码：
src/app/api/chat/route.ts     →  https://your-app.vercel.app/api/chat

Vercel 做的事：
1. 把这个文件打包成一个独立的函数
2. 部署到全球多个节点
3. 有请求来了才启动，处理完就释放
4. 按调用次数计费，没有请求就不花钱
```

**类比**：相当于阿里云函数计算（FC）。你写一个 Java 方法，不需要 Tomcat，有请求来了云平台帮你启动 JVM、调用方法、返回结果。区别是 Vercel 的 Serverless 用 Node.js 运行，冷启动更快。

```typescript
// src/app/api/hello/route.ts
// 这就是一个完整的"后端接口"，不需要 Spring Boot
export async function GET() {
  return Response.json({ message: "Hello from Vercel!" });
}

export async function POST(request: Request) {
  const body = await request.json();
  // 调用数据库、第三方 API 等
  return Response.json({ received: body });
}
```

### 4. 全球边缘网络（Edge Network）

Vercel 在全球有 100+ 个边缘节点（类似阿里云 CDN 节点）：

```
用户在东京访问你的博客
    │
    ▼
    ├─ 静态页面 → 直接从东京节点返回（< 50ms）
    ├─ API 请求 → 在最近的节点执行 Serverless 函数
    └─ 不需要你配任何 CDN 规则
```

**类比**：相当于你同时用了阿里云 CDN（加速静态资源）+ 全球多 Region 部署（就近处理 API 请求）。在后端世界要实现这套架构，至少要搞 CDN + 多地域 K8s + 全球负载均衡。

---

## Vercel vs 你熟悉的部署方式

### 传统方式部署一个博客

```
1. 买一台 ECS（每月 50-200 元）
2. 装 Node.js、Nginx
3. 配 Nginx 反向代理 + HTTPS 证书（Let's Encrypt）
4. 写部署脚本（git pull → npm build → 重启 pm2）
5. 配 CI/CD（GitHub Actions / Jenkins）
6. 配 CDN（可选，又要花钱）
7. 运维：磁盘满了、证书过期了、被攻击了...
```

### Vercel 部署同一个博客

```
1. 打开 vercel.com，用 GitHub 登录
2. 点 "Import Project"，选你的仓库
3. 点 "Deploy"
4. 完成。以后 git push 自动部署
```

没有第 5 步。

---

## Vercel 的定价模型

| | Hobby（免费） | Pro（$20/月） | Enterprise |
|---|---|---|---|
| 带宽 | 100 GB/月 | 1 TB/月 | 自定义 |
| Serverless 调用 | 100 GB-hrs | 1000 GB-hrs | 自定义 |
| 构建时长 | 6000 分钟/月 | 24000 分钟/月 | 自定义 |
| 自定义域名 | 支持 | 支持 | 支持 |
| 团队协作 | 不支持 | 支持 | 支持 |
| 适合 | 个人博客、Side Project | 商业项目 | 大型企业 |

**个人博客用免费版完全够了**。100 GB 带宽大概能支撑每月几万次访问。

---

## Vercel 和其他平台的对比

| 平台 | 定位 | 优势 | 劣势 |
|---|---|---|---|
| **Vercel** | Next.js 官方部署平台 | Next.js 零配置、预览部署、Edge Functions | 锁定 Next.js 生态 |
| **Netlify** | 静态站 + JAMstack | 表单处理、身份认证内置 | Serverless 函数功能弱一些 |
| **Cloudflare Pages** | 边缘优先 | 免费额度大、Workers 生态 | 构建速度较慢 |
| **GitHub Pages** | 纯静态站 | 完全免费 | 不支持 SSR、没有 Serverless |
| **阿里云 FC + OSS** | 国内部署 | 国内访问快、合规 | 配置复杂、需要备案 |

**选 Vercel 的理由**：如果你用 Next.js，Vercel 就是最佳选择——Next.js 是 Vercel 公司开发的，两者深度集成，零配置。

---

## Vercel 的技术原理（后端视角）

既然是写给后端的，讲一下 Vercel 底层做了什么：

### 构建阶段

```
你的 Next.js 项目
    │
    ▼ npm run build
    ├─ 页面组件 → 预渲染为 HTML 静态文件（SSG）
    ├─ 动态页面 → 打包为 Serverless 函数（SSR）
    ├─ API Routes → 打包为独立 Serverless 函数
    ├─ 图片/CSS/JS → 静态资源，上传到 CDN
    └─ 路由表 → 生成边缘路由规则
```

### 请求处理

```
用户请求 https://your-blog.vercel.app/articles/sse-guide
    │
    ▼ Vercel Edge Network（最近的边缘节点）
    ├─ 匹配路由规则
    ├─ 如果是静态页面 → 直接从 CDN 缓存返回（快）
    ├─ 如果是 SSR 页面 → 调用 Serverless 函数渲染（稍慢）
    ├─ 如果是 API → 调用对应的 Serverless 函数
    └─ 如果是静态资源 → CDN 直接返回（最快）
```

**类比**：就像 Nginx 的 `location` 路由 + 反向代理 + 静态文件服务，但全自动配置、全球分布。

### Serverless 冷启动

后端同学关心的一个问题：Serverless 函数首次调用有冷启动延迟。

```
第一次请求 → 冷启动（100-500ms，初始化运行时）→ 执行函数 → 返回结果
后续请求 → 直接执行（函数实例被复用）→ 返回结果
空闲一段时间 → 实例被回收 → 下次又要冷启动
```

Vercel 的 Node.js 函数冷启动通常在 100-300ms，比 Java Lambda（动辄几秒）快很多。对博客这种场景几乎感受不到。

---

## 实际部署流程（以这个博客为例）

以我的 `java-to-fullstack-blog` 项目为例，部署步骤：

### Step 1：注册并连接 GitHub

1. 打开 [vercel.com](https://vercel.com)
2. 用 GitHub 账号登录
3. 授权 Vercel 访问你的仓库

### Step 2：导入项目

1. 点击 "Add New Project"
2. 选择 `Mcluo/java-to-fullstack-blog` 仓库
3. Vercel 自动识别这是 Next.js 项目，框架、构建命令、输出目录全自动填好

### Step 3：配置环境变量

在 Vercel 面板的 Settings → Environment Variables 中添加：

```
ANTHROPIC_API_KEY=sk-ant-xxx        # AI 助手需要的 Claude API Key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # 评论系统
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx   # Supabase 公钥
```

**类比**：就像你在 Spring Boot 的 `application-prod.yml` 里配数据库连接一样，只是 Vercel 在网页上配。

### Step 4：点击 Deploy

点一下，等 1-2 分钟，你的博客就上线了。

以后每次 `git push origin main`，Vercel 自动重新构建部署，完全不需要手动操作。

---

## 什么时候不该用 Vercel

Vercel 不是万能的，这些场景不适合：

| 场景 | 原因 | 替代方案 |
|---|---|---|
| 需要长驻进程（WebSocket 服务器） | Serverless 函数有执行时长限制 | 传统服务器 / ECS |
| 大量计算任务（视频转码、ML 推理） | Serverless 资源有限 | 专用计算实例 |
| 国内用户为主 | Vercel 在国内没有节点，速度慢 | 阿里云 FC + OSS + CDN |
| 需要关系数据库直连 | Serverless 不适合连接池管理 | 用 Supabase/PlanetScale 等云数据库 |
| 合规要求（数据必须在国内） | Vercel 数据在海外 | 国内云服务商 |

---

## 一句话总结

**Vercel = GitHub 自动部署 + 全球 CDN + Serverless 函数 + 免费 HTTPS，专为前端项目（尤其是 Next.js）设计，让你像 `git push` 一样简单地上线网站。**

对后端工程师来说，理解 Vercel 最关键的一点是：**前端项目的部署本质上是"分发静态文件 + 按需执行少量服务端逻辑"，不需要传统意义上的"服务器"**。一旦想通了这一点，Vercel 的所有设计决策都顺理成章了。
