'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

const STORAGE_KEY = 'ai_chat_history'
const DEFAULT_WELCOME_MESSAGE = {
  role: 'assistant' as const,
  content: '你好！我是你的AI学习助手。我可以帮你：\n\n• 解释技术概念\n• 推荐学习路径\n• 回答编程问题\n• 对比Java和新技术\n\n有什么我可以帮你的吗？'
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([DEFAULT_WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 加载历史对话
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsedMessages = JSON.parse(saved)
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages)
          }
        } catch (error) {
          console.error('Failed to load chat history:', error)
        }
      }
    }
  }, [])

  // 保存对话历史
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const quickQuestions = [
    'TypeScript和JavaScript有什么区别？',
    'React和Spring有什么相似之处？',
    'Node.js的异步编程怎么理解？',
    '我应该从哪里开始学习？'
  ]

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    // 添加一个空的助手消息，用于流式更新
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      // 调用流式API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.filter(msg => msg.role !== 'assistant' || messages.indexOf(msg) > 0) // 排除初始欢迎消息
        }),
        signal: abortControllerRef.current.signal, // 添加取消信号
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'API请求失败')
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'text') {
                accumulatedText += data.content
                // 更新助手消息
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[assistantMessageIndex] = {
                    role: 'assistant',
                    content: accumulatedText
                  }
                  return newMessages
                })
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              // 忽略JSON解析错误
            }
          }
        }
      }

    } catch (error: any) {
      // 如果是用户主动取消，显示提示
      if (error.name === 'AbortError') {
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[assistantMessageIndex].content.trim()) {
            // 如果已有部分回复，保留并添加提示
            newMessages[assistantMessageIndex].content += '\n\n_[已停止生成]_'
          } else {
            // 如果没有内容，显示取消消息
            newMessages[assistantMessageIndex].content = '_[已取消回复]_'
          }
          return newMessages
        })
      } else {
        console.error('Chat error:', error)
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[assistantMessageIndex] = {
            role: 'assistant',
            content: `抱歉，出现了错误：${error.message}\n\n请稍后再试，或查看[学习路径](/roadmap)继续学习。`
          }
          return newMessages
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  // 停止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }

  // 清空对话
  const handleClearChat = () => {
    if (confirm('确定要清空所有对话记录吗？')) {
      setMessages([DEFAULT_WELCOME_MESSAGE])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // 导出对话为Markdown
  const handleExportChat = () => {
    const markdown = messages.map(msg => {
      const role = msg.role === 'user' ? '👤 用户' : '🤖 AI助手'
      return `## ${role}\n\n${msg.content}\n`
    }).join('\n---\n\n')

    const header = `# AI学习助手对话记录\n\n**导出时间**: ${new Date().toLocaleString('zh-CN')}\n**消息数量**: ${messages.length}\n\n---\n\n`
    const fullContent = header + markdown

    // 创建下载链接
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AI对话记录-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 导出对话为JSON
  const handleExportJSON = () => {
    const data = {
      exportTime: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AI对话记录-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleQuickQuestion = async (question: string) => {
    setInput(question)
    // 等待一下让input更新，然后发送
    setTimeout(() => handleSend(), 100)
  }

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-50"
        aria-label="AI助手"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[420px] h-[650px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
          {/* 头部 */}
          <div className="bg-white border-b border-gray-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI学习助手</h3>
                  <p className="text-xs text-gray-500">
                    {isLoading ? '正在思考...' : '在线'}
                  </p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  aria-label="菜单"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {showMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white text-gray-900 rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                    <button
                      onClick={() => {
                        handleExportChat()
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-gray-700">导出为Markdown</span>
                    </button>
                    <button
                      onClick={() => {
                        handleExportJSON()
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span className="text-gray-700">导出为JSON</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => {
                        handleClearChat()
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-red-600">清空对话</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* 头像 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                }`}>
                  {msg.role === 'user' ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                </div>

                {/* 消息内容 */}
                <div className={`flex-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-md'
                        : 'bg-white text-gray-800 rounded-tl-md shadow-sm border border-gray-200'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2">
                        <ReactMarkdown
                          components={{
                            a: ({ node, ...props }) => {
                              const href = props.href || ''
                              if (href.startsWith('/')) {
                                return (
                                  <Link
                                    href={href}
                                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                                    onClick={() => setIsOpen(false)}
                                  >
                                    {props.children}
                                  </Link>
                                )
                              }
                              return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline" />
                            },
                            p: ({ node, ...props }) => <p className="mb-2 break-words leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                            code: ({ node, inline, ...props }: any) =>
                              inline ?
                                <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs break-words font-mono" {...props} /> :
                                <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg text-xs my-2 overflow-x-auto whitespace-pre font-mono" {...props} />,
                            pre: ({ node, ...props }) => <pre className="overflow-x-auto my-2 max-w-full" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm break-words leading-relaxed">{msg.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-md shadow-sm border border-gray-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* 快速问题（仅在开始时显示） */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-3 px-2">
                <p className="text-xs text-gray-500 font-medium">快速开始</p>
                <div className="grid gap-2">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-left text-sm bg-white text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="输入消息... (Shift + Enter 换行)"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none transition"
                  disabled={isLoading}
                  rows={1}
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px',
                  }}
                />
              </div>
              {isLoading ? (
                <button
                  onClick={handleStop}
                  className="flex-shrink-0 w-11 h-11 bg-red-500 text-white rounded-xl hover:bg-red-600 transition flex items-center justify-center"
                  title="停止生成"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 w-11 h-11 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center"
                  title="发送消息"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 px-1">
              AI可能会犯错，请核实重要信息
            </p>
          </div>
        </div>
      )}
    </>
  )
}
