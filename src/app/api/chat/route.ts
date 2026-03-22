import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 系统提示词 - 定义AI助手的角色和能力
const SYSTEM_PROMPT = `你是一个专业的全栈+AI学习助手，专门帮助Java工程师转型学习前端、后端和AI技术。

## 你的专长
- 解释TypeScript、React、Node.js等技术概念
- 将新技术与Java/Spring进行对比，帮助理解
- 推荐学习路径和资源
- 回答编程问题和最佳实践
- 提供实用的代码示例

## 网站内容
本网站提供以下学习资源：

**快速启动教程**：
- TypeScript + React 30分钟快速上手 (/articles/quickstart/01-typescript-react-30min)

**前端教程**：
- TypeScript快速入门 (/articles/frontend/01-typescript-for-java-developers)
- React核心概念 (/articles/frontend/02-react-vs-spring)

**后端教程**：
- Node.js异步编程 (/articles/backend/01-nodejs-async-programming)

**AI教程**：
- Python for Java开发者 (/articles/ai/01-python-for-java-developers)

**学习路径**：
- 完整学习路线图 (/roadmap)

## 回答风格
- 简洁明了，避免冗长
- 使用Java类比帮助理解
- 提供具体示例和链接
- 鼓励实践和项目驱动学习
- 强调AI辅助学习的价值

## 重要原则
- 推荐"30分钟法则"：快速实践，立即看到成果
- 强调边做项目边学习，而非死记语法
- 建议使用AI工具（Claude、ChatGPT）辅助学习
- 适时推荐网站内的相关文章（使用markdown链接格式）

记住：你的目标是让Java工程师轻松、快速、有信心地完成技术转型！`

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // 检查API Key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json(
        { error: 'API配置错误，请联系管理员' },
        { status: 500 }
      )
    }

    // 构建消息历史
    const messages = [
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用Anthropic的流式API
          const messageStream = await anthropic.messages.stream({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            messages: messages
          })

          // 监听文本块事件
          messageStream.on('text', (text) => {
            const data = `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`
            controller.enqueue(encoder.encode(data))
          })

          // 监听完成事件
          messageStream.on('message', (message) => {
            const data = `data: ${JSON.stringify({
              type: 'done',
              usage: {
                input_tokens: message.usage.input_tokens,
                output_tokens: message.usage.output_tokens
              }
            })}\n\n`
            controller.enqueue(encoder.encode(data))
            controller.close()
          })

          // 监听错误事件
          messageStream.on('error', (error) => {
            console.error('Stream error:', error)
            const data = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
            controller.enqueue(encoder.encode(data))
            controller.close()
          })

        } catch (error: any) {
          console.error('Stream creation error:', error)
          const data = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
          controller.enqueue(encoder.encode(data))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)

    // 处理不同类型的错误
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'API密钥无效，请检查配置' },
        { status: 401 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'API请求过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'AI助手暂时不可用，请稍后再试' },
      { status: 500 }
    )
  }
}
