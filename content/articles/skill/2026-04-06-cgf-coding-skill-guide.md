---
title: "cgf-coding-skill 操作手册"
excerpt: "1688 前端开发技能组完全指南：4 条铁律 + 4 个常驻规范 + 25 个按需技能，覆盖需求开发全流程"
category: "skill"
tags: ["skill", "claude-code", "前端开发", "1688", "ICE", "Git"]
publishedAt: "2026-04-06"
readTime: 18
---

## 一句话概括

cgf-coding-skill 是 1688 前端开发专用的 Claude Code 技能组，内置 **4 条铁律 + 4 个常驻规范 + 25 个按需技能**，覆盖从需求分析到构建发布的完整开发流程。

> 内网依赖：需要阿里内网环境（Aone、tnpm、1688 内部服务）

---

## 技能架构

cgf-coding-skill 采用三层架构，优先级从高到低：

```
┌────────────────────────────────────────┐
│  铁律（4 条）— 违反即终止，最高优先级      │
├────────────────────────────────────────┤
│  常驻规范（4 个）— 每次对话自动加载         │
│  always/ 目录下的 .md 文件               │
├────────────────────────────────────────┤
│  按需技能（25 个）— 关键词触发，按需加载     │
│  skills/ 目录下的 .md 文件               │
└────────────────────────────────────────┘
```

**设计原则**：宁可误触发，不可漏触发。当你在对话中提到相关关键词时，对应技能会自动加载到 Claude 的上下文中，无需手动操作。

---

## 铁律（违反即终止）

这是整个技能组最核心的约束，4 条铁律优先级高于一切规范和技能。

### 铁律 1：仓库必须验证 git remote

**规则**：不信文件夹名，不信口述，只信 `git remote -v`。

```bash
# ❌ 错误：看到文件夹叫 order-detail 就以为是目标仓库
cd /Users/robin/work/order-detail

# ✅ 正确：执行 git remote -v 验证
cd /Users/robin/work/order-detail && git remote -v | grep origin
# origin  git@gitlab.alibaba-inc.com:ctf-page/order-detail.git (fetch)
# → 代码组=ctf-page, 仓库名=order-detail → 验证通过
```

**为什么？** 文件夹名和仓库实际指向经常不一致。比如 `order-detail` 目录的 remote 可能指向 `1688-global/order-detail.git`（代码组不同），在错误仓库上开发等于白干。

**例外**：用户明确提供了本地仓库路径或 git 地址时，可以跳过搜索，直接使用。

### 铁律 2：禁止在 master 上开发

```bash
# 开发前第一件事：检查分支
git branch --show-current

# 如果输出 master → 立即停止！创建新分支！
git checkout -b feature/80616570-kj-customer-service
```

**为什么？** O2 平台的自动合并机制可能导致 master 上的代码直接上线，污染生产环境。

### 铁律 3：推送时本地远端分支必须同名

```bash
# ❌ 错误：推到 master
git push origin master

# ❌ 错误：HEAD 可能跟踪的是 master
git push origin HEAD

# ✅ 正确：明确指定同名分支
git push origin feature/80616570-kj-customer-service

# ✅ 正确：首次推送用 -u 设置上游
git push -u origin feature/80616570-kj-customer-service
```

**安全推送三步检查**：

```bash
git branch --show-current           # 1. 确认不在 master
git branch -vv                      # 2. 确认跟踪关系正确
git push origin <当前分支名>          # 3. 明确指定分支名
```

### 铁律 4：只格式化修改的代码

```bash
# ❌ 禁止：格式化整个文件
prettier --write src/blocks/OrderMeta/index.js

# ✅ 正确：只改业务逻辑，保持原有格式
# 提交前检查：
git diff  # 确认没有无关的格式变动
```

**为什么？** 格式化整个文件会引入大量无关 diff，污染 code review，掩盖真正的业务改动。

---

## 常驻规范详解

常驻规范存放在 `always/` 目录下，每次对话自动加载到 Claude 上下文中。

### 1. 需求开发 9 步流程

这是 cgf-coding-skill 最核心的工作流，强制按顺序执行，不允许跳步。

```
步骤1:识别需求 → 步骤2:收集URL → 步骤3:解析URL → 步骤4:验证仓库
→ 步骤5:直接使用 → 步骤6:查看项目结构 → 步骤7:理解需求
→ 步骤8:制定计划 → 步骤9:开始开发
```

#### 关键步骤解析

**步骤 3 — URL 解析**：从页面 URL 提取代码组和仓库名

```
https://air.1688.com/app/ctf-page/order-detail/index.html
                         ^^^^^^^^  ^^^^^^^^^^^^
                         代码组     仓库名
```

**步骤 4 — 验证 git remote**（最关键的一步）

```bash
# 本地搜索所有候选目录
ls ~/work | grep order-detail

# 逐个验证 remote（必须检查所有候选！）
cd ~/work/order-detail     && git remote -v  # → 1688-global/order-detail ❌
cd ~/work/order-detail-pc  && git remote -v  # → ctf-page/order-detail   ✅
cd ~/work/order-detail-wap && git remote -v  # → ctf-m-page/order-detail ❌
```

**步骤 6 — 查看项目结构**：自动判断项目类型

| 特征 | 项目类型 | 自动激活 |
|------|---------|---------|
| `"ice": "^3.x.x"` | ICE.js v3 | ICE 结构技能 |
| `"@ali/build-scripts-ice"` 或 `build.json` | ICE.js v2 | ICE v2 结构技能 |
| `"ice-npm-utils"` 或 `icepkg.config.js` | ICE PKG | ICE PKG 技能 |
| 无以上依赖 | 非 ICE | 跳过 ICE 技能 |

#### 快速跳转规则

不是所有情况都要走完 9 步：

- **用户提供了本地目录**（如 `/Users/robin/work/order-detail`）→ 跳到**步骤 6**
- **用户提供了 Git 地址**（如 `git@gitlab...order-detail.git`）→ 跳到**步骤 4**

### 2. Git 提交规范

提交格式遵循 commitlint 标准：

```
<type>(<scope>): <subject>
```

| Type | 说明 | 示例 |
|------|------|------|
| **feat** | 新功能 | `feat(cart): 添加购物车批量删除功能` |
| **fix** | Bug 修复 | `fix(login): 修复手机号登录验证失败` |
| **refactor** | 重构 | `refactor(utils): 重构日期工具函数` |
| **style** | 格式调整 | `style(format): 格式化代码` |
| **docs** | 文档 | `docs(api): 更新接口文档说明` |
| **test** | 测试 | `test(order): 添加订单创建单元测试` |
| **chore** | 构建/工具 | `chore(deps): 升级依赖版本` |

#### 多业务线提交模板

```
feat(kj-plugin): 新增平台客服旺旺链接兜底逻辑

在 renderGlobalContact 中添加兜底逻辑：
- 服务端无配置时使用本地旺旺链接生成
- 根据 shippingRegion 和 serviceProvider 匹配旺旺 ID

影响范围：
- 仅跨境订单生效（isGlobalOrder === true）
- 国内订单不受影响

关联需求：Aone 80616570
关联业务：跨境订单（1688-global）
```

#### 分支命名规范

```bash
# 功能分支格式
feature/[需求编号]-[业务前缀]-[功能描述]

# 示例
feature/80616570-kj-customer-service    # kj = 跨境
feature/80616571-cbu-order-list         # cbu = 内贸
```

| 前缀 | 业务线 |
|------|--------|
| `kj` | 跨境业务 |
| `cbu` | 内贸业务 |
| `wechat` | 微信小程序 |
| `qn` | 千牛工作台 |
| `harmony` | 鸿蒙应用 |

### 3. 编码标准

TypeScript + React 编码规范，核心关注点：

- 类型安全优先，避免 `any`
- React Hooks 正确使用（依赖数组、cleanup）
- 性能意识（`useMemo` / `useCallback` 合理使用）
- 错误处理覆盖（try-catch、ErrorBoundary）

### 4. 角色定义

Claude 在前端开发中扮演三重角色：

| 角色 | 职责 |
|------|------|
| **架构师** | 系统设计、技术选型、模块划分 |
| **设计师** | 组件设计、交互逻辑、用户体验 |
| **开发专家** | 编码实现、调试优化、质量保障 |

遵循原则：DRY（不重复）、KISS（保持简单）、SOLID（面向对象）、YAGNI（不过度设计）。

---

## 按需技能速查表

### 核心流程类

| 技能 | 触发词 | 功能 |
|------|--------|------|
| URL 解析 | `http`, `1688.com`, git 地址 | 解析 1688 页面/仓库 URL |
| 需求启动 | 需求, 开发, Aone, 要做 | 启动需求开发流程 |
| 需求分析 | 需求分析, 拆解需求, 怎么做 | 深度分析需求 |
| 代码定位 | 代码在哪, 找到代码, 哪个文件 | 定位相关代码文件 |
| ICE 结构 | ICE, 项目结构, 路由, pages | 理解 ICE 项目目录结构 |

### 开发实现类

| 技能 | 触发词 | 功能 |
|------|--------|------|
| API 请求 | 接口, API, MTop, fetch | MTop 接口调用规范 |
| URL 参数 | URL参数, query, 传参 | URL 参数处理 |
| 样式开发 | 样式, less, css, className | Less/CSS 开发规范 |
| 状态管理 | store, model, useModel | ICE 状态管理方案 |
| 国际化 | 国际化, i18n, 多语言 | 多语言实现 |
| 环境判断 | 环境, 平台, 小程序, H5 | 多端环境检测 |
| 文件命名 | 命名, 文件名, 新建组件 | 文件/组件命名规范 |
| 包管理 | tnpm, npm, install, 依赖 | tnpm 包管理 |
| UI 组件库 | antd, Button, Modal, Table | Ant Design 组件使用 |
| Rom JSBridge | Rom, JSBridge, 页面跳转 | 客户端桥接调用 |

### 质量保障类

| 技能 | 触发词 | 功能 |
|------|--------|------|
| 日志上报 | 日志, 打点, SLS, 埋点 | 日志和埋点规范 |
| 错误边界 | ErrorBoundary, onError | React 错误边界 |
| 错误与性能上报 | jstracker, 白屏检测 | 错误/性能监控 |
| 单元测试 | 测试, jest, 单测, 覆盖率 | Jest 单元测试 |
| 性能优化 | 首屏, Lighthouse, 加载慢 | 性能优化方案 |

### 工程化类

| 技能 | 触发词 | 功能 |
|------|--------|------|
| 创建应用 | 创建应用, 脚手架, npm init | 新建 ICE 项目 |
| 构建与发布 | 构建, 发布, 部署, CDN | 构建和发布流程 |
| 内部文档读取 | 钉钉文档, 语雀, alidocs | 读取内部文档 |
| 设计稿生成代码 | pixelator, 设计稿, D2C | 设计稿转代码 |
| Ali NPM 查询 | @ali, 查包, anpm | 查询内部 NPM 包 |

---

## 深度解析：代码定位方法论

代码定位是日常开发中最高频的操作之一。技能内置了三种定位方法，按推荐度排序：

### 方法一：页面元素定位法（最快，推荐）

适用场景：有页面 URL 且能访问

```
操作步骤:
1. 打开页面 → F12 启动 DevTools
2. Ctrl+Shift+C 点击目标元素
3. 从以下线索中提取组件信息：
   - React DevTools 组件树（最准确）
   - HTML 类名：class="OrderMeta_method__3xYz1" → OrderMeta 组件
   - data-* 属性：data-tracker="contact.wangwang" → grep 定位
   - i18n key：ctf-order-detail.blocks.OrderMeta.xxx → 直接定位目录
```

### 方法二：关键词 grep 法

适用场景：知道功能关键词但无法访问页面

```bash
# 业务关键词搜索
grep -rn "客服" src/ --include="*.jsx" --include="*.tsx"

# 埋点 tracker 搜索
grep -rn "contact.wangwang" src/

# 使用 ripgrep（更快）
rg "客服" --type js
```

### 方法三：路由映射分析法

适用场景：全新项目，完全不了解结构

```
路由配置 → 页面组件 → blocks/components → 目标代码
src/routes.ts → /order-detail → src/pages/OrderDetail → src/blocks/OrderMeta
```

### 决策树

```
有 URL 且能访问？
  ├── 是 → 页面元素定位（秒级，95%+ 准确率）
  └── 否 → 知道功能关键词？
           ├── 是 → 关键词 grep（分钟级，70% 准确率）
           └── 否 → 路由映射分析（10+ 分钟，90% 准确率）
```

---

## 深度解析：API 请求规范

1688 前端 API 请求统一使用 `@ali/ctf-universal-request`。

### 快速开始

```bash
tnpm install @ali/ctf-universal-request
```

```typescript
import { mtopRequest } from '@ali/ctf-universal-request';

// 最常用：MTop 请求
const response = await mtopRequest({
  api: 'cbu.trade.order.get',
  v: '1.0',
  data: { orderId: '123456' }
});
```

### 请求方法速查

| 方法 | 用途 |
|------|------|
| `mtopRequest` | MTop 请求（最常用） |
| `axiosRequest` | Axios 请求 |
| `pollRequest` | 轮询请求 |
| `jsonpRequest` | JSONP 跨域请求 |
| `romRequest` | ROM 框架请求 |

### 错误处理

```typescript
try {
  const response = await mtopRequest({ api: '...', data: {} });
} catch (error) {
  if (error.code === 'NETWORK_ERROR') { /* 网络错误 */ }
  else if (error.code === 'API_ERROR') { /* 接口错误 */ }
}
```

### 注意事项

- 先检查 `src/utils/request.js` 是否有项目级封装
- 老项目如有成熟封装，保持一致性
- 新项目统一使用 `@ali/ctf-universal-request`

---

## 深度解析：性能优化体系

性能技能覆盖面广，这里给出核心框架。

### 核心公式

```
用户感知耗时 = 资源请求耗时 + 页面渲染耗时
```

### 关键指标（Web Vitals）

| 指标 | 含义 | 目标值 |
|------|------|--------|
| LCP | 最大内容绘制 | < 2.5s |
| FID / INP | 首次输入延迟 | < 100ms |
| CLS | 累计布局偏移 | < 0.1 |
| FCP | 首次内容绘制 | < 1.8s |
| TTFB | 首字节时间 | < 800ms |

### 优化手段速查

| 阶段 | 手段 | 效果 |
|------|------|------|
| **资源加载** | preload / prefetch / preconnect | 提前加载关键资源 |
| **构建优化** | Code Splitting + Tree Shaking | 减少包体积 |
| **缓存策略** | HTTP 缓存 + CDN + Service Worker | 减少网络请求 |
| **渲染优化** | React.memo + useMemo + 虚拟列表 | 减少不必要渲染 |
| **图片优化** | WebP + lazy loading + 响应式 | 减少图片体积 |
| **离线包** | zCache | 跳过网络请求，秒开 |

### 1688 常用 CDN 域名

| 类型 | 域名 |
|------|------|
| JS/CSS | `g.alicdn.com` |
| 图片 | `img.alicdn.com`, `cbu01.alicdn.com` |
| MTop API | `h5api.m.1688.com` |
| 埋点 | `log.mmstat.com` |

---

## 深度解析：构建与发布

构建发布依赖 **O2 平台**，需安装 O2 MCP 工具：

**安装地址**：`https://open.aone.alibaba-inc.com/mcp/server/o2`

### 发布流程

```
创建迭代 → 创建变更 → 推送代码 → 创建发布任务 → 部署
```

### O2 MCP 工具速查

| 场景 | 工具 |
|------|------|
| 查看应用信息 | `get_app_detail` |
| 搜索应用 | `get_apps` |
| 创建迭代 | `add_iteration` |
| 创建变更 | `add_iteration_change` / `add_app_change` |
| 创建发布任务 | `add_task` |
| 查看任务结果 | `get_task_result` |

---

## 实际使用场景

### 场景 1：接到新需求（完整流程）

```
你：帮我开发这个需求 https://aone.alibaba-inc.com/req/80616570
    页面 URL 是 https://air.1688.com/app/ctf-page/order-detail/index.html
```

Claude 自动执行 9 步流程：
1. 识别需求 → 从 Aone 链接获取需求信息
2. 收集 URL → 已提供
3. 解析 URL → 代码组=ctf-page，仓库名=order-detail
4. 验证仓库 → `git remote -v` 逐个验证候选目录
5. 直接使用 → remote 匹配则告知用户
6. 查看结构 → 判断 ICE 版本，读取 package.json
7. 理解需求 → 深入分析功能点
8. 制定计划 → 列出修改方案
9. 开始开发 → 按计划执行

### 场景 2：找代码改功能

```
你：商品列表的筛选功能代码在哪？
```

自动触发代码定位技能：
1. 优先使用页面元素定位法（如果有 URL）
2. 其次 grep 关键词：`筛选`、`filter`、`FilterPanel`
3. 找到后展示文件路径和关键代码

### 场景 3：提交代码

```
你：改好了，帮我提交
```

自动执行 Git 规范检查：
1. `git branch --show-current` — 确认不在 master ✅
2. `git diff` — 确认没有无关格式变动 ✅
3. 生成规范的 commit message：`feat(order): 添加筛选功能`
4. `git push origin <当前分支名>` — 同名推送 ✅

### 场景 4：性能优化

```
你：这个页面首屏加载太慢了
```

自动触发性能优化技能：
1. 分析当前性能指标
2. 检查资源加载瀑布图
3. 识别瓶颈（大 JS 包？过多请求？）
4. 给出针对性优化方案

### 场景 5：调用 MTop 接口

```
你：需要调用 cbu.trade.order.get 接口获取订单数据
```

自动触发 API 请求技能：
1. 检查项目是否已安装 `@ali/ctf-universal-request`
2. 生成标准的 mtopRequest 调用代码
3. 包含错误处理和类型定义

### 场景 6：国际化多语言

```
你：这个组件需要支持多语言
```

自动触发国际化技能：
1. 检查项目 i18n 配置
2. 提取需要翻译的文案
3. 生成 i18n key 和翻译文件
4. 替换硬编码文案为 i18n 调用

---

## 与其他工具的配合

cgf-coding-skill 不是独立工作的，它经常与其他工具链配合：

| 配合工具 | 场景 | 说明 |
|---------|------|------|
| **O2 MCP** | 构建发布 | 迭代/变更/发布任务管理 |
| **Aone MCP** | 需求管理 | 读取需求详情、创建工作项 |
| **Chrome MCP / Playwright** | 页面调试 | 打开页面、查看元素、截图 |
| **语雀 MCP** | 文档读取 | 读取内部技术文档 |
| **ali-dev-tools** | 代码平台 | 代码仓库、MR、流水线操作 |

---

## 常见问题 FAQ

### Q: 技能是怎么被触发的？

说话中包含对应关键词即可自动触发，不需要手动指定。例如你说"帮我调个接口"，其中"接口"会触发 API 请求技能。技能的设计原则是"宁可误触发，不可漏触发"。

### Q: 如果 git remote 没有匹配的仓库怎么办？

Claude 会告知你所有候选目录的 remote 信息，然后询问是否需要 clone 目标仓库。不会在不匹配的仓库上进行任何操作。

### Q: 非 ICE 项目能用这个 skill 吗？

可以。核心的铁律、Git 规范、代码定位、性能优化等技能不依赖 ICE。ICE 特有的技能（如 ICE 结构、状态管理）在非 ICE 项目中会自动跳过。

### Q: 技能内容可以自定义吗？

可以。技能文件存放在 `~/.claude/skills/cgf-coding-skill/` 目录下，`always/` 是常驻规范，`skills/` 是按需技能，都是 Markdown 文件，可以直接编辑。

### Q: FEATURES.md 里的待补充技能什么时候会加？

按需逐步补充。当前待补充的高优先级技能包括：
- **调试与排查** — DevTools 调试技巧、远程调试
- **数据 Mock** — ICE mock 目录规范、联调方案

---

## 待补充技能路线图

| 优先级 | 技能 | 触发词 | 状态 |
|--------|------|--------|------|
| P0 | 调试与排查 | debug, DevTools, 白屏, 报错 | 计划中 |
| P0 | 数据 Mock | mock, 模拟数据, 联调 | 计划中 |
| P1 | 组件开发规范 | 设计组件, props 设计 | 待排期 |
| P1 | Code Review | CR, MR, PR, 审查 | 待排期 |
| P2 | 微前端 icestark | 微前端, 子应用, 主应用 | 待排期 |
| P2 | 安全规范 | XSS, 注入, CSRF | 待排期 |
| P2 | AB 实验 | 灰度, feature flag | 待排期 |

---

## 总结

cgf-coding-skill 的核心价值：

1. **防错**：4 条铁律避免在错误仓库开发、误推 master 等灾难性错误
2. **提效**：9 步流程标准化需求开发，25 个技能覆盖日常开发全场景
3. **规范**：Git 提交、编码标准、命名规范统一团队协作
4. **智能**：关键词自动触发，无需记忆命令，说人话就能工作

一句话总结：**说你想做什么，skill 帮你按规范做对。**
