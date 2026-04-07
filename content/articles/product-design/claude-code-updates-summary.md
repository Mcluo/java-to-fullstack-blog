---
title: "Claude Code 更新整理"
excerpt: "1. 过度工程避免原则 - ✅ 只做必要修改 - ❌ 不要添加未请求的特性 - ❌ 不要过度重构周边代码 - ❌ 不要添加\"以防万一\"的错误处理 - ❌ 不要为单次使用创建抽象"
category: "product-design"
tags: []
publishedAt: "2026-04-07"
readTime: 8
---

**整理时间**: 2026-04-07 (持续更新)
**当前最新版本**: 2.1.92 (2026-04-04)
**当前安装版本**: 2.1.91

---

<img src="/images/cc-updates/claude-code-mindmap.svg" alt="Claude Code 功能全景思维导图" style="max-width:100%;margin:1em 0;" />

## 🚀 核心能力更新

### 1. 模型升级
- **Claude Opus 4.6**: 最新最强大的模型
- **Claude Sonnet 4.6**: 平衡性能和速度
- **Claude Haiku 4.5**: 快速响应场景
- **Fast Mode**: 使用相同的 Opus 4.6，但输出更快（/fast 切换）

### 2. 多平台支持
- ✅ **CLI 工具** (Mac/Linux/Windows)
- ✅ **桌面应用** (Mac/Windows)
- ✅ **Web 应用** (claude.ai/code)
- ✅ **IDE 插件** (VS Code, JetBrains)

---

## 📦 新功能特性

### 团队协作 (Team/Swarm)
```bash
# 创建团队并行工作
TeamCreate → 生成任务列表 → 分配给多个 agents → 并行执行
```

**核心能力**:
- [多 agent 协作](/articles/product-design/claude-code-agent-teams-guide)，任务自动分配
- 共享任务列表 (`~/.claude/tasks/{team-name}/`)
- 自动消息传递和状态同步
- 优雅关闭和资源清理

**使用场景**:
- 全栈功能开发（前后端并行）
- 代码重构 + 测试保持
- 研究 → 规划 → 编码流水线

### Worktree 隔离开发
```bash
# 独立环境并行开发
EnterWorktree → 隔离修改 → ExitWorktree (keep/remove)
```

**特点**:
- Git worktree 自动管理
- 临时分支自动创建
- 支持保留或删除变更
- 适合实验性开发

### 任务管理系统
```bash
TaskCreate  → 创建任务
TaskList    → 查看所有任务
TaskUpdate  → 更新状态/分配
TaskGet     → 获取详情
```

**状态流转**: `pending` → `in_progress` → `completed` / `deleted`

### 计划模式 (Plan Mode)
```bash
EnterPlanMode → 探索代码库 → 设计方案 → ExitPlanMode (用户审批)
```

**适用场景**:
- 新功能实现（多种实现方式）
- 架构决策（需要权衡）
- 多文件修改（影响面大）
- 需求不明确（需要探索）

---

## 🛠️ 工具生态

### MCP 服务器集成
- **Context7**: 获取最新技术文档和代码示例
- **[Playwright](/articles/tools-and-tips/claude-code-browser-automation-guide)**: 浏览器自动化
- **Sequential Thinking**: 复杂问题推理
- **21st Magic**: UI 组件生成
- **Yuque**: 语雀文档读取
- **ODPS Query**: MaxCompute 查询

### Skill 系统
- 100+ 开箱即用的 skills
- 自定义 skill 创建 (`/.claude/skills/`)
- 支持 `/skill-name` 快速调用
- YAML frontmatter 元数据

### 权限管理
- **多层级配置**: global > user > project > local
- **hooks 系统**:
  - `UserPromptSubmitHook`: 提交前检查
  - `WorktreeCreate/Remove`: Worktree 生命周期
- **自动/手动审批**: 根据工具和上下文智能决策

---

## 💾 记忆系统

### 自动记忆 (Auto Memory)
**位置**: `~/.claude/projects/{project}/memory/`

**类型**:
1. **user**: 用户角色、偏好、知识背景
2. **feedback**: 工作方式指导（要做/不做）
3. **project**: 进行中的工作、目标、截止日期
4. **reference**: 外部系统资源指针

**格式**:
```markdown
---
name: 记忆名称
description: 一行描述（用于相关性判断）
type: user|feedback|project|reference
---

记忆内容
**Why:** 原因/动机
**How to apply:** 应用场景
```

**索引**: `MEMORY.md` (始终加载，<200 行限制)

### Session 记录
- 对话历史自动保存 (`.jsonl`)
- `/session-restore` 恢复历史会话
- 上下文压缩（接近限制时自动）

---

## 🔧 实用命令

### 内置命令
```bash
/help         # 帮助文档
/fast         # 切换快速模式
/clear        # 清空对话
! <command>   # 在当前会话执行 shell 命令
```

### Git 工作流
```bash
# 自动提交
Git Safety Protocol:
- 创建新 commit（不是 amend）
- 失败时修复后再次提交（不是 amend）
- 尊重 pre-commit hooks
- 避免破坏性操作（需确认）

# PR 创建
自动分析全部 commits → 生成 title + body → 创建 PR
```

### 并行执行
- 多个独立的工具调用可在单个响应中并行执行
- 例：同时读取多个文件、并行搜索

---

## ⚡ 性能优化

### 工具选择优先级
1. **专用工具优先**:
   - ❌ `cat` → ✅ `Read`
   - ❌ `sed/awk` → ✅ `Edit`
   - ❌ `echo >` → ✅ `Write`
   - ❌ `find` → ✅ `Glob`
   - ❌ `grep` → ✅ `Grep`

2. **Agent 使用策略**:
   - 简单搜索：直接用 `Glob/Grep`
   - 复杂探索：`Agent(subagent_type=Explore)`
   - 避免重复：不要与 subagent 做同样的工作

3. **并行化**:
   - 独立任务 → 单个消息多个工具调用
   - 依赖任务 → 链式调用（`&&` 或多轮）

---

## 🎯 最佳实践

### 1. 过度工程避免原则
- ✅ 只做必要修改
- ❌ 不要添加未请求的特性
- ❌ 不要过度重构周边代码
- ❌ 不要添加"以防万一"的错误处理
- ❌ 不要为单次使用创建抽象

### 2. 安全操作原则
**需要确认的危险操作**:
- 破坏性：删除文件/分支、`rm -rf`、覆盖未提交代码
- 难撤销：`git push --force`、`git reset --hard`
- 影响他人：推送代码、创建/关闭 PR/Issue、发送消息
- 上传第三方：diagram 渲染器、pastebin（可能泄露敏感信息）

**原则**: 谨慎行事，有疑问时先问

### 3. 输出效率
- 直奔主题，先答案后推理
- 跳过无用的铺垫和过渡
- 只解释必要的内容
- 一句话能说清楚就不用三句

### 4. 记忆管理
```bash
# 新 Session 必做
Read insights/patterns.md      # 用户偏好
Read lessons/mistakes.md        # 历史错误
Read insights/weekly-*.md       # 本周关键信息

# 对话中
发现新模式 → Write to insights/
踩到新坑   → Write to lessons/
用户纠正   → 立即更新记忆

# 对话结束
总结保存 → 告知位置 → 确认写入
```

---

## 📊 使用场景示例

### 场景 1: 快速 Bug 修复
```
用户: "修复登录页面的 typo"
→ 直接 Read + Edit（不需要 Plan Mode）
```

### 场景 2: 新功能开发
```
用户: "添加用户认证功能"
→ EnterPlanMode
→ 探索代码库（架构、现有模式）
→ 设计方案（session vs JWT, 中间件结构）
→ ExitPlanMode（用户审批）
→ 实现
```

### 场景 3: 团队并行开发
```
用户: "实现全栈用户管理功能"
→ TeamCreate(name="user-mgmt")
→ TaskCreate: 前端 UI / 后端 API / 数据库迁移
→ Agent(name="frontend") / Agent(name="backend")
→ 并行开发，共享任务列表
→ 完成后 TeamDelete
```

### 场景 4: 实验性重构
```
用户: "尝试重构认证模块"
→ EnterWorktree(name="auth-refactor")
→ 修改代码
→ 测试失败/不满意
→ ExitWorktree(action="remove", discard_changes=true)
→ 无副作用清理
```

---

## 🔗 资源链接

- **文档**: 在 Claude Code 中使用 `/help` 查看
- **反馈**: https://code.alibaba-inc.com/claude-code/ali-claude-code/issues
- **模型**: Claude 4.5/4.6 系列（Opus/Sonnet/Haiku）
- **API**: Claude API (原 Anthropic API)

---

## 📅 版本更新追踪

| 版本 | 发布日期 | 主要变化 |
|------|----------|----------|
| 2.1.92 | 2026-04-04 | Latest (npm latest + next) |
| 2.1.91 | 2026-04-03 | 当前安装版本 |
| 2.1.90 | 2026-04-02 | - |
| 2.1.89 | 2026-04-01 | - |
| 2.1.88 | 2026-03-31 | - |
| 2.1.87 | 2026-03-29 | - |
| 2.1.86 | 2026-03-28 | - |
| 2.1.85 | 2026-03-27 | stable 标签版本 |
| 2.1.84 | 2026-03-26 | - |
| 2.1.83 | 2026-03-25 | - |

> 💡 Claude Code 保持高频更新节奏（几乎每日一版），dist-tags: `latest=2.1.92`, `stable=2.1.85`

---

## 🆕 近期更新亮点 (2026-04 观测)

### 定时任务系统 (CronCreate) 🆕
```bash
# 创建持久化定时任务
CronCreate → 标准 5 字段 cron 表达式 → 本地时区
# 自动到期：recurring 任务 7 天后自动删除
# 持久化：durable=true 写入 .claude/scheduled_tasks.json
```

**核心能力**:
- 支持一次性提醒和循环调度
- 本地时区，无需手动转换
- `durable: true` 跨 session 存活
- 自动避开 :00 和 :30 整点（减少 API 拥挤）
- `CronList` / `CronDelete` 管理

### Agent 子类型大幅扩展 🆕
现已支持 50+ 种专业 Agent 类型：
- **开发**: Frontend Developer, Backend Architect, Mobile App Builder, Senior Developer
- **测试/质量**: Code Reviewer, Evidence Collector, Test Results Analyzer, API Tester
- **安全**: Security Engineer, Threat Detection Engineer
- **设计**: UI Designer, UX Researcher, UX Architect
- **运维**: SRE, DevOps Automator, Performance Benchmarker
- **AI/数据**: AI Engineer, Data Engineer, Database Optimizer
- **内容**: Technical Writer, Brand Guardian, Visual Storyteller
- **特殊**: Embedded Firmware Engineer, Solidity Smart Contract Engineer, WeChat Mini Program Developer

### Auto Mode 增强 🆕
- 连续自主执行模式
- 减少中断，合理假设后直接行动
- 偏向行动而非规划
- 支持用户随时纠偏
- 危险操作仍需确认

### Companion (Gravy 小猫) 🆕
- 输入框旁的虚拟伴侣
- 独立的 speech bubble 交互
- 用户可直接与 Gravy 对话

### 团队协作能力
- 多 agent 协同工作
- 自动任务分配和状态同步
- 适合大型复杂任务

### 记忆系统增强
- 自动记忆持久化
- 分层索引（MEMORY.md + 详细文件）
- 跨 session 上下文保持
- 新增：记忆验证机制（先检查文件/函数是否仍存在）

### 工具生态丰富
- MCP 服务器集成（Context7、Figma OAuth、21st Magic 等）
- 100+ skills 开箱即用
- 自定义扩展能力

### 性能和体验优化
- Fast Mode 快速响应（同模型 Opus 4.6，输出更快）
- 并行工具执行
- 智能权限管理

---

## 💡 使用建议

1. **充分利用 Plan Mode**: 复杂任务前先规划，避免返工
2. **善用团队协作**: 大型任务拆分后并行处理
3. **维护记忆系统**: 重要决策和教训及时保存
4. **选择合适工具**: 专用工具优于通用 bash
5. **注意安全操作**: 破坏性操作前确认

---

**最后更新**: 2026-04-07
**整理人**: Claude Code (Opus 4.6)
**更新方式**: 每日自动检查 + 手动补充
