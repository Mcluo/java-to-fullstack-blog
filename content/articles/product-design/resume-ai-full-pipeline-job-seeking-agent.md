---
title: "从零构建 AI 求职全链路助手 — ResumeAI 产品设计与技术实现"
excerpt: "一个人 + Claude Code，两天做出完整的 AI 求职助手：对话式建简历、JD 智能匹配、一键 STAR 优化、ATS 兼容性检查、面试题生成。完整记录产品设计思路、架构决策和关键技术实现。"
category: "product-design"
tags: ["AI", "Next.js", "Claude", "resume", "product-design", "full-stack"]
publishedAt: "2026-04-08"
readTime: 18
---

## 为什么做这个

每年金三银四，朋友找我帮忙改简历。我发现大家遇到的问题高度相似：

1. **没有现成简历**——很多人上一次更新简历还是三年前
2. **不知道怎么写亮点**——"我就是写了个 CRUD 啊"
3. **和 JD 对不上**——投十份简历用同一版，石沉大海
4. **过不了 ATS**——格式花哨但机器读不懂
5. **面试不知道准备什么**——临时抱佛脚效率低

市面上的简历工具要么只做模板（Canva、超级简历），要么只做优化（Kickresume AI），没有一个覆盖**从建简历到面试准备**的全链路方案。

所以我决定自己做一个。

---

## 产品设计：六步全链路

ResumeAI 不是一个简历模板工具，它是一个**全链路求职 AI Agent**——从简历创建到面试准备，每一步都由 AI 驱动。

<img src="/images/resume-ai/resume-ai-pipeline.svg" alt="ResumeAI 六步全链路求职流水线：简历录入（含对话式建立）→ 简历编辑 → JD 分析 → 匹配优化 → ATS 检查 → 面试准备" style="max-width:100%;margin:1.5em 0;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" />

六步拆解：

| 步骤 | 功能 | AI 做了什么 |
|------|------|------------|
| 1. 简历录入 | 上传/粘贴/对话建立 | 解析非结构化文本为 JSON，或通过多轮对话引导收集信息 |
| 2. 简历编辑 | 结构化编辑器 + 实时预览 | 提供编辑框架，用户自由修改 |
| 3. JD 分析 | 粘贴岗位描述 | 提取必需技能、加分技能、关键词、核心职责 |
| 4. 匹配优化 | 匹配度评分 + 一键优化 | 对比简历和 JD，用 STAR 方法重写工作亮点，自然融入关键词 |
| 5. ATS 检查 | 格式/关键词/内容三维评分 | 模拟 ATS 系统检查兼容性，给出具体修改建议 |
| 6. 面试准备 | 生成面试题 + 参考答案 | 基于简历和 JD 生成行为/技术/情景三类面试题 |

核心设计原则：**数据贯穿全流程**。简历不是一次性输出，而是随着 JD 匹配和优化不断迭代的"活文档"。

---

## 核心创新：对话式建简历

这是 ResumeAI 最有意思的功能——**没有简历？没关系，我们聊出来**。

### 为什么不只做表单

传统方式让用户填一堆输入框：姓名、邮箱、公司1、职位1、时间1、亮点1……

问题在于：
- 表单太长，用户看到就退了
- 用户不知道"亮点"该写什么
- 无法追问量化数据

对话式的优势：

| 维度 | 表单模式 | 对话模式 |
|------|---------|---------|
| 用户负担 | 一次看到 20+ 字段 | 每次只回答 1-2 个问题 |
| 信息质量 | 用户自己写，容易泛泛而谈 | AI 主动追问："带了几个人？提升了多少？" |
| 跳过机制 | 必填字段阻塞 | 说"跳过"即可 |
| 体验感受 | 填表 | 和专业顾问聊天 |

<img src="/images/resume-ai/resume-ai-chat-flow.svg" alt="对话式简历构建流程：用户输入 → 前端追加消息 → AI 引导追问 → 多轮循环 → 生成 ResumeData → 跳转编辑器" style="max-width:100%;margin:1.5em 0;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" />

### 对话流程设计

AI 按照以下顺序引导（来源于专利系统的对话引导经验）：

```
Round 1: 基本信息（姓名、联系方式、求职意向）
Round 2-N: 工作经历（逐段收集，"还有更多吗？"）
Round N+1: 教育经历
Round N+2: 项目经历（可选）
Round N+3: 技能特长
Final: 确认总结 → 生成完整 ResumeData
```

关键 Prompt 设计原则：
1. **一次只问 1-2 个问题** —— 避免信息过载
2. **主动追问量化数据** —— "团队多大？""性能提升了多少百分比？"
3. **尊重"跳过"** —— 用户说没有就不强求
4. **结构化输出** —— AI 每轮返回 `{message, resumeData, done}` JSON

### 技术实现：多轮对话

前端维护一个 `messages[]` 数组，每轮追加用户输入和 AI 回复，整体发给后端：

```typescript
// POST /api/ai/chat-resume
{
  messages: [
    { role: "assistant", content: "你好！请告诉我你的名字..." },
    { role: "user", content: "我叫张三，在阿里做Java开发..." },
    { role: "assistant", content: "张三你好！你在阿里具体负责..." },
    { role: "user", content: "我带5人团队做搜索推荐..." }
  ],
  provider: "claude"
}
```

AI 返回：
```json
{
  "message": "很棒！5人团队 + 搜索推荐是很好的亮点。能具体说说你们做了什么成果吗？比如搜索延迟降低了多少？",
  "resumeData": null,
  "done": false
}
```

当用户确认最终信息后，AI 返回 `done: true` + 完整的 `resumeData`，前端自动跳转到编辑器。

---

## 架构设计

<img src="/images/resume-ai/resume-ai-system-architecture.svg" alt="ResumeAI 系统架构图：用户入口层 → 前端组件层 → API 路由层 → AI Provider 层 → Claude CLI / DashScope" style="max-width:100%;margin:1.5em 0;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" />

### 技术栈选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 框架 | Next.js 16 (App Router) | SSR + API Routes 一体，不需要单独后端 |
| UI | React + Tailwind + shadcn/ui | 组件质量高，开发效率快 |
| 数据库 | SQLite + Prisma ORM | 本地开发零配置，够用 |
| AI（主） | Claude via CLI 代理 | 复用 Claude Code 认证，不需要单独 API Key |
| AI（备） | Qwen via DashScope SDK | 国内可用的备选 |
| 语言 | TypeScript | 全栈类型安全 |

### 为什么用 Claude CLI 代理而不是直接调 API

这是一个有意思的技术决策。Claude Code CLI 在本地已经通过企业认证了，但它的凭证是内部 OAuth 机制，不是标准的 `sk-ant-` API Key。

直接调 Anthropic API 需要单独申请 Key，但我已经在 Claude Code CLI 里有了完整的认证。所以做了一个"代理调用"：

```typescript
// claude.ts - 通过 CLI 子进程调用
import { execFile } from 'child_process';

private callCLI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('claude', ['-p', prompt, '--output-format', 'text'], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180_000,
    }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
}
```

这个方案的 trade-off：

| 维度 | CLI 代理 | 直接 API |
|------|---------|---------|
| 认证 | 复用已有认证，零配置 | 需要单独申请和管理 Key |
| 延迟 | 多了进程启动开销（~1s） | 直接 HTTP 调用 |
| 并发 | 受 CLI 限制 | 可自由控制 |
| 部署 | 仅限有 CLI 的机器 | 任意服务器 |

对于个人项目和开发阶段，CLI 代理是个很好的折中。

### 数据模型

三表足够：

```prisma
model Resume {
  id       String          @id @default(cuid())
  name     String
  content  String          // JSON: ResumeData
  versions ResumeVersion[]
}

model ResumeVersion {
  id         String  @id @default(cuid())
  resumeId   String
  content    String  // JSON: 针对特定 JD 优化后的版本
  matchScore Int?
  atsScore   Int?
  label      String? // "Tailored for Google SWE"
}

model Job {
  id          String @id @default(cuid())
  title       String
  description String
  analysis    String? // JSON: JD 分析结果
}
```

核心设计：**简历有版本**。每次针对不同 JD 优化后的结果都保存为新版本，方便对比和回溯。

---

## AI Prompt 设计

六步流水线中，每一步都有专门的 Prompt。分享几个关键设计：

### 简历解析 Prompt

要求 AI 输出严格的 JSON 结构，而不是自由文本：

```
Output ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "basicInfo": { "name": "", "email": "", ... },
  "education": [{ "school": "", "degree": "", ... }],
  "experience": [{ "company": "", "title": "", "highlights": [] }],
  ...
}
```

关键技巧：**明确禁止 Markdown 包裹**。很多模型会习惯性加 ````json`，导致解析失败。

### 优化 Prompt

STAR 方法 + 关键词融入 + 真实性约束：

```
Rules:
1. Rewrite each highlight using STAR method
2. Naturally incorporate JD keywords (don't stuff)
3. Quantify achievements with numbers
4. KEEP IT TRUTHFUL - do not fabricate experiences
```

第 4 条很重要——AI 优化简历最大的风险是**编造经历**。必须明确约束。

### 对话式建立 Prompt

这是最复杂的一个，因为要同时控制：
- 对话风格（友好、专业）
- 流程推进（基本信息 → 工作 → 教育 → ...）
- 输出格式（每轮 JSON）
- 最终输出（完整 ResumeData）

核心约束：

```
## Rules
- Ask only 1-2 questions per turn
- Actively probe for quantifiable achievements
- If user says "skip", respect that and move on
- When done, set "resumeData" to complete resume object
```

---

## 前端交互设计

### 聊天 UI 组件

`ResumeChat` 组件实现了类似微信/iMessage 的气泡布局：

```tsx
{messages.map((msg) => (
  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
      msg.role === 'user'
        ? 'bg-primary text-primary-foreground rounded-br-md'  // 右侧蓝色
        : 'bg-white border shadow-sm rounded-bl-md'           // 左侧白色
    }`}>
      {msg.content}
    </div>
  </div>
))}
```

交互细节：
- **Enter 发送，Shift+Enter 换行** —— 符合聊天直觉
- **打字动画** —— AI 回复时显示三点跳动
- **自动滚动** —— 新消息自动滚到底部
- **完成后自动跳转** —— `done: true` 后 1.5s 延迟跳转编辑器

### 步骤导航

顶部 6 步导航条，每步完成变绿色打勾：

```tsx
const steps = [
  { step: 1, label: '上传简历', done: !!resume, tab: 'upload' },
  { step: 2, label: '编辑简历', done: !!resume, tab: 'edit' },
  { step: 3, label: '添加 JD', done: !!jobAnalysis, tab: 'jd' },
  // ...
];
```

Step 1 内部新增了子 Tab 切换：「上传简历」和「对话建立」。

---

## 开发效率：Claude Code 全程驾驶

这个项目从零到可用，一共花了不到两天：

| 阶段 | 耗时 | 主要工作 |
|------|------|---------|
| 产品调研 | 2h | 市面简历工具分析 + 痛点提炼 |
| MVP 搭建 | 4h | Next.js 项目 + Prisma + 6 个 AI API Route |
| 对话式简历 | 2h | ResumeChat 组件 + chat-resume API + Prompt |
| Claude CLI 代理 | 0.5h | 改造 provider，干掉 API Key 依赖 |
| 联调测试 | 1h | 端到端跑通全链路 |

高效的关键：
1. **Claude Code 承担了 90% 的编码** —— 我主要做产品决策和架构选型
2. **复用已有经验** —— 对话式引导的 Prompt 设计直接从专利撰写项目迁移
3. **CLI 代理方案** —— 绕过 API Key 问题，一行配置都不需要

---

## 总结和后续

ResumeAI 证明了一件事：**一个人 + AI 编程工具，可以在极短时间内做出一个完整的产品原型**。

当前版本的局限：
- 只有 SQLite，不支持多用户
- 没有简历模板/PDF 导出
- 对话式建立还没有"中间保存"功能
- Claude CLI 代理方案不适合线上部署

下一步计划：
- [ ] 简历 PDF 导出（用 Puppeteer 或 react-pdf）
- [ ] 多模板切换
- [ ] 对话中间状态保存（断点续聊）
- [ ] 接入标准 API Key，支持服务器部署

如果你也想快速做一个 AI 驱动的产品原型，我的建议是：**不要从技术开始，从用户痛点开始**。先想清楚"用户到底需要什么"，再让 AI 帮你写代码。

---

*本文中所有代码均在 [resume-ai](https://github.com/Mcluo/resume-ai) 仓库中，配合 Claude Code 开发。*
