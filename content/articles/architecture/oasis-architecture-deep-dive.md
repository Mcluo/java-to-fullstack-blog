---
title: "OASIS 社交仿真框架架构深度解析"
date: "2026-04-26"
category: "architecture"
tags: ["oasis", "multi-agent", "simulation", "sqlite", "asyncio", "camel-ai", "llm"]
summary: "基于 camel-oasis 0.2.5 源码，深度解析 OASIS 社交网络仿真框架的内部架构：Channel 消息总线、Platform 事件循环、SocialAgent LLM 决策、推荐系统与 SQLite 状态管理。"
---

# OASIS 社交仿真框架架构深度解析

> 本文基于 camel-oasis 0.2.5 源码，结合实际部署经验写成。

## 一、OASIS 是什么

OASIS（**O**pen **A**gent **S**ocial **I**nteraction **S**imulator）是由 CAMEL-AI 团队开源的社交网络仿真框架。它的核心思想：**用大量 LLM 驱动的 Agent 模拟真实用户在社交平台上的行为演化**，从而在数字沙盘中预演舆论走势、市场反应、竞争博弈。

用一句话总结其定位：**给社会科学和商业预测装上 LLM 引擎的仿真实验室**。

---

## 二、整体架构鸟瞰

```
┌─────────────────────────────────────────────────────┐
│                   OasisEnv（环境层）                  │
│                                                     │
│  ┌──────────────────┐    ┌──────────────────────┐   │
│  │   AgentGraph     │    │      Platform        │   │
│  │                  │    │                      │   │
│  │  SocialAgent × N │    │  SQLite DB           │   │
│  │  ├─ ChatAgent    │    │  RecommendSystem     │   │
│  │  ├─ SocialAction │◄──►│  SandboxClock        │   │
│  │  └─ SocialEnv    │    │  PlatformUtils       │   │
│  └──────────────────┘    └──────────────────────┘   │
│              ▲                      ▲                │
│              └──────── Channel ─────┘                │
│                    (AsyncQueue)                      │
└─────────────────────────────────────────────────────┘
```

核心分为三层：
- **环境层**：`OasisEnv`，对外的统一接口（make / reset / step / close）
- **平台层**：`Platform`，扮演"服务端"角色，处理所有 Agent 的行为请求，维护 SQLite 状态
- **Agent 层**：`AgentGraph` + `SocialAgent`，扮演"用户"角色，由 LLM 驱动决策

三层之间通过 **Channel**（异步消息队列）通信，彻底解耦。

---

## 三、各模块深度解析

### 3.1 Channel：核心通信总线

Channel 是整个框架的神经系统，它实现了 Agent 和 Platform 之间的**异步消息传递**：

```python
class Channel:
    def __init__(self):
        self.receive_queue = asyncio.Queue()  # Agent → Platform
        self.send_dict    = AsyncSafeDict()   # Platform → Agent（按 message_id 寻址）

    async def write_to_receive_queue(self, action_info):
        message_id = str(uuid.uuid4())
        await self.receive_queue.put((message_id, action_info))
        return message_id

    async def read_from_send_queue(self, message_id):
        while True:
            if message_id in await self.send_dict.keys():
                return await self.send_dict.pop(message_id)
            await asyncio.sleep(0.1)  # 轮询等待
```

**一次 Agent 行为的完整消息流**：

```
SocialAction.perform_action()
    │
    ├─→ channel.write_to_receive_queue((agent_id, message, action_type))
    │        → 生成 message_id，放入 receive_queue
    │
    │   [Platform.running() 被唤醒]
    │        → 从 receive_queue 取出消息
    │        → 执行对应 DB 操作
    │        → channel.send_to((message_id, agent_id, result))
    │
    └─→ channel.read_from_send_queue(message_id)
             → 轮询 send_dict，拿到结果
             → 返回给 Agent
```

这个设计实现了典型的**请求-响应模式**，用 UUID 作为相关标识，支持多 Agent 并发请求而不混淆。

---

### 3.2 Platform：状态服务端

Platform 扮演整个虚拟社交平台的"服务器"，它有且只有一个持续运行的事件循环：

```python
async def running(self):
    while True:
        message_id, data = await self.channel.receive_from()
        agent_id, message, action = data
        action = ActionType(action)

        if action == ActionType.EXIT:
            self.db_cursor.close()
            self.db.close()
            break

        # 通过反射找到对应方法：create_post / like_post / follow...
        action_function = getattr(self, action.value, None)
        result = await action_function(**params)
        await self.channel.send_to((message_id, agent_id, result))
```

**关键设计：反射派发**。Platform 用 `getattr(self, action.value)` 将 ActionType 枚举值（如 `"create_post"`）直接映射到同名方法，无需 if-else 分支，非常优雅。

Platform 持有的核心状态：

| 属性 | 说明 |
|------|------|
| `self.db` + `self.db_cursor` | SQLite 连接，所有状态持久化 |
| `self.sandbox_clock` | 沙盒时钟，控制仿真时间流速（默认 60x 加速） |
| `self.recsys_type` | 推荐系统类型（Reddit / Twitter / Random） |
| `self.channel` | 与 Agent 的通信管道 |

---

### 3.3 SocialAgent：LLM 驱动的虚拟用户

`SocialAgent` 继承自 CAMEL 框架的 `ChatAgent`，在此基础上叠加了社交行为能力：

```python
class SocialAgent(ChatAgent):
    def __init__(self, agent_id, user_info, ...):
        # 构建系统提示（persona / bio / 行为规则）
        system_message = user_info.to_system_message()
        
        # 将所有 Action 包装成 OpenAI Function Calling 工具
        self.action_tools = [FunctionTool(func) for func in available_actions]
        
        super().__init__(system_message=system_message, tools=all_tools, ...)
        
        # 每个 Agent 有独立的 SocialEnvironment 感知环境
        self.env = SocialEnvironment(SocialAction(agent_id, channel))
```

**Agent 的一次决策流程**（`perform_action_by_llm`）：

```
1. env.to_text_prompt()       → 感知当前社交环境（推荐帖子、关注列表等）
2. 构造 user_msg              → "Please perform social media actions..."
3. self.astep(user_msg)       → 调用 LLM，让其选择 Function Call
4. 执行 tool_call             → 实际调用 SocialAction.create_post() 等
5. SocialAction → Channel → Platform → DB
```

关键点：**LLM 通过 Function Calling 选择行动，而不是生成文本指令再解析**。这种方式更结构化，不会出现格式错误，也便于扩展新行为。

---

### 3.4 OasisEnv：对外统一接口

`OasisEnv` 是整个框架的门面（Facade），只暴露 4 个方法：

```python
class OasisEnv:
    async def reset(self):
        """启动 Platform 后台任务，注册所有 Agent"""
        self.platform_task = asyncio.create_task(self.platform.running())
        self.agent_graph = await generate_custom_agents(
            channel=self.channel, agent_graph=self.agent_graph
        )

    async def step(self, actions: dict[SocialAgent, ManualAction | LLMAction]):
        """推进一轮仿真"""
        await self.platform.update_rec_table()  # 刷新推荐系统
        tasks = []
        for agent, action in actions.items():
            if isinstance(action, LLMAction):
                tasks.append(self._perform_llm_action(agent))
            elif isinstance(action, ManualAction):
                tasks.append(agent.perform_action_by_data(...))
        await asyncio.gather(*tasks)            # 并发执行所有 Agent 行为

    async def close(self):
        """优雅退出，发送 EXIT 信号让 Platform 关闭 DB 连接"""
        await self.channel.write_to_receive_queue((None, None, ActionType.EXIT))
        await self.platform_task
```

**reset() 为何耗时 ~186 秒？** 因为 `generate_custom_agents()` 需要为每个 Agent 执行 `sign_up()`，每次 sign_up 都是一个完整的 Channel 通信往返，36 个 Agent 串行注册，加上 LLM 生成 persona 的网络延迟，合计约 3 分钟。

---

### 3.5 RecommendSystem：信息茧房的实现

推荐系统是仿真"真实感"的关键。OASIS 支持多种策略（`update_rec_table()`）：

| 模式 | 算法 | 说明 |
|------|------|------|
| `RANDOM` | 随机抽取 | 基准对照组 |
| `REDDIT` | 热度权重（Wilson score）| 综合点赞/踩/时间衰减 |
| `TWITTER` | 关注图 + TF-IDF 相似度 | 优先推送关注者内容 |
| `TWHIN` | TwHIN-BERT 向量相似 | 语义推荐，需 GPU |

每轮 `env.step()` 开始前必须调用 `update_rec_table()`，它会重新计算每个用户的推荐队列（`rec` 表），写入 SQLite。Agent 调用 `refresh()` 时读取这个队列，决定"看到什么内容"。

这个机制是**信息茧房**、**舆论极化**等社会现象能在仿真中涌现的底层原因。

---

### 3.6 SQLite 数据库：仿真状态的唯一真相

所有仿真状态都持久化在一个 SQLite 文件中，核心表结构：

```sql
-- 注册用户（每个 Agent 对应一行）
CREATE TABLE user (
    user_id INTEGER PRIMARY KEY,
    agent_id INTEGER,
    user_name TEXT, name TEXT, bio TEXT,
    num_followings INTEGER, num_followers INTEGER
);

-- 帖子（支持转发/引用）
CREATE TABLE post (
    post_id INTEGER PRIMARY KEY,
    user_id INTEGER,
    original_post_id INTEGER,  -- 转发时指向原帖
    content TEXT,
    quote_content TEXT,        -- 引用时的评论内容
    num_likes INTEGER, num_dislikes INTEGER, num_shares INTEGER
);

-- 推荐队列（每轮刷新）
CREATE TABLE rec (user_id INTEGER, post_id INTEGER, PRIMARY KEY(user_id, post_id));

-- 全量行为日志（可回放仿真过程）
CREATE TABLE trace (user_id INTEGER, created_at DATETIME, action TEXT, info TEXT);
```

`trace` 表是最重要的分析数据源，记录了**每个 Agent 在每个时间步的每个行为及其参数**，可以完整回放整个仿真过程。

---

### 3.7 SandboxClock：时间加速

现实世界的舆论演化需要数天，仿真中通过时钟加速压缩时间：

```python
class Clock:
    def __init__(self, magnification=60):
        self.magnification = magnification  # 默认 60x 加速
    
    def time_transfer(self, current_time, start_time):
        """将仿真时刻映射为虚拟社会时间"""
        elapsed = (current_time - start_time).total_seconds()
        virtual_seconds = elapsed * self.magnification
        return start_time + timedelta(seconds=virtual_seconds)
```

默认 60 倍加速意味着：现实中跑 1 分钟仿真 ≈ 虚拟社会经过 1 小时。帖子的时间戳、推荐算法的时间衰减都基于这个虚拟时间计算，使舆论演化曲线更真实。

---

## 四、一次完整仿真的时序图

```
用户代码                  OasisEnv          Platform         AgentGraph
   │                        │                  │                 │
   │── oasis.make() ───────►│                  │                 │
   │                        │── create_task ──►│ running()       │
   │── await env.reset() ──►│                  │ 等待消息...      │
   │                        │── generate_agents────────────────►│
   │                        │                  │◄── sign_up×36 ──│
   │                        │                  │── DB写入36用户   │
   │◄─ env就绪 ─────────────│                  │                 │
   │                        │                  │                 │
   │── await env.step() ───►│                  │                 │
   │                        │── update_rec_table──►DB更新推荐队列 │
   │                        │── gather(LLMAction×36)───────────►│
   │                        │                  │◄── 36×Channel消息│
   │                        │                  │── DB写入行为日志  │
   │◄─ 一轮完成 ─────────────│                  │                 │
   │                        │                  │                 │
   │── await env.close() ──►│── EXIT信号 ──────►│── 关闭DB连接    │
```

---

## 五、架构设计的核心权衡

### 优点

- **彻底解耦**：Channel 把 Agent 和 Platform 完全分离，可以替换任一侧的实现
- **协议一致**：ManualAction（脚本注入）和 LLMAction（LLM 决策）用同一套接口，混合仿真天然支持
- **完整可追溯**：trace 表记录所有行为，仿真过程可完整回放和分析

### 局限

- **SQLite 单连接瓶颈**：Platform 用单一 SQLite 连接串行处理所有 DB 操作，高并发时容易出现 `database is locked`（需启用 WAL 模式缓解）
- **reset() 耗时长**：36 Agent 串行注册，每次都需要约 3 分钟，没有缓存机制
- **Channel 轮询开销**：`read_from_send_queue()` 每 100ms 轮询一次，Agent 数量大时 CPU 负担较高

---

## 六、总结

OASIS 的架构本质上是一个**事件驱动的多 Agent 仿真引擎**，用 asyncio 的协程并发代替多线程，用 Channel 消息队列解耦 Agent 和状态存储，用 SQLite 提供轻量级的仿真状态持久化。

它最聪明的地方在于：把"社交平台"抽象成一个有状态的服务端（Platform），把"用户行为"抽象成 Function Calling（SocialAction），两者通过异步消息通信——这和真实的互联网架构（前端 API 调用 → 后端服务处理 → DB 持久化）惊人地相似。只不过"前端"换成了 LLM 驱动的虚拟用户。
