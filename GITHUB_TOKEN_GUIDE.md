# GitHub Personal Access Token 设置指南

## 🔑 创建 Token

1. **访问**: https://github.com/settings/tokens/new

2. **填写信息**:
   - **Note**: `java-to-fullstack-blog` (备注名称)
   - **Expiration**: `90 days` 或 `No expiration` (过期时间)
   - **Scopes** (权限，至少勾选以下):
     - ✅ `repo` (完整仓库访问权限)

3. **点击**: "Generate token"

4. **复制 Token**:
   - 格式类似: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **重要**: 复制后立即保存，页面关闭后无法再看到！

---

## 🚀 使用 Token 推送

### 方法 1: 在推送时输入（推荐）

```bash
git push -u origin main
```

提示输入用户名和密码时：
- **Username**: `Mcluo`
- **Password**: `粘贴你的 token（不是 GitHub 密码！）`

### 方法 2: 在 URL 中嵌入 Token

```bash
git remote set-url origin https://ghp_your_token_here@github.com/Mcluo/java-to-fullstack-blog.git
git push -u origin main
```

⚠️ 注意: 这种方式 token 会保存在 `.git/config` 文件中，不太安全。

### 方法 3: 使用 Credential Helper（最方便）

macOS 会自动使用 Keychain 保存凭证：

```bash
# 推送时输入一次 token，之后会自动记住
git push -u origin main
```

---

## 🔄 恢复全局配置

推送成功后，如果需要恢复之前的 URL 重写配置：

```bash
git config --global url."https://github.com/".insteadOf git@github.com:
```

---

## ✅ 快速推送步骤

1. 访问: https://github.com/settings/tokens/new
2. 创建 token（勾选 `repo`）
3. 复制 token
4. 运行: `git push -u origin main`
5. 输入用户名: `Mcluo`
6. 输入密码: 粘贴 token

完成！
