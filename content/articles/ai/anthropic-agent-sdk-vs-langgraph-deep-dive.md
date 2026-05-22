---
title: "Anthropic Agent SDK 深度解析：与 LangGraph 的架构哲学之争"
excerpt: "从设计理念、代码实现到生产实践，全面对比 Anthropic Agent SDK 和 LangGraph 两大 AI Agent 开发框架，帮你选择正确的技术路线"
category: "ai"
tags: ["AI Agent", "Anthropic", "Claude", "Agent SDK", "LangGraph", "LangChain", "框架对比", "架构"]
difficulty: "intermediate"
publishedAt: "2026-05-19"
readTime: 20
---

# Anthropic Agent SDK 深度解析：与 LangGraph 的架构哲学之争

当你决定构建一个 AI Agent 时，2026 年的技术选型已经不再是"用哪个模型"的问题，而是"用哪套编排框架"的问题。两个最具代表性的选择摆在面前：Anthropic 官方出品的 **Claude Agent SDK**，和 LangChain 生态的 **LangGraph**。它们代表了两种截然不同的设计哲学——一个说"把控制权交给模型"，另一个说"把控制权留给开发者"。

本文将从架构设计、代码实现、适用场景三个维度深入对比，帮你做出正确选择。

---

## 一、Anthropic Agent SDK：让 Claude 成为 Agent

### 1.1 核心理念：模型即调度器

Anthropic Agent SDK 的设计哲学可以用一句话概括：**你定义能力边界，Claude 决定如何行动**。

与传统的 Client SDK 不同，Agent SDK 不需要你手动实现 tool loop。它内置了 Claude Code 同款的 Agent Loop、上下文管理和工具执行系统。你只需要告诉它"做什么"和"能用什么工具"，剩下的交给 Claude 自主决策。

```python
# Client SDK：你手动管理循环
response = client.messages.create(...)
while response.stop_reason == "tool_use":
    result = your_tool_executor(response.tool_use)
    response = client.messages.create(tool_result=result, ...)

# Agent SDK：Claude 自主决策和执行
async for message in query(prompt="Fix the bug in auth.py"):
    print(message)
```

这个对比揭示了本质区别：Client SDK 是"你开车，模型导航"，Agent SDK 是"模型开车，你划定路线"。

### 1.2 核心架构

Agent SDK 的架构由四个核心组件构成：

```
┌─────────────────────────────────────────┐
│           Claude Agent SDK              │
├─────────────────────────────────────────┤
│  query() ─── Agent Loop 入口           │
│     ↓                                   │
│  Claude Model ─── 自主决策引擎          │
│     ↓                                   │
│  Tool System ─── 内置 + 自定义 + MCP    │
│     ↓                                   │
│  Subagent System ─── 多Agent协作        │
└─────────────────────────────────────────┘
```

**内置工具**：Read、Write、Edit、Bash、Grep、Glob 等（与 Claude Code 完全一致）

**自定义工具**：通过 `@tool` 装饰器注册

**MCP 协议**：通过 MCP Server 连接任意外部系统

### 1.3 自定义工具

```python
from claude_agent_sdk import (
    ClaudeSDKClient, ClaudeAgentOptions,
    tool, create_sdk_mcp_server
)

@tool("calculate", "Perform mathematical calculations", {"expression": str})
async def calculate(args: dict) -> dict:
    result = eval(args["expression"], {"__builtins__": {}})
    return {"content": [{"type": "text", "text": f"Result: {result}"}]}

@tool("get_time", "Get current time", {})
async def get_time(args: dict) -> dict:
    from datetime import datetime
    return {"content": [{"type": "text", "text": datetime.now().isoformat()}]}

# 通过 MCP Server 暴露工具
my_server = create_sdk_mcp_server(
    name="utilities", version="1.0.0",
    tools=[calculate, get_time]
)

options = ClaudeAgentOptions(
    mcp_servers={"utils": my_server},
    allowed_tools=["mcp__utils__calculate", "mcp__utils__get_time"]
)

async with ClaudeSDKClient(options=options) as client:
    await client.query("What's 123 * 456?")
```

### 1.4 多 Agent 协作（Subagents）

Agent SDK 原生支持多 Agent 架构。你定义专业化的子 Agent，Claude 自动判断何时委派任务：

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async for message in query(
    prompt="Review the authentication module for security issues",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob", "Task"],
        agents={
            "code-reviewer": AgentDefinition(
                description="Expert code review specialist for security reviews.",
                prompt="Analyze code for security vulnerabilities and suggest fixes.",
                tools=["Read", "Grep", "Glob"],
                model="sonnet"
            ),
            "test-runner": AgentDefinition(
                description="Runs and analyzes test suites.",
                prompt="Run tests and analyze results.",
                tools=["Bash", "Read", "Grep"]
            )
        }
    )
):
    print(message.result)
```

关键设计点：
- **description** 决定 Claude 何时调用该子 Agent
- **tools** 限制子 Agent 的能力边界（安全隔离）
- **model** 可为不同子 Agent 指定不同模型（成本优化）
- 子 Agent 通过 `Task` 工具被调用，拥有独立上下文

### 1.5 MCP 协议集成

MCP（Model Context Protocol）是 Agent SDK 连接外部世界的标准协议：

```python
async for message in query(
    prompt="Open example.com and describe what you see",
    options=ClaudeAgentOptions(
        mcp_servers={
            "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}
        }
    )
):
    print(message.result)
```

一行配置，即可让 Agent 获得浏览器自动化能力。MCP 的设计使得工具生态可以无限扩展，而无需修改 Agent 核心代码。

---

## 二、LangGraph：图论驱动的 Agent 编排

### 2.1 核心理念：开发者即调度器

LangGraph 的哲学恰恰相反：**你定义每一步的流转逻辑，模型只是图中的一个节点**。

它将 Agent 建模为一个有向图（Directed Graph），其中：
- **Node（节点）**= 执行单元（LLM 调用、工具执行、自定义逻辑）
- **Edge（边）**= 流转规则（条件路由、循环、终止）
- **State（状态）**= 贯穿整个图的共享数据

### 2.2 核心架构

```
┌─────────────────────────────────────────┐
│              LangGraph                  │
├─────────────────────────────────────────┤
│  StateGraph ─── 图定义                  │
│     ↓                                   │
│  Nodes ─── LLM / Tool / Custom Logic   │
│     ↓                                   │
│  Edges ─── Conditional / Static         │
│     ↓                                   │
│  Checkpointer ─── 状态持久化            │
│     ↓                                   │
│  Runtime ─── 编译执行                    │
└─────────────────────────────────────────┘
```

### 2.3 完整示例：构建 Tool-Calling Agent

```python
from langchain.tools import tool
from langchain.chat_models import init_chat_model
from langchain.messages import SystemMessage, HumanMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from typing import Literal, TypedDict, Annotated
import operator

# Step 1: 定义工具
@tool
def multiply(a: int, b: int) -> int:
    """Multiply a and b."""
    return a * b

@tool
def add(a: int, b: int) -> int:
    """Add a and b."""
    return a + b

tools = [add, multiply]
tools_by_name = {t.name: t for t in tools}

# Step 2: 绑定模型
model = init_chat_model("claude-sonnet-4-6", temperature=0)
model_with_tools = model.bind_tools(tools)

# Step 3: 定义状态
class MessagesState(TypedDict):
    messages: Annotated[list, operator.add]

# Step 4: 定义节点
def llm_call(state: MessagesState):
    """LLM 决定是否调用工具"""
    return {"messages": [
        model_with_tools.invoke(
            [SystemMessage(content="You are a helpful calculator.")]
            + state["messages"]
        )
    ]}

def tool_node(state: MessagesState):
    """执行工具调用"""
    result = []
    for tool_call in state["messages"][-1].tool_calls:
        t = tools_by_name[tool_call["name"]]
        observation = t.invoke(tool_call["args"])
        result.append(ToolMessage(content=observation, tool_call_id=tool_call["id"]))
    return {"messages": result}

# Step 5: 定义路由逻辑
def should_continue(state: MessagesState) -> Literal["tool_node", "__end__"]:
    if state["messages"][-1].tool_calls:
        return "tool_node"
    return END

# Step 6: 构建图
graph = StateGraph(MessagesState)
graph.add_node("llm_call", llm_call)
graph.add_node("tool_node", tool_node)
graph.add_edge(START, "llm_call")
graph.add_conditional_edges("llm_call", should_continue, ["tool_node", END])
graph.add_edge("tool_node", "llm_call")

# Step 7: 编译并执行
agent = graph.compile()
result = agent.invoke({"messages": [HumanMessage(content="What is 3 + 4?")]})
```

### 2.4 Human-in-the-Loop（人机协作）

LangGraph 的杀手级特性是 `interrupt` 机制——在关键节点暂停执行，等待人工确认：

```python
from langgraph.types import interrupt
from langgraph.checkpoint.sqlite import SqliteSaver

@tool
def send_email(to: str, subject: str, body: str):
    """发送邮件前需要人工确认"""
    response = interrupt({
        "action": "send_email",
        "to": to, "subject": subject, "body": body,
        "message": "Approve sending this email?",
    })
    if response.get("action") == "approve":
        # 实际发送
        return f"Email sent to {to}"
    return "Email cancelled by user"

# 配合 Checkpointer 实现持久化暂停/恢复
checkpointer = SqliteSaver(conn)
graph = builder.compile(checkpointer=checkpointer)
```

这种机制使得 LangGraph 天然适合审批流、危险操作确认等需要人工介入的场景。

---

## 三、核心对比：两种哲学的碰撞

### 3.1 架构哲学

| 维度 | Anthropic Agent SDK | LangGraph |
|------|-------------------|-----------|
| **控制模型** | 声明式（Declarative） | 命令式（Imperative） |
| **核心抽象** | Agent Loop + Tools | Graph + State + Nodes |
| **决策者** | Claude 模型自主决策 | 开发者编写路由逻辑 |
| **流程定义** | 隐式（模型推理） | 显式（图结构） |
| **类比** | "雇一个聪明员工" | "画一张流程图" |

### 3.2 开发体验

| 维度 | Anthropic Agent SDK | LangGraph |
|------|-------------------|-----------|
| **上手难度** | 极低（5行代码启动） | 中等（需理解图论概念） |
| **代码量** | 少（声明工具即可） | 多（定义节点+边+状态） |
| **调试** | 黑盒（模型决策不透明） | 白盒（图结构可视化） |
| **可预测性** | 低（依赖模型推理质量） | 高（路由逻辑确定性） |
| **灵活性** | 高（模型适应性强） | 极高（任意图结构） |

### 3.3 能力对比

| 能力 | Anthropic Agent SDK | LangGraph |
|------|-------------------|-----------|
| **内置工具** | 丰富（文件/Shell/搜索） | 无（需自行实现） |
| **多 Agent** | 原生 Subagent 系统 | 需手动编排子图 |
| **状态持久化** | 有限（上下文管理） | 强大（Checkpointer） |
| **Human-in-Loop** | Hook 机制 | 原生 interrupt |
| **流式输出** | 原生 async generator | 原生 streaming |
| **模型锁定** | 仅 Claude | 任意 LLM |
| **MCP 协议** | 原生支持 | 需适配器 |
| **可观测性** | 基础 | LangSmith 集成 |

### 3.4 生产特性

| 特性 | Anthropic Agent SDK | LangGraph |
|------|-------------------|-----------|
| **容错恢复** | Agent Loop 内置重试 | Checkpointer 断点续跑 |
| **长时任务** | 受限于 context window | Durable Execution 支持 |
| **部署方式** | 嵌入应用 / CLI | LangGraph Cloud / 自部署 |
| **权限控制** | allowedTools 白名单 | 自行实现 |
| **成本控制** | 子 Agent 指定低成本模型 | 路由到不同模型节点 |

---

## 四、选型决策树

```
你的场景是什么？
│
├── 需要 Agent 自主完成复杂编程任务
│   └── → Agent SDK（它就是 Claude Code 的引擎）
│
├── 需要精确控制每一步执行流程
│   └── → LangGraph（你画图，它执行）
│
├── 需要多模型混用（Claude + GPT + 本地模型）
│   └── → LangGraph（模型无关）
│
├── 需要 Human-in-the-Loop 审批流
│   └── → LangGraph（interrupt 原生支持）
│
├── 需要快速原型验证
│   └── → Agent SDK（5行代码跑起来）
│
├── 需要与外部系统集成（数据库/API/浏览器）
│   ├── 通过 MCP 协议 → Agent SDK
│   └── 通过自定义节点 → LangGraph
│
└── 需要长时间运行的有状态工作流
    └── → LangGraph（Durable Execution）
```

---

## 五、实战对比：同一任务的两种实现

### 任务：代码审查 Agent

**Agent SDK 实现（~15行）**：

```python
from claude_agent_sdk import query, ClaudeAgentOptions

async for msg in query(
    prompt="Review src/auth.py for security issues. Run tests after fixing.",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Edit", "Bash", "Grep", "Glob"]
    )
):
    print(msg)
```

Claude 会自动：读取文件 → 分析问题 → 编辑修复 → 运行测试 → 报告结果。

**LangGraph 实现（~80行）**：

```python
from langgraph.graph import StateGraph, START, END

class ReviewState(TypedDict):
    messages: list
    files_reviewed: list[str]
    issues_found: list[str]
    tests_passed: bool

def read_files(state):
    # 读取目标文件
    ...

def analyze_security(state):
    # LLM 分析安全问题
    ...

def apply_fixes(state):
    # 应用修复
    ...

def run_tests(state):
    # 执行测试
    ...

def should_fix(state) -> Literal["apply_fixes", "report"]:
    return "apply_fixes" if state["issues_found"] else "report"

# 构建图
graph = StateGraph(ReviewState)
graph.add_node("read", read_files)
graph.add_node("analyze", analyze_security)
graph.add_node("apply_fixes", apply_fixes)
graph.add_node("run_tests", run_tests)
graph.add_node("report", generate_report)

graph.add_edge(START, "read")
graph.add_edge("read", "analyze")
graph.add_conditional_edges("analyze", should_fix)
graph.add_edge("apply_fixes", "run_tests")
graph.add_edge("run_tests", "report")
graph.add_edge("report", END)

agent = graph.compile()
```

**对比结论**：
- Agent SDK 代码量少 5 倍，但执行路径不可预测
- LangGraph 代码量大，但每一步都在你的掌控之中
- Agent SDK 适合"我信任模型的判断力"的场景
- LangGraph 适合"我需要确保每一步都正确"的场景

---

## 六、混合架构：两全其美

实际生产中，你可以组合两者的优势：

```python
# 在 LangGraph 的某个节点中调用 Agent SDK
from claude_agent_sdk import query, ClaudeAgentOptions

def deep_code_review_node(state):
    """用 Agent SDK 执行深度代码审查（让 Claude 自由发挥）"""
    results = []
    async for msg in query(
        prompt=f"Review {state['target_file']} for security issues",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Grep"])
    ):
        results.append(msg)
    return {"review_results": results}

# LangGraph 控制整体流程，Agent SDK 处理复杂子任务
graph = StateGraph(WorkflowState)
graph.add_node("triage", triage_node)           # 确定性分类
graph.add_node("review", deep_code_review_node)  # Agent 自由探索
graph.add_node("approve", human_approval_node)   # 人工审批
graph.add_node("deploy", deploy_node)            # 确定性部署
```

这种混合模式的最佳实践：
- **确定性流程**（分类、路由、审批）→ LangGraph 节点
- **探索性任务**（代码分析、bug 修复、文档生成）→ Agent SDK
- **危险操作**（部署、删除、发送）→ LangGraph + interrupt

---

## 七、总结与建议

### 选 Agent SDK 如果你：
- 构建编程助手、代码生成器、开发工具
- 需要快速原型，不想写大量编排代码
- 信任 Claude 的推理和决策能力
- 已经在 Claude/MCP 生态中
- 想要 Claude Code 同款能力但可编程

### 选 LangGraph 如果你：
- 构建企业级工作流（审批、流转、多步骤）
- 需要精确控制、可审计、可回溯
- 需要多模型混用或模型无关
- 需要长时间运行的有状态任务
- 团队已在 LangChain 生态中

### 最终观点

Agent SDK 和 LangGraph 不是竞品，而是**不同抽象层级的工具**：

- Agent SDK 是"高级语言"——表达力强，开发快，但你放弃了底层控制
- LangGraph 是"汇编语言"——控制力极强，但你需要自己管理每一个细节

2026 年的趋势是：**简单任务用 Agent SDK 快速搞定，复杂工作流用 LangGraph 精确编排，两者通过混合架构协同工作**。选择的关键不在于"哪个更好"，而在于"你愿意把多少控制权交给模型"。

---

*如果你正在构建 AI Agent 应用，欢迎交流你的技术选型经验。下一篇我们将深入 Agent SDK 的 Hooks 系统和权限模型设计。*
