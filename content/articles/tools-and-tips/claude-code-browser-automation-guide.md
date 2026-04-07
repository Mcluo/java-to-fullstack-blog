---
title: "Claude Code 浏览器自动化能力全景指南"
excerpt: "Claude Code 中有 3 套 浏览器相关能力，定位各不相同："
category: "tools-and-tips"
tags: []
publishedAt: "2026-04-06"
readTime: 14
---

> 创建日期: 2026-04-06
> 分类: tools-and-tips
> 标签: claude-code, browser, automation, playwright, agent-browser

---

## 一、能力概览

Claude Code 中有 **3 套** 浏览器相关能力，定位各不相同：

| 能力 | 类型 | 定位 | 适用场景 |
|------|------|------|----------|
| **Playwright MCP** | MCP Server 工具 | Claude 直接调用的浏览器操作 | 对话中即时操作网页 |
| **agent-browser Skill** | CLI 工具 + Skill | 独立 CLI，通过 Bash 调用 | 脚本化、可复用的浏览器自动化 |
| **alex-image2code Skill** | 设计转代码 | 截图转 React 代码 | UI 还原，非浏览器自动化 |

---

## 二、Playwright MCP Server（内置，开箱即用）

### 2.1 是什么

Claude Code 内置的 Playwright MCP Server，提供 20+ 个浏览器操作工具，Claude 在对话中可以**直接调用**，无需安装任何额外工具。

### 2.2 核心工具清单

| 工具名 | 功能 | 典型用途 |
|--------|------|----------|
| `browser_navigate` | 导航到 URL | 打开网页 |
| `browser_snapshot` | 获取页面可访问性快照 | 分析页面结构（比截图更好） |
| `browser_click` | 点击元素 | 按钮、链接交互 |
| `browser_type` | 输入文字 | 表单填写 |
| `browser_fill_form` | 批量填写表单 | 多字段表单 |
| `browser_select_option` | 下拉选择 | 选择菜单 |
| `browser_hover` | 悬停 | 触发 hover 效果 |
| `browser_drag` | 拖拽 | 拖放操作 |
| `browser_press_key` | 按键 | Enter、Escape 等 |
| `browser_take_screenshot` | 截图 | 视觉验证 |
| `browser_evaluate` | 执行 JavaScript | 数据提取、DOM 操作 |
| `browser_tabs` | 标签页管理 | 多标签操作 |
| `browser_file_upload` | 文件上传 | 表单上传 |
| `browser_console_messages` | 控制台消息 | 调试 |
| `browser_network_requests` | 网络请求 | API 分析 |
| `browser_wait_for` | 等待条件 | 等文字出现/消失 |
| `browser_handle_dialog` | 处理弹窗 | alert/confirm |
| `browser_resize` | 调整窗口大小 | 响应式测试 |
| `browser_close` | 关闭浏览器 | 清理 |
| `browser_run_code` | 运行 Playwright 代码 | 复杂自定义操作 |

### 2.3 实践案例

#### 案例 1：抓取网页内容并分析

```
用户: 帮我打开 https://example.com 看看页面结构

Claude 执行:
1. browser_navigate → 打开页面
2. browser_snapshot → 获取元素树（返回 @ref 引用）
3. 分析结构并回答用户
```

#### 案例 2：自动填写表单

```
用户: 帮我在这个注册页面填写信息

Claude 执行:
1. browser_navigate → 打开注册页
2. browser_snapshot → 发现表单字段和 ref
3. browser_fill_form → 批量填写:
   - fields: [{ref: "@e1", type: "textbox", value: "test@example.com"}, ...]
4. browser_click → 点击提交按钮
5. browser_snapshot → 验证结果
```

#### 案例 3：Web 应用测试

```
用户: 帮我测试一下这个登录流程

Claude 执行:
1. browser_navigate → 打开登录页
2. browser_snapshot → 识别输入框
3. browser_type → 输入用户名密码
4. browser_click → 点击登录
5. browser_wait_for → 等待 "Welcome" 出现
6. browser_take_screenshot → 截图存证
7. browser_console_messages → 检查有无报错
```

#### 案例 4：API 请求监控

```
用户: 我想看这个页面发了哪些 API 请求

Claude 执行:
1. browser_navigate → 打开页面
2. browser_network_requests → 获取所有网络请求
   - filter: "/api/"
   - requestBody: true
   - requestHeaders: true
3. 分析并格式化展示
```

### 2.4 优缺点

**优点：**
- 零配置，开箱即用
- Claude 直接理解页面结构（通过 snapshot 的可访问性树）
- 交互式，可以在对话中逐步操作
- 支持完整的浏览器 API

**缺点：**
- 不支持持久化 session（关闭后状态丢失）
- 不支持认证状态保存/恢复
- 不太适合需要重复执行的自动化任务

---

## 三、agent-browser Skill（CLI 工具，脚本化自动化）

### 3.1 是什么

`agent-browser` 是一个独立的 CLI 工具，通过 Bash 调用。它的核心设计理念是 **snapshot → ref → interact**，专为 AI Agent 优化，token 消耗极低。

**安装**: `npm i -g agent-browser` 或 `brew install agent-browser`

**Skill 路径**: `~/.claude/skills/agent-browser/`

### 3.2 核心工作流

```bash
# 1. 导航
agent-browser open https://example.com

# 2. 快照（获取 @ref 引用）
agent-browser snapshot -i
# 输出:
# @e1 [input type="email"] placeholder="Email"
# @e2 [input type="password"] placeholder="Password"
# @e3 [button] "Login"

# 3. 交互（使用 @ref）
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3

# 4. 等待 + 验证
agent-browser wait --load networkidle
agent-browser snapshot -i  # 重新快照
```

### 3.3 核心命令速查表

```bash
# === 导航 ===
agent-browser open <url>              # 打开页面
agent-browser back / forward          # 前进/后退
agent-browser reload                  # 刷新
agent-browser close                   # 关闭

# === 快照与信息 ===
agent-browser snapshot -i             # 交互元素快照（推荐）
agent-browser snapshot -i -C          # 包含 cursor:pointer 元素
agent-browser get text @e1            # 获取元素文字
agent-browser get url / title         # 获取 URL/标题

# === 交互 ===
agent-browser click @e1               # 点击
agent-browser fill @e2 "text"         # 清除并输入
agent-browser type @e2 "text"         # 追加输入
agent-browser select @e1 "option"     # 下拉选择
agent-browser check @e1               # 勾选
agent-browser press Enter             # 按键
agent-browser scroll down 500         # 滚动

# === 截图与导出 ===
agent-browser screenshot              # 截图
agent-browser screenshot --full       # 全页截图
agent-browser screenshot --annotate   # 标注截图（带编号）
agent-browser pdf output.pdf          # 导出 PDF

# === 等待 ===
agent-browser wait @e1                # 等待元素出现
agent-browser wait --load networkidle # 等待网络空闲
agent-browser wait --text "Success"   # 等待文字出现
agent-browser wait --url "**/page"    # 等待 URL 匹配

# === 认证状态 ===
agent-browser state save auth.json    # 保存登录状态
agent-browser state load auth.json    # 恢复登录状态
agent-browser --session-name myapp open <url>  # 命名 session（自动保存恢复）

# === 高级 ===
agent-browser eval 'document.title'   # 执行 JS
agent-browser network requests        # 查看网络请求
agent-browser diff snapshot           # 对比页面变化
agent-browser record start demo.webm  # 录制视频
```

### 3.4 认证方案（5 种）

| 方案 | 命令 | 适用场景 |
|------|------|----------|
| **Auth Vault**（推荐） | `agent-browser auth save/login` | 加密存储凭据，LLM 不可见密码 |
| **Session Name** | `--session-name myapp` | 自动保存恢复 cookies/localStorage |
| **State File** | `state save/load auth.json` | 手动保存恢复状态 |
| **Persistent Profile** | `--profile ~/.myapp` | 类似 Chrome 用户数据目录 |
| **Auto Connect** | `--auto-connect` | 连接已登录的 Chrome |

### 3.5 实践案例

#### 案例 1：批量数据采集

```bash
# 打开商品列表页
agent-browser open "https://example.com/products"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 获取所有商品文字
agent-browser get text body > products.txt

# 全页截图
agent-browser screenshot --full products-full.png

# 翻页采集
agent-browser click @e10  # "下一页"按钮
agent-browser wait --load networkidle
agent-browser get text body >> products.txt

agent-browser close
```

#### 案例 2：自动登录并采集

```bash
# 保存凭据（只需一次）
echo "$PASSWORD" | agent-browser auth save myapp \
  --url https://app.example.com/login \
  --username user@example.com \
  --password-stdin

# 以后每次自动登录
agent-browser auth login myapp
agent-browser open https://app.example.com/dashboard
agent-browser wait --load networkidle
agent-browser screenshot dashboard.png
agent-browser close
```

#### 案例 3：响应式测试

```bash
agent-browser open https://example.com

# 桌面视图
agent-browser set viewport 1920 1080
agent-browser screenshot desktop.png

# 平板视图
agent-browser set viewport 768 1024
agent-browser screenshot tablet.png

# 手机视图
agent-browser set viewport 375 812
agent-browser screenshot mobile.png

agent-browser close
```

#### 案例 4：页面变更监控（Diff）

```bash
# 保存基线截图
agent-browser open https://example.com
agent-browser screenshot baseline.png
agent-browser close

# ... 一段时间后 ...

# 对比变化
agent-browser open https://example.com
agent-browser diff screenshot --baseline baseline.png
# 输出变化像素的百分比和差异图
agent-browser close
```

#### 案例 5：iframe 内表单填写（支付场景）

```bash
agent-browser open https://checkout.example.com
agent-browser snapshot -i
# @e2 [Iframe] "payment-frame"
#   @e3 [input] "Card number"
#   @e4 [input] "Expiry"
#   @e5 [button] "Pay"

# 直接操作 iframe 内元素，无需切换
agent-browser fill @e3 "4111111111111111"
agent-browser fill @e4 "12/28"
agent-browser click @e5
```

### 3.6 与 Playwright MCP 的对比

| 维度 | Playwright MCP | agent-browser |
|------|---------------|---------------|
| 调用方式 | Claude 直接调用 MCP 工具 | 通过 Bash 执行 CLI 命令 |
| 交互性 | 对话中逐步操作 | 可脚本化、批量执行 |
| 认证持久化 | 不支持 | 5 种方案 |
| Session 管理 | 单 session | 多 session 并行 |
| Token 消耗 | 中等 | 极低（@ref 设计） |
| 视频录制 | 不支持 | 支持 webm 录制 |
| Diff 对比 | 不支持 | 快照 diff + 像素 diff |
| iOS 模拟 | 不支持 | 支持 iOS Simulator |
| 安全控制 | 无 | 域名白名单、操作策略文件 |
| 适合场景 | 一次性探索、快速验证 | 自动化流程、重复任务 |

---

## 四、其他浏览器相关能力

### 4.1 alex-image2code Skill

将高保真设计截图 1:1 还原为 [React](/articles/frontend/02-react-vs-spring) 代码。不是浏览器自动化工具，而是**设计转代码**工具。
- 触发: 用户提供 UI 截图要求还原
- 输出: 可运行的 React 组件代码

### 4.2 WebFetch 工具（内置）

简单的 URL 内容抓取工具，不涉及浏览器操作：
- 抓取 URL 内容并转为 Markdown
- 用 AI 模型处理抓取的内容
- 适合快速读取文档页面
- 不支持 JS 渲染、不支持交互

---

## 五、选型决策树

```
需要浏览器操作吗？
├── 只需要读取网页文本内容 → WebFetch（最简单）
├── 需要交互式操作（点击、填写、截图）
│   ├── 一次性任务，在对话中完成 → Playwright MCP
│   └── 需要重复执行 / 脚本化 → agent-browser
├── 需要认证状态保存 → agent-browser（唯一选择）
├── 需要多 session 并行 → agent-browser
├── 需要录制视频 / Diff 对比 → agent-browser
└── 需要截图转代码 → alex-image2code
```

<img src="/images/browser-automation/browser-automation-decision-tree.svg" alt="浏览器自动化工具选择决策树" style="max-width:100%;margin:1em 0;" />

---

## 六、快速上手建议

### 初学者路径

1. **先用 Playwright MCP** — 在对话中直接说"帮我打开 xxx 网页看看"，Claude 会自动调用
2. **需要自动化时用 agent-browser** — 安装后在对话中说"用 agent-browser 帮我..."
3. **认证场景** — 使用 `agent-browser auth save` 保存凭据

### 常用触发语句

| 想做的事 | 怎么说 |
|---------|--------|
| 快速看网页 | "帮我打开 xxx 看看页面内容" |
| 截图 | "帮我截图 xxx 网页" |
| 填表单 | "帮我在这个页面填写表单" |
| 测试登录 | "帮我测试这个登录流程" |
| 数据采集 | "用 agent-browser 帮我抓取 xxx 页面的数据" |
| 响应式测试 | "帮我测试这个页面在手机和桌面上的显示效果" |

---

## 七、安全注意事项

1. **State 文件** 包含明文 session token，务必加入 `.gitignore`
2. **Auth Vault** 使用 `AGENT_BROWSER_ENCRYPTION_KEY` 加密存储
3. **域名白名单** `AGENT_BROWSER_ALLOWED_DOMAINS` 限制可访问域名
4. **操作策略** `AGENT_BROWSER_ACTION_POLICY` 限制可执行操作
5. **输出限制** `AGENT_BROWSER_MAX_OUTPUT=50000` 防止上下文溢出
