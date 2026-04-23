---
title: "Hermes WebUI：给 Hermes Agent 安装一个浏览器控制台"
excerpt: "从安装到使用，全面解析 Hermes WebUI 的功能、优势与部署方式，以及它与 Claude Code 数据的兼容关系"
category: "ai"
tags: ["hermes", "ai-agent", "webui", "工具", "自托管"]
difficulty: "beginner"
publishedAt: "2026-04-13"
readTime: 15
---

# Hermes WebUI：给 Hermes Agent 安装一个浏览器控制台

Hermes Agent 是 Nous Research 开源的新一代 AI Agent，以"自进化"为核心卖点——它能在使用过程中自动积累 Skills、记忆用户习惯，越用越聪明。但它原生运行在终端里，对不习惯命令行的用户不太友好。

[hermes-webui](https://github.com/nesquena/hermes-webui) 正是为此而生：一个轻量、自托管的 Web 界面，让你从浏览器或手机就能操控 Hermes Agent，体验对标 Claude.ai 的三栏对话布局。

目前已获 **1,459 Stars**，MIT 开源，更新极为活跃（每天都有新提交）。

---

## 为什么需要 WebUI？

大多数 AI 工具每次对话都从零开始——不知道你是谁，不知道你的项目，每次都要重新解释上下文。

Hermes 的设计哲学完全相反：

- **跨会话持久记忆**：用户画像、Agent 笔记、可复用的 Skills 流程，Hermes 一次学会，永久记住
- **离线定时任务**：Cron Job 在你关机时也能执行，结果推送到 Telegram / Discord / Slack / 邮件
- **10+ 消息平台接入**：微信、飞书、Telegram 都能直接调用同一个 Agent
- **自动生成 Skills**：Agent 从经验中自动写 Skill 并保存，无需手动配置插件
- **模型无关**：OpenAI、Anthropic、Google、DeepSeek、OpenRouter 都支持

WebUI 在此基础上，把终端体验搬进浏览器，完整覆盖 CLI 的所有能力。

---

## 功能全览

### 对话核心

- SSE 流式响应（token 逐字实时显示）
- 内联**工具调用卡片**（展示工具名、参数、结果，可折叠）
- **子 Agent 委派卡片**（spawning Claude Code / Codex 等子任务时独立显示）
- **危险命令审批**：执行 shell 命令前弹出审批卡，可选"允许一次 / 本会话 / 始终 / 拒绝"
- Mermaid 流程图内联渲染
- Claude extended thinking / o3 推理块折叠展示
- 编辑历史消息并从该点重新生成
- Context token 用量 + 费用实时显示（composer 底部）
- 支持消息排队（上一条还没回完就可以发下一条）

### 会话管理

- 创建、重命名、复制、删除、全文搜索
- 置顶 / 归档
- **会话分组**（带颜色的项目组）
- **标签系统**（`#tag` 自动高亮，点击过滤）
- 按今天 / 昨天 / 更早分组显示（可折叠）
- 导出 Markdown / JSON，支持 JSON 导入
- **CLI 会话桥接**：终端里跑的 Hermes 会话，也会同步显示到 Web 侧边栏

### 工作区文件浏览器

- 目录树展开 / 折叠
- 面包屑导航
- 文本、代码、Markdown（渲染后）、图片内联预览
- 文件增删改查，新建文件夹
- **Git 状态检测**：显示分支名 + 脏文件数徽章
- 右侧面板可拖动调整宽度

### 左侧导航面板

| 面板 | 功能 |
|------|------|
| Chat | 会话列表、搜索、分组、新对话 |
| Tasks | Cron 任务管理、运行历史 |
| Skills | 技能列表、搜索、预览、编辑 |
| Memory | 查看/编辑 MEMORY.md 和 USER.md |
| Profiles | 多配置文件切换（不同 API Key / 模型） |
| Todos | 当前会话的 Todo 实时列表 |
| Spaces | 工作区管理、快速切换 |

### 其他亮点

- **语音输入**（Web Speech API，~2 秒静音自动停止）
- 6 套内置主题：Dark / Light / Slate / Solarized Dark / Monokai / Nord
- 斜杠命令：`/model`、`/theme`、`/compact`、`/usage` 等
- 移动端响应式（iOS 风格底部导航栏）
- 可选密码保护（HMAC Cookie，默认关闭）
- SSH 隧道 / Tailscale 远程访问支持

---

## 技术栈

这个项目的技术选型非常克制：

**后端**：纯 Python，无框架（`server.py` 只有 83 行路由代码），SSE 流式传输，SQLite 复用 Hermes agent 的 session store

**前端**：原生 JavaScript + HTML/CSS，无打包工具，无框架。Prism.js 语法高亮，Mermaid.js 图表渲染，Web Speech API 语音输入

**容器**：多架构 Docker 镜像（amd64 + arm64），发布在 GHCR

**测试**：pytest，433 个测试 / 23 个测试文件

这意味着：零构建时间，部署极简，贡献门槛低。

---

## 安装方式

### 方式一：Bootstrap 脚本（推荐新手）

```bash
git clone https://github.com/nesquena/hermes-webui.git ~/hermes-webui
cd ~/hermes-webui
python3 bootstrap.py --no-browser
```

Bootstrap 会自动：
1. 检测 Hermes Agent，如未安装则自动安装
2. 创建 Python 虚拟环境并安装依赖
3. 启动 Web 服务，等待 /health 健康检查通过
4. 默认打开浏览器（`--no-browser` 跳过）

访问 http://localhost:8787

### 方式二：Docker（最省心）

```bash
docker pull ghcr.io/nesquena/hermes-webui:latest
docker run -d \
  -e WANTED_UID=$(id -u) -e WANTED_GID=$(id -g) \
  -v ~/.hermes:/home/hermeswebui/.hermes \
  -v ~/workspace:/workspace \
  -p 8787:8787 ghcr.io/nesquena/hermes-webui:latest
```

访问 http://localhost:8787

### 方式三：Docker Compose（推荐生产）

```bash
git clone https://github.com/nesquena/hermes-webui.git
cd hermes-webui
docker compose up -d
```

---

## 关键环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HERMES_WEBUI_PORT` | 8787 | 监听端口 |
| `HERMES_WEBUI_HOST` | 127.0.0.1 | 绑定地址（改 0.0.0.0 可外网访问） |
| `HERMES_WEBUI_PASSWORD` | 未设置 | 设置后开启密码保护 |
| `HERMES_WEBUI_STATE_DIR` | `~/.hermes/webui-mvp` | 会话状态存储目录 |
| `HERMES_WEBUI_DEFAULT_MODEL` | openai/gpt-5.4-mini | 默认模型 |

---

## 远程 / 手机访问

**SSH 隧道**（最安全）：
```bash
ssh -N -L 8787:127.0.0.1:8787 user@your.server.com
```
本地打开 http://localhost:8787 即可。

**Tailscale**（手机访问推荐）：
```bash
HERMES_WEBUI_HOST=0.0.0.0 HERMES_WEBUI_PASSWORD=your-secret ./start.sh
```

---

## Hermes 能沿用 Claude Code 的基础数据吗？

这是个很实际的问题，尤其是用了 Claude Code 很久、积累了大量 Skills 和配置的用户。

### 数据类型对比

| 数据类型 | Claude Code 位置 | Hermes 位置 | 可迁移？ |
|----------|-----------------|-------------|---------|
| Skills（技能脚本） | `~/.claude/skills/` | `~/.hermes/skills/` | **可以**，格式相同（SKILL.md） |
| Memory / 用户画像 | `~/.claude/` 无直接等价 | `~/.hermes/memories/USER.md` | 手动整理后迁移 |
| Agent 笔记 | 无 | `~/.hermes/memories/MEMORY.md` | 需手写 |
| 会话历史 | `~/.claude/sessions/` | `~/.hermes/state.db` | **不兼容**（格式不同） |
| 模型配置 | `~/.claude/settings.json` | `~/.hermes/config.yaml` | 手动转换 |
| MCP 配置 | `~/.claude/mcp.json` | Hermes 暂不支持 MCP | 不适用 |
| Hooks | `~/.claude/hooks/` | Hermes 无等价概念 | 不适用 |

### Skills 迁移（最有价值）

Claude Code 和 Hermes 的 Skills 格式基本一致，都是 YAML frontmatter + Markdown 正文的 `.md` 文件。理论上可以直接复制，但实践时需注意：

1. **命令引用**：CC Skills 里如果有 `claude` CLI 命令，在 Hermes 里要换成 `hermes`
2. **工具名差异**：CC 的工具名（如 `Bash`、`Write`）和 Hermes 的工具名（如 `terminal`、`write_file`）不同，但 Skills 通常只是文字描述，不硬编码工具名
3. **路径引用**：`~/.claude/` 的路径引用需要改成 `~/.hermes/`

批量复制命令（复制后需人工校验）：
```bash
cp -r ~/.claude/skills/* ~/.hermes/skills/
```

### Memory 迁移

Hermes 的记忆系统有两个文件：
- `~/.hermes/memories/USER.md`：用户画像（你是谁，工作背景，偏好）
- `~/.hermes/memories/MEMORY.md`：Agent 的工作笔记（环境信息，项目约定，踩坑记录）

CC 没有完全对等的文件，但你可以把 CC 的 `CLAUDE.md`（项目级指令）、自定义系统提示等内容整理后写入这两个文件。

### 会话历史

两者的会话存储格式完全不同（CC 用 JSONL，Hermes 用 SQLite），**不支持迁移**。

### 结论

Skills 可以大部分直接复用（批量复制，逐个校验），Memory 需要人工整理，会话历史无法迁移。但 Hermes 的核心价值在于**从现在开始**积累，越用积累越多，历史数据不是关键。

---

## 与 Claude Code 的核心差异

| 维度 | Claude Code | Hermes Agent |
|------|-------------|--------------|
| 运行方式 | 终端 CLI，面向代码任务 | 多平台（终端/Web/消息App），通用 Agent |
| 记忆持久化 | 项目级 CLAUDE.md | 全局跨会话 Memory + Skills |
| 定时任务 | 无 | 内置 Cron，可离线执行 |
| Web 界面 | 无（第三方 GUI 工具） | hermes-webui（官方社区维护） |
| 模型支持 | Anthropic 为主 | 完全模型无关 |
| Skills 系统 | 社区维护，手动安装 | 自动从经验生成 |
| 开源协议 | 私有 | MIT |

---

## 快速上手建议

1. 先用 Bootstrap 脚本在本地跑起来：`python3 bootstrap.py`
2. 在 Profiles 面板配置好你的 API Key 和默认模型
3. 在 Memory 面板填写你的用户画像（工作背景、偏好、常用技术栈）
4. 把 Claude Code 里最常用的 Skills 复制过来校验一遍
5. 试用 Tasks 面板创建一个定时 Cron 任务（比如每日 AI 资讯摘要）

Hermes WebUI 目前仍在高速迭代中，功能更新频繁，值得持续关注。

---

*本文基于 hermes-webui v0.8.0 及以上版本，GitHub：https://github.com/nesquena/hermes-webui*
