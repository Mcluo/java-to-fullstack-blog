---
title: "从逆向 ahafrog.com 到自研 GameLearn Engine：AI 游戏化学习引擎的产品与技术全解"
excerpt: "深度拆解 ahafrog.com 的产品方案与技术架构，然后从零构建一个 AI 驱动的「文本转可玩游戏」引擎。完整记录从逆向分析、产品设计到技术实现的全过程。"
category: "product-design"
tags: ["AI", "gamification", "Next.js", "Claude API", "microlearning", "product-design"]
publishedAt: "2026-04-08"
readTime: 25
---

## 引言：当 AI 遇上游戏化学习

想象一下：你粘贴一段关于「光合作用」的课文，AI 在两分钟内自动生成一个可以直接玩的互动小游戏——有像素风角色、有题目关卡、有音效反馈、有计分排行。

这不是科幻，这是 [ahafrog.com](https://ahafrog.com/) 正在做的事情。

我花了一个下午逆向分析了这个网站的全部源码、产品架构和商业模式，然后用一天时间从零构建了自己的版本—— **GameLearn Engine**。

这篇文章完整记录了这个过程：**逆向 → 分析 → 设计 → 实现**。

---

## 第一章：逆向 ahafrog.com

### 1.1 技术栈全貌

ahafrog.com 是一个典型的**一人团队全栈作品**（公告栏甚至写着「管理员熬夜修改服务器，熬不动了」），但技术选型相当精明：

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| CDN/安全 | Cloudflare | 全球分发 + Bot 防护 + 免费额度 |
| 服务端 | Cloudflare Workers | Serverless，零运维 |
| 数据库 | Cloudflare D1 | SQLite on Edge，零成本 |
| 前端 | 原生 HTML/CSS/JS | 无框架，5700 行单文件 |
| 分析 | 自研 analytics.js | 30 秒批量上报 |
| 字体 | PixelZH（正清刻南北辞宫普宋体） | 统一像素风格 |

最大的亮点是**成本结构**：除了 AI API 调用费，整个平台的运营成本接近零。Cloudflare Workers + D1 的免费额度足以支撑数万用户。

### 1.2 反爬措施分析

网站实现了三层防护，但老实说，防君子不防小人：

**第一层：Cloudflare 基础设施**
- Bot 管理、速率限制、WAF 规则
- `email-decode.min.js` 混淆邮箱地址

**第二层：前端反调试**
```javascript
// 禁用右键、F12、Ctrl+U、Ctrl+Shift+I/J/C
document.addEventListener('contextmenu', e => e.preventDefault(), true);
document.addEventListener('keydown', function(e) {
  if (e.key === 'F12') { e.preventDefault(); return false; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); }
  // ...更多快捷键拦截
}, true);
```

**第三层：API 访问控制**
- 匿名用户每 IP 限 3 次游戏
- JWT Token 认证存 localStorage
- 跨标签页登录同步（监听 storage 事件）

**弱点**：`curl` 直接绕过所有前端防护，API 无请求签名，代码全明文无混淆。

### 1.3 产品架构拆解

ahafrog 的产品由三大模块构成：

<img src="/images/gamelearn/ahafrog-product-architecture.svg" alt="ahafrog.com 产品架构拆解：产品层（课程库/Playground/Studio）、增长引擎（XP/排行榜/Streak/画廊/分享）、技术栈（Cloudflare Workers + D1 全家桶）" style="max-width:100%;margin:1.5em 0;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" />

其中 **Playground** 是最核心的差异化模块——用户输入任意文本，AI 实时生成可玩的互动游戏。

### 1.4 AI 生成流水线（13 步）

从源码中提取的完整生成流程：

```
📚 分析知识内容 (8%)
💬 生成对话剧本 (18%)
🎨 绘制图标 (26%)
🧑 绘制角色 (34%)
🌄 绘制场景背景 (42%)
🖼️ 绘制封面 (48%)
🕹️ 设计互动小游戏 (55%)
⚙️ 编写游戏代码 (65%)
🔍 检查游戏代码 (72%)
✏️ 优化像素画 (78%)
📦 打包游戏资源 (88%)
☁️ 上传到云端 (94%)
✅ 生成完成 (100%)
```

注意：AI 不只生成文字，还会**生成像素画资源**（角色、背景、图标、封面）、**编写可执行的游戏代码**，并在**沙箱中验证**代码正确性。这条流水线的技术复杂度远超普通的 AI 应用。

### 1.5 商业模式

```javascript
// 源码中的定价（尚未上线）
const PLANS = {
  annual:         { price: 399,  label: '$3.99/mo' },   // 年付
  monthly_auto:   { price: 699,  label: '$6.99/mo' },   // 月付自动续
  monthly_manual: { price: 999,  label: '$9.99/mo' },   // 月付手动续
};
```

目前处于**免费增长阶段**，付费系统标注「kept for future billing integration」。增长飞轮依赖：XP 经验值 → 排行榜 → 连续天数 → 社区画廊 → 分享链接。

---

## 第二章：产品设计——我的版本

### 2.1 核心取舍

对比原版，我做了几个关键决策：

| 维度 | ahafrog | GameLearn Engine | 理由 |
|------|---------|-----------------|------|
| 定位 | 面向终端用户的学习平台 | AI 游戏生成引擎（开发者工具） | 聚焦核心技术，不做运营 |
| 美术资源 | AI 生成像素画 | CSS/SVG 像素风模板 | 省去图片生成 API 成本 |
| 游戏运行 | 同源 iframe | `sandbox="allow-scripts"` iframe | 安全隔离 |
| 生成策略 | 纯 AI 生成（13 步） | 模板注入 + AI 数据（6 步） | 可靠性 > 灵活性 |
| 存储 | Cloudflare D1 | 文件系统 + JSON 索引 | MVP 最简 |

### 2.2 为什么选「模板注入」而非「纯 AI 生成」

这是最核心的技术决策。

**纯 AI 生成**：让 Claude 直接输出完整的 HTML+CSS+JS 游戏代码。
- 优点：极高灵活性，每个游戏都可以不同
- 缺点：JS 错误率 30-40%，游戏机制不稳定，调试困难

**模板注入**：预先写好游戏骨架（HTML 结构、游戏循环、计分系统），AI 只负责生成数据（题目、答案、主题）。
- 优点：几乎零错误，游戏体验一致
- 缺点：游戏类型受限于已有模板

我选择了后者。原因很简单：**用户要的是「能玩」，不是「能生成」**。一个 100% 能正常运行的测验游戏，远比一个 60% 概率崩溃的炫酷模拟好得多。

### 2.3 Pipeline 架构

精简到 6 步，每步职责清晰。对比 ahafrog 的 13 步，我砍掉了所有图片生成步骤（图标、角色、背景、封面），用 CSS 像素艺术替代，并将核心的「代码生成」替换为「模板注入」。成本从估算的 $0.50-1.00 降到 $0.10-0.15/次：

<img src="/images/gamelearn/pipeline-comparison.svg" alt="AI 生成流水线对比：ahafrog 13步纯 AI 生成（含 4 步图像生成，$0.50-1.00/次）vs GameLearn 6步模板注入（纯文本生成，$0.10-0.15/次）" style="max-width:100%;margin:1.5em 0;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" />

---

## 第三章：技术实现

### 3.1 技术栈选择

```
Next.js 14 (App Router) + TypeScript
├── 前端：React + Tailwind CSS (暗色主题)
├── 后端：API Routes (SSE 流式响应)
├── AI：Claude Sonnet 4.6 via @anthropic-ai/sdk
├── 存储：文件系统 (public/games/*.html)
└── i18n：自研轻量方案 (React Context + 字典)
```

为什么不用 Cloudflare Workers 像 ahafrog 那样？因为 Next.js 让我在一个项目里同时搞定前后端，开发效率更高。生产环境如果要迁移到 Edge，Vercel 或 Cloudflare Pages 都可以一键部署。

<img src="/images/gamelearn/gamelearn-tech-architecture.svg" alt="GameLearn Engine 技术架构：前端层（PlaygroundForm/PipelineProgress/GamePreview/I18nProvider）→ API 层（SSE 生成接口 + CRUD）→ AI Pipeline（6步编排器）→ Claude API + 文件存储" style="max-width:100%;margin:1.5em 0;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)" />

### 3.2 项目结构

```
game-learn-engine/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页
│   │   ├── playground/page.tsx   # 核心：创作工坊
│   │   ├── gallery/page.tsx      # 游戏库
│   │   ├── play/[gameId]/page.tsx # 全屏播放器
│   │   └── api/
│   │       ├── generate/route.ts # SSE 生成接口
│   │       └── games/            # CRUD 接口
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── pipeline.ts       # 编排器（核心）
│   │   │   ├── steps/            # 6 个 pipeline 步骤
│   │   │   └── prompts/          # Prompt 模板
│   │   ├── templates/quiz.ts     # Quiz 游戏 HTML 模板
│   │   ├── i18n.ts               # 中英文翻译字典
│   │   └── game-storage.ts       # 文件存储
│   └── components/
│       ├── I18nProvider.tsx       # 多语言 Context
│       ├── PlaygroundForm.tsx     # 输入表单
│       ├── PipelineProgress.tsx   # 实时进度
│       └── GamePreview.tsx        # iframe 预览
```

### 3.3 SSE 流式响应——让用户看到进度

生成一个游戏需要 30-60 秒，如果让用户干等一个 loading 圈，体验会很差。ahafrog 用轮询（每 3-5 秒查一次 job 状态），我选择 SSE（Server-Sent Events）——服务端主动推送，实时性更好。

**服务端**（`api/generate/route.ts`）：

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const stream = new ReadableStream({
    async start(controller) {
      await runPipeline(body, (event) => {
        // 每个 step 完成都推送一条事件
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      });
      controller.close();
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**客户端**（`useGameGeneration` hook）：

```typescript
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 解析 SSE 事件，更新 UI 状态
  const event = JSON.parse(line.slice(6));
  setEvents(prev => [...prev, event]);
}
```

效果：用户看到一个垂直步骤条，每完成一步就打勾，当前步骤显示 loading 动画。

### 3.4 Prompt 工程——让 AI 可靠地输出结构化数据

这是整个项目最需要调优的部分。关键原则：

**原则 1：每步一个 Claude 调用，不要试图一步到位**

把「分析内容 + 设计游戏 + 生成题目」拆成 3 个独立调用。每次调用的 prompt 更聚焦，输出更可控，出错了也容易定位。

**原则 2：JSON Schema 写在 System Prompt 里**

```
SYSTEM: You are a knowledge extraction specialist.
Respond with ONLY valid JSON matching this exact schema:
{
  "title": "string",
  "concepts": [{ "id": "c1", "term": "...", "definition": "..." }],
  "difficulty": "beginner|intermediate|advanced",
  "domain": "string"
}
```

Claude Sonnet 4.6 遵循 JSON Schema 的可靠性非常高，几乎不需要重试。

**原则 3：质量约束写在内容生成的 prompt 里**

```
- 每个错误答案必须看似合理但明确错误
- 题目应测试理解而非死记硬背
- 解释应教授概念，而不仅仅确认对错
- 难度应从浅入深递进
```

这些约束看起来像废话，但去掉它们，AI 生成的题目质量会明显下降。

### 3.5 Quiz 游戏模板——一个完全自包含的 HTML 文件

模板是一个导出函数，接收 `GameContent` 和 `GameTheme`，返回完整 HTML 字符串：

```typescript
export function buildQuizGame(
  content: GameContent, 
  theme: GameTheme
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
    }
    /* 像素风深色主题、响应式布局、动画... */
  </style>
</head>
<body>
  <script>
    const GAME_DATA = ${JSON.stringify(content)};
    // 游戏引擎：打乱选项、计分、进度条、结算...
  </script>
</body>
</html>`;
}
```

关键特性：
- **完全自包含**：零外部依赖，一个 HTML 文件搞定一切
- **安全沙箱**：`sandbox="allow-scripts"` 阻止 iframe 访问父页面
- **Web Audio API 音效**：正确/错误时播放 chiptune 风格的提示音，无需音频文件
- **CSS 像素艺术**：用 `box-shadow` 技术绘制像素风装饰元素

### 3.6 多语言方案

没有引入 `next-intl` 或 `i18next` 这些重型库，自研了一个 50 行的轻量方案：

```typescript
// i18n.ts — 翻译字典
const dict = {
  'pg.title': { zh: '创建学习游戏', en: 'Create a Learning Game' },
  'form.submit': { zh: '生成游戏', en: 'Generate Game' },
  // ...60+ 条
};

export function t(key: TranslationKey, locale: Locale): string {
  return dict[key]?.[locale] || key;
}
```

通过 React Context 提供 `useI18n()` hook，导航栏右上角一个 `中文 | EN` 切换按钮。选择持久化到 localStorage，默认根据 `navigator.language` 检测。

够用就好，不要为了 i18n 引入一个比业务代码还重的依赖。

---

## 第四章：成本对比与 ROI

### 每次生成成本

| 步骤 | 输入 tokens | 输出 tokens | 费用 |
|------|-----------|-----------|------|
| 知识分析 | ~2,000 | ~1,500 | ~$0.01 |
| 游戏设计 | ~2,500 | ~500 | ~$0.005 |
| 内容生成 | ~4,000 | ~4,000 | ~$0.03 |
| HTML 组装 | ~6,000 | ~6,000 | ~$0.05 |
| 验证修复（如需） | ~8,000 | ~8,000 | ~$0.06 |
| **合计** | | | **~$0.10-0.15** |

### 与传统方式对比

| 方式 | 时间 | 成本 | 质量 |
|------|------|------|------|
| 人工设计一个教学游戏 | 2-5 天 | $500-2000 | 高 |
| 用 H5 模板填内容 | 2-4 小时 | $0 | 中等 |
| GameLearn Engine | 2 分钟 | $0.12 | 中等偏上 |

---

## 第五章：思考与展望

### 5.1 ahafrog 做对了什么

1. **极致的成本控制**：Cloudflare 全家桶让运营成本趋近于零
2. **像素美学一致性**：从字体到 UI 到游戏资产，统一的视觉语言
3. **完整的增长飞轮**：XP + 排行榜 + Streak + 社区画廊 + 分享链接
4. **8 语言国际化**：包括 RTL（阿拉伯语）支持

### 5.2 可能的风险

1. **数据可信度**：「52K+ 学习者」硬编码在 HTML 里，不是动态数据
2. **单点故障**：一人团队，公告栏就是证据
3. **AI 成本**：13 步流水线包含多次图像生成，每次生成成本可能在 $0.50 以上
4. **模板化倾向**：游戏类型最终会趋同，用户会审美疲劳

### 5.3 GameLearn Engine 的进化路径

**短期**（已实现）：
- Quiz 游戏模板 + AI 数据生成
- SSE 实时进度推送
- 中英文多语言界面

**中期**（下一步）：
- 更多游戏模板：闪卡、拖拽配对、填空
- 用户账户系统（Supabase Auth）
- 游戏分享链接

**长期**（如果做成产品）：
- AI 全量生成（不依赖模板，Claude 直接写游戏代码）
- 多人对战模式
- 教师后台（班级管理、学习数据分析）
- 移动端 PWA

---

## 总结

| 维度 | 数据 |
|------|------|
| 逆向分析耗时 | ~2 小时 |
| 产品设计耗时 | ~1 小时 |
| 代码实现耗时 | ~4 小时（3 个 AI agent 并行） |
| 源文件数量 | 33 个 |
| 依赖数量 | 3 个（next, anthropic-sdk, nanoid） |
| 每次生成成本 | $0.10-0.15 |
| 项目地址 | `/Users/mcluo/game-learn-engine` |

从逆向一个线上产品到自己实现一个完整的 AI 游戏引擎，整个过程最大的收获不是代码本身，而是**产品思维的训练**：

- 看到一个产品，能拆解出它的核心价值链
- 在模仿与创新之间找到自己的定位
- 在「什么都做」和「做好一件事」之间做出取舍

ahafrog 选择做一个面向终端用户的完整平台；我选择做一个开发者导向的生成引擎。两条路都对，区别在于你要解决谁的什么问题。

> **技术服务于产品，产品服务于用户。**
>
> 反爬再强也挡不住 `curl`，但好的产品不需要靠反爬来赢。
