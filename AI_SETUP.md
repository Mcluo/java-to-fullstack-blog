# AI助手配置指南

本文档说明如何配置Claude API以启用AI学习助手功能。

---

## 📋 前置要求

1. **Anthropic账号** - 访问 [console.anthropic.com](https://console.anthropic.com/)
2. **API密钥** - 在控制台生成API Key
3. **付费计划** - 需要有可用的API额度

---

## 🚀 配置步骤

### 1. 获取API密钥

1. 访问 [Anthropic Console](https://console.anthropic.com/settings/keys)
2. 登录或注册账号
3. 点击 "Create Key" 创建新的API密钥
4. 复制生成的密钥（格式：`sk-ant-...`）

### 2. 配置环境变量

在项目根目录找到 `.env.local` 文件（如果不存在则创建）：

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

**重要**:
- 替换 `your_api_key_here` 为你实际的API密钥
- 不要将 `.env.local` 提交到Git仓库（已在.gitignore中）

### 3. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 4. 测试AI助手

1. 打开浏览器访问 http://localhost:3000
2. 点击右下角的AI助手按钮 🤖
3. 尝试提问，例如："TypeScript和JavaScript有什么区别？"
4. 应该能收到Claude的真实回复

---

## 🔧 技术细节

### API路由
- **路径**: `/api/chat`
- **方法**: POST
- **使用模型**: Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)

### 请求格式
```typescript
{
  message: string,      // 用户消息
  history: Array<{      // 对话历史（可选）
    role: 'user' | 'assistant',
    content: string
  }>
}
```

### 响应格式
```typescript
{
  message: string,      // AI回复
  usage: {
    input_tokens: number,
    output_tokens: number
  }
}
```

### 系统提示词
AI助手使用专门的系统提示词，定制为Java工程师学习助手：
- 熟悉网站内容和文章链接
- 善于用Java类比解释新技术
- 推荐实践优先的学习方式
- 自动推荐相关文章

---

## 💰 费用估算

**Claude 3.5 Sonnet 定价**（2024年）：
- 输入：$3 / 百万tokens
- 输出：$15 / 百万tokens

**估算使用成本**：
- 单次对话平均消耗：~1000 tokens（输入）+ ~500 tokens（输出）
- 单次对话成本：约 $0.01
- 100次对话成本：约 $1

**建议**：
- 设置月度预算限制
- 监控API使用量
- 在Anthropic控制台查看实时费用

---

## 🛡️ 安全最佳实践

### 1. 保护API密钥
```bash
# 确保 .env.local 在 .gitignore 中
echo ".env.local" >> .gitignore

# 检查是否被追踪
git status --ignored
```

### 2. 限流和保护
当前实现包含基础错误处理，生产环境建议添加：
- 请求频率限制（Rate Limiting）
- 用户认证
- 请求日志记录
- 成本监控告警

### 3. 生产部署
部署到Vercel时：
1. 在Vercel项目设置中添加环境变量
2. 不要在代码中硬编码API密钥
3. 使用Vercel的Edge Functions减少延迟

---

## ❌ 故障排查

### 问题1: "API配置错误"
**原因**: API密钥未设置或格式错误

**解决**:
```bash
# 检查环境变量是否存在
cat .env.local

# 确保格式正确
ANTHROPIC_API_KEY=sk-ant-...

# 重启服务器
npm run dev
```

### 问题2: "API密钥无效"
**原因**: API密钥错误或已被删除

**解决**:
1. 登录 [Anthropic Console](https://console.anthropic.com/settings/keys)
2. 检查密钥状态
3. 如有必要，重新生成新密钥

### 问题3: "API请求过于频繁"
**原因**: 超过速率限制

**解决**:
- 等待几分钟后重试
- 考虑实现请求队列
- 升级API计划以获得更高限额

### 问题4: AI回复未渲染Markdown
**原因**: react-markdown未正确安装

**解决**:
```bash
npm install react-markdown
npm run dev
```

---

## 🔄 后续优化建议

### 1. 流式响应
当前实现是一次性返回完整回复，可以改为流式响应以提升用户体验：

```typescript
// 使用 Anthropic 的 stream API
const stream = await anthropic.messages.stream({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 2048,
  messages: messages
})
```

### 2. 对话历史持久化
将对话保存到数据库或localStorage：
```typescript
localStorage.setItem('chat_history', JSON.stringify(messages))
```

### 3. 多会话支持
允许用户创建多个独立对话：
```typescript
interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
}
```

### 4. 成本监控
添加Token使用统计和展示：
```typescript
const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 })
```

---

## 📚 相关资源

- [Anthropic官方文档](https://docs.anthropic.com/)
- [Claude API参考](https://docs.anthropic.com/claude/reference/getting-started)
- [定价信息](https://www.anthropic.com/api)
- [最佳实践指南](https://docs.anthropic.com/claude/docs/guide-to-anthropics-prompt-engineering-resources)

---

## ✅ 验收清单

配置完成后，确认以下功能正常：

- [ ] AI助手按钮可见且可点击
- [ ] 可以打开聊天窗口
- [ ] 发送消息后能收到Claude回复
- [ ] Markdown格式正确渲染（粗体、列表、链接等）
- [ ] 快速问题按钮正常工作
- [ ] 文章链接可以点击并跳转
- [ ] 错误情况有友好提示
- [ ] 响应时间在合理范围内（<5秒）

---

**配置完成！**🎉

现在你的AI学习助手已经可以正常工作了！
