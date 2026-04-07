---
title: "Python 基础速成：Java 开发者版"
excerpt: "通过 Java 对比快速掌握 Python 核心语法、数据结构和面向对象编程"
category: "ai"
tags: ["python", "java", "syntax", "基础"]
difficulty: "beginner"
publishedAt: "2026-03-22"
readTime: 20
notebook: "python-basics.ipynb"
---

# Python 基础速成：Java 开发者版

Python 是 AI 开发的首选语言。作为 Java 工程师，你会发现 Python 更简洁、灵活，但核心编程概念是相通的。

## 语言特性对比

| 特性 | Java | Python |
|------|------|--------|
| 类型系统 | 静态类型 | 动态类型（可选类型提示） |
| 编译 | 编译为字节码 | 解释执行 |
| 性能 | 高 | 较低（但有 NumPy 等优化库） |
| 语法 | 冗长，严格 | 简洁，灵活 |
| 包管理 | Maven/Gradle | pip/conda |
| 缩进 | {} | 强制缩进 |

<img src="/images/python-java/java-python-concept-map.svg" alt="Java → Python 概念映射图" style="max-width:100%;margin:1em 0;" />

## 1. 基本语法对比

### Hello World

**Java:**
```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

**Python:**
```python
print("Hello, World!")
```

### 变量和类型

**Java:**
```java
String name = "Alice";
int age = 25;
double price = 99.99;
boolean isActive = true;

// 类型转换
String ageStr = String.valueOf(age);
int parsedAge = Integer.parseInt("25");
```

**Python:**
```python
name = "Alice"  # 自动推断类型
age = 25
price = 99.99
is_active = True  # 注意大写

# 类型转换
age_str = str(age)
parsed_age = int("25")

# 类型提示（可选，类似 [TypeScript](/articles/frontend/01-typescript-for-java-developers "TypeScript 快速入门：Java 工程师视角")）
name: str = "Alice"
age: int = 25
```

## 2. 数据结构对比

### List vs ArrayList

**Java:**
```java
List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
System.out.println(names.get(0)); // Alice
System.out.println(names.size()); // 2
```

**Python:**
```python
names = []  # 或 list()
names.append("Alice")
names.append("Bob")
print(names[0])  # Alice
print(len(names))  # 2

# List 推导式（强大特性）
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
```

### Map vs Dictionary

**Java:**
```java
Map<String, Integer> ages = new HashMap<>();
ages.put("Alice", 25);
ages.put("Bob", 30);
System.out.println(ages.get("Alice")); // 25
```

**Python:**
```python
ages = {}  # 或 dict()
ages["Alice"] = 25
ages["Bob"] = 30
print(ages["Alice"])  # 25

# 字典推导式
ages_dict = {name: age for name, age in [("Alice", 25), ("Bob", 30)]}
```

### Set

**Java:**
```java
Set<String> uniqueNames = new HashSet<>();
uniqueNames.add("Alice");
uniqueNames.add("Alice");  // 重复，不会添加
System.out.println(uniqueNames.size()); // 1
```

**Python:**
```python
unique_names = set()
unique_names.add("Alice")
unique_names.add("Alice")  # 重复，不会添加
print(len(unique_names))  # 1

# 集合操作
set1 = {1, 2, 3}
set2 = {3, 4, 5}
print(set1 & set2)  # 交集 {3}
print(set1 | set2)  # 并集 {1, 2, 3, 4, 5}
```

## 3. 控制流

### if-else

**Java:**
```java
if (age >= 18) {
    System.out.println("成年人");
} else if (age >= 13) {
    System.out.println("青少年");
} else {
    System.out.println("儿童");
}
```

**Python:**
```python
if age >= 18:
    print("成年人")
elif age >= 13:
    print("青少年")
else:
    print("儿童")

# Python 独有：三元表达式
status = "成年人" if age >= 18 else "未成年"
```

### 循环

**Java:**
```java
// for 循环
for (int i = 0; i < 10; i++) {
    System.out.println(i);
}

// for-each
List<String> names = Arrays.asList("Alice", "Bob");
for (String name : names) {
    System.out.println(name);
}

// while
int i = 0;
while (i < 10) {
    System.out.println(i);
    i++;
}
```

**Python:**
```python
# for 循环
for i in range(10):
    print(i)

# 遍历列表
names = ["Alice", "Bob"]
for name in names:
    print(name)

# 带索引遍历
for index, name in enumerate(names):
    print(f"{index}: {name}")

# while
i = 0
while i < 10:
    print(i)
    i += 1
```

## 4. 函数

### 基本函数

**Java:**
```java
public int add(int a, int b) {
    return a + b;
}

// 调用
int result = add(3, 5);
```

**Python:**
```python
def add(a, b):
    return a + b

# 调用
result = add(3, 5)

# 类型提示（推荐）
def add(a: int, b: int) -> int:
    return a + b
```

### 默认参数和可变参数

**Java:**
```java
// 方法重载实现默认参数
public void greet(String name) {
    greet(name, "Hello");
}

public void greet(String name, String greeting) {
    System.out.println(greeting + ", " + name);
}

// 可变参数
public int sum(int... numbers) {
    int total = 0;
    for (int num : numbers) {
        total += num;
    }
    return total;
}
```

**Python:**
```python
# 默认参数
def greet(name, greeting="Hello"):
    print(f"{greeting}, {name}")

greet("Alice")  # Hello, Alice
greet("Bob", "Hi")  # Hi, Bob

# 可变参数
def sum_numbers(*args):
    return sum(args)

print(sum_numbers(1, 2, 3, 4))  # 10

# 关键字参数
def create_user(name, age, **kwargs):
    print(f"Name: {name}, Age: {age}")
    print(f"Extra: {kwargs}")

create_user("Alice", 25, city="Beijing", job="Engineer")
```

## 5. 面向对象编程

### 类和对象

**Java:**
```java
public class User {
    private String name;
    private int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return "User{name='" + name + "', age=" + age + "}";
    }
}

// 使用
User user = new User("Alice", 25);
System.out.println(user.getName());
```

**Python:**
```python
class User:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        return f"User(name='{self.name}', age={self.age})"

    # Getter (通常直接访问属性)
    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, value):
        self._name = value

# 使用
user = User("Alice", 25)
print(user.name)  # 直接访问属性
print(user)  # User(name='Alice', age=25)
```

### 继承

**Java:**
```java
public class Employee extends User {
    private String employeeId;

    public Employee(String name, int age, String employeeId) {
        super(name, age);
        this.employeeId = employeeId;
    }

    @Override
    public String toString() {
        return super.toString() + ", employeeId=" + employeeId;
    }
}
```

**Python:**
```python
class Employee(User):
    def __init__(self, name, age, employee_id):
        super().__init__(name, age)
        self.employee_id = employee_id

    def __str__(self):
        return f"{super().__str__()}, employee_id={self.employee_id}"
```

## 6. 异常处理

**Java:**
```java
try {
    int result = 10 / 0;
} catch (ArithmeticException e) {
    System.err.println("Error: " + e.getMessage());
} finally {
    System.out.println("清理资源");
}
```

**Python:**
```python
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
except Exception as e:  # 捕获所有异常
    print(f"Unexpected error: {e}")
finally:
    print("清理资源")

# 自定义异常
class ValidationError(Exception):
    pass

raise ValidationError("Invalid input")
```

## 7. 文件操作

**Java:**
```java
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
}
```

**Python:**
```python
# with 语句自动关闭文件
with open("file.txt", "r") as f:
    for line in f:
        print(line.strip())

# 写入文件
with open("output.txt", "w") as f:
    f.write("Hello, World!\n")

# 读取整个文件
content = open("file.txt").read()
lines = open("file.txt").readlines()
```

## 8. 常用库和工具

### Java → Python 对应库

| Java | Python |
|------|--------|
| ArrayList, HashMap | list, dict（内置） |
| Stream API | map(), filter(), list comprehension |
| LocalDateTime | datetime |
| HttpClient | requests |
| Jackson/Gson | json（内置） |
| JUnit | pytest |
| Log4j/SLF4J | logging |

### 示例：HTTP 请求

**Java (HttpClient):**
```java
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .build();

HttpResponse<String> response = client.send(request,
    HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

**Python (requests):**
```python
import requests

response = requests.get("https://api.example.com/users")
print(response.json())  # 自动解析 JSON
```

## 9. 实战：构建一个简单的 REST 客户端

**Python 实现：**

```python
import requests
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str

class UserClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def get_all(self) -> List[User]:
        response = requests.get(f"{self.base_url}/users")
        response.raise_for_status()
        return [User(**data) for data in response.json()]

    def get_by_id(self, user_id: int) -> Optional[User]:
        response = requests.get(f"{self.base_url}/users/{user_id}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return User(**response.json())

    def create(self, name: str, email: str) -> User:
        data = {"name": name, "email": email}
        response = requests.post(f"{self.base_url}/users", json=data)
        response.raise_for_status()
        return User(**response.json())

# 使用
client = UserClient("https://api.example.com")
users = client.get_all()
for user in users:
    print(user)
```

## 10. Python 独有的强大特性

### 装饰器（类似 Java 注解）

```python
from functools import wraps
import time

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.2f}s")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "Done"

slow_function()  # slow_function took 1.00s
```

### 上下文管理器

```python
class DatabaseConnection:
    def __enter__(self):
        print("Opening connection")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Closing connection")

    def query(self, sql):
        print(f"Executing: {sql}")

# 使用
with DatabaseConnection() as db:
    db.query("SELECT * FROM users")
# 自动调用 __exit__
```

### 生成器（内存高效）

```python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# 惰性求值，不会一次性生成所有数字
for num in fibonacci(10):
    print(num)
```

## 11. 环境管理

**Java:** Maven/Gradle 管理依赖

**Python:** pip + 虚拟环境

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows

# 安装依赖
pip install requests numpy pandas

# 导出依赖
pip freeze > requirements.txt

# 安装依赖
pip install -r requirements.txt
```

## 12. 常见陷阱

### 1. 可变默认参数

❌ **错误：**
```python
def add_item(item, items=[]):
    items.append(item)
    return items

print(add_item(1))  # [1]
print(add_item(2))  # [1, 2]  ← 共享同一个列表！
```

✅ **正确：**
```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### 2. 浅拷贝 vs 深拷贝

```python
import copy

original = [[1, 2], [3, 4]]

# 浅拷贝
shallow = original.copy()
shallow[0][0] = 99
print(original)  # [[99, 2], [3, 4]]  ← 影响原始数据

# 深拷贝
deep = copy.deepcopy(original)
deep[0][0] = 88
print(original)  # [[1, 2], [3, 4]]  ← 不影响
```

## 总结

Python 相比 Java：
- ✅ 更简洁、更灵活
- ✅ 更快的开发速度
- ✅ 强大的数据处理库（NumPy, Pandas）
- ❌ 性能较低
- ❌ 类型安全性较弱（可通过类型提示改善）

## 下一步

1. 学习 NumPy 和 Pandas（数据处理）
2. 掌握 Jupyter Notebook（交互式开发）
3. 了解机器学习库（scikit-learn）
4. 学习深度学习框架（PyTorch/TensorFlow）

## 参考资源

- [Python 官方文档](https://docs.python.org/3/)
- [Real Python](https://realpython.com/)
- [Python for Java Developers](https://lobr.github.io/python-for-java-developers/)
