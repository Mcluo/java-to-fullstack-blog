---
title: "无触控交互 Chrome 扩展 MVP 设计：用手势操控浏览器"
excerpt: "深入探讨如何将 MediaPipe 手部追踪封装为 Chrome 扩展，实现手势驱动的浏览器无触控交互，覆盖架构设计、核心难点和性能预算"
category: "frontend"
tags: ["chrome-extension", "mediapipe", "手势识别", "无触控交互", "MV3", "computer-vision"]
difficulty: "advanced"
publishedAt: "2026-04-12"
readTime: 20
---

# 无触控交互 Chrome 扩展 MVP 设计：用手势操控浏览器

[上一篇文章](/articles/frontend/04-mediapipe-hand-tracking-creative-coding)拆解了一个手部追踪粒子特效项目，并提出了 6 个产品化方向。这篇文章深入展开其中最推荐的方向——**将手部追踪封装为 Chrome 扩展，实现无触控浏览器交互**。

## 它到底要解决什么问题？

用户对着摄像头伸手，手势被识别后映射为浏览器操作：

| 手势 | 浏览器动作 |
|------|-----------|
| 食指指向 | 移动光标 |
| 拇指+食指捏合 | 点击 |
| 手掌展开上下推 | 页面滚动 |
| 张开五指 | 停止/取消 |

**核心场景**：双手被占用时（做饭看菜谱、跑步机上看视频）、不想触碰屏幕时（公共终端、展厅信息屏），或者作为无障碍辅助输入。

## 架构设计

Chrome MV3 扩展有几个隔离的运行环境，每层代码放哪里至关重要：

```
┌─────────────────────────────────────────────┐
│  Popup / Options Page                       │
│  配置面板：开关、灵敏度、手势映射自定义       │
└──────────────────┬──────────────────────────┘
                   │ chrome.storage
┌──────────────────▼──────────────────────────┐
│  Background Service Worker                   │
│  全局状态管理、tab 切换时保持追踪连续性       │
└──────────────────┬──────────────────────────┘
                   │ chrome.runtime.message
┌──────────────────▼──────────────────────────┐
│  Offscreen Document (关键!)                  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ <video>     │  │ MediaPipe Hands      │  │
│  │ 摄像头流    │──│ WASM 推理            │  │
│  │ (隐藏)      │  │ 21 关键点 → 手势判定  │  │
│  └─────────────┘  └──────────┬───────────┘  │
└──────────────────────────────┬───────────────┘
                               │ postMessage
┌──────────────────────────────▼───────────────┐
│  Content Script (注入到每个页面)               │
│  ┌────────────────┐  ┌────────────────────┐  │
│  │ 虚拟光标渲染    │  │ 手势 → DOM 事件派发 │  │
│  │ (粒子特效复用)  │  │ click/scroll/zoom  │  │
│  └────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 为什么用 Offscreen Document？

Chrome MV3 的 Service Worker 不能访问 DOM 和摄像头。Offscreen Document 是 Chrome 提供的解决方案——一个隐藏页面，可以跑 `getUserMedia` + MediaPipe WASM 推理，且不会随 tab 切换而销毁。这意味着手部追踪是全局持续运行的，切换标签页不会中断。

### 数据流

```
摄像头帧 → MediaPipe WASM → 21个关键点坐标
    → 手势判定引擎 → 手势事件 {type, x, y, confidence}
    → Service Worker 路由 → Content Script
    → 虚拟光标移动 / DOM 事件派发
```

每帧传递的数据很小（一个手势事件对象约 100 bytes），消息通信不会成为瓶颈。

## 三个最难的技术点

### 难点一：从 21 个关键点到手势语义

MediaPipe 输出的是原始坐标，你需要自己定义"什么算一个手势"。

#### 手指伸直检测

```javascript
// 核心：指尖到手腕的距离 vs 指根到手腕的距离
function isFingerExtended(landmarks, fingerTip, fingerMcp) {
  const tip = landmarks[fingerTip];
  const mcp = landmarks[fingerMcp];
  const wrist = landmarks[0];

  const tipDist = distance3D(tip, wrist);
  const mcpDist = distance3D(mcp, wrist);

  return tipDist > mcpDist * 1.2; // 指尖比指根远 20% → 判定为伸直
}

function distance3D(a, b) {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2
  );
}
```

#### 关键点索引速查

```
MediaPipe Hand Landmarks (21个点):

        8   12  16  20       ← 指尖 (TIP)
        |   |   |   |
        7   11  15  19       ← 远端指节 (DIP)
        |   |   |   |
    4   6   10  14  18       ← 近端指节 (PIP)
    |   |   |   |   |
    3   5   9   13  17       ← 指根 (MCP)
    |    \  |  /   /
    2      \|/   /
    |       0───/            ← 手腕 (WRIST)
    1
  拇指
```

#### 捏合检测（点击手势）

```javascript
function isPinching(landmarks) {
  const thumb = landmarks[4];   // 拇指尖
  const index = landmarks[8];   // 食指尖

  const dist = distance3D(thumb, index);
  return dist < 0.05; // 归一化坐标下的阈值
}
```

#### 手势状态机（防误触）

裸判定会导致大量误触——手指经过捏合位置的瞬间就会触发点击。解决方案是引入状态机：

```javascript
class GestureStateMachine {
  constructor() {
    this.state = 'idle';      // idle → ready → triggered → cooldown
    this.readyTime = 0;
    this.cooldownTime = 0;
  }

  update(isPinch, now) {
    switch (this.state) {
      case 'idle':
        if (isPinch) {
          this.state = 'ready';
          this.readyTime = now;
        }
        break;

      case 'ready':
        if (!isPinch) {
          this.state = 'idle'; // 捏合时间太短，取消
        } else if (now - this.readyTime > 200) {
          this.state = 'triggered'; // 持续 200ms，确认为点击
          return 'click';
        }
        break;

      case 'triggered':
        if (!isPinch) {
          this.state = 'cooldown';
          this.cooldownTime = now;
        }
        break;

      case 'cooldown':
        // 300ms 冷却期，防止连续误触
        if (now - this.cooldownTime > 300) {
          this.state = 'idle';
        }
        break;
    }
    return null;
  }
}
```

**关键设计**：
- `ready → triggered` 需要 200ms 持续捏合，过滤掉手指经过时的瞬间碰触
- `triggered → cooldown` 需要 300ms 冷却，防止松手后立即再次触发
- 阈值应该暴露为用户可配置参数

### 难点二：手坐标到屏幕坐标的映射

MediaPipe 输出 0~1 的归一化坐标。直接乘以屏幕尺寸会有两个致命问题。

#### 问题 A：活动范围太小

人在摄像头前手的有效活动范围大约只占画面的 40%~60%。如果 1:1 映射，光标永远够不到屏幕边缘。

```javascript
// 解法：把手的有效活动区域拉伸映射到全屏
function mapToScreen(handX, handY) {
  // 手的有效活动区域（可通过校准动态确定）
  const zone = { xMin: 0.2, xMax: 0.8, yMin: 0.2, yMax: 0.8 };

  let nx = (handX - zone.xMin) / (zone.xMax - zone.xMin);
  let ny = (handY - zone.yMin) / (zone.yMax - zone.yMin);

  // 钳制到 [0, 1]
  nx = Math.max(0, Math.min(1, nx));
  ny = Math.max(0, Math.min(1, ny));

  return {
    x: nx * window.innerWidth,
    y: ny * window.innerHeight
  };
}
```

更好的做法是在首次使用时做一个**校准流程**：让用户把手移到左上角和右下角，自动记录活动范围。

#### 问题 B：抖动

手不可能完全静止，直接映射光标会疯狂抖。

```javascript
// 指数移动平均滤波 (EMA)
class SmoothCursor {
  constructor(smoothing = 0.7) {
    this.smoothing = smoothing; // 0.5~0.9，越大越平滑但延迟越高
    this.x = 0;
    this.y = 0;
  }

  update(rawX, rawY) {
    this.x = this.x * this.smoothing + rawX * (1 - this.smoothing);
    this.y = this.y * this.smoothing + rawY * (1 - this.smoothing);
    return { x: this.x, y: this.y };
  }
}
```

**进阶优化：速度自适应平滑**

平滑度和响应速度是矛盾的。手快速移动时需要跟手（低平滑），手停住时需要防抖（高平滑）：

```javascript
update(rawX, rawY) {
  const dx = rawX - this.x;
  const dy = rawY - this.y;
  const speed = Math.sqrt(dx * dx + dy * dy);

  // 速度越快，平滑系数越低（越跟手）
  const adaptive = Math.max(0.3, this.smoothing - speed * 2);

  this.x = this.x * adaptive + rawX * (1 - adaptive);
  this.y = this.y * adaptive + rawY * (1 - adaptive);

  return { x: this.x, y: this.y };
}
```

### 难点三：Content Script 派发真实 DOM 事件

手势识别出"点击"后，Content Script 需要在目标坐标触发真实的点击：

```javascript
function dispatchClickAt(x, y) {
  const target = document.elementFromPoint(x, y);
  if (!target) return;

  // 必须派发完整的鼠标事件序列，很多框架依赖 mousedown/mouseup
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    target.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'mouse',
      view: window
    }));
  }
}
```

#### 已知的坑

| 问题 | 原因 | 解法 |
|------|------|------|
| iframe 内元素点不到 | `elementFromPoint` 不穿透 iframe | 在 iframe 也注入 Content Script |
| React/Vue 按钮不响应 | 合成事件系统需要 Pointer 事件 | 同时派发 `PointerEvent` + `MouseEvent` |
| 下拉菜单展不开 | 需要先触发 `mouseenter`/`mouseover` | 光标移动时持续派发 hover 事件 |
| input 无法聚焦 | 浏览器安全限制 | 先 `target.focus()` 再派发事件 |

## 虚拟光标设计

光标需要给用户明确的视觉反馈——"系统知道我的手在哪"。这里可以复用原项目的粒子特效：

```javascript
class VirtualCursor {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'hand-cursor';
    this.el.style.cssText = `
      position: fixed;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 255, 255, 0.6);
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.8),
                  0 0 30px rgba(0, 255, 255, 0.4);
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
      transition: width 0.15s, height 0.15s, background 0.15s;
    `;
    document.body.appendChild(this.el);
  }

  moveTo(x, y) {
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  }

  // 捏合时视觉反馈：缩小 + 变色
  onPinchStart() {
    this.el.style.width = '16px';
    this.el.style.height = '16px';
    this.el.style.background = 'rgba(255, 100, 50, 0.8)';
  }

  onPinchEnd() {
    this.el.style.width = '24px';
    this.el.style.height = '24px';
    this.el.style.background = 'rgba(0, 255, 255, 0.6)';
  }
}
```

光标颜色变化让用户确认"点击被识别了"，这个反馈在无触控场景下至关重要。

## 性能预算

这是决定"能不能用"的关键：

| 环节 | 目标 | 预期实际值 | 说明 |
|------|------|-----------|------|
| MediaPipe 推理 | < 30ms | 15-25ms | Lite 模型，Offscreen Document |
| 手势判定 | < 2ms | ~1ms | 纯数学计算 |
| 消息传递 | < 5ms | 2-3ms | chrome.runtime.sendMessage |
| 光标渲染 | < 3ms | ~1ms | CSS transform，GPU 加速 |
| **端到端延迟** | **< 50ms** | **约 30-40ms** | 人对光标延迟感知阈值 50-100ms |

**关键优化策略**：

1. MediaPipe 用 `modelComplexity: 0`（Lite 模式），牺牲少量精度换 2x 速度
2. 推理在 Offscreen Document 运行，不阻塞页面主线程
3. 光标位置更新用 `requestAnimationFrame`，与屏幕刷新同步
4. 消息传递只发手势事件（~100 bytes），不传原始关键点

## MVP 功能边界

### 第一版只做这些

| 功能 | 手势 | 判定条件 |
|------|------|----------|
| 移动光标 | 食指指向 | 仅食指伸直，其余握拳 |
| 点击 | 拇指+食指捏合 | 两指尖距离 < 阈值，持续 200ms |
| 滚动 | 手掌展开上下推 | 五指全伸，检测手掌中心 y 轴位移 |

### 明确不做

- 缩放手势（两指捏合拉开）
- 拖拽（捏合后移动）
- 右键菜单
- 多手势组合
- 自定义手势训练

这些留给 v2，先验证核心体验。

## 项目文件结构

```
hand-cursor-extension/
├── manifest.json              # MV3 配置，声明权限
├── offscreen/
│   ├── offscreen.html         # 隐藏页面，承载摄像头和推理
│   └── tracker.js             # 手部追踪 + 手势状态机
├── content/
│   ├── cursor.js              # 虚拟光标渲染
│   └── dispatcher.js          # 手势 → DOM 事件派发
├── background/
│   └── service-worker.js      # 消息路由、全局状态
├── popup/
│   ├── popup.html             # 开关、灵敏度调节
│   └── popup.js
├── lib/
│   └── mediapipe/             # WASM 文件（本地打包，不依赖 CDN）
└── icons/                     # 扩展图标
```

## 最大的两个风险

### 风险 1：摄像头权限焦虑

用户会担心"这个扩展一直开着摄像头在看我"。必须做到：

- 扩展图标实时显示摄像头状态（绿色 = 开启，灰色 = 关闭）
- 一键开关，快捷键支持（如 `Alt+H` 切换）
- 所有推理纯本地运行，不发送任何数据
- README 和扩展商店页面明确声明隐私策略
- 浏览器地址栏本身也会显示摄像头指示灯，这是系统级的信任锚点

### 风险 2：使用场景可能太窄

大部分时间键鼠更高效。MVP 阶段建议锚定一个"非用不可"的场景来验证：

| 场景 | 刚需程度 | 说明 |
|------|---------|------|
| 厨房看菜谱 | 高 | 手上有面粉/油，不想碰屏幕 |
| 跑步机看视频 | 中 | 运动中不方便精确操作 |
| 展厅信息屏 | 高 | 公共卫生考虑，B 端预算充足 |
| 无障碍辅助 | 高 | 小众但需求强烈，政策支持 |

建议先做"厨房模式"——大按钮 UI + 手势翻页，场景直觉，用户立刻能理解价值。

## 下一步

这篇文章覆盖了架构设计和核心技术难点。如果要动手实现，建议的开发顺序：

1. **Offscreen Document + MediaPipe 推理** — 先把手势识别跑通
2. **手势状态机调参** — 在不同光照、不同人手上测试误触率
3. **Content Script + 虚拟光标** — 接入页面，验证端到端体验
4. **Popup 配置面板** — 开关、灵敏度、快捷键

最核心的验证指标只有一个：**用户能否在 30 秒内完成"打开 YouTube → 点击一个视频 → 滚动评论区"这个任务？** 如果可以，MVP 就成立了。

> 技术上最炫酷的方案和产品上最有效的方案，往往不是同一个。MVP 的意义在于用最小代价验证后者。

---

*系列文章：*
- *上篇：[从玩具到产品：MediaPipe 手部追踪 + Canvas 粒子特效实战](/articles/frontend/04-mediapipe-hand-tracking-creative-coding)*
- *下篇：实现篇（待更新）*
