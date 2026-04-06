---
title: "Chrome MCP 工作原理深度解析：Claude Code 如何控制你的浏览器"
excerpt: "深入剖析 Chrome MCP 的四层架构：从 Claude Code 到你的浏览器标签页，每一步是怎么连通的？为什么需要 Chrome 扩展？常见连接失败怎么排查？"
category: "tools-and-tips"
tags: ["chrome-mcp", "mcp", "claude-code", "browser-automation", "architecture"]
publishedAt: "2026-04-07"
readTime: 8
---

> 创建日期: 2026-04-07
> 分类: tools-and-tips
> 标签: chrome-mcp, mcp, claude-code, browser-automation

---

## 背景：为什么需要 Chrome MCP？

在 Claude Code 的工作流中，经常需要操作浏览器——比如登录 LeetCode 刷题、读取钉钉文档、抓取网页数据。但这里有一个根本性问题：

**Claude Code 是一个终端进程，它无法直接控制你的浏览器。**

Playwright MCP 的做法是启动一个**全新的浏览器实例**——干净的、没有任何登录状态、没有插件、没有 Cookie。这对于自动化测试可以，但对于需要用你**已登录账号**操作的场景（比如登录 LeetCode 写题），完全不可行。

Chrome MCP 解决的正是这个问题：**连接你当前正在使用的 Chrome 浏览器**，复用你的登录状态、Cookie、插件，一切都是你熟悉的环境。

---

## 核心架构：四层通信链路

![Chrome MCP 四层通信架构](/images/chrome-mcp-architecture/architecture.svg)

Chrome MCP 的工作原理可以用一条通信链路来概括：

```
┌─────────────┐     stdio      ┌─────────────────┐
│ Claude Code  │ ◄────────────► │  MCP Server      │
│ (CLI 进程)   │   JSON-RPC     │  (Node.js 进程)  │
└─────────────┘                └────────┬────────┘
                                        │
                                  Native Messaging
                                   (stdin/stdout)
                                        │
                               ┌────────▼────────┐
                               │ Native Messaging │
                               │     Host         │
                               │  (Shell 脚本)    │
                               └────────┬────────┘
                                        │
                                  Chrome Native
                                  Messaging API
                                        │
                               ┌────────▼────────┐
                               │  Chrome 扩展     │
                               │ (Extension)      │
                               │                  │
                               │  ┌────────────┐  │
                               │  │ chrome.tabs│  │
                               │  │ chrome.dom │  │
                               │  │ chrome.js  │  │
                               │  └────────────┘  │
                               └────────┬────────┘
                                        │
                                  Chrome APIs
                                        │
                               ┌────────▼────────┐
                               │   你的浏览器      │
                               │  标签页/页面/DOM  │
                               └─────────────────┘
```

### 第一层：Claude Code → MCP Server

```
Claude Code  ──── stdio (JSON-RPC) ────►  MCP Server (Node.js)
```

Claude Code 通过 **stdio**（标准输入/输出）与 MCP Server 通信，使用 JSON-RPC 协议。

当你在 Claude Code 中配置了 Chrome MCP：

```json
{
  "chrome-mcp": {
    "type": "stdio",
    "command": "node",
    "args": ["/path/to/mcp-server-stdio.js"]
  }
}
```

Claude Code 会启动这个 Node.js 进程，并通过 stdin/stdout 管道发送指令，比如 "读取当前页面" 或 "点击某个按钮"。

**这一层的职责**：接收 Claude 的工具调用请求，转换为浏览器操作指令。

### 第二层：MCP Server → Native Messaging Host

```
MCP Server  ──── Native Messaging ────►  Shell 脚本 (Host)
```

MCP Server 收到指令后，需要把它传递给 Chrome 浏览器内部。但 Node.js 进程无法直接和 Chrome 进程通信——它们是两个完全独立的操作系统进程。

这里用到了 Chrome 的 **Native Messaging** 机制。在你的系统中，有一个注册文件：

```
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chromemcp.nativehost.json
```

内容类似：

```json
{
  "name": "com.chromemcp.nativehost",
  "description": "Node.js Host for Browser Bridge Extension",
  "path": "/path/to/run_host.sh",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://hbdgbgagpkpjffpklnamcljpakneikee/"
  ]
}
```

这个文件告诉 Chrome：当扩展 `hbdgbgagpkpjffpklnamcljpakneikee` 请求 Native Messaging 时，运行 `run_host.sh` 脚本来建立连接。

**这一层的职责**：在操作系统层面桥接 Node.js 进程和 Chrome 进程。

### 第三层：Chrome 扩展（关键桥梁）

```
Native Messaging Host  ──── Chrome API ────►  Chrome Extension
```

**这是整个链路中最关键的一环。**

Chrome 扩展运行在浏览器内部，拥有以下超能力：

| API | 能力 | 用途 |
|-----|------|------|
| `chrome.tabs` | 标签页管理 | 列出、创建、切换、关闭标签页 |
| `chrome.scripting` | 脚本注入 | 在页面中执行 JavaScript |
| `chrome.debugger` | DevTools 协议 | 完整的页面控制能力 |
| `chrome.downloads` | 下载管理 | 处理文件下载 |
| `chrome.bookmarks` | 书签管理 | 读写书签 |
| `chrome.history` | 历史记录 | 搜索浏览历史 |

扩展通过 `chrome.runtime.connectNative()` 与 Native Messaging Host 建立双向通信管道，接收操作指令，调用对应的 Chrome API 执行。

**这一层的职责**：真正执行浏览器操作的执行者。没有它，前面所有层都是空转。

### 第四层：Chrome 扩展 → 你的页面

```
Chrome Extension  ──── DOM/CDP ────►  网页内容
```

扩展拿到指令后，操作你的实际页面：

- **读取页面**：注入 JS 获取 DOM 结构、文本内容
- **点击元素**：通过 CSS 选择器定位元素并触发点击
- **填写表单**：设置 input 值并触发事件
- **截图**：通过 `chrome.tabs.captureVisibleTab()` 截取
- **执行 JS**：通过 `chrome.scripting.executeScript()` 注入代码

---

## 为什么扩展不可或缺？

你可能会问：能不能跳过扩展，让 MCP Server 直接用 CDP（Chrome DevTools Protocol）连接浏览器？

理论上可以，但有严重限制：

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Chrome 扩展** | 连接已运行的 Chrome；完整 API；不影响用户使用 | 需要安装扩展 |
| **CDP 远程调试** | 不需要扩展 | Chrome 必须用 `--remote-debugging-port` 启动；安全风险高；可能与 DevTools 冲突 |
| **Playwright** | 功能最全 | 启动全新浏览器实例，无法复用登录状态 |

Chrome 扩展是**唯一**能在不改变用户使用习惯的前提下，从外部程序控制已运行浏览器的方式。

---

## 常见连接失败排查

### 问题 1：MCP Server 连接失败

```
Error: Failed to connect to MCP server
```

**排查步骤**：

```bash
# 1. 检查 MCP Server 文件是否存在
ls -la /path/to/mcp-server-stdio.js

# 2. 检查 Chrome 是否在运行
pgrep -la "Google Chrome"

# 3. 检查 Native Messaging Host 注册
ls ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

# 4. 检查注册文件中的扩展 ID 是否匹配
cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/*.json
```

### 问题 2：扩展 ID 不匹配

这是最常见的问题。Native Messaging Host 注册文件中的 `allowed_origins` 必须与你实际安装的扩展 ID 完全一致。

```json
// 注册文件期望的扩展 ID
"allowed_origins": ["chrome-extension://hbdgbgagpkpjffpklnamcljpakneikee/"]

// 如果你安装的是另一个扩展（不同的 ID），就会连不上
```

**解决方案**：要么安装匹配的扩展，要么修改 MCP Server 配置使用你已安装的扩展。

### 问题 3：Playwright vs Chrome MCP 混淆

| 场景 | 应该用 |
|------|--------|
| 需要用已登录账号操作 | Chrome MCP |
| 自动化测试（干净环境） | Playwright |
| 抓取需要登录的页面 | Chrome MCP |
| CI/CD 中的 E2E 测试 | Playwright |

---

## 实战对比：同一个操作的不同实现

### 打开 LeetCode 并写题

**Playwright（失败场景）**：
```
浏览器启动 → 全新实例 → 未登录 → 无法操作 ❌
```

**Chrome MCP（正确方式）**：
```
连接已有 Chrome → 已登录的 LeetCode 标签页 → 直接操作 ✅
```

### 读取钉钉文档

**Playwright**：需要重新登录钉钉（可能还有扫码验证）❌

**Chrome MCP**：直接读取你已打开的钉钉文档标签页 ✅

---

## 总结

Chrome MCP 的精髓在于一个"桥"字：

```
你的终端 (Claude Code)
    ↕ stdio
MCP Server (翻译官)
    ↕ Native Messaging
Chrome 扩展 (执行者)
    ↕ Chrome APIs
你的浏览器 (目标)
```

每一层都有不可替代的职责：
- **MCP Server**：把 Claude 的意图翻译成浏览器指令
- **Native Messaging**：跨进程通信的操作系统级桥梁
- **Chrome 扩展**：拥有浏览器 API 权限的实际执行者

理解了这个架构，你就能快速定位连接问题出在哪一层，以及为什么每一个组件都是必要的。

---

*下次当 Chrome MCP 连不上的时候，就按照这四层一层层排查吧。*
