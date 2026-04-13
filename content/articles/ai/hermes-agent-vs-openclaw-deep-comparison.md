---
title: "Hermes Agent 被捧为'OpenClaw 杀手'？— 两大开源 AI Agent 框架深度对比"
excerpt: "Hermes Agent 和 OpenClaw 是 2026 年最具代表性的两个开源 AI Agent 框架。本报告从技术架构、核心能力、部署方式、社区生态、自我进化机制等多个维度进行详细对比分析，并给出选型建议。"
category: "ai"
tags: ["ai-agent", "hermes", "openclaw", "framework-comparison", "self-evolution"]
publishedAt: "2026-04-10"
readTime: 25
---

Hermes Agent 和 OpenClaw 是 2026 年最具代表性的两个开源 AI Agent 框架。Hermes Agent 由 Nous Research 开发，以其独特的"自我进化"机制和强大的模型微调能力著称；OpenClaw 由 Peter Steinberger 创建，以隐私优先的本地运行架构和丰富的多平台接入能力备受关注。本报告从技术架构、核心能力、部署方式、社区生态等多个维度进行详细对比。

---

## 1 Hermes Agent 深度调研

### 1.1 项目背景与团队

Hermes Agent 由 Nous Research 于 2026 年 2 月开源发布，核心创始人为独立 AI 研究者 Teknium。Nous Research 是一家运营超过两年的独立 AI 对齐实验室，通过企业合作获得资金支持，同时保持所有成果完全开源。

Hermes 模型系列的发展历程如下：Hermes 2（2023 年）→ Hermes 3（2024 年 8 月）→ Hermes 4（2025 年 8 月）→ Hermes 4.3，直至 2026 年 2 月发布独立的 Agent 框架。项目采用 Apache 2.0 许可证，完全开源。

### 1.2 核心技术架构

Hermes Agent 的定位是「Agent Runtime」而非简单的聊天界面，强调长时间执行和跨平台能力。采用纯 Python 架构，核心编排循环（run_agent.py）、CLI 界面、工具管理和持久化状态存储（hermes_state.py）实现了彻底解耦。AIAgent 中央模块负责提供者路由、提示组装、命令执行、重试逻辑、上下文修剪和数据持久化。

最核心的差异化特性是「自我进化系统」——结合 DSPy 框架和 GEPA（遗传-帕累托提示进化）算法，无需 GPU 训练即可通过分析运行日志自动优化 Agent 的技能文档、工具描述和系统指令。这意味着 Agent 会随着使用而不断变得更智能。

### 1.3 核心能力

- **40+ 内置工具：** 涵盖网络搜索、文件操作、浏览器控制、图像分析、定时任务等
- **Hermes-style Function Calling：** 基于 ChatML + `<tool_call>` XML 标签的工具调用标准，已被 vLLM、Qwen2.5、IBM Granite 等广泛采用
- **原生 MCP 协议支持：** 可连接外部服务和工具生态
- **并发子代理：** 最多 3 个并发子代理并行工作
- **持久化记忆：** 基于 Honcho 的跨会话持久化记忆搜索和自动技能生成
- **统一消息网关：** 支持 Telegram、Discord、Slack、WhatsApp、Signal、Email 等多平台接入
- **多层安全防御：** 手动/智能命令审批、MCP 进程环境变量剥离、SSRF 失败关闭保护

### 1.4 支持的模型规格

Hermes 微调模型基于 Llama 3.1（8B/70B/405B）、Mistral 等基座模型。Hermes 4.3 为 36B 参数。Agent 框架本身模型无关，通过 Nous Portal 支持 400+ 模型，还支持 OpenRouter（200+）、OpenAI、Anthropic 等提供者，切换无需改代码。

### 1.5 安全模型

Hermes Agent 实现了多层安全防御体系：

- **第一层** — 命令审批机制，支持手动确认和智能自动审批两种模式
- **第二层** — MCP 进程环境变量剥离，确保外部工具无法访问敏感的系统环境变量
- **第三层** — SSRF 失败关闭保护（fail-closed），当检测到潜在的服务器端请求伪造时默认拒绝请求

### 1.6 部署方式

Hermes Agent 支持 6 种执行后端：Local、Docker、SSH、Daytona、Singularity、Modal，覆盖从笔记本到 HPC 集群的全场景。官方建议分阶段上线：先 CLI，再消息网关，最后隔离后端。需要注意的是，Windows 环境需要 WSL2 支持。Hermes 模型被 vLLM、llama.cpp、HuggingFace Transformers 等主流推理框架支持。项目更适合构建持久化、多环境 Agent 的工程师，而非追求轻量级代码助手的普通用户。

### 1.7 社区与生态

GitHub 约 26,900 Stars、208 贡献者，每周新增约 1,600 星。发布 6 周内已迭代至 v0.7.0，更新极为频繁。拥有专门的文档站点、Reddit 社区（r/hermesagent）和技能市场（agentskills.io）。

---

## 2 OpenClaw 深度调研

### 2.1 项目背景与团队

OpenClaw 由 Peter Steinberger 创建，他是奥地利维也纳的知名开发者，此前曾是一家主流 PDF SDK 公司的 CEO。他在退休三年后于 2025 年 11 月重新出山，仅用一个小时就完成了第一个可工作的原型。

项目经历了三次命名变更：Clawdbot（因与 Claude 名称过于接近被 Anthropic 发出商标侵权通知）→ Moltbot（遭遇账号抢注者抢注社交媒体账号）→ OpenClaw（2026 年 1 月 29 日正式定名）。采用 Apache 2.0 许可证。

上线首 24 小时即获 9,000 GitHub Stars，两个月内突破 100,000 Stars，截至 2026 年 3 月已达 350,600+ Stars。值得注意的是，创始人 Peter Steinberger 于 2026 年 2 月 15 日宣布加入 OpenAI，同时承诺将 OpenClaw 转移至独立开源基金会运营。

### 2.2 核心技术架构

OpenClaw 采用 TypeScript 开发，运行于 Node.js 24（推荐）或 Node.js 22.16+ 之上，作为本地 CLI 应用程序运行。其架构流水线为：用户消息 → Channel Adapter（通道适配器）→ Gateway Server（网关服务器）→ Agent Runner（代理运行器）→ LLM API 调用 → Agentic Loop（代理循环）→ 响应返回。

Gateway Server 充当任务协调器，使用基于 lane 的命令队列，默认串行处理以消除竞态条件。Agent Runner 负责模型选择、API Key 轮换和动态 System Prompt 组装。记忆系统采用 JSONL 会话记录 + SQLite 向量搜索 + FTS5 关键词索引的混合检索架构。

### 2.3 核心能力

- **多平台接入：** 支持 WhatsApp、Telegram、Discord、Slack、Signal、iMessage 等聊天平台
- **浏览器自动化：** 基于 Playwright 生成文本可访问性树快照，比图像 Token 更高效
- **自主技能系统：** ClawHub 技能市场已收录 13,700+ 技能，支持后台 cron 任务
- **多 Agent 支持：** 子 Agent 通过 sessions_spawn 工具创建，继承父代理部分上下文
- **MCP 集成：** 通过 `~/.claude.json` 配置注册 MCP 服务，连接外部工具
- **安全沙箱：** 命令白名单 + 危险模式自动拦截 + Docker 隔离执行

### 2.4 部署方式

OpenClaw 支持多种安装方式：curl 一键安装、npm/pnpm 安装、Git Clone（Hackable 模式）。支持 macOS、Windows、Linux、Raspberry Pi 平台。同时提供 Docker 部署方案，包含资源限制、网络限制和健康检查等企业级特性。NVIDIA 基于 OpenClaw 构建了 NemoClaw 企业版集成方案。

### 2.5 社区与生态

GitHub 约 350,600+ Stars、35,000+ Forks、100+ 位核心贡献者。有多个社区资源仓库（awesome-openclaw、openclaw101 中文入门指南）。更新极为频繁，Beta 版本每隔几天就有新发布。中文社区文档丰富（知乎、极客时间、腾讯云等平台均有深度解析文章）。

---

## 3 详细对比分析

### 3.1 基础信息对比

| 对比维度 | Hermes Agent | OpenClaw |
|---------|-------------|----------|
| 开发团队 | Nous Research（Teknium） | Peter Steinberger（个人） |
| 发布时间 | 2026 年 2 月 | 2025 年 11 月（原型） |
| 开源协议 | Apache 2.0 | Apache 2.0 |
| 开发语言 | Python | TypeScript |
| 运行时 | Python 3.10+ | Node.js 24 / 22.16+ |
| GitHub Stars | 约 26,900 | 约 350,600+ |
| 贡献者数 | 208 | 100+ |
| 当前版本 | v0.7.0 | Beta 阶段 |
| 赞助商 | 企业合作 | OpenAI、GitHub、NVIDIA、Vercel |

### 3.2 技术架构对比

| 对比维度 | Hermes Agent | OpenClaw |
|---------|-------------|----------|
| 架构风格 | 纯 Python，AIAgent 中央模块 | TypeScript CLI，流水线架构 |
| 核心循环 | 提供者路由 + 命令执行 | Agentic Loop（迭代工具调用循环） |
| 任务规划 | DSPy + GEPA 自进化 | LLM 内在推理 + Prompt 引导 |
| 上下文管理 | 自动上下文修剪 | Context Window Guard 监控 |
| 记忆系统 | 跨会话持久化记忆 | JSONL + SQLite 向量 + FTS5 混合检索 |
| 子代理 | 最多 3 个并发 | sessions_spawn 无硬性限制 |
| 工具调用模式 | 异步并发 | 同步阻塞 |
| 安全防御 | 多层防御（命令审批/环境变量剥离/SSRF） | 命令白名单 + Docker 隔离 + 危险模式拦截 |
| 项目定位 | Agent Runtime（持久化多环境） | 个人 AI 助手（隐私优先） |

### 3.3 模型支持对比

| 对比维度 | Hermes Agent | OpenClaw |
|---------|-------------|----------|
| 模型无关性 | 支持 400+ 模型 | 支持多家主流提供者 |
| 自有模型 | Hermes 4.3 (36B)、Hermes 3 等 | 无自有模型 |
| 本地模型支持 | vLLM、llama.cpp、HF Transformers | 支持本地模型回退 |
| 主要提供者 | Nous Portal、OpenRouter、OpenAI、Anthropic | Anthropic、OpenAI、MiniMax |
| Function Calling | Hermes-style 标准（广泛采用） | 依赖提供者原生支持 |

### 3.4 部署与运维对比

| 对比维度 | Hermes Agent | OpenClaw |
|---------|-------------|----------|
| 部署后端数 | 6 种（Local/Docker/SSH/Daytona/Singularity/Modal） | 3 种主要（本地/Docker/VPS） |
| 安装复杂度 | 较复杂，需配置多个组件 | 简单，curl 一键安装 |
| 平台支持 | Linux/macOS，Windows需WSL2 | macOS/Windows/Linux/Raspberry Pi |
| 沙箱安全 | 多层防御（命令审批/环境变量剥离/SSRF防护） | Docker 隔离 + 命令白名单 |
| HPC/集群支持 | Singularity/Modal 原生支持 | 需自行配置 Kubernetes |
| 企业方案 | 未明确 | NVIDIA NemoClaw |

### 3.5 生态系统对比

| 对比维度 | Hermes Agent | OpenClaw |
|---------|-------------|----------|
| 技能市场 | agentskills.io | ClawHub（13,700+ 技能） |
| 社区规模 | 26,900 Stars / 208 贡献者 | 350,600+ Stars / 100+ 贡献者 |
| 中文社区 | 较少 | 丰富（知乎/极客时间/腾讯云） |
| 文档质量 | 专门文档站 | 官方文档站 + 丰富第三方教程 |
| 更新频率 | 极高（6周迭代至v0.7） | 极高（每几天发布新Beta） |
| 多平台接入 | Telegram/Discord/Slack/WhatsApp/Signal/Email | WhatsApp/Telegram/Discord/Slack等 |

### 3.6 核心差异化特性对比

| 对比维度 | Hermes Agent | OpenClaw |
|---------|-------------|----------|
| 最大亮点 | 自我进化机制（DSPy+GEPA） | 隐私优先本地运行 |
| Function Calling | 创建了行业标准规范 | 使用提供者原生能力 |
| 模型微调 | 拥有自己的微调模型系列 | 无自有模型，模型无关 |
| 浏览器自动化 | 内置基础支持 | Playwright 深度集成 |
| 聊天平台集成 | 统一消息网关支持 6 平台 | 原生支持 6+ 平台 |
| 进化能力 | 无需GPU自动优化提示/工具 | 用户可教AI自行构建技能 |

---

## 4 优势与劣势分析

### 4.1 Hermes Agent

**优势：**

- 自我进化机制业界独特，无需 GPU 训练即可持续优化 Agent 行为
- 纯 Python 架构透明度高，便于 AI/ML 开发者理解和扩展
- 模型无关设计，支持 400+ 模型，切换无需改代码
- Function Calling 标准影响力广泛，已被 vLLM、Qwen2.5 等采用
- 支持 6 种执行后端，从笔记本到 HPC 集群全覆盖
- 拥有自己的微调模型系列，对 Agent 场景专门优化

**劣势：**

- 需要自托管和基础设施管理，初始设置比竞品复杂
- 冷启动效果有限，需持续交互积累才能发挥自进化优势
- 项目仍处 v0.x 早期阶段，生产稳定性有待验证
- 已有沙箱安全绕过的社区报告（issue #4146）
- 自进化管线依赖远程 API，离线场景受限
- 社区规模相对较小，中文资源较少

### 4.2 OpenClaw

**优势：**

- 隐私优先，完全本地运行，数据不离开用户设备
- 安装极其简单，curl 一键安装即可使用
- 多平台接入能力强大，原生支持 WhatsApp/Telegram/Discord/Slack 等
- 社区极度活跃，350K+ Stars，技能市场拥有 13,700+ 技能
- 丰富的中文社区资源，学习曲线低
- 已获得 NVIDIA 等大厂背书，NemoClaw 企业方案已发布
- Playwright 浏览器自动化深度集成，Web 交互能力强

**劣势：**

- 项目仍处于 Beta 阶段，生产稳定性有待验证
- IO 延迟偏高，p99 约 3.0s，高于部分竞品
- 缺乏企业级治理功能（审计日志、合规等）
- 技能市场安全审核机制不够完善，已发现多个高危技能
- 创始人已加入 OpenAI，项目长期治理存在不确定性
- 工具调用同步阻塞，复杂多工具场景下效率受限
- 无显式任务规划器，依赖 LLM 内在推理进行任务分解
- 三次改名导致早期文档和教程搜索困难

---

## 5 专题：Hermes Agent 自我进化机制深度解析

自我进化机制是 Hermes Agent 最具差异化的核心特性，也是其与其他 Agent 框架拉开差距的关键所在。该机制结合了斯坦福 NLP 实验室的 DSPy 框架和 GEPA（遗传-帕累托）算法，实现了无需 GPU 训练、纯通过 API 调用即可持续优化 Agent 行为的能力。

### 5.1 DSPy 框架核心原理

DSPy（Declarative Self-improving Language Programs）由斯坦福 NLP 实验室的 Omar Khattab 等人开发（arXiv:2310.03714），是一个声明式的语言模型编程框架。与传统 Prompt Engineering 依赖手动调试脆弱的提示字符串不同，DSPy 采用结构化、声明式的编程范式：开发者只需指定「做什么」，DSPy 自动决定「怎么做」。

DSPy 的编程模型由三个核心抽象构成：

- **Signatures（签名）** — 声明式地定义输入/输出行为，如 `"question -> answer"`，将意图与实现分离
- **Modules（模块）** — 包括 Predict（核心预测）、ChainOfThought（链式推理）、ReAct（工具使用）、ProgramOfThought（代码生成）等
- **Optimizers（优化器）** — 包括 BootstrapFewShot、MIPROv2 和 GEPA 等，通过算法自动调优程序参数

### 5.2 GEPA 算法详细机制

GEPA（Genetic-Pareto）的学术论文为《GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning》（arXiv:2507.19457），核心思想是将遗传算法与帕累托优化结合，用于 Prompt 文本的自动进化。

**GEPA 的进化循环分为九个步骤：**

1. **初始化：** 以未优化的种子程序初始化候选池
2. **选择：** 从帕累托前沿中按覆盖率概率选择候选体
3. **收集追踪：** 在训练小批量上收集完整执行追踪
4. **定位目标：** 基于失败分析锚定到特定的预测器模块
5. **反思+变异：** LLM 分析追踪并反思失败原因，提出有针对性的指令修订
6. **评估：** 评估变异候选体，若有改善则在验证集上运行
7. **更新前沿：** 用非支配候选体更新帕累托前沿
8. **交叉：** 系统感知的合并，组合不同血统的模块（可选）
9. **终止：** 当 rollout/指标预算耗尽时终止

**帕累托优化的真正含义：**

GEPA 的帕累托优化在实例层面运作，采用「照明」策略：前沿由在至少一个评估实例上取得最高分的候选体组成。被其他候选体在所有实例上严格支配的候选体会被剪枝。选择概率与候选体「胜出」的实例数成正比。这种设计通过保留多样化策略来防止过早收敛。

### 5.3 GEPA vs 强化学习（GRPO）的核心差异

| 对比维度 | GEPA | GRPO（强化学习） |
|---------|------|-----------------|
| 信号类型 | 丰富的文本反馈（执行追踪） | 稀疏的标量奖励 |
| 信用分配 | LLM 反思隐式完成 | 需显式奖励塑形 |
| 样本效率 | 最高节省 35x rollouts | 需要大量 rollouts |
| GPU 需求 | 零（纯 API 调用） | 需要 GPU 更新权重 |
| 优化目标 | Prompt 文本（系统层） | 模型权重（参数层） |
| 泛化能力 | 泛化差距较小 | 奖励过拟合风险较高 |

**实验数据：** GEPA 相比 GRPO 平均提升 6%，最高可达 19-20%；相比 MIPROv2 累计提升 14%；在 AIME-2025 数学基准上比 MIPROv2 提升 12% 准确率；最少只需 3 个训练样本即可启动优化。

### 5.4 Hermes Agent 中的具体实现

自我进化管线作为独立项目运行在 Hermes Agent 之上，包含三个引擎：

- **DSPy+GEPA（主引擎）** — MIT 许可，用于文本优化
- **Darwinian Evolver（AGPL CLI）** — 用于代码文件变异
- **DSPy MIPROv2** — 作为回退优化器

**数据流管线：**

真实对话日志 → 评估数据集创建器 → DSPy 模块包装器 → GEPA/MIPROv2/Darwinian Evolver → 批量运行器 → 约束验证器 + 基准门控 → 自动生成 Pull Request → 人工审批并合并 → 部署更新

**四层优化目标：**

| 层级 | 优化对象 | 风险等级 | 典型场景 |
|------|---------|---------|---------|
| Tier 1 | 流程性指令文件（如 SKILL.md） | 低 | 技能文档优化 |
| Tier 2 | 工具选择/路由的 Schema 元数据 | 中 | 提升工具调用准确率 |
| Tier 3 | 系统消息中的行为指令 | 高 | 优化交互风格和策略 |
| Tier 4 | Python 实现文件（源代码） | 极高 | 自动修复代码缺陷 |

**关键设计决策——基准作为门控而非适应度函数：**

候选体必须在特定任务指标上有所提升，同时不能在现有基准上出现回退。这有效避免了古德哈特定律（Goodhart's Law）效应——当一个指标成为目标时，它就不再是一个好指标。

### 5.5 深度观点：优势、风险与边界

**核心优势：**

1. GEPA 的「反思式变异」是对传统遗传算法的本质升级——LLM 分析失败原因后有针对性地提出修改，将搜索效率提升了几个数量级
2. 帕累托前沿的多样性保持机制解决了 Agent 优化中的根本难题：不同用户、不同任务需要不同的 Prompt 策略
3. 零 GPU 需求大幅降低了自进化的门槛，个人开发者和小团队也能享受自动优化的红利

**潜在风险与局限性：**

1. **「误进化」风险** — 自进化 Agent 可能出现「能力退化」，在未被测量的维度上能力下降、幻觉放大
2. **过拟合风险** — GEPA 最少只需 3 个训练样本，但这也意味着极高的过拟合风险
3. **安全隐患** — Tier 3/4 的优化可能无意中绕过安全约束，或引发「身份漂移」
4. **API 依赖** — 对远程 API 的完全依赖是一把双刃剑，对话日志需要发送到外部 API，与数据隐私保护存在紧张关系

**综合评价：**

Hermes Agent 的自我进化机制代表了 Agent 框架发展的一个重要方向——从「静态配置」走向「动态自适应」。其真正的价值在于长期的复合效应——每次优化迭代都在上一轮的基础上改进。但安全性、可解释性和难以预测的涌现行为仍是必须持续关注的核心挑战。

---

## 6 选型建议

### 6.1 选择 Hermes Agent 的场景

- 需要 Agent 具备自我进化能力，随时间推移自动优化行为的场景
- 已有 Python 技术栈的团队，希望深度自定义和扩展 Agent 行为
- 需要在 HPC 集群或科研计算环境中运行（Singularity/Modal 支持）
- 希望使用针对 Agent 场景专门微调的模型（Hermes 系列）
- 需要为多个模型提供者做统一的 Function Calling 接口

### 6.2 选择 OpenClaw 的场景

- 对数据隐私要求极高，需要完全本地运行的个人 AI 助手
- 需要通过 WhatsApp、Telegram、Slack 等多平台接入 AI Agent
- 希望快速上手，安装和配置尽可能简单
- 看重社区生态和技能市场的丰富度（13,700+ 技能可用）
- 团队以 TypeScript/Node.js 为主要技术栈
- 需要强大的浏览器自动化能力（Playwright 深度集成）

---

## 参考来源

- Nous Research Hermes Agent GitHub 仓库
- NousResearch/hermes-agent-self-evolution GitHub 仓库
- Khattab et al. DSPy: Compiling Declarative LM Calls (arXiv:2310.03714)
- Agrawal et al. GEPA: Reflective Prompt Evolution (arXiv:2507.19457)
- Shao et al. Your Agent May Misevolve (arXiv:2509.26354)
- OpenClaw GitHub 仓库
- NVIDIA NemoClaw 官方页面
- Peter Steinberger 博客
- SparkCo: AI Agent Frameworks Compared (2026)

> **免责声明：** 本报告基于 2026 年 4 月公开可获得的信息编写。两个项目均处于快速迭代阶段，具体功能和特性可能已发生变化。建议在做出最终决策前参考各项目的官方文档和最新发布。
