---
title: "后端视角：Next.js 两个诡异报错的根因与规避"
excerpt: "Cannot find module vendor-chunks 和样式突然丢失——用 Java/Maven 类比，彻底搞清楚 Next.js 构建缓存和 CSS chunk 竞态这两个新手必踩的坑。"
category: "troubleshooting"
tags: ["next.js", "构建系统", "缓存", "troubleshooting", "后端转全栈"]
publishedAt: "2026-04-26"
readTime: 8
---

## 背景

在用 Next.js 开发博客时，遇到了两个让后端工程师摸不着头脑的前端报错：

1. **`Cannot find module './vendor-chunks/@supabase.js'`** — 本地好好的，突然就崩了
2. **样式全部丢失** — 页面能打开，但裸奔，没有任何 CSS

两个错误表现截然不同，但根因都指向同一件事：**构建产物的状态管理**。

用后端的视角来看，其实一点都不神秘。

---

## 报错一：`Cannot find module './vendor-chunks/@supabase.js'`

### 现象

访问页面时，浏览器或终端出现：

```
Error: Cannot find module './vendor-chunks/@supabase.js'
Require stack:
- .next/server/webpack-runtime.js
- .next/server/app/articles/[category]/[slug]/page.js
```

### 用 Java/Maven 类比

这就像 `target/` 目录里的 `.class` 文件**部分损坏**：

```
正常状态：
target/
├── UserService.class     ✅
├── OrderService.class    ✅
└── vendor/supabase.jar  ✅

损坏状态（某次构建中断）：
target/
├── UserService.class     ✅（新编译的）
├── OrderService.class    ✅（新编译的）
└── vendor/supabase.jar  ❌（旧版本或缺失）

→ UserService 引用 supabase.jar 时：ClassNotFoundException
```

Next.js 的 `.next/` 目录等价于 Maven 的 `target/`：

| Java/Maven | Next.js |
|-----------|---------|
| `target/` | `.next/` |
| `target/classes/` | `.next/server/` |
| `target/dependency/` | `.next/server/chunks/vendor-chunks/` |
| `mvn clean` | `rm -rf .next` |
| `mvn clean install` | `rm -rf .next && npm run build` |

### 根因

项目的 `predev` 脚本只清了缓存层，没清产物层：

```json
// package.json（有问题的配置）
"predev": "rm -rf .next/cache && ..."
//                        ↑
//                 只清了这一层（相当于清 Maven 缓存，不等于 mvn clean）
```

上次开发服务器**异常中断**时，`.next/server/` 里留下了残缺的 vendor chunk 文件。下次启动时，新编译的模块找不到旧的 chunk，就报了这个错。

### 解决方案

```json
// package.json（修复后）
"predev": "rm -rf .next && ...",
//                  ↑
//         清整个 .next，相当于 mvn clean，从头编译
```

### 权衡

`rm -rf .next` 会让每次 `npm run dev` 都重新编译所有模块，首次启动要多等几秒到几十秒（视项目大小）。如果日常开发不想等，可以拆成两个命令：

```json
"dev": "next dev",           // 直接启动，保留 .next（日常快速开发）
"dev:clean": "rm -rf .next && next dev"  // 完整清理后启动（遇到奇怪问题时用）
```

> **经验法则**：遇到莫名其妙的模块找不到、类型报错、热更新失效，先 `rm -rf .next` 重启——等价于 Java 里的 `mvn clean`，解决 80% 的"玄学"问题。

---

## 报错二：样式全部丢失

### 现象

页面能打开，内容也有，但完全没有样式——所有 Tailwind CSS 类名都没生效，页面"裸奔"。

### 用 Java/Spring Boot 类比

这就像 Spring Boot 的 **Bean 竞态初始化**：

```java
// 假设场景：Bean A 依赖 Bean B，但 B 还没初始化完，
// 请求就进来了，A 拿到了 null 的 B
@Service
public class OrderService {
    @Autowired
    private InventoryService inventory; // 还没初始化完

    public void createOrder() {
        inventory.check(); // NullPointerException
    }
}
```

Next.js 的 CSS 丢失是类似的竞态：

```
用户请求 /articles/xxx
    ↓
Next.js: "这个页面没有编译产物，开始编译..."
    ↓
JS 编译完成 → 立即返回 HTML（含 <link rel="stylesheet" href="/_next/static/css/xxx.css">）
    ↓
浏览器解析 HTML → 请求 CSS 文件
    ↓
❌ CSS 还没编译完，返回 404
    ↓
样式丢失，页面裸奔
```

### 为什么 Next.js 会这样

Next.js 的开发模式采用**按需编译**（On-demand Compilation）：只有页面被访问时，才开始编译那个页面的代码。这么设计是为了加快启动速度——不用一启动就把所有页面都编译好。

代价是：**第一次访问**某个页面时，存在编译竞态窗口。通常情况下这不是问题，因为 JS 和 CSS 同步编译，浏览器等得到。但当 `.next` 目录刚被清空时，第一次请求的编译时间特别长（需要编译 5000+ 模块），就可能出现 CSS 文件还没好、HTML 已经发出去的情况。

### 解决方案

删除 `.next` 后，**先用命令行预热，再开浏览器**：

```bash
# 启动开发服务器后，手动预热
curl -s http://localhost:3000 > /dev/null
curl -s http://localhost:3000/articles > /dev/null
# 等终端显示 "✓ Compiled" 后，再打开浏览器
```

或者把预热集成到 npm 脚本：

```json
"dev:warmup": "next dev & sleep 12 && curl -s http://localhost:3000 > /dev/null && echo '✅ 预热完成'"
```

> **本质理解**：后端 Spring Boot 启动时会把所有 Bean 初始化好再对外提供服务。Next.js 开发模式为了快，是"来一个编译一个"，第一次请求是带着编译时间的。

---

## 报错三：Fast Refresh 全量重载

### 现象

终端出现：
```
⚠ Fast Refresh had to perform a full reload due to a runtime error.
```

### 解释

这是前两个报错的**副作用**，不独立存在：

- Fast Refresh = Spring Boot 的热部署（DevTools）
- 热部署检测到运行时报错 → 自动触发全量重载，等价于重启应用
- 前两个报错修好之后，这个警告自然消失

---

## 总结

| 报错 | 后端类比 | 根因 | 一句话修复 |
|------|---------|------|-----------|
| `Cannot find module vendor-chunks` | `target/` class 文件残缺 | `.next/cache` 清了但产物层没清 | `predev` 改为 `rm -rf .next` |
| 样式全部丢失 | Bean 未初始化完就接了请求 | CSS chunk 编译竞态 | 删 `.next` 后先用 curl 预热 |
| Fast Refresh 全量重载 | 热部署失败回滚 | 前两个错误的副作用 | 修前两个就消失了 |

### 日常操作建议

```bash
# 日常开发（快，保留 .next）
npm run dev:fast

# 遇到莫名其妙的报错（慢，从头来）
npm run dev

# 删了 .next 之后，别急着开浏览器，先等终端出现：
# ✓ Compiled /articles/[category]/[slug] in 14s
# 再打开页面
```

### 心智模型

作为后端工程师，可以这样理解 Next.js 的构建系统：

```
.next/          ←→  target/（Maven 构建产物）
.next/cache/    ←→  ~/.m2/repository（依赖缓存）
rm -rf .next    ←→  mvn clean
npm run build   ←→  mvn package
npx next dev    ←→  mvn spring-boot:run（开发模式）
```

遇到问题，先 `mvn clean`，这个直觉在 Next.js 里同样适用。
