'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Link from 'next/link'
import { useSettings } from './SettingsProvider'
import { useAuth } from './AuthProvider'
import * as storage from '@/lib/chat-storage'
import type { ChatSession, Message } from '@/lib/chat-storage'

const DEFAULT_WELCOME_MESSAGE = {
  role: 'assistant' as const,
  content: '你好！我是你的 AI 学习助手，可以帮你解释技术概念、推荐学习路径、回答编程问题、对比 Java 和新技术栈。\n\n划选文章内容可以直接添加为上下文，让我针对性回答。'
}

interface ContextItem {
  id: string
  type: 'page' | 'text' | 'selection' | 'image' | 'file'
  label: string
  content: string
  /** base64 data URL for image contexts */
  imageData?: string
}

function generateTitle(messages: Message[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return '新对话'
  const raw = firstUser.content.trim()

  // Try to extract a meaningful short title from the question
  // Remove common filler prefixes
  let text = raw
    .replace(/^(请问|帮我|我想|你好[，,]?\s*|hi[,\s]*)/i, '')
    .replace(/^(解释一下|介绍一下|讲讲|说说|分析一下|对比一下)\s*/, '')
    .trim()
  if (!text) text = raw

  // If it's a short question ending with ？, keep it clean
  if (text.length <= 35) return text.replace(/\n.*/s, '')

  // Try to cut at a natural boundary (punctuation)
  const cutAt = text.slice(0, 35).search(/[，。？！,.\?\!；;：:]/g)
  if (cutAt > 8) return text.slice(0, cutAt)

  return text.slice(0, 30).replace(/\n.*/s, '') + '...'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}小时前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function AIAssistant() {
  const { settings } = useSettings()
  const { user } = useAuth()
  const githubId = user?.githubId
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [contexts, setContexts] = useState<ContextItem[]>([])
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const [customText, setCustomText] = useState('')
  const [selectionPopup, setSelectionPopup] = useState<{ text: string; x: number; y: number } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const selectionTextRef = useRef<string>('')
  const selectionPopupRef = useRef<HTMLDivElement>(null)

  // 初始化：加载当前会话或创建新会话
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false

    async function init() {
      // 登录用户：先尝试迁移 localStorage 数据到 Supabase
      if (githubId) {
        setSyncStatus('syncing')
        const migrated = await storage.syncFromLocal(githubId)
        if (migrated > 0) console.log(`Migrated ${migrated} sessions to Supabase`)
        if (!cancelled) setSyncStatus('synced')
      }

      const allSessions = await storage.getSessions(githubId)
      if (cancelled) return
      setSessions(allSessions)

      // 尝试恢复上次活跃的会话
      const lastActiveId = localStorage.getItem('ai_active_session')
      if (lastActiveId) {
        const msgs = await storage.getMessages(lastActiveId, githubId)
        if (!cancelled && msgs.length > 0) {
          setMessages(msgs)
          setCurrentSessionId(lastActiveId)
          return
        }
      }

      // 加载最新的会话
      if (allSessions.length > 0) {
        const latest = allSessions[0]
        const msgs = await storage.getMessages(latest.id, githubId)
        if (!cancelled && msgs.length > 0) {
          setMessages(msgs)
          setCurrentSessionId(latest.id)
          localStorage.setItem('ai_active_session', latest.id)
          return
        }
      }

      // 没有任何历史，创建空会话
      if (!cancelled) {
        const id = Date.now().toString()
        setCurrentSessionId(id)
        localStorage.setItem('ai_active_session', id)
      }
    }

    init()
    return () => { cancelled = true }
  }, [githubId])

  // 自动保存当前会话
  const saveCurrentSession = useCallback(async () => {
    if (!currentSessionId || typeof window === 'undefined') return
    if (messages.length <= 1) return // 只有欢迎消息不保存

    await storage.saveMessages(currentSessionId, messages, githubId)
    localStorage.setItem('ai_active_session', currentSessionId)

    const userMsgCount = messages.filter(m => m.role === 'user').length
    if (userMsgCount === 0) return

    const session: ChatSession = {
      id: currentSessionId,
      title: generateTitle(messages),
      preview: messages.find(m => m.role === 'user')?.content.slice(0, 60) || '',
      createdAt: new Date().toISOString(),
      messageCount: userMsgCount,
    }
    await storage.saveSession(session, githubId)

    setSessions(prev => {
      const updated = [session, ...prev.filter(s => s.id !== currentSessionId)].slice(0, 50)
      return updated
    })
  }, [currentSessionId, messages, githubId])

  useEffect(() => {
    saveCurrentSession()
  }, [messages, saveCurrentSession])

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 添加当前页面为上下文
  const handleAddPageContext = () => {
    const pageTitle = document.title
    const articleEl = document.querySelector('article')
    const mainEl = document.querySelector('main')
    const content = (articleEl || mainEl)?.innerText || ''

    if (!content.trim()) {
      alert('当前页面没有可提取的内容')
      return
    }

    // 截断过长内容
    const truncated = content.length > 6000 ? content.slice(0, 6000) + '\n\n[...内容已截断]' : content

    const newContext: ContextItem = {
      id: Date.now().toString(),
      type: 'page',
      label: pageTitle || window.location.pathname,
      content: truncated,
    }

    setContexts(prev => [...prev, newContext])
    setShowContextMenu(false)
  }

  // 添加自定义文本为上下文
  const handleAddTextContext = () => {
    if (!customText.trim()) return

    const newContext: ContextItem = {
      id: Date.now().toString(),
      type: 'text',
      label: customText.slice(0, 30) + (customText.length > 30 ? '...' : ''),
      content: customText.trim(),
    }

    setContexts(prev => [...prev, newContext])
    setCustomText('')
    setShowTextInput(false)
    setShowContextMenu(false)
  }

  // 移除上下文
  const handleRemoveContext = (id: string) => {
    setContexts(prev => prev.filter(c => c.id !== id))
  }

  // 划线选中 → 弹窗添加上下文
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // 如果点击的是弹窗本身，不处理
      if (selectionPopupRef.current?.contains(e.target as Node)) return

      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!text || text.length < 5) {
        setSelectionPopup(null)
        return
      }
      // 不在 AI 助手面板内触发
      const anchorNode = sel?.anchorNode
      if (anchorNode) {
        const el = anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as HTMLElement)
          : anchorNode.parentElement
        if (el?.closest('.ai-assistant-panel')) return
      }
      const range = sel?.getRangeAt(0)
      if (!range) return
      const rect = range.getBoundingClientRect()
      // 同时存入 ref，保证 click handler 一定能拿到
      selectionTextRef.current = text
      setSelectionPopup({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })
    }

    const handleMouseDown = (e: MouseEvent) => {
      // 如果点击的是弹窗本身，不清除
      if (selectionPopupRef.current?.contains(e.target as Node)) return
      setSelectionPopup(null)
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  const handleAddSelectionContext = () => {
    // 从 ref 读取，避免 state 时序问题
    const text = selectionTextRef.current
    if (!text) return
    setContexts(prev => [...prev, {
      id: Date.now().toString(),
      type: 'selection',
      label: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
      content: text,
    }])
    selectionTextRef.current = ''
    setSelectionPopup(null)
    window.getSelection()?.removeAllRanges()
    // 自动打开聊天窗口
    if (!isOpen) setIsOpen(true)
  }

  // 图片上下文
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setContexts(prev => [...prev, {
        id: Date.now().toString(),
        type: 'image',
        label: file.name,
        content: `[图片: ${file.name}]`,
        imageData: dataUrl,
      }])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setShowContextMenu(false)
  }

  // 文件上下文
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) {
      alert('文件大小不能超过 1MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n\n[...内容已截断]' : text
      setContexts(prev => [...prev, {
        id: Date.now().toString(),
        type: 'file',
        label: file.name,
        content: truncated,
      }])
    }
    reader.readAsText(file)
    e.target.value = ''
    setShowContextMenu(false)
  }

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
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      ...(contexts.length > 0 ? {
        contexts: contexts.map(c => ({ type: c.type, label: c.label }))
      } : {}),
    }
    setMessages(prev => [...prev, userMsg])
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
          history: messages.filter(msg => msg.role !== 'assistant' || messages.indexOf(msg) > 0), // 排除初始欢迎消息
          contexts: contexts.map(c => ({
            type: c.type, label: c.label, content: c.content,
            ...(c.imageData ? { imageData: c.imageData } : {}),
          })),
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

  // 新建对话（保存当前会话后新建）
  const handleNewChat = async () => {
    await saveCurrentSession()
    const id = Date.now().toString()
    setCurrentSessionId(id)
    setMessages([DEFAULT_WELCOME_MESSAGE])
    setContexts([])
    localStorage.setItem('ai_active_session', id)
    setShowHistory(false)
  }

  // 加载历史会话
  const handleLoadSession = async (sessionId: string) => {
    await saveCurrentSession()
    const msgs = await storage.getMessages(sessionId, githubId)
    if (msgs.length > 0) {
      setMessages(msgs)
      setCurrentSessionId(sessionId)
      localStorage.setItem('ai_active_session', sessionId)
    }
    setShowHistory(false)
  }

  // 删除单个会话
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    await storage.deleteSession(sessionId, githubId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    // 如果删除的是当前会话，新建一个
    if (sessionId === currentSessionId) {
      handleNewChat()
    }
  }

  // 清空所有历史
  const handleClearAllHistory = async () => {
    if (!confirm('确定要清空所有历史对话？此操作不可恢复。')) return
    await storage.clearAllSessions(githubId)
    setSessions([])
    handleNewChat()
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

  // 复制单条消息
  const handleCopyMessage = async (index: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(index)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(index)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  // 切换消息选中
  const handleToggleSelect = (index: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // 批量复制
  const handleBatchCopy = async () => {
    const selected = Array.from(selectedIds).sort((a, b) => a - b)
    const text = selected.map(i => {
      const msg = messages[i]
      const role = msg.role === 'user' ? '用户' : 'AI助手'
      return `**${role}**:\n${msg.content}`
    }).join('\n\n---\n\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条消息？`)) return
    setMessages(prev => prev.filter((_, i) => !selectedIds.has(i)))
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleQuickQuestion = async (question: string) => {
    setInput(question)
    // 等待一下让input更新，然后发送
    setTimeout(() => handleSend(), 100)
  }

  if (!settings.showAiButton && !isOpen) return null

  return (
    <>
      {/* 浮动按钮 */}
      {!(isOpen && isExpanded) && (
      <button
        onClick={() => { setIsOpen(!isOpen); if (isOpen) setIsExpanded(false) }}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center z-50 ${
          isOpen
            ? 'bg-gray-900 hover:bg-gray-800 rotate-0'
            : 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 hover:scale-110'
        }`}
        aria-label="AI助手"
      >
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            {/* 脉冲光环 */}
            <span className="absolute inset-0 rounded-2xl bg-violet-500/30 animate-ping" style={{ animationDuration: '3s' }} />
          </>
        )}
      </button>
      )}

      {/* 划线选中弹窗 */}
      {selectionPopup && (
        <div
          ref={selectionPopupRef}
          className="fixed z-[60]"
          style={{
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
            onClick={handleAddSelectionContext}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg hover:bg-gray-800 transition whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加到 AI 助手
          </button>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.java,.xml,.yaml,.yml,.csv,.log,.html,.css,.sql,.sh,.go,.rs,.c,.cpp,.h,.hpp,.rb,.php,.swift,.kt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 聊天窗口 */}
      {isOpen && (
        <div
          className={`fixed bg-white/95 backdrop-blur-xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] flex flex-col z-50 border border-white/50 overflow-hidden ai-assistant-panel transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isExpanded
              ? 'inset-4 sm:inset-6 lg:inset-10 rounded-2xl'
              : 'bottom-24 right-6 w-[400px] h-[620px] rounded-3xl'
          }`}
          style={isExpanded ? undefined : { animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <style>{`
            @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          `}</style>
          {/* 头部 */}
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">AI 学习助手</h3>
                  <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                    {isLoading ? (
                      <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />思考中...</>
                    ) : syncStatus === 'syncing' ? (
                      <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />同步中...</>
                    ) : (
                      <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{user ? '已同步' : '在线'}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* 放大/缩小 */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                  title={isExpanded ? '缩小' : '放大'}
                >
                  {isExpanded ? (
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" />
                    </svg>
                  )}
                </button>
                {/* 关闭（放大模式下可见） */}
                {isExpanded && (
                  <button
                    onClick={() => { setIsOpen(false); setIsExpanded(false) }}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                    title="关闭"
                  >
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                  aria-label="菜单"
                >
                  <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {showMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white text-gray-900 rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                    <button
                      onClick={() => {
                        handleNewChat()
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-gray-700">新建对话</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowHistory(true)
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700">历史记录</span>
                      {sessions.length > 0 && (
                        <span className="ml-auto text-xs text-gray-400">{sessions.length}</span>
                      )}
                    </button>
                    <div className="border-t border-gray-100" />
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
                      <span className="text-gray-700">导出 Markdown</span>
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
                      <span className="text-gray-700">导出 JSON</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => {
                        setSelectMode(true)
                        setSelectedIds(new Set())
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="text-gray-700">选择消息</span>
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* 历史记录面板 */}
          {showHistory && (
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
              {/* 历史面板头部 */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    返回对话
                  </button>
                  {sessions.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      清空全部
                    </button>
                  )}
                </div>
                {sessions.length > 3 && (
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索历史对话..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>
                )}
              </div>

              {/* 会话列表 */}
              <div className="flex-1 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 px-8">
                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">暂无历史对话</p>
                    <p className="text-xs mt-1">开始一次新对话吧</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {sessions
                      .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.preview.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(session => (
                        <button
                          key={session.id}
                          onClick={() => handleLoadSession(session.id)}
                          className={`w-full text-left px-5 py-3 hover:bg-white transition group ${
                            session.id === currentSessionId ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                session.id === currentSessionId ? 'text-blue-700' : 'text-gray-800'
                              }`}>
                                {session.title}
                              </p>
                              {session.preview && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">{session.preview}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-gray-400">
                                  {formatDate(session.createdAt)}
                                </span>
                                <span className="text-[11px] text-gray-300">
                                  {session.messageCount} 条消息
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteSession(e, session.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition flex-shrink-0"
                              title="删除此对话"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* 底部新建按钮 */}
              <div className="px-5 py-3 border-t border-gray-200 bg-white">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新建对话
                </button>
              </div>
            </div>
          )}

          {/* 消息列表 */}
          <div className={`flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-gradient-to-b from-gray-50 to-white ${showHistory ? 'hidden' : ''}`}>
            {/* 批量操作栏 */}
            {selectMode && (
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-200">
                <span className="text-sm text-gray-600">
                  已选 <span className="font-semibold text-blue-600">{selectedIds.size}</span> 条
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchCopy}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    复制
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    删除
                  </button>
                  <button
                    onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} ${
                  selectMode ? 'cursor-pointer' : ''
                }`}
                onClick={selectMode ? () => handleToggleSelect(index) : undefined}
              >
                {/* 选择模式 checkbox */}
                {selectMode && (
                  <div className="flex-shrink-0 flex items-start pt-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                      selectedIds.has(index)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {selectedIds.has(index) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* 头像 */}
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}

                {/* 消息内容 */}
                <div className={`flex-1 ${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[88%]'}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-gray-900 text-white rounded-br-lg'
                        : 'bg-white text-gray-700 rounded-bl-lg shadow-sm ring-1 ring-gray-100'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
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
                      <div>
                        <div className="text-sm break-words leading-relaxed">{msg.content}</div>
                        {/* 用户消息中显示上下文标签 */}
                        {msg.contexts && msg.contexts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/20">
                            {msg.contexts.map((ctx, ci) => (
                              <span key={ci} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/20 text-white/90 text-[10px] rounded">
                                {ctx.type === 'page' && '📄'}
                                {ctx.type === 'text' && '📝'}
                                {ctx.type === 'selection' && '✂️'}
                                {ctx.type === 'image' && '🖼️'}
                                {ctx.type === 'file' && '📎'}
                                <span className="max-w-[100px] truncate">{ctx.label}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 消息操作栏（hover 显示） */}
                  {!selectMode && index > 0 && (
                    <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyMessage(index, msg.content) }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition rounded"
                        title="复制内容"
                      >
                        {copiedId === index ? (
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white animate-spin" style={{ animationDuration: '3s' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-lg shadow-sm ring-1 ring-gray-100">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* 快速问题（仅在开始时显示） */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-3 px-1">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">试试这些</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-left text-[13px] bg-white text-gray-600 px-3.5 py-3 rounded-xl hover:bg-violet-50 hover:text-violet-700 transition-all ring-1 ring-gray-100 hover:ring-violet-200 hover:shadow-sm leading-snug"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 输入框 */}
          <div className={`p-3.5 bg-white/80 backdrop-blur-sm border-t border-gray-100 ${showHistory ? 'hidden' : ''}`}>
            {/* 上下文标签 */}
            {contexts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {contexts.map(ctx => (
                  <span
                    key={ctx.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-lg border border-violet-200/60"
                  >
                    {ctx.type === 'page' && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {(ctx.type === 'text' || ctx.type === 'selection') && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    )}
                    {ctx.type === 'image' && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {ctx.type === 'file' && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    )}
                    <span className="max-w-[120px] truncate">{ctx.label}</span>
                    <button
                      onClick={() => handleRemoveContext(ctx.id)}
                      className="hover:text-red-500 transition ml-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 自定义文本输入面板 */}
            {showTextInput && (
              <div className="mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">添加文本上下文</span>
                  <button
                    onClick={() => { setShowTextInput(false); setCustomText('') }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="粘贴代码、错误日志、文档片段等..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                  rows={4}
                />
                <button
                  onClick={handleAddTextContext}
                  disabled={!customText.trim()}
                  className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  添加
                </button>
              </div>
            )}

            <div className="flex gap-2 items-end">
              {/* 添加上下文按钮 */}
              <div className="relative">
                <button
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    contexts.length > 0
                      ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                  }`}
                  title="添加上下文"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {contexts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 text-white text-[10px] rounded-full flex items-center justify-center">
                      {contexts.length}
                    </span>
                  )}
                </button>

                {/* 上下文菜单 */}
                {showContextMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                    <button
                      onClick={handleAddPageContext}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-gray-700">添加当前页面</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => { setShowTextInput(true); setShowContextMenu(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span className="text-gray-700">添加文本片段</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={() => { imageInputRef.current?.click(); setShowContextMenu(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700">添加图片</span>
                    </button>
                    <button
                      onClick={() => { fileInputRef.current?.click(); setShowContextMenu(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm transition"
                    >
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-gray-700">添加文件</span>
                    </button>
                    {contexts.length > 0 && (
                      <>
                        <div className="border-t border-gray-100" />
                        <button
                          onClick={() => { setContexts([]); setShowContextMenu(false) }}
                          className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-sm transition"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="text-red-600">清除所有上下文</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

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
                  placeholder={contexts.length > 0 ? "基于上下文提问..." : "问点什么..."}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none transition-all placeholder:text-gray-300"
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
                  className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-200 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm disabled:shadow-none"
                  title="发送消息"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-300 mt-1.5 text-center">
              AI 可能出错 / Enter 发送 / Shift+Enter 换行
            </p>
          </div>
        </div>
      )}
    </>
  )
}
