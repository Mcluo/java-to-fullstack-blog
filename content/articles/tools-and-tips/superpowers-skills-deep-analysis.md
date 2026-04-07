---
title: "Superpowers 深度拆解：13 万 Star 的 Vibe Coding 圣经到底做对了什么"
excerpt: "逐个拆解 obra/superpowers 的 14 个 Skill，揭示 AI 编程方法论的核心设计——Iron Law、反合理化表、说服力原则、CSO 优化。不是介绍文，是工程师视角的技术分析。"
category: "tools-and-tips"
tags: ["superpowers", "claude-code", "vibe-coding", "ai-engineering", "skills", "tdd", "prompt-engineering"]
publishedAt: "2026-04-07"
readTime: 20
---

> 创建日期: 2026-04-07
> 项目地址: [obra/superpowers](https://github.com/obra/superpowers) (137k+ Stars)
> 作者: Jesse Vincent (Prime Radiant)

---

## 写在前面

2026 年初，一个叫 Superpowers 的 Claude Code 插件在 GitHub 上拿到了 13.7 万 Star。社区称它为 "Vibe Coding 的圣经"。

但翻遍了中文社区的文章，几乎都在说"它很厉害"、"装了生产力翻倍"。没有人拆开来看**它为什么有效**。

我读完了全部 14 个 Skill 的源文件（总计约 4000 行 Markdown），发现了一些让我重新理解 AI 编程的东西。这篇文章不是安装教程，而是一个工程师对 Superpowers 设计思想的技术分析。

---

## 一、它到底是什么

Superpowers 不是一个工具，不是一个框架，而是一套**强制性的软件开发工作流**（mandatory workflows, not suggestions）。

它由 14 个 Skill 组成，每个 Skill 本质上是一份精心调教过的 Prompt，用来**塑造 AI Agent 的行为**。装上之后，当你让 Claude Code 写功能、修 bug、做重构时，它会自动触发对应的 Skill，按照预设的流程执行。

```
你: "帮我加一个用户认证功能"

没有 Superpowers:
  Claude 直接开始写代码 → 写了一堆你没要求的东西 → 跑不起来 → 来回修

有 Superpowers:
  1. 触发 brainstorming → 先问你要什么，不写代码
  2. 触发 writing-plans → 拆成 2-5 分钟的小任务
  3. 触发 subagent-driven-development → 每个任务派子 Agent 执行
  4. 每个子 Agent 遵循 TDD → 先写测试再写代码
  5. 双重审查 → spec 合规 + 代码质量
  6. 完成后触发 finishing → 验证测试、合并/PR
```

核心差异：**它让 AI Agent 像一个遵守流程的工程师一样工作，而不是一个有能力但没纪律的实习生**。

---

## 二、14 个 Skill 全景图

按工作流顺序排列：

| 阶段 | Skill | 核心职责 |
|------|-------|---------|
| **启动** | using-superpowers | 强制检查是否有适用的 Skill |
| **设计** | brainstorming | 把想法变成设计文档 |
| **环境** | using-git-worktrees | 创建隔离的工作空间 |
| **规划** | writing-plans | 拆成 2-5 分钟的 bite-sized 任务 |
| **执行** | subagent-driven-development | 子 Agent 驱动开发（推荐） |
| **执行** | executing-plans | 内联执行（备选） |
| **并行** | dispatching-parallel-agents | 并行派发独立任务 |
| **测试** | test-driven-development | RED-GREEN-REFACTOR |
| **调试** | systematic-debugging | 四阶段根因分析 |
| **验证** | verification-before-completion | 证据先于断言 |
| **审查** | requesting-code-review | 派发 Code Review 子 Agent |
| **审查** | receiving-code-review | 如何正确响应 Review 反馈 |
| **收尾** | finishing-a-development-branch | 验证→选项→执行→清理 |
| **元** | writing-skills | 如何创建新 Skill（TDD for 文档） |

---

## 三、五大核心设计模式

### 模式 1：Iron Law（铁律）

每个核心 Skill 都有一条不可违反的铁律，用代码块格式强调：

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST    — TDD
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST    — Debugging
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION    — Verification
```

**为什么有效？** 这不是建议，是绝对命令。LLM 对权威性语言（"YOU MUST"、"NEVER"、"No exceptions"）的遵从率远高于柔性建议（"Consider..."、"You might want to..."）。

Superpowers 的 `persuasion-principles.md` 直接引用了学术研究：Meincke et al. (2025) 在 N=28000 个 LLM 对话中测试了 7 种说服原则，**使用说服技术后合规率从 33% 提升到了 72%**。

铁律的设计就是应用了 Authority（权威）原则——消除决策疲劳，消除合理化空间。

---

### 模式 2：反合理化表（Rationalization Table）

这是我见过的最精彩的 Prompt Engineering 技巧。

AI Agent 非常擅长给自己的违规行为找理由。Superpowers 对此的解法是：**预测所有可能的借口，然后逐一封堵**。

以 TDD Skill 为例，它内置了这张表：

| 借口 | 现实 |
|------|------|
| "太简单了不用测试" | 简单代码也会出 bug，测试只要 30 秒 |
| "我先写完再补测试" | 后补的测试能立即通过，证明不了任何事 |
| "已经手动测过了" | 手动测试是临时的，没有记录，不能重复 |
| "删掉 X 小时的工作太浪费了" | 沉没成本谬误。保留你无法信任的代码才是浪费 |
| "保留作为参考，先写测试" | 你会"改造"它，那还是 test-after。删除就是删除 |
| "TDD 是教条主义，我在务实" | TDD 比 debugging 更快，务实 = test-first |
| "测试后补也能达到同样目的" | 后补测试回答的是"代码做了什么"，TDD 回答的是"代码应该做什么" |

**每一行都来自实际的 Agent 违规记录**。这不是作者凭空想的，而是通过 RED-GREEN-REFACTOR 的方式测试出来的——先观察 Agent 在没有 Skill 时怎么找借口，然后针对性封堵。

Verification-before-completion 里也有同样精彩的表：

| 借口 | 现实 |
|------|------|
| "应该能跑了" | 跑一下验证命令 |
| "我很有信心" | 信心 ≠ 证据 |
| "就这一次" | 没有例外 |
| "Linter 通过了" | Linter ≠ 编译器 |
| "Agent 说成功了" | 独立验证 |
| "我累了" | 疲劳 ≠ 借口 |

这告诉我们一个重要的 Prompt Engineering 原则：**不要只告诉 LLM 该做什么，还要告诉它不该怎么给自己找借口**。

---

### 模式 3：HARD-GATE（硬门禁）

Superpowers 在关键节点设置了不可跳过的门禁：

**Brainstorming 的硬门禁：**
```
<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project,
or take any implementation action until you have presented a design and the
user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>
```

**Verification 的门禁函数：**
```
BEFORE claiming any status:
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command
3. READ: Full output, check exit code
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim
Skip any step = lying, not verifying
```

关键设计："This applies to EVERY project **regardless of perceived simplicity**"。

这是针对 AI Agent 最常见的违规路径——"这太简单了不需要走流程"。Superpowers 的回应是：**越简单越要走流程，因为简单项目里未经检验的假设造成的浪费最多**。

---

### 模式 4：CSO（Claude Search Optimization）

这是 Superpowers 独创的概念：**为 AI Agent 的搜索行为优化文档结构**，类比 SEO 但对象是 LLM。

最关键的发现在 `writing-skills` 里：

> **Description 只写何时触发，绝不描述流程。**
>
> 测试发现，当 description 摘要了 Skill 的工作流程时，Claude 会直接按 description 执行而跳过读完整 Skill 内容。一个 description 写了"code review between tasks"的 Skill，Claude 只做了一次 Review；而 Skill 的流程图明确要求两次（spec compliance + code quality）。
>
> 把 description 改成纯触发条件后，Claude 才正确读取流程图并执行两阶段 Review。

```yaml
# BAD: 描述了流程 → Claude 走捷径
description: Use when executing plans - dispatches subagent per task with code review

# GOOD: 只写触发条件 → Claude 被迫读完整内容
description: Use when executing implementation plans with independent tasks
```

这个发现对所有写 AI Agent 指令的人都有价值：**给 LLM 的元数据越多，它越可能跳过正文**。

---

### 模式 5：TDD for Everything

Superpowers 最激进的设计是：**不仅代码要 TDD，文档（Skill）本身也要 TDD**。

`writing-skills` 要求创建新 Skill 时必须遵循：

1. **RED**：用子 Agent 在没有 Skill 的情况下跑压力测试场景，记录它违规的具体行为和借口
2. **GREEN**：针对这些具体违规写 Skill 内容
3. **REFACTOR**：装上 Skill 后再次测试，发现新的合理化漏洞就封堵

| TDD 概念 | Skill 创建 |
|----------|-----------|
| Test case | 子 Agent 压力场景 |
| Production code | SKILL.md 文档 |
| Test fails (RED) | Agent 没有 Skill 时违规 |
| Test passes (GREEN) | Agent 有 Skill 后合规 |
| Refactor | 封堵新发现的合理化漏洞 |

"Writing skills IS Test-Driven Development applied to process documentation."

这意味着 Superpowers 的每一行文字都经过了实际的 Agent 行为验证，不是作者的主观判断。

---

## 四、被忽视的细节

### "Human Partner" 不是 "User"

Superpowers 全文使用 "your human partner" 而非 "the user"。这不是文案选择，是**行为塑造**。

"User" 暗示服务关系——用户说什么就做什么。"Human partner" 暗示协作关系——你有义务在 partner 犯错时提出异议。

这直接影响了 `receiving-code-review` 的设计：

```
# 禁止的回应
"You're absolutely right!"    ← CLAUDE.md 明确禁止
"Great point!"                ← 表演性同意
"Let me implement that now"   ← 未验证就执行

# 正确的回应
复述技术需求 → 提出澄清问题 → 用技术推理反驳错误建议
```

甚至有一个"不舒服时的暗号"：如果你不敢当面反驳但觉得反馈有问题，可以说 **"Strange things are afoot at the Circle K"**（《Bill & Ted》的台词），让 human partner 知道你有保留意见。

### 3 次修复失败 = 架构问题

`systematic-debugging` 设置了一个精确的阈值：

```
If < 3 fixes: Return to Phase 1, re-analyze
If ≥ 3 fixes: STOP and question the architecture
DON'T attempt Fix #4 without architectural discussion
```

> Pattern indicating architectural problem:
> - Each fix reveals new shared state/coupling/problem in different place
> - Fixes require "massive refactoring" to implement
> - Each fix creates new symptoms elsewhere
>
> This is NOT a failed hypothesis - this is a wrong architecture.

大多数 AI 编程工具在修复失败后会不断尝试新方案，陷入 thrashing loop。Superpowers 用一个硬数字（3）打断这个循环，迫使 Agent 退后一步思考根本性问题。

### 94% PR 拒绝率

Superpowers 自身的 CLAUDE.md 开头就是对 AI Agent 的警告：

> "This repo has a 94% PR rejection rate. Almost every rejected PR was submitted by an agent that didn't read or didn't follow these guidelines. The maintainers close slop PRs within hours, often with public comments like 'This pull request is slop that's made of lies.'"

这不只是项目管理规范，更是一种价值观声明：**AI 生成的低质量贡献不仅无价值，而且有害——它浪费维护者时间、损害贡献者声誉**。

---

## 五、说服力原则的科学基础

`persuasion-principles.md` 是整个项目最惊人的文件。它明确告诉你 Superpowers 使用了哪些心理学原则来控制 Agent 行为：

| 原则 | 应用 | 示例 |
|------|------|------|
| **Authority**（权威） | 绝对命令式语言 | "YOU MUST"、"No exceptions" |
| **Commitment**（承诺一致） | 要求 Agent 宣布正在使用的 Skill | "Announce: I'm using writing-plans" |
| **Scarcity**（稀缺性） | 时间约束 | "IMMEDIATELY after completing task" |
| **Social Proof**（社会认同） | 建立规范 | "Every time"、"X without Y = failure" |
| **Unity**（群体认同） | 协作语言 | "our codebase"、"we're colleagues" |

而**明确不使用**的原则：

- **Reciprocity**（互惠）：容易显得操纵性
- **Liking**（喜好）：会导致 Agent 产生谄媚行为（sycophancy）

核心引用来自 Meincke et al. (2025)：N=28000 个对话，使用说服技术后 LLM 合规率从 33% 翻倍到 72%。

**这意味着 Superpowers 不是凭感觉写 Prompt，而是基于 LLM 行为学研究系统设计的。**

---

## 六、适合谁？不适合谁？

### 适合

- **团队协作**：标准化 AI 辅助开发流程，确保代码质量
- **复杂项目**：需要多步骤、多 Agent 协作的中大型功能
- **严肃工程**：对测试覆盖率、代码审查有硬性要求的项目
- **学习 Prompt Engineering**：14 个 Skill 是顶级的 LLM 行为塑造教材

### 不适合

- **快速原型**：brainstorming + writing-plans 的流程对 throwaway code 太重了
- **简单修改**：改个 typo 不需要走完整工作流
- **不用 TDD 的项目**：如果团队没有测试文化，Superpowers 会强制你写测试，这可能产生摩擦
- **非编码任务**：写文档、做分析不需要这套流程

---

## 七、我的核心收获

### 1. Prompt Engineering 的本质是行为塑造

Superpowers 证明了 Prompt 不是"写一段话告诉 AI 做什么"，而是一个**行为控制系统**——需要铁律、门禁、反合理化表、说服力原则的系统性设计。

### 2. LLM 的最大问题不是能力，而是纪律

Claude 完全有能力写出好代码、做出好测试。问题是它会"偷懒"——跳过测试、不验证就声称完成、用最简单的方案而不是最正确的方案。Superpowers 的所有设计都在解决**纪律问题**。

### 3. TDD 思维可以应用到任何领域

TDD for code、TDD for skills、TDD for documentation。核心逻辑是一样的：先定义"什么算成功"，再做事，最后验证。

### 4. AI 编程的竞争力不在工具，在方法论

安装 Superpowers 不会让你变强。**理解它背后的设计思想、把这套方法论内化到自己的工作流程中**，才是真正的生产力提升。

---

## 参考资料

- [obra/superpowers](https://github.com/obra/superpowers) - 项目源码
- [Superpowers for Claude Code](https://blog.fsck.com/2025/10/09/superpowers/) - 作者博客
- Meincke et al. (2025). *Call Me A Jerk: Persuading AI to Comply with Objectionable Requests.* University of Pennsylvania.
- Cialdini, R. B. (2021). *Influence: The Psychology of Persuasion (New and Expanded).* Harper Business.
