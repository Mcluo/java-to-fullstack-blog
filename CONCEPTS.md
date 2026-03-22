# 核心概念索引

> **🎯 目标**: 快速查找和理解核心技术概念
> **使用方式**: Ctrl+F 搜索关键词，跳转到相关文章

---

## 🧭 快速导航

| 分类 | 核心概念 |
|------|---------|
| [TypeScript](#typescript) | Interface, Type, 泛型, 类型推断 |
| [React](#react) | Component, Props, State, Hooks, Context |
| [Node.js](#nodejs) | 异步编程, Event Loop, Promise, async/await |
| [AI/ML](#aiml) | Prompt Engineering, Embedding, RAG, Fine-tuning |
| [数据库](#database) | ORM, Migration, Query, Transaction |
| [部署](#deployment) | Vercel, Docker, CI/CD, 环境变量 |

---

## TypeScript

### Interface vs Type
**概念**: TypeScript的两种类型定义方式

**Java对比**:
- TypeScript Interface ≈ Java POJO（纯数据结构）
- TypeScript Type = 类型别名（Java没有直接对应）

**何时使用**:
- Interface: 定义对象结构、可扩展
- Type: 联合类型、交叉类型、类型别名

**参考文章**:
- [TypeScript + React 30分钟快速上手](/articles/quickstart/01-typescript-react-30min#typescript-interface-vs-java-interface)
- [TypeScript快速入门](/articles/frontend/01-typescript-for-java-developers)

**示例对比**:
```typescript
// Interface - 可扩展
interface Todo {
  id: number
  title: string
}

interface TodoWithPriority extends Todo {
  priority: 'high' | 'low'
}

// Type - 联合类型
type Status = 'pending' | 'completed'
type Result<T> = { success: true; data: T } | { success: false; error: string }
```

---

### 泛型 (Generics)
**概念**: 类型参数化，提高代码复用性

**Java对比**:
```java
// Java
List<String> names = new ArrayList<>();
Optional<User> user = findUser(id);
```

```typescript
// TypeScript
const names: Array<string> = []
const user: Option<User> = findUser(id)
```

**参考文章**:
- [TypeScript快速入门 - 泛型章节](/articles/frontend/01-typescript-for-java-developers#generics)

---

### 类型推断 (Type Inference)
**概念**: TypeScript自动推导变量类型

**Java对比**:
```java
// Java - 需要显式声明
String name = "John";
```

```typescript
// TypeScript - 自动推断
const name = "John"  // 推断为 string
```

**参考文章**:
- [TypeScript快速入门](/articles/frontend/01-typescript-for-java-developers)

---

## React

### Component (组件)
**概念**: UI的独立可复用单元

**Java对比**:
- React Component ≈ Java @Component (Spring)
- 组件化 ≈ 模块化

**类型**:
- 函数组件（推荐）
- 类组件（传统）

**参考文章**:
- [React核心概念](/articles/frontend/02-react-vs-spring#components)

**示例**:
```typescript
// 函数组件
function TodoItem({ todo }: { todo: Todo }) {
  return <div>{todo.title}</div>
}
```

---

### Props
**概念**: 组件间传递数据的方式

**Java对比**:
- Props ≈ 方法参数
- Props ≈ Spring的@Autowired（依赖注入）

**特点**:
- 单向数据流（父→子）
- 不可变（Immutable）

**参考文章**:
- [React核心概念 - Props](/articles/frontend/02-react-vs-spring#props)
- [TypeScript 30分钟 - 组件通信](/articles/quickstart/01-typescript-react-30min)

**示例**:
```typescript
// 父组件传递props
<TodoItem todo={todo} onComplete={handleComplete} />

// 子组件接收props
function TodoItem({ todo, onComplete }: Props) {
  return <button onClick={() => onComplete(todo.id)}>Complete</button>
}
```

---

### State (状态)
**概念**: 组件内部的可变数据

**Java对比**:
```java
// Java - 成员变量
private List<Todo> todos = new ArrayList<>();
```

```typescript
// React - useState Hook
const [todos, setTodos] = useState<Todo[]>([])
```

**关键区别**:
- Java: 直接修改 `todos.add(newTodo)`
- React: 不可变更新 `setTodos([...todos, newTodo])`

**参考文章**:
- [TypeScript 30分钟 - useState Hook](/articles/quickstart/01-typescript-react-30min#usestate-hook-vs-java成员变量)

---

### Hooks
**概念**: React函数组件的状态和生命周期管理

**常用Hooks**:
- `useState` - 状态管理
- `useEffect` - 副作用处理
- `useContext` - 上下文共享
- `useMemo` / `useCallback` - 性能优化

**Java对比**:
- `useEffect` ≈ Spring @PostConstruct / @PreDestroy
- `useContext` ≈ Spring ApplicationContext

**参考文章**:
- [React核心概念 - Hooks](/articles/frontend/02-react-vs-spring#hooks)

---

### Context API
**概念**: 跨组件共享数据，避免props层层传递

**Java对比**:
- Context ≈ Spring ApplicationContext
- Context Provider ≈ Spring @Configuration

**参考文章**:
- [React核心概念 - Context](/articles/frontend/02-react-vs-spring#context)

---

## Node.js

### Event Loop (事件循环)
**概念**: Node.js的单线程异步执行模型

**Java对比**:
- Java: 多线程并发（Thread Pool）
- Node.js: 单线程事件驱动（Event Loop）

**优势**:
- 高并发I/O操作
- 内存占用小
- 编程模型简单

**参考文章**:
- [Node.js异步编程](/articles/backend/01-nodejs-async-programming#event-loop)

---

### Promise
**概念**: 异步操作的抽象表示

**Java对比**:
```java
// Java CompletableFuture
CompletableFuture<User> future = getUserAsync();
future.thenAccept(user -> System.out.println(user));
```

```typescript
// JavaScript Promise
const promise = getUserAsync()
promise.then(user => console.log(user))
```

**参考文章**:
- [Node.js异步编程 - Promise](/articles/backend/01-nodejs-async-programming#promise)

---

### async/await
**概念**: 基于Promise的异步语法糖

**Java对比**:
```java
// Java - 阻塞等待
User user = getUserSync();
Post post = getPostSync(user.getId());
```

```typescript
// JavaScript - 非阻塞异步
const user = await getUserAsync()
const post = await getPostAsync(user.id)
```

**参考文章**:
- [Node.js异步编程 - async/await](/articles/backend/01-nodejs-async-programming#async-await)

---

## AI/ML

### Prompt Engineering (提示词工程)
**概念**: 设计有效的AI提示词以获得更好的输出

**关键技巧**:
- 明确任务和上下文
- 提供示例（Few-shot Learning）
- 指定输出格式
- 迭代优化

**参考文章**:
- [即将推出]

**示例**:
```typescript
// 糟糕的Prompt
"翻译这段话"

// 良好的Prompt
"请将以下技术文档从英文翻译成中文，保持技术术语的准确性，使用专业的技术写作风格：\n\n[文本]"
```

---

### Embedding (嵌入/向量化)
**概念**: 将文本转换为数值向量表示

**应用场景**:
- 语义搜索
- 相似度计算
- 文档分类
- 推荐系统

**参考文章**:
- [即将推出]

**示例**:
```typescript
// 文本 → 向量
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "TypeScript是JavaScript的超集"
})
// 结果: [0.123, -0.456, 0.789, ...] (1536维向量)
```

---

### RAG (检索增强生成)
**概念**: Retrieval-Augmented Generation，结合检索和生成的AI架构

**工作流程**:
1. 用户查询 → Embedding向量化
2. 向量检索 → 找到相关文档
3. 文档+查询 → 发送给LLM
4. LLM生成 → 基于上下文的准确回答

**应用场景**:
- 知识库问答
- 文档助手
- 智能客服

**参考文章**:
- [即将推出]

---

### Fine-tuning (微调)
**概念**: 在预训练模型基础上针对特定任务训练

**vs Prompt Engineering**:
- Prompt: 快速、灵活、成本低
- Fine-tuning: 效果好、需数据、成本高

**参考文章**:
- [即将推出]

---

## Database

### ORM (Object-Relational Mapping)
**概念**: 对象关系映射，用对象操作数据库

**Java对比**:
- Java: Hibernate, JPA, MyBatis
- Node.js: Prisma, TypeORM, Sequelize

**参考文章**:
- [即将推出]

**示例对比**:
```java
// Java JPA
@Entity
public class User {
  @Id
  private Long id;
  private String name;
}
User user = userRepository.findById(1L);
```

```typescript
// Prisma
model User {
  id   Int    @id @default(autoincrement())
  name String
}
const user = await prisma.user.findUnique({ where: { id: 1 } })
```

---

### Migration (数据库迁移)
**概念**: 版本控制数据库结构变更

**工具**:
- Prisma Migrate
- Flyway (Java)
- Liquibase (Java)

**参考文章**:
- [即将推出]

---

## Deployment

### Vercel
**概念**: Next.js官方推荐的部署平台

**特点**:
- 零配置部署
- 自动CI/CD
- 全球CDN
- Serverless Functions

**参考文章**:
- [TypeScript 30分钟 - 部署](/articles/quickstart/01-typescript-react-30min#一键部署到vercel)

---

### Docker
**概念**: 容器化应用部署

**Java对比**:
- Java: 打包成JAR/WAR → 运行在JVM
- Docker: 打包成Image → 运行在Container

**参考文章**:
- [即将推出]

---

### CI/CD
**概念**: 持续集成/持续部署

**工具**:
- GitHub Actions
- Jenkins
- GitLab CI

**参考文章**:
- [即将推出]

---

## 📚 学习路径推荐

### 新手路径
1. TypeScript基础概念
2. React核心概念（Component, Props, State）
3. Node.js异步编程
4. 数据库ORM

### AI方向路径
1. Python基础
2. Prompt Engineering
3. Embedding和向量搜索
4. RAG架构实战

### 全栈路径
1. 前端框架（React）
2. 后端API（Node.js + Express）
3. 数据库（Prisma + PostgreSQL）
4. 部署（Vercel + Docker）

---

## 🔍 如何使用这份索引

### 查找概念
1. **Ctrl+F 搜索** - 直接搜索概念名称
2. **快速导航表** - 查看分类概览
3. **跳转链接** - 点击跳转到详细文章

### 对比学习
- 每个概念都有Java对比说明
- 理解新概念时参考熟悉的Java知识
- 建立知识关联网络

### 深入学习
- 概念索引 → 点击"参考文章"
- 阅读完整教程
- 动手实践项目

---

## 💡 概念关系图

```
TypeScript
├─ Interface ──→ React Props定义
├─ Type ──→ API响应类型
└─ 泛型 ──→ 可复用组件

React
├─ Component ──→ 页面构建
├─ Props ──→ 组件通信
├─ State ──→ 数据管理
└─ Hooks ──→ 副作用处理
    └─ useEffect ──→ API调用
        └─ Promise/async ──→ 异步数据获取

Node.js
├─ Event Loop ──→ 异步编程基础
├─ Promise ──→ 异步操作抽象
└─ async/await ──→ 同步风格的异步代码

AI/ML
├─ Prompt ──→ 与AI交互
├─ Embedding ──→ 文本向量化
└─ RAG ──→ 智能问答系统
    ├─ Embedding ──→ 查询向量化
    ├─ Vector DB ──→ 相似度检索
    └─ LLM ──→ 答案生成
```

---

**版本**: v1.0
**更新日期**: 2026-03-22
**维护**: 持续补充新概念

---

💪 **开始你的概念学习之旅！**

**使用建议**:
- 遇到不懂的概念，先在这里查找
- 建立Java和新技术的对应关系
- 理解概念之间的依赖关系
- 按需深入学习详细文章
