---
title: "别再磕Harness Engineering了，Environment Engineering才是未来AI Agent的终极工程"
excerpt: "从Prompt Engineering到Environment Engineering的完整进化脉络，论证为什么对真实运行环境的工程化设计，才是AI Agent时代的终极命题"
category: "ai"
tags: ["AI Agent", "Environment Engineering", "Harness Engineering", "Context Engineering", "Prompt Engineering", "架构"]
difficulty: "advanced"
publishedAt: "2026-04-02"
readTime: 30
---

# 别再磕Harness Engineering了，Environment Engineering才是未来AI Agent的终极工程

三年之内，构建LLM应用的方式经历了四次范式跃迁——Prompt Engineering → Context Engineering → Harness Engineering → Environment Engineering。每一次跃迁都在回答同一个问题：当模型本身不再是瓶颈时，工程师的价值到底在哪里？

## 引言：一个被忽视的事实

2026年2月，LangChain团队在TerminalBench 2.0基准测试上做了一个实验：他们没有更换模型，没有微调权重，仅仅修改了Agent周围的"脚手架"代码——得分就从52.8%飙升至66.5%，从排行榜前30名开外直接跃入前5。在另一个独立实验中，研究者Can Boluk仅仅改变了代码编辑的格式（加入行哈希），某模型的得分就从6.7%暴涨至68.3%——十倍的提升，零模型变更。

这些数据指向一个正在被行业逐渐认知的事实：**围绕模型的基础设施，其重要性已经超越模型本身。** 而当我们把目光从"如何让模型生成更好的输出"转向"如何让Agent在真实世界中可靠运行"时，就会发现一个更深层的工程学科正在浮现——Environment Engineering（环境工程）。

本文将追溯从Prompt Engineering到Environment Engineering的完整进化脉络，论证为什么对真实运行环境的工程化设计，才是AI Agent时代的终极命题。

## 第一次进化：Prompt Engineering——"说什么"的艺术

### 起源与核心技术

Prompt Engineering作为一个独立学科的诞生，可以精确追溯到2020年OpenAI发布GPT-3。Tom B. Brown等人在论文《Language Models are Few-Shot Learners》中展示了一个1750亿参数的模型如何仅凭输入文本中的零样本、单样本、少样本示例就能完成各种任务——无需微调。这一发现彻底改变了人机交互范式：工程师不再需要重新训练模型，只需"说对话"就能引导模型行为。

技术词汇迅速膨胀。2022年1月，Jason Wei等人在Google Brain提出链式思维提示（Chain-of-Thought Prompting），证明要求模型"一步一步思考"能显著提升数学和逻辑推理能力——PaLM 540B仅用8个链式思维示例就在GSM8K数学基准上达到了当时的最优水平。Takeshi Kojima等人随后发现，仅仅在提示末尾添加"Let's think step by step"这句话，无需任何示例就能激发推理能力。普林斯顿大学的Shunyu Yao先后发表了ReAct（2022年10月，将推理与工具使用交织）和Tree of Thoughts（2023年5月，用搜索算法探索多条推理路径），后者将GPT-4在"24点游戏"上的成功率从4%提升至74%。到2024年，研究者已经编目了超过50种文本提示技术和40种多模态变体。"Prompt"一词成为2023年牛津词典年度词汇的亚军候选。

### 根本性脆弱

但这一学科承载着结构性的脆弱。Wharton商学院生成式AI实验室2025年3月的研究揭示了令人不安的发现：措辞上的微小变化——比如"请（Please）"与"我命令（I order）"的区别——可以导致单个问题上高达60个百分点的性能波动。重新排列少样本示例的顺序可以产生40个百分点的准确率波动。2024年一项arXiv研究发现，为早期模型开发的提示工程技术，在新一代推理模型（如o1）上的效果往往不如简单的零样本提示。

一位基础设施工程师在2025年一篇题为《Prompt Engineering Is Not Engineering》的尖锐批评文章中写道，他试图系统性地学习提示工程，找到的却是"一些告诉你'要具体'和'要迭代'的博客文章"。这个学科缺乏定义真正工程学科所需的数学基础、可复现性和形式化方法。

更关键的是，Prompt Engineering只解决了"你说什么"这一维度——一段静态的指令文本。当LLM应用从单轮问答演化为需要编排工具、数据库和API的多步骤Agent时，一串静态指令就显得无能为力了。

## 第二次进化：Context Engineering——"模型看见什么"的系统工程

### 概念的爆发式传播

"Context Engineering"这个术语在2025年6月经历了一次闪电般的传播，尽管实践本身早已存在。最早的公开使用可追溯到Braintrust CEO Ankur Goyal，他在2025年4月20日指出"RAG是context engineering的一种形式"，并给出了一个极具说服力的数据：在典型的生产环境提示中，67.6%的token来自工具返回的结果，而非人类编写的任何内容。"提示词"这个名字，对于从业者实际构建的东西来说，是一个严重的误称。

Shopify CEO Tobi Lütke 在2025年6月18日的一条推文中赋予了这个术语主流可见度："我非常喜欢'context engineering'这个术语而非prompt engineering。它更好地描述了核心技能：为任务提供所有上下文的艺术，使LLM能够合理地解决问题。"这条推文获得了190万次浏览。在Acquired播客上，Lütke进一步阐述："使用AI的根本技能是能够陈述一个问题，并附带足够的上下文，使得在不需要任何额外信息的情况下，这个任务可以被合理地解决。这其实是一件非常棘手的事情。"Shopify早已将AI能力纳入绩效评估，并要求团队在申请更多人力之前先证明为什么AI无法完成该任务。

五天后，LangChain创始人Harrison Chase发表了第一篇系统性阐述，定义context engineering为"构建动态系统，以正确的格式提供正确的信息和工具，使LLM能够合理地完成任务"。又两天后，Andrej Karpathy以病毒式传播的推文放大了这一概念："+1 for 'context engineering' over 'prompt engineering'… context engineering是精心填充上下文窗口的微妙艺术与科学。"他提出了一个深刻的类比：LLM是CPU，上下文窗口是RAM，而context engineering就是操作系统——管理有限工作内存中应该放入什么。

Simon Willison在6月27日表态支持："大多数人对prompt engineering的推断性定义是——这是一个可笑地自命不凡的说法，用来描述在聊天机器人里打字！我认为人们对'context engineering'的推断性定义很可能更接近其本意。"

### 七大组成要素

Context engineering要求从业者编排七个不同的信息维度：

1. **系统提示与指令**——基础行为规范
2. **用户即时查询**——当前任务的直接输入
3. **对话历史（短期记忆）**——当前会话的上下文连续性
4. **跨会话的持久知识（长期记忆）**——用户偏好、历史决策
5. **外部检索信息（RAG）**——从向量数据库、搜索引擎等获取的实时知识
6. **可用工具定义及其返回结果**——函数调用的接口与输出
7. **结构化输出模式**——约束模型输出格式

Anthropic在2025年9月发表的权威指南将这一工程问题定义为"在LLM固有约束下，优化token的效用以持续达成预期结果"。Gartner在2025年10月将其正式化为一项企业能力，建议组织任命"context engineering负责人或团队"。

### 与Prompt Engineering的本质区别

区别在于范围与动态性。Prompt engineering制作一段静态指令。Context engineering架构一个在运行时动态组装正确信息的系统。正如HuggingFace的Phil Schmid所言："大多数Agent的失败不再是模型的失败，而是上下文的失败。"Context engineering不替代prompt engineering——它包含了prompt engineering。提示词是其中一个组件；上下文才是整体。

但context engineering仍有其局限：它回答了"模型应该看到什么"，却没有回答"整个系统应该如何运作"。

## 第三次进化：Harness Engineering——"系统如何运作"的全栈工程

### 概念的结晶

到2025年底，从业者发现即使是优秀的context engineering也不足以支撑可靠的自主Agent。Agent仍然会漂移、积累熵、在长时间运行的任务中失败。Harness Engineering这一概念在2026年2月两周之内急剧结晶。

Anthropic在2025年11月发表《Effective harnesses for long-running agents》中埋下了种子，将Claude Agent SDK描述为"一个强大的通用Agent harness"，并详细阐述了多上下文窗口工作流的架构。

2026年2月5日，Mitchell Hashimoto——HashiCorp联合创始人，Vagrant、Terraform和Ghostty的创造者——发表了《My AI Adoption Journey》，其中第五步的标题就是"Engineer the Harness"。他写道："我不知道业界是否有一个被广泛接受的术语来描述这个概念，但我越来越倾向于称之为'harness engineering'。这个理念是：每当你发现Agent犯了一个错误，你就花时间工程化一个解决方案，使Agent再也不会犯同样的错误。"

六天后的2月11日，OpenAI发表了《Harness engineering: leveraging Codex in an agent-first world》，描述了一个为期五个月的实验，其中一个团队交付了一个生产级产品——零行人工编写的代码，超过一百万行代码完全由Codex Agent生成。他们的核心洞察是："我们现在最困难的挑战集中在设计环境、反馈回路和控制系统上。"Martin Fowler的网站发表分析时不无幽默地指出，OpenAI这篇标题为"Harness engineering"的文章在正文中实际上只提到了"harness"一次——可能是"受Mitchell Hashimoto最近博客文章启发而产生的事后想法"。

### 核心公式与组件

Harness engineering给出了一个简洁的公式：

**Agent = Model + Harness**

Harness就是模型本身之外的每一行代码、每一段配置和每一条执行逻辑。其组件包括：

- **工具集成与选择**——定义Agent可以调用什么，不可以调用什么
- **记忆系统**——工作上下文、会话状态、长期记忆的分层管理
- **编排逻辑**——子Agent委托、模型路由、任务分解
- **验证与测试**——代码检查器（linter）、CI流水线、自动化测试套件
- **护栏与安全**——人机协同控制、权限系统
- **错误处理与恢复**——重试逻辑、"死循环"检测
- **可观测性**——追踪每次工具调用、指标、成本
- **架构约束**——强制依赖分层、模块化边界

Vercel发现了一个反直觉的结论：移除Agent 80%的工具反而提升了结果质量——更少的工具意味着更少的步骤、更少的token消耗和更高的成功率。

### 三层范式的层级关系

Louis Bouchard给出了精炼的概括："Context engineering是关于发送什么给模型，使其能够自信地回答。Harness engineering是关于整个系统如何运作。"每一层包含前一层，竞争优势已经从"你在用哪个模型？"决定性地转移到"你的harness有多好？"

但即便如此，harness engineering仍然有一个巨大的盲区：它关注的是模型周围的编排逻辑，却没有系统性地思考Agent运行的真实世界本身。

## 第四次进化：Environment Engineering——为什么它才是终极工程

### 从编排逻辑到运行世界

让我们回到一个最基本的事实：Agent的一切价值最终都必须在真实环境中兑现。

Agent不是一个纯粹的信息处理系统。它需要从真实环境中读取文件、查询数据库、调用API来收集信息；它编写的代码需要在真实的操作系统上编译和运行；它创建的Pull Request需要通过真实的CI/CD流水线；它部署的服务需要在真实的云基础设施上承载流量。无论你的prompt多么精巧、context多么丰富、harness多么完善——如果Agent没有一个经过精心工程化的运行环境，一切都是空中楼阁。

这就是Environment Engineering的核心命题。

### 概念的浮现

最系统的阐述来自微软解决方案工程师Aymen Furter，他在2025年10月15日发表了《Environment Engineering: Platform Engineering for AI Agents》。他的定位非常明确："将其理解为应用于Agent的平台工程（platform engineering）。"

Furter指出了一个被广泛忽视的事实："许多Agent的失败不是由弱提示或训练不足的模型导致的，而是由糟糕的环境造成的。"

这个概念涵盖六个核心维度：

1. **工具与动作（Tools & Actions）**——哪些工具存在、哪些被允许或禁止
2. **资源与数据（Resources & Data）**——只读访问模式、显式的副作用声明
3. **运行时与网络（Runtime & Network）**——容器、沙箱、出站调用白名单
4. **认证与身份（Authentication & Identity）**——Agent的专用身份、最小权限原则
5. **人类监督（Human Oversight）**——对不可逆操作的审批门
6. **反馈回路（Feedback Loops）**——可操作的错误信息、行为追踪、日志

### 为什么Environment Engineering是终极工程：五个核心论证

**论证一：强化学习的"环境"概念直接映射到Agent运行的真实世界**

这不是一个隐喻。Agent-R1框架将马尔可夫决策过程（MDP）正式扩展到LLM Agent：状态空间是对话上下文加环境状态，动作空间是生成的token和工具调用，奖励函数可以基于结果或过程。Apple的LOOP研究（2026年1月）首次将强化学习应用于在有状态、多领域环境中通过直接API调用运行的交互式数字Agent。rLLM等框架使RL训练可以跨LangGraph、SmolAgent和OpenAI Agents SDK同时进行——一个40亿参数的模型经过rLLM训练后在金融任务上超越了2350亿参数的模型。

在经典RL中，环境定义了Agent可以做什么、不可以做什么、做了之后会发生什么。LLM Agent的运行环境扮演着完全相同的角色——它定义了可用工具集、资源边界、权限范围、反馈信号。工程化这个环境，本质上就是工程化Agent的学习与执行空间。

**论证二：所有前三层范式最终都在环境中汇聚**

Prompt engineering关注的文本最终需要在某个运行环境的API端点中被发送。Context engineering编排的RAG管道、记忆系统和工具需要连接真实的向量数据库、对象存储和外部服务。Harness engineering设计的编排逻辑、CI验证和错误恢复需要在容器、虚拟机或云函数中执行。

换言之：**环境是所有其他范式的底座。** 没有运行环境，prompt只是一段无处可去的文本，context只是一堆无法获取的信息，harness只是一套无法执行的逻辑。

**论证三：真实世界的Agent产品正在用行动证明环境才是核心竞争力**

观察2025-2026年最成功的Agent产品，它们的核心差异化都不在模型层，而在环境层：

- **Anthropic的Claude Code**作为一个agentic CLI运行，读取文件、执行命令、编写代码，通过CLAUDE.md配置文件定义行为。Computer Use让Claude能够在容器化的运行时中通过截屏和鼠标/键盘控制操作桌面环境。这本质上是为Agent构建一个完整的操作系统级运行环境。
- **Google的Jules**将代码仓库克隆到安全的Google Cloud虚拟机中，在其中规划变更并自主创建GitHub Pull Request。Project Mariner（网页浏览Agent）运行在基于云的虚拟机上，支持同时运行多达10个后台任务。
- **Cursor**以其"影子工作区"架构达到了超过100万日活用户和超过10亿美元年化收入——AI在一个后台模拟环境中编写和测试代码，然后才将建议呈现给用户。Background Agent在沙箱化环境中运行，可通过Web、Slack和移动端访问。
- **Devin**在专用云虚拟机中运行，拥有完整的开发环境访问权限，估值达到102亿美元。Goldman Sachs试点使用Devin来增强其12,000人的工程团队。
- **微软**推出了Windows 365 for Agents（在策略控制的Cloud PC上运行的企业Agent）、Entra Agent ID（自动身份分配）和Agent 365（作为所有AI Agent"控制塔"的集中治理平台）。

这些产品之间的模型差异正在缩小（很多甚至使用相同的底层模型），但环境差异却在持续扩大。环境的工程化水平决定了Agent产品的上限。

**论证四：安全与信任问题只能在环境层解决**

Anthropic在2025年8月披露了一个严峻的事实：一个威胁行为者利用Claude Code自动化了对30个组织80-90%的间谍式网络攻击。这不是模型的问题——是运行环境缺乏足够的隔离和权限控制。

沙箱技术已经成为关键基础设施：

- **Docker Desktop 4.60+**以微虚拟机（microVM）的隔离级别运行AI编程Agent——超越了容器级别的隔离，每个Agent拥有独立的守护进程、文件系统和网络。
- **OpenAI的Codex**是唯一一个默认启用沙箱的主流Agent（使用Landlock + seccomp）。
- **E2B**的Agent沙箱会话数从2024年3月的40,000增长到2025年3月的1,500万，大约一半的财富500强企业在运行Agent工作负载。
- **Kubernetes Agent Sandbox项目**提供了CRD来管理基于gVisor或Kata Containers后端的隔离Agent工作负载。

安全不能在prompt中"请求"，不能在context中"暗示"，不能在harness中"尽力而为"——**安全只能在环境层被强制执行。** 最小权限原则、网络隔离、审批门控、不可逆操作的确认机制——这些都是环境工程的范畴。

**论证五：Environment Engineering是连接AI世界与物理/数字世界的桥梁**

前三层范式都在关注Agent的"内部世界"——它看到什么、想什么、做什么决策。但Agent的价值在于它与"外部世界"的交互——读取真实的代码库、操作真实的数据库、部署到真实的服务器、与真实的API通信。

Environment Engineering是唯一直接面对这个外部世界的范式。它要回答：

- Agent如何安全地访问生产数据库而不会破坏数据？
- Agent编写的代码如何在一个镜像生产环境的沙箱中被验证？
- Agent如何获得恰到好处的网络权限——能访问需要的API，但不能发送未经授权的请求？
- 多个Agent如何在共享环境中协作而不互相干扰？
- Agent的操作如何被完整记录以满足审计合规需求？
- 当Agent在云环境中自主扩缩容时，如何控制成本和资源边界？

这些问题没有一个可以通过更好的prompt、更完整的context或更精巧的harness来解决。它们本质上是平台工程（platform engineering）问题，只是服务对象从人类开发者变成了AI Agent。

## 四层范式的对比全景

| 维度 | Prompt Engineering | Context Engineering | Harness Engineering | Environment Engineering |
|------|-------------------|-------------------|-------------------|----------------------|
| 核心问题 | 怎么说？ | 模型看到什么？ | 系统如何运作？ | Agent在什么世界中运行？ |
| 诞生时间 | 2020 (GPT-3) | 2025年6月 (概念结晶) | 2026年2月 (概念结晶) | 2025年10月 (概念浮现) |
| 关键人物 | Jason Wei, Shunyu Yao | Tobi Lütke, Karpathy, Chase | Mitchell Hashimoto, OpenAI | Aymen Furter (微软) |
| 操作对象 | 一段文本 | 整个上下文窗口 | 模型周围的所有代码 | Agent运行的整个世界 |
| 类比 | 写邮件措辞 | 准备会议资料包 | 设计公司运营流程 | 建造办公楼与基础设施 |
| RL类比 | - | State表示 | Policy + Reward | Environment本身 |
| 关键度量 | 输出质量 | 信息覆盖率与相关性 | 任务成功率与可靠性 | 安全性、延迟、成本、可扩展性 |
| 失败模式 | 措辞不当→输出偏差 | 信息缺失→决策错误 | 编排失当→Agent漂移 | 环境缺陷→安全漏洞、执行失败 |
| 是否包含前者 | - | ✅ | ✅ | ✅ |

## 思想领袖的声音：从Vibe Coding到Agentic Engineering

追溯这一进化弧线，最好的方式是通过推动它的那些人的话语。

**Andrej Karpathy**一直是这条弧线最一致的叙述者。2025年2月，他创造了"vibe coding"这个概念——"一种新的编码方式，你完全沉浸在氛围中，拥抱指数级增长，忘记代码的存在"。到2026年2月，他提出了"agentic engineering"作为其职业化的继承者："新的默认模式是你99%的时间不直接编写代码，你在编排执行工作的Agent并担任监督角色——用'工程'来强调这其中有一门艺术、科学和专业知识。"

**Dario Amodei**以不断压缩的时间线制造紧迫感。2025年初在外交关系委员会："我认为三到六个月内我们就会达到那个状态——AI编写90%的代码。"2026年1月在达沃斯："我们可能距离模型端到端完成软件工程师所有工作只有6-12个月。"他提到"我认识的一些最强的工程师现在几乎把所有编码都交给了AI"。

**Sam Altman**在2025年1月写道："我们相信，在2025年，我们可能会看到第一批AI Agent'加入劳动力'并实质性地改变公司的产出。"

**Swyx（Shawn Wang）**提供了理论框架，正式区分了"Model Labs"和"Agent Labs"，并通过六个属性定义Agent：工具使用、环境交互、多步规划、长时间运行记忆、委托权限和RL微调。注意——环境交互是Agent定义的核心属性之一，而非可选项。

**Harrison Chase**将理论落地为实践："当Agent搞砸时，它们搞砸是因为没有正确的上下文；当它们成功时，它们成功是因为拥有正确的上下文。"他观察到Claude Code的系统提示词就有近2,000行——与prompt engineering曾经暗示的简单指令相去甚远。但即便如此，Harrison更深的洞察是——仅有上下文还不够，Agent需要可靠的执行环境才能将决策转化为行动。

## 前瞻：Environment Engineering的未来形态

### Agent-Native Infrastructure的兴起

如果我们接受Environment Engineering是AI Agent时代的终极工程命题，那么它的未来形态将是什么？

**Agent-Native操作系统。** 今天的Agent在为人类设计的操作系统中笨拙地模拟人类操作——通过截屏"看"屏幕、通过模拟点击"操作"界面。未来的Agent OS将提供原生的API-first接口，让Agent以程序化方式直接与系统交互，而非模拟人类的感知-运动回路。

**声明式环境定义。** 正如Kubernetes用YAML声明式地定义容器编排，未来的Agent环境将用类似的声明式语言定义——可用工具清单、权限边界、资源配额、审批流程、监控规则，全部在一个环境定义文件中描述。Aymen Furter已经在这个方向上探索。

**环境即代码（Environment as Code）。** DevOps领域的"基础设施即代码"（Infrastructure as Code）将演变为"Agent环境即代码"。Agent的运行环境——包括沙箱配置、网络策略、身份凭证、可用API端点、审批工作流——将全部版本化、可审计、可复现。

**多Agent环境协调。** 当多个Agent需要在同一环境中协作时（例如一个负责前端、一个负责后端、一个负责测试），环境需要提供隔离、通信和协调机制——这与微服务编排是同构的问题，但服务对象变成了Agent。

**环境驱动的RL训练。** 随着Agent-R1和rLLM等框架的成熟，环境将不仅是Agent的运行时，更是Agent的训练场。精心设计的环境可以提供丰富的奖励信号，使Agent在真实或仿真环境中持续进化。

## 结语：四层之上，环境为基

AI工程范式的进化遵循一个清晰的范围扩张逻辑：

- **Prompt Engineering**问："我应该怎么表达？"
- **Context Engineering**问："模型应该看到什么？"
- **Harness Engineering**问："整个系统应该如何运作？"
- **Environment Engineering**问："Agent应该在什么样的世界中运行？"

每一层的出现都是因为前一层被证明是必要但不充分的。而Environment Engineering之所以是终极工程，不是因为它比其他层"更高级"，而是因为它是所有其他层的物质基础。没有环境，提示词无处发送，上下文无法获取，harness无法执行。

最重要的洞察是经验性的而非理论性的：**围绕模型的基础设施现在比模型本身更重要。** 当Dario Amodei预测AI将在12个月内接管几乎所有编码工作时，他实际上在暗示——模型能力正在快速商品化。在一个模型能力趋同的世界里，差异化竞争的唯一来源就是你为Agent构建的运行环境有多好。

正如传统软件工程的重心从"编写代码"逐渐转移到"构建平台"——从写出正确的算法到设计可靠的分布式系统——AI工程的重心也正在从"与模型对话"转移到"为Agent构建世界"。

Intent决定了你需要什么context，context决定了什么prompt有意义，harness编排一切如何运作，而environment定义了一切可能性的边界。

在这个新的工程层级中，能够跨越全部四层同时工程化的从业者——不是prompt engineer，不是context engineer，而是Karpathy所说的"agentic engineer"——将是这个时代最稀缺的人才。而他们最核心的能力，将是设计Agent运行的世界本身。

## 参考来源

- Tom B. Brown et al., "Language Models are Few-Shot Learners," arXiv:2005.14165, 2020
- Shunyu Yao et al., "Tree of Thoughts: Deliberate Problem Solving with Large Language Models," arXiv:2305.10601, 2023
- Wharton Generative AI Labs, "Prompt Engineering is Complicated and Contingent," March 2025
- Tobi Lütke, X/Twitter post, June 18, 2025; Acquired Podcast interview
- Andrej Karpathy, X/Twitter posts on context engineering (June 2025) and agentic engineering (February 2026)
- Harrison Chase, "The rise of context engineering," LangChain Blog, June 23, 2025
- Simon Willison, "Context engineering," simonwillison.net, June 27, 2025
- Phil Schmid, "The New Skill in AI is Not Prompting, It's Context Engineering," philschmid.de, 2025
- Anthropic, "Effective context engineering for AI agents," September 2025
- Anthropic, "Effective harnesses for long-running agents," November 2025
- Mitchell Hashimoto, "My AI Adoption Journey," mitchellh.com, February 5, 2026
- OpenAI, "Harness engineering: leveraging Codex in an agent-first world," February 11, 2026
- Martin Fowler, "Harness Engineering," martinfowler.com, 2026
- LangChain, "Improving Deep Agents with harness engineering," 2026; "The Anatomy of an Agent Harness," 2026
- Aymen Furter, "Environment Engineering: Platform Engineering for AI Agents," aymenfurter.ch, October 15, 2025
- Agent-R1, arXiv:2511.14460, 2025; Apple LOOP Research, January 2026
- Swyx, "Agent Engineering," Latent.Space, 2025
- Dario Amodei, Council on Foreign Relations 2025; Davos 2026 remarks
- Sam Altman, "Reflections," blog.samaltman.com, January 2025
