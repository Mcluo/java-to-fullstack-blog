---
title: "写给后端的前端流式渲染指南 — 遨虾选品报告 SSE 架构拆解"
excerpt: "用后端工程师熟悉的语言，讲清楚前端是怎么消费 SSE 流的：Fetch + ReadableStream 手动解析、MobX 状态驱动渲染、Markdown 实时转 HTML、逐 token 动画。看完你就知道你吐出来的流，前端到底是怎么'吃'的。"
category: "architecture"
tags: ["SSE", "streaming", "frontend", "React", "MobX", "alphashop"]
publishedAt: "2026-04-06"
updatedAt: "2026-04-07"
readTime: 14
---

## 为什么后端需要看这篇

你写了一个 SSE 流式接口，`SseEmitter` 一行行往外吐 `data: {...}\n`。接口调通了，Postman 里也能看到数据在跑。

然后前端同事问你：

> "心跳包能不能换个格式？" "完成信号能不能加个字段？" "为什么偶尔会丢最后一条消息？"

你一脸懵——我吐出来的流，前端到底是怎么消费的？为什么这些细节会影响前端？

这篇文章就是帮你补上这个认知：以遨虾（alphashop.cn）选品报告的前端代码为例，把前端消费 SSE 流的全过程讲清楚。所有前端概念都会用后端类比来解释。

---

## 一、整体架构速览

先看全貌，再看细节：

| 层级 | 技术 | 后端类比 |
|------|------|----------|
| 前端框架 | ICE (飞冰) + React | 相当于 Spring Boot，阿里内部的 React 脚手架 |
| 状态管理 | MobX | 相当于一个内存中的 "数据库"，数据变了 UI 自动刷新 |
| 流式通信 | Fetch API + ReadableStream | 相当于 `HttpURLConnection.getInputStream()`，逐行读 |
| 渲染 | Markdown → HTML + CSS 动画 | 相当于模板引擎（Thymeleaf/FreeMarker）把数据渲染成页面 |

数据流向：**你的 SSE 接口 → Fetch 拿到流 → 逐行解析 JSON → 推入 MobX Store → React 自动重新渲染 UI**。

这和后端的 "MQ 消费者" 模型其实很像：消息进队列 → 消费者取出 → 写入数据库 → 变化自动触发下游。只不过前端的 "队列" 是 MobX 的 observable 数组，"下游" 是 DOM 渲染。

---

## 二、前端怎么发起 SSE 请求

### 为什么不用 EventSource

你可能知道浏览器有个原生的 `EventSource` API 专门用来消费 SSE。但遨虾没用它，原因很简单——**EventSource 只支持 GET 请求**。

对后端来说这意味着：如果你的接口是 POST（发 JSON body），前端就没法用 EventSource，必须用 `fetch` 手动处理。

完整对比：

| 对比项 | EventSource | Fetch + ReadableStream |
|--------|-------------|----------------------|
| 请求方法 | 仅 GET | POST/PUT/任意方法 |
| 请求体 | 不支持 | 支持 JSON body |
| 请求头 | 不可自定义 | 完全自定义 |
| 取消请求 | 手动 `.close()` | `AbortController`（类似 Java 的 `Future.cancel()`） |
| 认证 | 只能 URL 传参或靠 cookie | 可带 cookie 或自定义 header |
| 自动重连 | 内置 | 需自己实现 |

**结论**：遨虾需要 POST + JSON body + cookie 认证，所以只能用 Fetch。

### 请求代码（逆向还原）

```javascript
async function ew({ fetchUrl, params, onStream }) {
  // AbortController = 后端的 Future.cancel()，用来中途取消请求
  const controller = new AbortController();
  
  const response = await fetch(fetchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",      // 告诉后端：我要 SSE 流
      "Cache-Control": "no-cache",       // 别缓存，要实时数据
    },
    credentials: "include",              // 带上 cookie（类似后端 HttpClient 的 CookieStore）
    body: JSON.stringify({ sessionId, taskId, ...params }),
    signal: controller.signal,           // 绑定取消信号
  });

  if (!response.ok) throw Error(`HTTP ${response.status}`);
  if (!response.body) throw Error("响应体为空");

  // response.body 就是一个流，类似 Java 的 InputStream
  // getReader() 类似把 InputStream 包装成 BufferedReader
  eC(response.body.getReader(), new TextDecoder("utf-8"), "", onStream);
}
```

到这一步为止，和后端用 `HttpURLConnection` 读流没有本质区别。关键区别在下面的解析逻辑。

---

## 三、核心：逐 chunk 读取和解析（最重要的部分）

这段代码是整个流式渲染的心脏。用后端的话说，这就是一个 **SSE 协议的客户端解析器**——你在后端写的 `data: xxx\n`，前端就是这么一行行拆出来的。

```javascript
async function eC(reader, decoder, buffer, onStream) {
  try {
    // reader.read() = BufferedReader.readLine()，但读的是 byte chunk 不是行
    const { done, value } = await reader.read();
    if (done) return;  // 流结束（后端 close 了连接）

    // 1. 解码 + 缓冲区拼接
    //    value 是 Uint8Array（字节数组），需要解码成字符串
    //    stream: true 表示"后面还有数据，别把不完整的多字节字符截断"
    //    这和 Java 的 InputStreamReader 设置 charset 是一个道理
    buffer += decoder.decode(value, { stream: true });

    // 2. 按换行符切割
    //    SSE 协议规定：每条消息以 \n 结尾，消息之间用空行分隔
    //    这里的处理方式类似后端的 "按行读取 + 处理粘包"
    const lines = buffer.split("\n");
    
    // ★ 关键：最后一行可能是不完整的（TCP 粘包/拆包）
    //    比如收到 "data: {\"content\":\"hel"，还没到 \n
    //    pop() 把它留到下次拼接，和 Netty 的 LineBasedFrameDecoder 原理一样
    buffer = lines.pop() || "";

    // 3. 逐行解析
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 跳过空行和非 data: 开头的行（SSE 还有 event:、id:、retry: 等字段，这里只处理 data:）
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      // 去掉 "data:" 前缀，拿到 JSON 字符串
      const data = trimmed.slice(5).trim();
      
      // 心跳包：后端发的 "data: heartbeat"，前端直接丢弃
      if (data.startsWith("heartbeat")) continue;
      
      // 关闭信号：后端发的 "data: connection_closing"
      if (data === "connection_closing") return;

      try {
        const parsed = JSON.parse(data);

        // --- 以下是业务协议层 ---

        // 完成信号：后端发 {"status": "allDone"} 表示报告生成完毕
        if (parsed.status === "allDone") {
          setProcessStatus("COMPLETED");
          setIsStreaming(false);
          return;
        }

        // 会话管理：后端在首条消息里带上 sessionId/taskId
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        if (parsed.taskId) setTaskId(parsed.taskId);

        // 错误处理：后端返回 {"success": false, "data": {"errorMessage": "..."}}
        if (parsed.success === false) {
          setIsStreaming(false);
          message.error(parsed.data?.errorMessage || "请求失败");
          return;
        }

        // ★★★ 核心中的核心 ★★★
        // 节流：throttle() 控制渲染频率，防止大模型吐太快把浏览器卡死
        // 类似后端 MQ 消费者的限流（RateLimiter）
        await throttle();
        
        // 把解析好的数据推入 MobX Store（类似往内存队列里 offer 一条消息）
        // MobX 检测到数组变化后，自动触发 React 重新渲染
        onStream(parsed);

      } catch (e) {
        // JSON 解析失败就跳过，不影响后续消息（容错）
        console.warn("[SSE] JSON解析失败:", data, e);
      }
    }

    // 4. 递归调用自己，继续读下一个 chunk
    //    为什么用递归不用 while 循环？
    //    因为每次 await reader.read() 会让出执行权给浏览器渲染线程
    //    如果用 while(true)，虽然有 await，但 V8 引擎的微任务队列调度
    //    可能导致渲染任务被推迟。递归调用可以确保每次循环之间有"喘息"的机会
    //    类比：类似后端用 EventLoop 而不是 while(true) 轮询
    eC(reader, decoder, buffer, onStream);

  } catch (e) {
    console.error("[SSE] 读取数据时出错:", e);
  }
}
```

### 用后端概念翻译一下这段代码做了什么

把上面的代码翻译成后端工程师熟悉的模式：

```
1. 从 InputStream 读一个 byte[] chunk    → reader.read()
2. 解码成 String，拼到缓冲区             → decoder.decode() + buffer
3. 按 \n 切割，处理粘包（保留不完整行）  → split("\n") + pop()
4. 逐行解析：去掉 "data: " 前缀 + JSON.parse  → 类似 Jackson.readValue()
5. 根据消息类型做业务处理               → 类似 MQ 消费者的 switch-case
6. 限流后推入 Store                      → 类似 RateLimiter + queue.offer()
7. 循环读取下一个 chunk                  → 类似 while((line = br.readLine()) != null)
```

**本质上就是一个 SSE 协议的客户端解码器 + 消息分发器。**

---

## 四、状态管理：MobX 就是前端的 "内存数据库"

后端同学可能对 MobX 不熟悉，用一个类比就能理解：

```
后端：消息写入 Redis → 订阅者收到变更通知 → 执行业务逻辑
前端：数据推入 MobX observable 数组 → React 检测到变更 → 自动重新渲染 DOM
```

遨虾的 `useChatStream` hook（可以理解为一个 "流式消费服务类"）暴露这些状态：

```javascript
return {
  blocks,              // observable 数组：存放所有收到的消息块（类似 List<Block>）
  getStream,           // 发起流式请求（类似 startConsuming()）
  isStreaming,         // 是否正在接收（类似 consumer.isRunning()）
  processStatus,       // INIT | RUNNING | COMPLETED（任务状态机）
  clearBlocks,         // 清空消息（类似 queue.clear()）
  sessionId,           // 会话 ID
  pushBlock,           // 手动推入消息（用于回放历史报告）
};
```

每次 `onStream(parsed)` 往 `blocks` 数组推入一条新消息，React 就会自动把对应的 UI 片段渲染出来。不需要手动操作 DOM，不需要轮询——**数据驱动视图，这就是 React + MobX 的核心理念**。

---

## 五、Markdown 渲染：后端吐的文本怎么变成漂亮的页面

这部分和后端模板引擎（Thymeleaf/FreeMarker）的概念类似：**拿到数据 → 套模板 → 输出 HTML**。

### 后端吐出来的是 Markdown

大模型（通义千问）生成的是 Markdown 格式文本，通过 SSE 逐 token 推送：

```
data: {"content": "| 赛道 | 品牌垄断率 | ... |"}
data: {"content": "|------|----------|...|}"}
data: {"content": "| yoga pants plus size | 31% | ... |"}
```

### 前端实时转成 HTML

前端用 Markdown 解析库把文本实时转成 HTML。比如上面的 Markdown 表格会变成：

```html
<table class="qwen-table">
  <caption>表1：瑜伽裤细分赛道机会对比</caption>
  <thead>
    <tr>
      <th>赛道原名（中文名）</th>
      <th>品牌垄断率</th>
      <th>新品销量占比</th>
      <th>近30天销量环比</th>
      <th>机会评级</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <!-- 每个 token 包一个 span，用来做逐词出现的动画 -->
        <span style="animation: 0.1s ft-fadeIn">yoga</span>
        <span style="animation: 0.1s ft-fadeIn"> pants</span>
        <span style="animation: 0.1s ft-fadeIn"> plus size</span>
      </td>
      <td><span style="animation: 0.1s ft-fadeIn">31%</span></td>
      <!-- ... -->
    </tr>
  </tbody>
</table>
```

### "打字机"动画怎么实现的

每个新 token 被包在一个 `<span>` 里，CSS 动画让它从透明渐变为不透明：

```css
@keyframes ft-fadeIn {
  from { opacity: 0; }  /* 刚出现时完全透明 */
  to { opacity: 1; }    /* 0.1秒内变为完全可见 */
}
```

**对后端的意义**：你的接口吐 token 的粒度直接决定了动画效果。吐太快（一次一大段），打字机效果就没了；吐太慢（一次一个字），页面会卡顿（DOM 操作太频繁）。遨虾前端通过 `throttle()` 做了节流来兜底，但后端的输出粒度仍然是关键因素。

---

## 六、完整数据流时序

把前面的所有环节串起来：

```
用户输入 "瑜伽裤"
    │
    ▼
POST /chatCache/create              ← 创建会话（普通 REST 调用）
    │
    ▼
POST /algo/execute (SSE 长连接)     ← 发起流式请求
    │
    │  前端内部发生了什么：
    │  fetch() → response.body.getReader() → 开始逐 chunk 读取
    │
    ├─ data: {"status":"planning","content":"任务规划..."} 
    │   → JSON.parse → 识别为状态消息 → 渲染"规划中"面板
    │
    ├─ data: {"status":"executing","content":"正在分析..."} 
    │   → JSON.parse → 状态切换 → 渲染"执行中"面板
    │                               ┌─ POST /chatCache/get (轮询状态)
    │  前端同时并行发起其他请求 →    ├─ POST /searchSkus (查商品)
    │                               └─ POST /searchSkus (查商品)
    │
    ├─ data: {"content":"## 一、市场简介\n..."}
    │   → JSON.parse → 推入 MobX blocks → React 渲染
    │   → Markdown 解析为 HTML → 逐 token ft-fadeIn 动画
    │
    ├─ data: {"content":"| 赛道 | 品牌垄断率 |..."}
    │   → Markdown 表格 → <table class="qwen-table">
    │
    ├─ data: heartbeat
    │   → 前端直接丢弃，仅用于保持连接不被 Nginx/SLB 断开
    │
    ├─ data: {"content":"## 二、机会赛道一..."}
    │   → 商品卡片渲染（配合之前 searchSkus 拿到的商品数据）
    │
    ├─ data: {"status":"allDone"}
    │   → 设置 processStatus = COMPLETED → 显示"导出报告"按钮
    │
    └─ 连接关闭
```

注意这里有一个很重要的设计：**SSE 流只负责推送大模型生成的内容和状态，商品数据走独立的 REST 接口**。前端拿到商品数据后，在渲染时和 SSE 流里的内容做组合。

用后端的话说：这是一个 **编排模式**——主流程走 SSE，支线数据走并行 RPC。

---

## 七、后端接口设计对前端的影响

了解了前端怎么消费 SSE 流之后，你就能理解这些接口设计决策为什么重要：

### 7.1 心跳包格式

前端代码里是 `if (data.startsWith("heartbeat")) continue;`，意味着你发的心跳包必须以 `heartbeat` 开头。如果你改成 `{"type": "heartbeat"}`，前端就不认了——它会尝试 `JSON.parse`，虽然不会崩（有 try-catch 兜底），但会多一次无意义的解析。

### 7.2 完成信号

前端靠 `parsed.status === "allDone"` 判断流结束。如果后端不发这个信号就直接关连接，前端 `reader.read()` 会收到 `done: true`，也能处理。但用户可能会看到一瞬间的"加载中"状态才切换到"完成"，体验不好。

### 7.3 错误信息

前端直接把 `parsed.data.errorMessage` 弹出来给用户看。所以后端的错误信息要是用户能读懂的中文，不要返回 `NullPointerException at line 42`。

### 7.4 token 输出粒度

大模型 `incrementalOutput: true`（增量输出）模式下，每次回调的 token 可能是一个字、一个词、或半句话。前端做了节流处理，但如果后端把多个 token 攒成一大段再发，"打字机"效果就没了。

---

## 八、核心 API 端点汇总

| 端点 | 方法 | 用途 | 响应格式 |
|------|------|------|----------|
| `selection.alphashop.cn/opp/sel/api/algo/execute` | POST | 执行选品算法（核心） | SSE 流 |
| `create.alphashop.cn/chatCache/create` | POST | 创建聊天缓存 | JSON |
| `create.alphashop.cn/chatCache/get` | POST | 轮询缓存状态（12次+） | JSON |
| `selection.alphashop.cn/opp/sel/api/product/searchSkus` | POST | 查询商品数据 | JSON |
| `create.alphashop.cn/preference/get` | GET | 用户偏好 | JSON |
| `www.alphashop.cn/getUserInfo` | GET | 用户信息 | JSON |

---

## 九、一句话总结

**后端的 `SseEmitter.send()` 吐出来的每一行 `data: {...}\n`，前端通过 Fetch ReadableStream 逐 chunk 读取、按 `\n` 切割处理粘包、JSON.parse 解析、推入 MobX 响应式 Store，React 自动 diff 并渲染 DOM。**

整个过程就是一个 "流式消息消费 + 响应式数据绑定" 的组合。和后端的 "Kafka 消费者 + 缓存更新触发下游" 是同一个思维模型。
