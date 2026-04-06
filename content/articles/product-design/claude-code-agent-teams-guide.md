---
title: "Claude Code Agent Teams/Swarm 使用指南"
excerpt: "Agent Teams（也叫 Swarm）是 Claude Code 的多 agent 协作功能，允许你创建一个团队，由多个 AI agents 并行工作，共同完成复杂任务。"
category: "product-design"
tags: []
publishedAt: "2026-03-26"
readTime: 15
---

## 🎯 什么是 Agent Teams

Agent Teams（也叫 Swarm）是 Claude Code 的多 agent 协作功能，允许你创建一个团队，由多个 AI agents 并行工作，共同完成复杂任务。

### 核心概念

```
Team = TaskList (1:1 对应)

Leader (你)
  ├─ Agent A (frontend)
  ├─ Agent B (backend)
  └─ Agent C (testing)
       ↓
  共享任务列表 (~/.claude/tasks/{team-name}/)
```

---

## 📋 完整工作流程

### Step 1: 创建团队

```bash
# 使用 TeamCreate 工具
TeamCreate(
  team_name="user-mgmt",           # 团队名称
  description="用户管理功能开发",   # 团队描述（可选）
  agent_type="team-lead"           # 你的角色（可选）
)
```

**创建后会生成**:
- 团队配置: `~/.claude/teams/user-mgmt/config.json`
- 任务目录: `~/.claude/tasks/user-mgmt/`

---

### Step 2: 创建任务列表

使用 Task 工具拆分工作：

```bash
# 任务 1: 前端开发
TaskCreate(
  subject="实现用户管理 UI",
  description="使用 React 创建用户列表、添加、编辑、删除界面",
  activeForm="开发用户管理 UI"
)

# 任务 2: 后端 API
TaskCreate(
  subject="实现用户管理 API",
  description="创建 RESTful API: GET/POST/PUT/DELETE /api/users",
  activeForm="开发用户管理 API"
)

# 任务 3: 数据库迁移
TaskCreate(
  subject="创建用户表迁移",
  description="设计 users 表 schema 并创建迁移脚本",
  activeForm="创建数据库迁移"
)

# 任务 4: 集成测试
TaskCreate(
  subject="编写集成测试",
  description="测试前后端完整流程",
  activeForm="编写集成测试"
)
```

---

### Step 3: 设置任务依赖（可选）

```bash
# 任务 4 依赖任务 1, 2, 3
TaskUpdate(
  taskId="4",
  addBlockedBy=["1", "2", "3"]
)

# 这样任务 4 会等待前三个完成后才能开始
```

---

### Step 4: 派生团队成员

**关键：选择正确的 agent 类型**

```bash
# 前端开发 agent（需要文件编辑能力）
Agent(
  name="frontend-dev",              # 成员名称
  team_name="user-mgmt",            # 加入的团队
  subagent_type="general-purpose",  # 通用 agent（有编辑能力）
  description="前端开发",
  prompt="你负责实现用户管理的前端界面。请查看任务列表，认领任务 1 并开始开发。"
)

# 后端开发 agent
Agent(
  name="backend-dev",
  team_name="user-mgmt",
  subagent_type="general-purpose",
  description="后端开发",
  prompt="你负责实现用户管理的后端 API。请查看任务列表，认领任务 2 并开始开发。"
)

# 测试 agent
Agent(
  name="tester",
  team_name="user-mgmt",
  subagent_type="general-purpose",
  description="测试工程师",
  prompt="你负责编写测试。请等待任务 4 解除阻塞后认领并开始工作。"
)
```

**⚠️ Agent 类型选择规则**:
- ✅ `general-purpose`: 有 Read/Edit/Write/Bash 等全部工具
- ❌ `Explore`: 只能搜索和读取，**不能编辑文件**
- ❌ `Plan`: 只能规划，**不能编辑文件**

**原则**: 需要实现代码的任务必须用 `general-purpose`

---

### Step 5: 分配任务

**方法 1: 自动认领**（推荐）
```bash
# Agent 会自动检查 TaskList，认领未分配的任务
# 在 Agent 的 prompt 中指示：
"请使用 TaskList 查看可用任务，用 TaskUpdate 认领任务（设置 owner 为你的名字），然后开始工作。"
```

**方法 2: 手动分配**
```bash
# 作为 Leader，你可以分配任务
TaskUpdate(
  taskId="1",
  owner="frontend-dev"
)

# 然后通知 agent
SendMessage(
  to="frontend-dev",
  summary="任务已分配",
  message="任务 1 已分配给你，请开始开发用户管理 UI。"
)
```

---

### Step 6: 监控进度

```bash
# 查看任务状态
TaskList()

# 输出示例：
# | ID | Subject              | Status      | Owner        | BlockedBy |
# |----|---------------------|-------------|--------------|-----------|
# | 1  | 实现用户管理 UI       | in_progress | frontend-dev | []        |
# | 2  | 实现用户管理 API     | in_progress | backend-dev  | []        |
# | 3  | 创建用户表迁移       | completed   | -            | []        |
# | 4  | 编写集成测试         | pending     | -            | [1, 2]    |
```

---

### Step 7: 与团队成员沟通

**自动消息传递**:
- Agents 完成任务后会自动向你发送消息
- 消息会自动显示在你的对话中（不需要手动检查）

**主动发送消息**:
```bash
SendMessage(
  to="frontend-dev",
  summary="需要修改",
  message="请在用户列表中添加分页功能。"
)

# 广播给所有成员
SendMessage(
  to="*",
  summary="重要通知",
  message="API 端点已改为 /api/v2/users"
)
```

---

### Step 8: 处理 Agent 空闲

**重要概念**: Agent 在每轮对话后会自动进入 idle 状态，这是正常的！

```
Agent 工作流:
1. 收到消息/任务
2. 执行工作
3. 发送结果消息
4. 自动进入 idle ✅ ← 这是正常的！
```

**处理方式**:
- ✅ Idle 不是错误，只是等待下一条指令
- ✅ 如果有新任务，直接 SendMessage 唤醒
- ❌ 不要担心 idle 状态或频繁检查

**示例**:
```bash
# Agent 报告完成任务 1 后进入 idle
# 你可以：

# 方案 1: 分配新任务
SendMessage(
  to="frontend-dev",
  summary="新任务",
  message="请认领任务 5（添加用户搜索功能）。"
)

# 方案 2: 让他自己找
SendMessage(
  to="frontend-dev",
  summary="继续工作",
  message="任务 1 完成得很好，请查看 TaskList 认领下一个可用任务。"
)

# 方案 3: 什么都不做（如果没有更多工作）
# Agent 会保持 idle，等待你的指令
```

---

### Step 9: 优雅关闭团队

**关闭流程**:

```bash
# 1. 向所有成员发送关闭请求
SendMessage(
  to="frontend-dev",
  summary="请求关闭",
  message={
    "type": "shutdown_request",
    "reason": "任务已完成"
  }
)

SendMessage(
  to="backend-dev",
  summary="请求关闭",
  message={
    "type": "shutdown_request",
    "reason": "任务已完成"
  }
)

# 2. Agents 会响应并关闭

# 3. 所有成员关闭后，删除团队
TeamDelete()
```

**⚠️ 注意**:
- 只有在所有成员关闭后才能 TeamDelete
- 如果有成员未关闭，TeamDelete 会失败

---

## 🎨 实战示例

### 示例 1: 全栈功能开发

```bash
# 场景：开发博客评论功能

# 1. 创建团队
TeamCreate(team_name="blog-comments")

# 2. 创建任务
TaskCreate(subject="设计评论数据模型", description="...")
TaskCreate(subject="实现后端 API", description="...")
TaskCreate(subject="实现前端组件", description="...")
TaskCreate(subject="编写单元测试", description="...")

# 3. 设置依赖
TaskUpdate(taskId="2", addBlockedBy=["1"])  # API 依赖数据模型
TaskUpdate(taskId="3", addBlockedBy=["2"])  # 前端依赖 API
TaskUpdate(taskId="4", addBlockedBy=["3"])  # 测试依赖前端

# 4. 派生 agents
Agent(name="backend", team_name="blog-comments",
      subagent_type="general-purpose",
      prompt="负责任务 1 和 2")

Agent(name="frontend", team_name="blog-comments",
      subagent_type="general-purpose",
      prompt="等待任务 3 解除阻塞后开始")

Agent(name="tester", team_name="blog-comments",
      subagent_type="general-purpose",
      prompt="等待任务 4 解除阻塞后开始")

# 5. 监控和协调
TaskList()  # 定期查看进度
SendMessage(...)  # 根据需要沟通

# 6. 完成后关闭
SendMessage(to="*", message={"type": "shutdown_request"})
TeamDelete()
```

---

### 示例 2: 代码审查 + 修复

```bash
# 场景：审查一个 PR 并修复发现的问题

# 1. 创建团队
TeamCreate(team_name="pr-review")

# 2. 创建任务
TaskCreate(subject="审查代码质量", description="检查代码规范、安全性")
TaskCreate(subject="审查测试覆盖", description="检查测试完整性")
TaskCreate(subject="修复发现的问题", description="根据审查结果修复")

# 3. 设置依赖
TaskUpdate(taskId="3", addBlockedBy=["1", "2"])

# 4. 派生 agents
Agent(name="code-reviewer", team_name="pr-review",
      subagent_type="general-purpose",  # 需要读写能力记录问题
      prompt="审查 PR #123 的代码质量，认领任务 1")

Agent(name="test-reviewer", team_name="pr-review",
      subagent_type="general-purpose",
      prompt="审查 PR #123 的测试覆盖，认领任务 2")

Agent(name="fixer", team_name="pr-review",
      subagent_type="general-purpose",
      prompt="等待任务 3 解除阻塞，修复审查中发现的问题")

# 5. 等待完成
# Reviewers 会完成审查并标记任务为 completed
# Fixer 会自动开始修复

# 6. 关闭
SendMessage(to="*", message={"type": "shutdown_request"})
TeamDelete()
```

---

### 示例 3: 研究 + 实现流水线

```bash
# 场景：研究某个技术并实现 POC

# 1. 创建团队
TeamCreate(team_name="tech-research")

# 2. 创建任务
TaskCreate(subject="研究技术方案", description="调研 3 种方案的优缺点")
TaskCreate(subject="选择方案", description="根据研究结果推荐方案")
TaskCreate(subject="实现 POC", description="实现选定方案的原型")

# 3. 设置依赖
TaskUpdate(taskId="2", addBlockedBy=["1"])
TaskUpdate(taskId="3", addBlockedBy=["2"])

# 4. 派生 agents
Agent(name="researcher", team_name="tech-research",
      subagent_type="Explore",  # 只需要搜索能力
      prompt="研究 GraphQL vs REST vs gRPC，认领任务 1")

Agent(name="architect", team_name="tech-research",
      subagent_type="Plan",  # 只需要规划能力
      prompt="等待任务 2，根据研究结果推荐方案")

Agent(name="developer", team_name="tech-research",
      subagent_type="general-purpose",  # 需要编辑能力
      prompt="等待任务 3，实现选定的方案")

# 5. 完成后关闭
SendMessage(to="*", message={"type": "shutdown_request"})
TeamDelete()
```

---

## 🚨 常见问题

### Q1: Agent 类型选错了怎么办？

**问题**: 派生了 `Explore` agent 但需要它写代码
```bash
❌ Agent(name="dev", subagent_type="Explore", prompt="写一个登录功能")
# Explore agent 没有 Edit/Write 工具，无法写代码！
```

**解决**:
1. 关闭错误的 agent
2. 重新派生正确类型的 agent

---

### Q2: 任务一直是 pending 状态？

**原因**:
- Agent 没有主动认领（`TaskUpdate` 设置 `owner`）
- 任务被其他任务阻塞（`blockedBy` 不为空）

**解决**:
```bash
# 检查任务状态
TaskList()

# 如果是阻塞问题，完成阻塞任务
# 如果是认领问题，手动分配或提醒 agent
SendMessage(to="agent-name", message="请使用 TaskUpdate 认领任务")
```

---

### Q3: Agent 不回复消息？

**可能原因**:
1. Agent 还在处理中（等待）
2. Agent 遇到错误卡住了
3. Agent 名字写错了

**调试**:
```bash
# 检查团队成员
Read ~/.claude/teams/{team-name}/config.json

# 重新发送消息（确认名字正确）
SendMessage(to="正确的名字", message="...")
```

---

### Q4: 如何查看 Agent 之间的对话？

**Peer DM 可见性**:
- 当 Agent A 给 Agent B 发消息时
- Team Lead（你）会在 idle 通知中看到简要摘要
- 但看不到完整消息内容

**如果需要完整内容**:
```bash
# 直接问相关 agent
SendMessage(
  to="agent-a",
  summary="查询",
  message="你和 agent-b 讨论了什么？"
)
```

---

### Q5: TeamDelete 失败？

**错误**: `Cannot delete team with active members`

**原因**: 还有 agent 在运行

**解决**:
```bash
# 1. 检查所有成员
Read ~/.claude/teams/{team-name}/config.json

# 2. 逐个关闭
SendMessage(to="agent-1", message={"type": "shutdown_request"})
SendMessage(to="agent-2", message={"type": "shutdown_request"})

# 3. 等待所有成员关闭后再删除
TeamDelete()
```

---

## 💡 最佳实践

### 1. 任务拆分原则
- ✅ 每个任务足够独立（可以并行）
- ✅ 任务描述清晰（agent 能理解）
- ✅ 设置合理的依赖关系
- ❌ 不要创建过细的任务（增加协调成本）

### 2. Agent 分配原则
- ✅ 根据任务性质选择 agent 类型
- ✅ 给每个 agent 明确的职责
- ✅ 在 prompt 中说明如何认领任务
- ❌ 不要让太多 agent 竞争同一任务

### 3. 沟通原则
- ✅ 使用 SendMessage 传递信息（不要用 bash）
- ✅ 重要变更广播给所有成员（`to="*"`）
- ✅ 定期检查 TaskList 了解进度
- ❌ 不要过度干预 agent 的工作细节

### 4. 任务优先级
- ✅ Agent 应优先处理 ID 较小的任务
- ✅ 早期任务通常为后续任务铺垫上下文
- ❌ 不要随意跳过任务

### 5. 资源清理
- ✅ 完成后及时关闭 agents
- ✅ 删除团队释放资源
- ❌ 不要留下僵尸团队

---

## 📊 何时使用 Teams

### ✅ 适合使用 Teams 的场景

1. **多个独立的子任务**
   - 全栈开发（前端 + 后端 + 数据库）
   - 多模块功能开发

2. **需要并行处理**
   - 时间紧迫的任务
   - 相互独立的工作

3. **不同专业领域**
   - 研究 + 设计 + 实现
   - 代码审查 + 测试 + 修复

4. **复杂项目**
   - 5+ 个相关任务
   - 需要协调多个方面

### ❌ 不适合使用 Teams 的场景

1. **简单任务**
   - 单个文件修改
   - 快速 bug 修复

2. **高度依赖的顺序任务**
   - 每一步都依赖上一步的结果
   - 需要频繁调整方向

3. **探索性工作**
   - 需求不明确
   - 方向可能大幅变化

**原则**: 当任务可以清晰拆分且相对独立时，使用 Teams

---

## 🔗 相关工具

- **EnterPlanMode**: 使用 Teams 前先规划（推荐）
- **EnterWorktree**: 如果需要隔离环境
- **TaskCreate/Update/List**: 任务管理
- **SendMessage**: 团队沟通

---

## 📚 进阶阅读

1. 阅读系统提示中的 `TeamCreate` 工具说明
2. 查看 `Agent` 工具的 subagent_type 选项
3. 了解 Task 工具的完整 API
4. 研究 SendMessage 的协议响应机制

---

**最后更新**: 2026-03-26
**作者**: Claude Code (Opus 4.6)
