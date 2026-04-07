---
title: "Node.js 异步编程：对比 Java 多线程模型"
excerpt: "理解 Node.js 的事件循环机制，对比 Java 的多线程并发模型，掌握 async/await 模式"
category: "backend"
tags: ["nodejs", "async", "java", "并发编程"]
difficulty: "intermediate"
publishedAt: "2026-03-22"
readTime: 25
---

# Node.js 异步编程：对比 Java 多线程模型

Java 工程师习惯使用多线程处理并发，而 Node.js 采用单线程事件循环模型。理解这一差异是掌握 Node.js 的关键。

## 并发模型对比

| 特性 | Java | Node.js |
|------|------|---------|
| 线程模型 | 多线程 | 单线程 + 事件循环 |
| 并发方式 | 多个线程同时执行 | 事件驱动、非阻塞 I/O |
| 内存开销 | 每个线程 ~1MB | 单线程，低内存 |
| 上下文切换 | 频繁 | 无 |
| 适用场景 | CPU 密集型 | I/O 密集型 |

## 1. 阻塞 vs 非阻塞

### Java 阻塞 I/O

```java
public class JavaBlockingIO {
    public static void main(String[] args) throws Exception {
        System.out.println("开始");

        // 阻塞 2 秒
        Thread.sleep(2000);
        System.out.println("2秒后");

        // 阻塞式文件读取
        String content = Files.readString(Path.of("file.txt"));
        System.out.println(content);

        System.out.println("结束");
    }
}
```

**执行流程**：
```
开始 → [等待2秒] → 2秒后 → [读取文件，阻塞] → 打印内容 → 结束
```

### Node.js 非阻塞 I/O

```typescript
console.log('开始');

// 非阻塞，2秒后执行回调
setTimeout(() => {
  console.log('2秒后');
}, 2000);

// 非阻塞，文件读取完成后执行回调
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

console.log('结束'); // 立即执行！
```

**执行流程**：
```
开始 → 结束 → [2秒后] → 2秒后 → [文件读取完成] → 打印内容
```

**关键差异**：
- Java：程序等待 I/O 完成（阻塞）
- Node.js：注册回调，继续执行（非阻塞）

## 2. Promise：Java CompletableFuture 的对应物

### Java CompletableFuture

```java
public class JavaAsync {
    public CompletableFuture<User> fetchUser(String id) {
        return CompletableFuture.supplyAsync(() -> {
            // 模拟数据库查询
            sleep(1000);
            return new User(id, "Alice");
        });
    }

    public void chainOperations() {
        fetchUser("123")
            .thenApply(user -> enrichUser(user))
            .thenAccept(user -> System.out.println(user))
            .exceptionally(ex -> {
                System.err.println("错误: " + ex);
                return null;
            });
    }
}
```

### Node.js Promise

```typescript
function fetchUser(id: string): Promise<User> {
  return new Promise((resolve, reject) => {
    // 模拟数据库查询
    setTimeout(() => {
      resolve({ id, name: 'Alice' });
    }, 1000);
  });
}

function chainOperations() {
  fetchUser('123')
    .then(user => enrichUser(user))
    .then(user => console.log(user))
    .catch(error => console.error('错误:', error));
}
```

**类比**：
- `Promise` ≈ `CompletableFuture`
- `.then()` ≈ `.thenApply()`
- `.catch()` ≈ `.exceptionally()`

## 3. async/await：更优雅的异步代码

### Java Virtual Threads (Project Loom)

```java
// Java 21+ with Virtual Threads
public class VirtualThreadExample {
    public User fetchUserSync(String id) throws Exception {
        Thread.sleep(1000); // 不再阻塞 OS 线程
        return new User(id, "Alice");
    }

    public void process() {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<User> future = executor.submit(() -> fetchUserSync("123"));
            User user = future.get();
            System.out.println(user);
        }
    }
}
```

### Node.js async/await

```typescript
async function fetchUser(id: string): Promise<User> {
  // 模拟异步操作
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { id, name: 'Alice' };
}

async function process() {
  try {
    const user = await fetchUser('123'); // 看起来像同步代码
    console.log(user);
  } catch (error) {
    console.error('错误:', error);
  }
}
```

**优势**：
- 代码看起来像同步，实际是异步
- 错误处理使用 try/catch
- 避免"回调地狱"

## 4. 并行执行多个异步操作

### Java Parallel Stream

```java
List<String> userIds = Arrays.asList("1", "2", "3");

List<User> users = userIds.parallelStream()
    .map(id -> fetchUser(id).join())
    .collect(Collectors.toList());
```

### Node.js Promise.all

```typescript
const userIds = ['1', '2', '3'];

// 并行执行所有请求
const users = await Promise.all(
  userIds.map(id => fetchUser(id))
);

// 或使用 Promise.allSettled（不会因单个失败而全部失败）
const results = await Promise.allSettled(
  userIds.map(id => fetchUser(id))
);
```

## 5. 事件循环详解

<img src="/images/nodejs-async/nodejs-vs-java-threading.svg" alt="Java 多线程 vs Node.js 事件循环模型对比" style="max-width:100%;margin:1em 0;" />

Node.js 的事件循环是其核心机制：

```
   ┌───────────────────────────┐
┌─>│           timers          │ setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │ I/O 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │ 内部使用
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │ 获取新的 I/O 事件
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │ setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │ socket.on('close', ...)
   └───────────────────────────┘
```

**示例：执行顺序**

```typescript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

process.nextTick(() => console.log('4'));

console.log('5');

// 输出顺序：1, 5, 4, 3, 2
```

**执行顺序解释**：
1. 同步代码：`1`, `5`
2. `process.nextTick`：`4`（微任务队列优先级最高）
3. Promise 微任务：`3`
4. setTimeout 宏任务：`2`

## 6. 实战：构建高并发 API 服务

### 需求

并发查询多个数据源，汇总结果。

**Java 实现（使用 CompletableFuture）：**

```java
@Service
public class DataAggregationService {
    @Autowired
    private UserService userService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private ProductService productService;

    public CompletableFuture<AggregatedData> fetchDashboard(String userId) {
        CompletableFuture<User> userFuture =
            CompletableFuture.supplyAsync(() -> userService.getUser(userId));

        CompletableFuture<List<Order>> ordersFuture =
            CompletableFuture.supplyAsync(() -> orderService.getOrders(userId));

        CompletableFuture<List<Product>> productsFuture =
            CompletableFuture.supplyAsync(() -> productService.getRecommended(userId));

        return CompletableFuture.allOf(userFuture, ordersFuture, productsFuture)
            .thenApply(v -> new AggregatedData(
                userFuture.join(),
                ordersFuture.join(),
                productsFuture.join()
            ));
    }
}
```

**Node.js 实现：**

```typescript
interface AggregatedData {
  user: User;
  orders: Order[];
  products: Product[];
}

async function fetchDashboard(userId: string): Promise<AggregatedData> {
  // 并行执行三个请求
  const [user, orders, products] = await Promise.all([
    userService.getUser(userId),
    orderService.getOrders(userId),
    productService.getRecommended(userId)
  ]);

  return { user, orders, products };
}

// Express API 端点
app.get('/dashboard/:userId', async (req, res) => {
  try {
    const data = await fetchDashboard(req.params.userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

**性能对比**：
- 串行执行：3秒（1秒 + 1秒 + 1秒）
- 并行执行：1秒（同时请求）

## 7. 错误处理最佳实践

### Promise 错误处理

```typescript
// ❌ 不推荐：错误被吞掉
fetchUser('123').then(user => console.log(user));

// ✅ 推荐：始终处理错误
fetchUser('123')
  .then(user => console.log(user))
  .catch(error => console.error('Error:', error));

// ✅ 更好：使用 async/await + try/catch
async function safeOperation() {
  try {
    const user = await fetchUser('123');
    console.log(user);
  } catch (error) {
    console.error('Error:', error);
    // 可以重新抛出或返回默认值
  }
}
```

### 全局错误处理

```typescript
// 捕获未处理的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

## 8. 常见陷阱

### 1. 回调地狱

❌ **不推荐：**
```typescript
getData(function(a) {
  getMoreData(a, function(b) {
    getMoreData(b, function(c) {
      getMoreData(c, function(d) {
        console.log(d);
      });
    });
  });
});
```

✅ **推荐：**
```typescript
const a = await getData();
const b = await getMoreData(a);
const c = await getMoreData(b);
const d = await getMoreData(c);
console.log(d);
```

### 2. 忘记 await

❌ **错误：**
```typescript
async function wrong() {
  const user = fetchUser('123'); // 返回 Promise，不是 User！
  console.log(user.name); // undefined
}
```

✅ **正确：**
```typescript
async function correct() {
  const user = await fetchUser('123'); // 等待 Promise 完成
  console.log(user.name); // 正确
}
```

### 3. 串行而非并行

❌ **低效：**
```typescript
const user1 = await fetchUser('1');  // 等待 1 秒
const user2 = await fetchUser('2');  // 再等待 1 秒
// 总计 2 秒
```

✅ **高效：**
```typescript
const [user1, user2] = await Promise.all([
  fetchUser('1'),
  fetchUser('2')
]);
// 总计 1 秒（并行）
```

## 9. 性能优化

### 批量操作

```typescript
// 批量处理用户
async function processUsers(userIds: string[]) {
  // 限制并发数为 5
  const BATCH_SIZE = 5;

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(id => processUser(id)));
  }
}
```

### 超时控制

```typescript
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}

// 使用
const user = await withTimeout(fetchUser('123'), 5000); // 5秒超时
```

## 10. 总结

| 场景 | Java 方式 | Node.js 方式 |
|------|-----------|--------------|
| 异步执行 | CompletableFuture | Promise / async-await |
| 并行操作 | parallelStream() | Promise.all() |
| 错误处理 | try-catch / exceptionally | try-catch / .catch() |
| 线程池 | ExecutorService | 单线程事件循环 |
| 阻塞操作 | 使用额外线程 | 使用 Worker Threads |

**关键要点**：
- Node.js 是单线程，适合 I/O 密集型任务
- 使用 async/await 简化异步代码
- Promise.all 实现并行操作
- 始终处理错误，避免未捕获的异常

## 下一步

1. 学习 Express.js 框架
2. 数据库集成（Prisma/TypeORM）
3. 构建 RESTful API
4. 微服务架构

如果你同时在学习前端，可以对比阅读 [TypeScript 的 async/await 用法](/articles/frontend/01-typescript-for-java-developers "TypeScript 快速入门：Java 工程师视角")，两者的异步模型高度相似。

## 参考资源

- [Node.js 事件循环](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [async/await 最佳实践](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
- [Promise 规范](https://promisesaplus.com/)
