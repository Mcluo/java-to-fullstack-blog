# Jupyter Notebook 集成指南

本博客支持在文章中嵌入 Jupyter Notebook 链接，让读者可以在云端直接运行代码。

## 📁 文件结构

```
java-to-fullstack-blog/
├── public/
│   └── notebooks/           # 存放 .ipynb 文件
│       └── python-basics.ipynb
├── src/
│   └── components/
│       └── NotebookLinks.tsx  # Notebook 链接组件
└── content/
    └── articles/
        └── ai/
            └── 01-python-for-java-developers.md
```

## 🚀 使用方法

### 1. 创建 Jupyter Notebook

在 `public/notebooks/` 目录下创建 `.ipynb` 文件：

```bash
# 使用 Jupyter Lab 创建
jupyter lab

# 或使用 VSCode 的 Jupyter 扩展
code public/notebooks/my-tutorial.ipynb
```

### 2. 在文章中引用 Notebook

在文章的 frontmatter 中添加 `notebook` 字段：

```yaml
---
title: "Python 基础教程"
category: "ai"
notebook: "python-basics.ipynb"
---
```

### 3. 自动显示链接

文章页面会自动在标题下方显示三个按钮：
- **Google Colab** - 最快，需要 Google 账号
- **Binder** - 无需登录，启动较慢（~2分钟）
- **GitHub** - 查看源代码

## 🔗 支持的平台

### Google Colab
- **优点**: 免费 GPU/TPU、快速启动、自动保存
- **缺点**: 需要 Google 账号
- **URL格式**: `https://colab.research.google.com/github/{repo}/blob/main/public/notebooks/{filename}`

### Binder
- **优点**: 无需登录、完全开源
- **缺点**: 启动慢（首次~2分钟）、会话有时限
- **URL格式**: `https://mybinder.org/v2/gh/{repo}/main?filepath=public/notebooks/{filename}`

### GitHub
- **优点**: 快速查看代码
- **缺点**: 不能执行
- **URL格式**: `https://github.com/{repo}/blob/main/public/notebooks/{filename}`

## 📝 Notebook 编写建议

### 1. 结构清晰

```python
# 每个 notebook 应包含：
1. 标题和简介（Markdown cell）
2. 环境准备（安装依赖）
3. 分步教程（代码 + 说明）
4. 练习题
5. 总结
```

### 2. 适合 Java 工程师

```python
# ✅ 好的做法：提供 Java 对比
"""
Java 写法：
List<String> list = new ArrayList<>();
list.add("item");

Python 写法：
"""
list = []
list.append("item")
```

### 3. 可运行性

```python
# ✅ 确保 notebook 能独立运行
# 添加必要的 pip install
!pip install numpy pandas matplotlib

# ❌ 不要依赖本地文件
# data = pd.read_csv('/Users/local/file.csv')  # 错误

# ✅ 使用在线数据或生成数据
data = pd.DataFrame({'x': [1, 2, 3], 'y': [4, 5, 6]})
```

### 4. 输出可见

```python
# ✅ 显示中间结果
print("计算结果:", result)
df.head()  # 显示前5行

# ✅ 添加可视化
import matplotlib.pyplot as plt
plt.plot(x, y)
plt.show()
```

## 🎨 组件定制

修改 `src/components/NotebookLinks.tsx` 来定制样式和行为：

```tsx
<NotebookLinks
  notebookPath="python-basics.ipynb"
  repoUrl="https://github.com/yourname/yourrepo"  // 自定义仓库
  title="💻 交互式代码实践"  // 自定义标题
/>
```

## 🔧 配置 GitHub 仓库

确保你的 GitHub 仓库是公开的，Colab 和 Binder 才能访问：

```bash
# 1. 推送 notebook 到 GitHub
git add public/notebooks/
git commit -m "Add Jupyter notebooks"
git push origin main

# 2. 确认仓库是 Public
# Settings > General > Danger Zone > Change visibility
```

## 📦 依赖管理（可选）

为 Binder 创建 `requirements.txt`：

```txt
# requirements.txt
numpy>=1.20.0
pandas>=1.3.0
matplotlib>=3.4.0
scikit-learn>=0.24.0
```

为 Binder 创建 `runtime.txt`（指定 Python 版本）：

```txt
python-3.9
```

## ✅ 测试清单

创建新 notebook 后，确认：

- [ ] Notebook 在本地可以完整运行
- [ ] 不依赖本地文件或路径
- [ ] 推送到 GitHub main 分支
- [ ] 文章 frontmatter 包含 `notebook` 字段
- [ ] 在网站上能看到链接按钮
- [ ] 点击 Colab 链接可以打开
- [ ] 点击 Binder 链接可以打开（等待2分钟）
- [ ] 点击 GitHub 链接可以查看源码

## 🎯 最佳实践

### 适合使用 Notebook 的场景

✅ **适合**:
- Python 入门教程
- 数据分析实战
- 机器学习算法演示
- 可视化教程
- 交互式练习

❌ **不适合**:
- 纯理论讲解
- 多文件项目
- 需要数据库/API 的复杂应用
- 长时间运行的任务

### 示例文章

参考 `content/articles/ai/01-python-for-java-developers.md`：

```yaml
---
title: "Python 基础速成：Java 开发者版"
notebook: "python-basics.ipynb"
---

文章内容...
```

## 🐛 常见问题

### Q: Colab 链接打不开？
A: 确保 GitHub 仓库是公开的，路径正确。

### Q: Binder 启动很慢？
A: 首次启动需要构建环境（~2分钟），后续会快一些。可以在 README 中说明。

### Q: 如何更新 Notebook？
A: 修改 `.ipynb` 文件后推送到 GitHub，链接会自动指向最新版本。

### Q: 能否支持其他语言？
A: 可以！Notebook 支持 R、Julia 等多种语言，只需修改 kernel 配置。

## 📚 相关资源

- [Jupyter Notebook 官方文档](https://jupyter.org/documentation)
- [Google Colab 指南](https://colab.research.google.com/)
- [Binder 文档](https://mybinder.readthedocs.io/)
- [JupyterLite](https://jupyterlite.readthedocs.io/)（未来可考虑集成）

---

**提示**: 如果想要完全内嵌的交互式体验（不跳转到外部），可以考虑集成 JupyterLite 或 Pyodide。
