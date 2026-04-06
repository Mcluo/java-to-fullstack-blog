# GitHub 仓库设置指南

## 📝 已完成的步骤

✅ Git 仓库已初始化
✅ 所有文件已提交（41 个文件）
✅ NotebookLinks 组件已更新为你的用户名 (mcluo)

## 🚀 接下来需要做的事

### 1. 在 GitHub 创建仓库

访问: https://github.com/new

**仓库设置**:
- **Repository name**: `java-to-fullstack-blog`
- **Description**: `Java 工程师全栈+AI 转型博客 - 帮助 Java 开发者学习前端、后端和 AI 技术`
- **Visibility**: ✅ **Public** (必须是公开的，Colab 和 Binder 才能访问)
- **Initialize**: ❌ 不要勾选任何选项（README, .gitignore, license）

点击 "Create repository"

---

### 2. 连接远程仓库并推送

创建完仓库后，GitHub 会显示命令。你需要在终端执行：

```bash
# 添加远程仓库

git remote add origin https://github.com/mcluo/java-to-fullstack-blog.git
# 设置默认分支名称
git branch -M main

# 推送代码
git push -u origin main
```

或者直接运行这个脚本：

```bash
cd /Users/mcluo/java-to-fullstack-blog && \
git remote add origin https://github.com/mcluo/java-to-fullstack-blog.git && \
git branch -M main && \
git push -u origin main
```

---

### 3. 验证设置

推送成功后，访问以下链接验证：

#### GitHub 仓库
https://github.com/mcluo/java-to-fullstack-blog

#### Notebook 文件
https://github.com/mcluo/java-to-fullstack-blog/blob/main/public/notebooks/python-basics.ipynb

#### Google Colab
https://colab.research.google.com/github/mcluo/java-to-fullstack-blog/blob/main/public/notebooks/python-basics.ipynb

#### Binder
https://mybinder.org/v2/gh/mcluo/java-to-fullstack-blog/main?filepath=public/notebooks/python-basics.ipynb

---

## ⚠️ 常见问题

### Q: 推送时提示需要登录？

**方案 A: 使用 HTTPS（推荐）**
```bash
# 会弹出登录窗口
git push -u origin main
```

**方案 B: 使用 Personal Access Token**
1. 访问 https://github.com/settings/tokens/new
2. 生成 token（勾选 repo 权限）
3. 推送时用 token 作为密码

**方案 C: 使用 SSH**
```bash
# 改用 SSH URL
git remote set-url origin git@github.com:mcluo/java-to-fullstack-blog.git
git push -u origin main
```

### Q: 推送后 Colab 还是找不到？

等待 1-2 分钟，GitHub 需要时间索引文件。

### Q: 推送失败？

检查仓库名是否正确：
```bash
git remote -v
```

如果不对，修改：
```bash
git remote set-url origin https://github.com/mcluo/java-to-fullstack-blog.git
```

---

## ✅ 完成后的效果

推送成功后：

1. **GitHub 仓库** - 可以查看所有代码
2. **Colab 链接** - 可以在云端运行 Notebook
3. **Binder 链接** - 可以在云端运行 Notebook（首次启动需 2 分钟）
4. **博客页面** - Notebook 卡片的三个按钮都能正常工作

---

## 📱 快速推送命令

如果你已经创建好了 GitHub 仓库，直接运行：

```bash
git remote add origin https://github.com/mcluo/java-to-fullstack-blog.git
git branch -M main
git push -u origin main
```

---

**祝你推送顺利！** 🎉

如有问题，查看 GitHub 推送指南：https://docs.github.com/en/get-started/importing-your-projects-to-github/importing-source-code-to-github/adding-locally-hosted-code-to-github
