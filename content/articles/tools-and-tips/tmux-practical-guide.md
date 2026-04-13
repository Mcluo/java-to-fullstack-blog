---
title: "tmux 实战指南：终端复用器从入门到日常高效使用"
excerpt: "面向开发者的 tmux 实用教程。从核心概念到日常工作流，覆盖会话管理、窗口分屏、快捷键定制、远程开发和 Claude Code 协作场景，附速查表。"
category: "tools-and-tips"
tags: ["tmux", "terminal", "productivity", "devops", "remote-development"]
publishedAt: "2026-04-12"
readTime: 15
---

> 创建日期: 2026-04-12
> 环境: macOS + iTerm2/Terminal, tmux 3.6a
> 定位: 实战导向，不讲历史，直接上手

---

## 为什么需要 tmux

三个核心场景：

1. **SSH 断连不丢活**：远程服务器上跑长任务，SSH 断开后进程继续运行，重连后 `tmux attach` 恢复现场
2. **一个终端多个工作区**：左边写代码、右边跑服务、下面看日志，不用开一堆终端窗口
3. **可复现的工作环境**：固定的窗口布局，每次开机直接恢复

---

## 核心概念：三层结构

```
tmux server
  └── Session（会话）    ← 最外层，可以有多个
        └── Window（窗口）   ← 类似浏览器标签页
              └── Pane（面板）    ← 窗口内的分屏区域
```

理解这三层就够了：

| 概念 | 类比 | 操作 |
|------|------|------|
| **Session** | 一个项目/工作区 | 创建、切换、断开、恢复 |
| **Window** | 浏览器标签页 | 新建、切换、重命名 |
| **Pane** | 标签页内的分屏 | 水平/垂直拆分、调整大小 |

---

## 快速上手：5 分钟入门

### 安装

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt install tmux

# 验证
tmux -V   # tmux 3.6a
```

### 第一次使用

```bash
# 创建一个命名会话
tmux new -s work

# 你现在在 tmux 里了！底部有绿色状态栏
# 试试分屏：
#   Ctrl+B %    左右分屏
#   Ctrl+B "    上下分屏
#   Ctrl+B o    切换面板
#   Ctrl+B d    断开（会话后台运行）

# 回到正常终端后，重新连接：
tmux attach -t work
# 或简写：
tmux a -t work
```

### 前缀键（Prefix）

tmux 所有快捷键都以**前缀键**开头，默认是 `Ctrl+B`。

操作方式：先按 `Ctrl+B`（松开），再按功能键。

> 后文用 `<prefix>` 代替 `Ctrl+B`。很多人会改成 `Ctrl+A`（见配置章节）。

---

## 会话管理

### 基本操作

```bash
# 创建
tmux new -s project-name        # 命名会话
tmux new -s api -d              # 后台创建（不进入）

# 查看
tmux ls                          # 列出所有会话
tmux list-sessions               # 同上

# 连接
tmux attach -t project-name     # 连接到指定会话
tmux a                           # 连接到最近的会话

# 销毁
tmux kill-session -t project-name
tmux kill-server                 # 杀掉所有会话
```

### 会话内快捷键

| 快捷键 | 功能 |
|--------|------|
| `<prefix> d` | 断开当前会话（后台运行） |
| `<prefix> s` | 列出所有会话并切换 |
| `<prefix> $` | 重命名当前会话 |
| `<prefix> (` | 切换到上一个会话 |
| `<prefix> )` | 切换到下一个会话 |

---

## 窗口管理

窗口就像浏览器标签页，在一个 Session 内管理多个工作上下文。

| 快捷键 | 功能 |
|--------|------|
| `<prefix> c` | 新建窗口 |
| `<prefix> ,` | 重命名当前窗口 |
| `<prefix> n` | 下一个窗口 |
| `<prefix> p` | 上一个窗口 |
| `<prefix> 0-9` | 切换到第 N 个窗口 |
| `<prefix> w` | 窗口列表（可预览+选择） |
| `<prefix> &` | 关闭当前窗口（需确认） |

### 实用技巧

```bash
# 命令行直接创建带名称的窗口
tmux new-window -n logs
tmux new-window -n server

# 在状态栏看到类似：
# [work] 0:code* 1:logs 2:server
#                    ^ 当前窗口带 *
```

---

## 面板（Pane）分屏

这是 tmux 最常用的功能。

### 分屏操作

| 快捷键 | 功能 |
|--------|------|
| `<prefix> %` | 左右分屏（垂直切割） |
| `<prefix> "` | 上下分屏（水平切割） |
| `<prefix> o` | 切换到下一个面板 |
| `<prefix> ;` | 切换到上一个面板 |
| `<prefix> 方向键` | 按方向切换面板 |
| `<prefix> x` | 关闭当前面板（需确认） |
| `<prefix> z` | 当前面板全屏/恢复（zoom） |
| `<prefix> !` | 将面板提升为独立窗口 |
| `<prefix> q` | 显示面板编号，按数字跳转 |

### 调整面板大小

| 快捷键 | 功能 |
|--------|------|
| `<prefix> Ctrl+方向键` | 微调大小（1 格） |
| `<prefix> Alt+方向键` | 大幅调整（5 格） |

### 面板布局切换

| 快捷键 | 功能 |
|--------|------|
| `<prefix> Space` | 循环切换预设布局 |
| `<prefix> Alt+1` | 水平等分 |
| `<prefix> Alt+2` | 垂直等分 |
| `<prefix> Alt+3` | 主面板在上 |
| `<prefix> Alt+4` | 主面板在左 |

---

## 复制模式

tmux 有自己的复制粘贴系统，在翻看历史输出时特别有用。

### 基本流程

```
1. <prefix> [        进入复制模式
2. 方向键/PgUp/PgDn   移动光标
3. Space             开始选择
4. Enter             复制选中内容
5. <prefix> ]        粘贴
```

### 复制模式下的导航

| 按键 | 功能 |
|------|------|
| `q` | 退出复制模式 |
| `g` | 跳到顶部 |
| `G` | 跳到底部 |
| `/` | 向下搜索 |
| `?` | 向上搜索 |
| `n` | 下一个搜索结果 |
| `N` | 上一个搜索结果 |

> 如果配置了 `set -g mode-keys vi`，可以用 vim 的 `hjkl` 导航。

---

## 实用配置 (~/.tmux.conf)

创建 `~/.tmux.conf`，让 tmux 更好用：

```bash
# ========== 基础设置 ==========

# 前缀键改为 Ctrl+A（更顺手）
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# 开启鼠标支持（滚轮翻页、点击切换面板、拖拽调整大小）
set -g mouse on

# 窗口编号从 1 开始（0 太远了）
set -g base-index 1
setw -g pane-base-index 1

# 窗口关闭后自动重新编号
set -g renumber-windows on

# 增大历史记录
set -g history-limit 50000

# 减少 escape 延迟（vim 用户必备）
set -sg escape-time 10

# 256 色支持
set -g default-terminal "screen-256color"
set -sa terminal-overrides ",xterm*:Tc"

# ========== 快捷键优化 ==========

# 更直观的分屏键
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind %
unbind '"'

# 新窗口保持当前路径
bind c new-window -c "#{pane_current_path}"

# vim 风格的面板切换
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# 快速重载配置
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# vim 风格的复制模式
setw -g mode-keys vi
bind -T copy-mode-vi v send -X begin-selection
bind -T copy-mode-vi y send -X copy-pipe-and-cancel "pbcopy"

# ========== 状态栏美化 ==========

# 状态栏位置
set -g status-position bottom
set -g status-interval 5

# 简洁的状态栏
set -g status-style "bg=#1a1b26,fg=#a9b1d6"
set -g status-left "#[fg=#7aa2f7,bold] #S "
set -g status-right "#[fg=#565f89] %H:%M "
set -g status-left-length 20

# 窗口标签样式
setw -g window-status-format "#[fg=#565f89] #I:#W "
setw -g window-status-current-format "#[fg=#7aa2f7,bold] #I:#W "

# 面板边框
set -g pane-border-style "fg=#292e42"
set -g pane-active-border-style "fg=#7aa2f7"
```

配置后运行 `tmux source-file ~/.tmux.conf` 或重启 tmux 生效。

---

## 日常工作流

### 场景一：全栈开发

```bash
# 创建项目会话
tmux new -s myproject

# 窗口 1：代码编辑（默认）
# 重命名窗口
# <prefix> , → 输入 "code"

# 窗口 2：前端服务
# <prefix> c → 创建新窗口
npm run dev

# 窗口 3：后端服务
# <prefix> c
npm run server

# 窗口 4：Git + 终端
# <prefix> c
# 上下分屏：<prefix> "
# 上面 git 操作，下面跑测试
```

### 场景二：远程服务器运维

```bash
# SSH 到服务器后
tmux new -s deploy

# 左边：部署脚本
# <prefix> |  (需要上面的配置)
# 右边：监控日志
tail -f /var/log/app.log

# SSH 断连也不怕，重连后：
tmux a -t deploy
# 一切还在原来的位置
```

### 场景三：Claude Code 多任务协作

```bash
# 会话 1：主开发
tmux new -s dev
# Claude Code 在这里工作

# 会话 2：测试和验证
tmux new -s test -d
# <prefix> s 可以在会话间切换

# 在 Claude Code 中，tmux 的好处：
# 1. Claude 可以在后台运行长任务
# 2. 你可以同时在另一个面板手动检查
# 3. 会话持久化，不怕意外断连
```

### 场景四：多项目并行

```bash
# 每个项目一个 session
tmux new -s project-a -d
tmux new -s project-b -d
tmux new -s project-c -d

# 查看所有项目
tmux ls
# project-a: 1 windows
# project-b: 1 windows
# project-c: 1 windows

# 快速切换：<prefix> s → 选择会话
```

---

## 进阶技巧

### 1. 发送命令到其他面板

```bash
# 不用切换面板就能执行命令
tmux send-keys -t 1 "npm run test" Enter
```

### 2. 同步面板输入

```bash
# 同时在多个面板输入相同命令（多服务器操作）
# <prefix> : 进入命令模式
setw synchronize-panes on
# 再次执行关闭：
setw synchronize-panes off
```

### 3. 保存和恢复面板内容

```bash
# 保存当前面板的所有历史输出
# <prefix> : 进入命令模式
capture-pane -S -3000
save-buffer ~/tmux-output.txt
```

### 4. 快速创建固定布局（脚本化）

```bash
#!/bin/bash
# dev-layout.sh — 一键创建开发环境

SESSION="dev"
tmux new-session -d -s $SESSION -n code

# 窗口 1: 代码 + 终端
tmux split-window -v -p 30 -t $SESSION:1
tmux send-keys -t $SESSION:1.2 "npm run dev" Enter

# 窗口 2: 日志
tmux new-window -t $SESSION -n logs
tmux send-keys "tail -f logs/app.log" Enter

# 窗口 3: Git
tmux new-window -t $SESSION -n git
tmux send-keys "git status" Enter

# 回到第一个窗口
tmux select-window -t $SESSION:1
tmux select-pane -t $SESSION:1.1

# 连接
tmux attach -t $SESSION
```

### 5. 嵌套 tmux 处理

本地 tmux 里 SSH 到远程服务器的 tmux：

```bash
# 本地前缀：Ctrl+A（配置后）
# 远程前缀：Ctrl+B（保持默认）
# 或者用 Ctrl+A Ctrl+A 发送前缀到内层
```

---

## 速查表

### 会话

| 命令/快捷键 | 功能 |
|------------|------|
| `tmux new -s name` | 新建命名会话 |
| `tmux a -t name` | 连接会话 |
| `tmux ls` | 列出会话 |
| `tmux kill-session -t name` | 销毁会话 |
| `<prefix> d` | 断开 |
| `<prefix> s` | 会话列表 |
| `<prefix> $` | 重命名会话 |

### 窗口

| 命令/快捷键 | 功能 |
|------------|------|
| `<prefix> c` | 新建 |
| `<prefix> n/p` | 下/上一个 |
| `<prefix> 0-9` | 跳转 |
| `<prefix> w` | 窗口列表 |
| `<prefix> ,` | 重命名 |
| `<prefix> &` | 关闭 |

### 面板

| 命令/快捷键 | 功能 |
|------------|------|
| `<prefix> %` 或 `\|` | 左右分屏 |
| `<prefix> "` 或 `-` | 上下分屏 |
| `<prefix> o` | 切换面板 |
| `<prefix> z` | 全屏/恢复 |
| `<prefix> x` | 关闭面板 |
| `<prefix> q` | 显示编号 |
| `<prefix> Space` | 切换布局 |
| `<prefix> !` | 提升为窗口 |

### 复制

| 命令/快捷键 | 功能 |
|------------|------|
| `<prefix> [` | 进入复制模式 |
| `Space` | 开始选择 |
| `Enter` | 复制 |
| `<prefix> ]` | 粘贴 |

---

## 常见问题

### Q: 鼠标滚轮不能翻页？
在 `~/.tmux.conf` 添加 `set -g mouse on`。

### Q: 颜色显示不正确？
确保终端支持 256 色，并在配置中设置：
```bash
set -g default-terminal "screen-256color"
```

### Q: 复制到系统剪贴板？
macOS 需要配合 `pbcopy`：
```bash
bind -T copy-mode-vi y send -X copy-pipe-and-cancel "pbcopy"
```

### Q: 如何从 tmux 外面杀掉一个卡住的会话？
```bash
tmux kill-session -t stuck-session
```

### Q: 前缀键太难按？
改成 `Ctrl+A`（见配置章节），或者用 CapsLock 映射为 Ctrl。

---

> **推荐阅读**:
> - [tmux 官方 Wiki](https://github.com/tmux/tmux/wiki)
> - `man tmux` — 最权威的参考
