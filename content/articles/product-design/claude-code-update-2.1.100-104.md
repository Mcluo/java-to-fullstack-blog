---
title: "Claude Code 2.1.100-104 更新详解：TaskCreate 交互优化与 Skill 触发机制升级"
excerpt: "TaskCreate 新增 activeForm 实时反馈、Skill 触发规则强制化、跨境选品新 Skill、Agent 团队发现增强、记忆 feedback 类型改进、Cron 避峰调度。"
category: "product-design"
tags: ["claude-code", "更新日志", "task-management", "skills"]
publishedAt: "2026-04-13"
readTime: 8
---

**检测时间**: 2026-04-13
**版本范围**: 2.1.100 → 2.1.104 (2.1.102/103 跳过)
**dist-tags**: latest=2.1.104, next=2.1.104, stable=2.1.92

---

## 核心更新一览

| 更新项 | 影响面 | 重要度 |
|--------|--------|--------|
| TaskCreate activeForm | 任务管理用户 | P1 |
| Skill 触发规则强制化 | 所有用户 | P0 |
| 跨境选品新 Skill | 选品用户 | P1 |
| Agent 团队成员发现 | 团队协作 | P1 |
| 记忆 feedback 改进 | 所有用户 | P2 |
| Cron 避峰调度 | 定时任务用户 | P2 |
| stable 升级至 2.1.92 | 稳定通道用户 | P1 |

---

## 1. TaskCreate activeForm 字段

### 是什么

`TaskCreate` 工具新增了可选参数 `activeForm`，用于指定任务在 `in_progress` 状态时 spinner（加载动画）中显示的文案。

### 之前的问题

当 Claude Code 执行一个长时间任务时，用户看到的 spinner 只显示任务标题（subject）。比如任务标题是 "Run integration tests"，spinner 也显示 "Run integration tests"——这不符合英语的现在进行时语感，而且缺乏"正在做"的动态感。

### 现在的效果

```javascript
TaskCreate({
  subject: "Run integration tests",        // 任务标题
  activeForm: "Running integration tests",  // spinner 显示
  description: "执行所有集成测试套件"
})
```

| 状态 | 显示内容 | 来源 |
|------|----------|------|
| pending | Run integration tests | subject |
| in_progress | Running integration tests | activeForm |
| completed | Run integration tests | subject |

### 为什么有用

这是一个微小但重要的 UX 改进：

- **状态感知**：用户一眼就能看出"正在做什么"
- **语言自然**：现在进行时更符合"进行中"的语义
- **可选参数**：如果不设置 activeForm，行为和之前完全一样（回退到 subject）

---

## 2. Skill 触发规则强制化

### 是什么

Skill 系统的触发机制从"建议调用"升级为**强制调用**：当用户的请求匹配某个 Skill 时，Claude Code **必须先调用 Skill 工具**，然后才能生成响应。

### 具体规则

```
用户请求 → 检查是否匹配已注册的 Skill
  ├─ 匹配：必须先 Skill() 调用 → 再基于结果响应
  └─ 不匹配：正常响应
```

### 之前的问题

有时候 Claude Code 会"跳过" Skill 调用，直接用自己的知识回答。比如用户输入 `/commit`，Claude Code 可能直接开始提交流程，而没有先加载 commit skill 的完整提示词。这导致 Skill 定义的最佳实践和检查流程被绕过。

### 新增约束

1. **不得猜测 Skill 名称**——只使用 system-reminder 中列出的已注册 Skill
2. **不得重复调用**——已经运行的 Skill 不再触发
3. **先调用后响应**——这是一个 blocking requirement

### 为什么重要

Skill 是 Claude Code 的扩展机制。很多团队会定制自己的 Skill（比如代码规范检查、部署流程）。如果 Skill 触发不可靠，这些定制化的流程就形同虚设。

---

## 3. 跨境选品新 Skill

### 是什么

新增 `cross-border-selling-strategy` Skill，提供跨境电商选品销售策略分析能力。

### 使用方式

用户可以通过以下方式触发：

- 上传商品图片
- 提供 1688 商品链接
- 指定目标市场（如 Amazon US、TikTok 东南亚）

### 分析内容

Skill 沿着一个**决策树**进行分析：

```
商品输入 → 查询同款数据 → 查询相似款数据
    │
    ├─ 目标市场竞争分析
    ├─ 定价策略建议
    ├─ 目标人群匹配
    └─ 最佳销售方式推荐
```

### 核心理念

> **"没有卖不出去的商品，只有没选对市场、人群和销售方式"**

这个 Skill 的设计思路不是简单地告诉你"好不好卖"，而是帮你找到**最合适的销售路径**。

---

## 4. Agent 团队成员发现增强

### 是什么

当使用 `TeamCreate` 创建多 Agent 团队时，团队配置文件的规范更加明确，成员发现机制更加可靠。

### 团队配置文件

路径：`~/.claude/teams/{team-name}/config.json`

```json
{
  "members": [
    {
      "name": "frontend-dev",      // 用这个通信！
      "agentId": "uuid-xxx",       // 仅供参考
      "agentType": "Frontend Developer"
    },
    {
      "name": "backend-dev",
      "agentId": "uuid-yyy",
      "agentType": "Backend Architect"
    }
  ]
}
```

### 核心规则

**始终用 `name` 而非 `agentId` 通信。**

```javascript
// 正确
SendMessage({ to: "frontend-dev", message: "登录页面做好了吗？" })

// 错误
SendMessage({ to: "uuid-xxx", message: "登录页面做好了吗？" })
```

### 为什么强调这个

在之前的版本中，有时候 Agent 会尝试用 agentId（一个 UUID）来发送消息，导致通信失败。这次更新在文档中明确了：**name 用于消息发送和任务分配，agentId 仅作为系统内部引用**。

---

## 5. 记忆 feedback 类型改进

### 是什么

记忆系统中 `feedback` 类型（用户对工作方式的指导）新增了结构化要求，并扩展了触发场景。

### 结构化格式

```markdown
---
name: 不要 mock 数据库
type: feedback
---

集成测试必须使用真实数据库，不要 mock。

**Why:** 上季度 mock 测试通过但生产环境迁移失败，mock 与真实行为的差异导致 bug 被掩盖。
**How to apply:** 编写测试代码时，如果涉及数据库操作，使用测试数据库而非 mock。
```

### 新增：记录"确认"而非仅"纠正"

之前 feedback 记忆主要在用户**纠正**时保存（"不要这样做"、"停"）。但这次更新强调：**用户的确认同样值得保存**。

| 触发场景 | 示例 | 保存内容 |
|----------|------|----------|
| 纠正 | "不要 mock 数据库" | 规则 + 原因 |
| 确认 | "对，就是要合成一个 PR" | 这种做法在此场景下是正确的 |
| 默认接受 | 接受了非常规方案而不反对 | 该方案被验证为可行 |

### 为什么

> **"只记错误不记成功"会导致行为过度保守**

如果只保存纠正，Claude Code 会越来越谨慎、越来越保守——因为它只记住了什么"不能做"。保存确认可以平衡这一点，让它知道什么做法是被认可的。

---

## 6. Cron 避峰调度

### 是什么

定时任务（`CronCreate`）的调度规则更新：当用户给出的时间是**近似的**（如"每天早上9点左右"），Claude Code 应选择非 0/30 分钟的时间点。

### 具体规则

| 用户请求 | 之前 | 现在 |
|----------|------|------|
| "每天早上9点" | `0 9 * * *` | `57 8 * * *` 或 `3 9 * * *` |
| "每小时" | `0 * * * *` | `7 * * * *` |
| "9:00 sharp" | `0 9 * * *` | `0 9 * * *` (保持) |

### 为什么

所有用户说"9点"都会生成 `0 9`——这意味着全球大量 Claude Code 实例在同一时刻向 API 发请求。通过随机偏移几分钟，可以有效分散负载。

用户不会注意到 8:57 和 9:00 的差异，但 API 服务端的体验会好很多。

---

## 7. stable 升级至 2.1.92

### dist-tags 变化

| 通道 | 之前 | 现在 |
|------|------|------|
| latest | 2.1.100 | **2.1.104** |
| next | 2.1.101 | **2.1.104** (与 latest 合并) |
| stable | 2.1.89 | **2.1.92** |

### 注意

- latest 和 next 合并到同一版本（2.1.104），说明当前发布进入稳定期
- 2.1.102/103 被跳过（内部版本）
- stable 从 2.1.89 升级 3 个版本到 2.1.92

---

## 总结

这一轮更新的主题是**可靠性与可发现性**：

- **可靠性**: Skill 触发强制化确保定制流程不被跳过
- **可发现性**: Agent 团队成员规范让多 Agent 协作更顺畅
- **UX 细节**: TaskCreate activeForm、记忆确认记录、Cron 避峰——都是让工具用起来更顺手的小改进
- **生态扩展**: 跨境选品 Skill 继续丰富业务能力

---

[返回 Claude Code 更新汇总](/articles/product-design/claude-code-updates-summary)
