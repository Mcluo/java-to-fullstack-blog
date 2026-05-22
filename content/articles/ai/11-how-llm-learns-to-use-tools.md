---
title: "大模型怎么学会用工具？Function Calling 训练全解析"
excerpt: "大模型天生只会续写文本，是怎么学会输出结构化JSON调用函数的？从SFT数据构造、ReAct范式到Tool Use的两阶段训练流程，拆解Function Calling的完整训练链路。"
category: "ai"
tags: ["Function Calling", "SFT", "ReAct", "Tool Use", "Agent训练", "大模型"]
difficulty: "intermediate"
publishedAt: "2026-05-22"
readTime: 15
---

# 大模型怎么学会用工具？Function Calling 训练全解析

> 大模型本质是一个"续写文本"的系统——给定前文，预测下一个 token。那它是怎么学会输出 `{"name": "search", "arguments": {"query": "xxx"}}` 这种结构化工具调用的？答案是：**精心设计的训练数据 + 两阶段训练范式**。

---

## 从"会说"到"会做"：核心转变

普通对话模型的输出空间是自然语言文本。而 Function Calling 要求模型：

1. **判断何时需要调用工具**（而不是直接回答）
2. **选择正确的工具**（从几十个候选中挑一个）
3. **生成精确的参数**（严格符合 JSON Schema）
4. **理解工具返回结果**（并基于结果继续推理）

这不是 prompt engineering 能稳定解决的——需要**改变模型的行为模式**，而改变行为模式只有一条路：训练。

---

## 第一阶段：SFT（有监督微调）

### 训练数据长什么样？

Function Calling 的 SFT 数据本质是：给模型看大量"正确的工具调用示例"，让它模仿。

一条训练样本的结构：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个助手，可以使用以下工具：...",
      "tools": [
        {
          "name": "search_web",
          "description": "搜索互联网信息",
          "parameters": {
            "type": "object",
            "properties": {
              "query": {"type": "string", "description": "搜索关键词"},
              "num_results": {"type": "integer", "default": 5}
            },
            "required": ["query"]
          }
        }
      ]
    },
    {
      "role": "user",
      "content": "帮我查一下2026年杭州亚运会的举办时间"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "name": "search_web",
          "arguments": "{\"query\": \"2026年杭州亚运会举办时间\"}"
        }
      ]
    },
    {
      "role": "tool",
      "content": "2026年杭州亚运会将于9月10日至25日举办..."
    },
    {
      "role": "assistant",
      "content": "根据搜索结果，2026年杭州亚运会将于9月10日至25日举办。"
    }
  ]
}
```

### 数据构造的关键设计

**1. 正例 + 负例平衡**

不是所有用户问题都需要调用工具。训练数据必须包含"不调用工具直接回答"的样本，否则模型会对任何问题都条件反射式地调用工具。

```
用户: "1+1等于几？"  → 直接回答（不需要工具）
用户: "今天杭州天气如何？" → 调用 weather API（需要实时数据）
```

**2. 多工具选择**

System prompt 中提供 5-20 个工具定义，模型必须选择正确的那个（或多个），训练数据覆盖不同工具的选择场景。

**3. 参数精确性**

模型必须生成合法的 JSON，且参数类型、格式完全正确。这部分通常需要大量高质量标注数据或合成数据。

### 数据来源

| 来源 | 优势 | 劣势 |
|------|------|------|
| 人工标注 | 质量最高 | 成本极高，难以规模化 |
| GPT-4 合成 | 规模大，成本可控 | 可能引入偏差 |
| 真实 API 日志 | 贴近实际场景 | 涉及隐私，需脱敏 |
| Self-Play | 无需外部数据 | 质量依赖基础模型能力 |

DeepSeek V3/V4 的训练大量使用了**合成数据 + 真实 API 交互**的混合方案。

---

## ReAct 范式：Agent的标准思维框架

### 什么是 ReAct？

ReAct（Reasoning + Acting）是 2022 年提出的 Agent 推理范式，现在是几乎所有 Agent 框架的标准模式：

```
Thought: 用户要查天气，我需要知道城市和日期。用户说了"今天杭州"，所以参数是...
Action: get_weather(city="杭州", date="2026-05-22")
Observation: {"temperature": 28, "weather": "多云", "humidity": 65}
Thought: 拿到结果了，温度28度多云，我可以直接回答用户了。
Answer: 今天杭州28°C，多云，湿度65%。
```

### 为什么 ReAct 比直接 Function Calling 更强？

纯 Function Calling 是 `user → tool_call → result → answer`，没有显式的推理过程。

ReAct 增加了 **Thought 步骤**，让模型在调用工具前先"想清楚"：
- 需要什么信息？
- 应该用哪个工具？
- 参数应该怎么填？
- 上一步结果说明了什么？

这在多步任务中至关重要。比如修复一个 bug：

```
Thought: 错误信息说 NullPointerException 在 UserService.java:42，我需要先看这个文件
Action: read_file("src/main/java/UserService.java")
Observation: [文件内容...]
Thought: 第42行调用了 user.getProfile()，但 user 可能为 null。我需要确认调用链...
Action: grep("UserService.getUser", "src/")
Observation: 在 Controller.java:28 调用，没有 null 检查
Thought: 问题确认了。需要在 Controller 层加 null 检查，或在 Service 层做防御
Action: edit_file("src/main/java/UserService.java", ...)
...
```

### ReAct 的训练数据

训练 ReAct 需要**带推理链的工具调用数据**。格式通常是在 assistant 消息中混合自然语言思考和结构化调用：

```json
{
  "role": "assistant",
  "content": "<think>用户需要天气信息，这需要调用天气API。城市是杭州，日期是今天。</think>",
  "tool_calls": [{"name": "get_weather", "arguments": "{\"city\": \"杭州\"}"}]
}
```

---

## 第二阶段：强化学习微调

SFT 教会模型"模仿正确的工具调用"，但模仿有天花板：
- 遇到训练数据中没见过的工具组合怎么办？
- 多步任务中如何选择最优路径？
- 如何从失败中学习调整策略？

这就需要**强化学习（RL）**——让模型在环境中试错，根据结果优化策略。

### 典型流程

```
1. 给模型一个任务（如"修复这个GitHub Issue"）
2. 模型自主执行多步工具调用
3. 评估最终结果（测试是否通过、Issue是否解决）
4. 根据结果给予奖励/惩罚
5. 更新模型参数
```

### 奖励信号设计

| 奖励类型 | 适用场景 | 示例 |
|---------|---------|------|
| 结果奖励（ORM） | 任务有明确成功标准 | 代码通过测试 +1，失败 -1 |
| 过程奖励（PRM） | 需要评估中间步骤 | 每步推理正确 +0.1 |
| 环境反馈（RLEF） | 可执行环境 | 代码编译通过 +0.5 |
| 格式奖励 | 结构化输出 | JSON合法 +0.2，非法 -0.5 |

下一篇文章会深入展开各种 RL 方法的细节。

---

## Strict Mode：从"大概率正确"到"保证正确"

即使经过 SFT + RL 训练，模型生成的 JSON 仍然可能有格式错误（缺少引号、类型不匹配等）。在 Agent 系统中，一次格式错误就会导致整个工具调用链断裂。

**Strict Mode** 的解决方案是**受限解码（Constrained Decoding）**：

在推理阶段，根据 JSON Schema 定义，动态屏蔽不合法的 token。比如当期望一个 integer 字段时，只允许数字 token 被采样，强制保证输出 100% 符合 Schema。

```
// 无 Strict Mode：模型可能输出
{"count": "five"}  // 类型错误：string vs integer

// Strict Mode：解码器强制约束
{"count": 5}       // 保证类型正确
```

DeepSeek V4 的 Strict Mode 支持 `$ref`/`$def` 递归引用，可处理复杂嵌套的工具定义。这对企业级 Agent 系统至关重要。

---

## 训练流程总结

```
┌─────────────────────────────────────────────────────────┐
│  预训练 (Pre-training)                                    │
│  → 模型获得语言理解和世界知识                               │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  SFT (有监督微调)                                         │
│  → 模型学会工具调用的格式和时机                              │
│  → 数据：人工标注 + GPT-4合成 + API日志                     │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  RL (强化学习)                                            │
│  → 模型学会在复杂场景中做出最优决策                           │
│  → 信号：任务成功率、过程正确性、环境反馈                      │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  推理优化 (Inference)                                     │
│  → Strict Mode保证输出格式正确                              │
│  → 长上下文支持完整的工具调用历史                             │
└─────────────────────────────────────────────────────────┘
```

---

## 系列文章导航

1. [什么是AI Agent？](/articles/ai/10-what-is-ai-agent)
2. **大模型怎么学会用工具？** ← 你在这里
3. [强化学习如何让Agent越来越聪明？](/articles/ai/12-agent-training-reinforcement-learning)
4. [DeepSeek V4的Agent能力为什么炸裂？](/articles/ai/13-deepseek-v4-agent-why-so-strong)
5. [四大厂商的Agent训练路线对比](/articles/ai/14-industry-agent-routes-comparison)

---

> **下一篇预告**：SFT 让模型学会了"模仿"工具调用，但真正的 Agent 需要在未知环境中自主决策。强化学习是怎么让 Agent 越来越聪明的？从 RLHF 到 GRPO，从人类打分到环境自动反馈——下一篇拆解 Agent 强化学习的完整技术栈。
