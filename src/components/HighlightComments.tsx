'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

interface Highlight {
  id: string
  selected_text: string
  comment: string
  user_name: string
  user_avatar: string | null
  user_github_id: string | null
  start_offset: number
  end_offset: number
  container_path: string
  created_at: string
}

interface PopoverState {
  visible: boolean
  x: number
  y: number
  anchorBottom: number
  selectedText: string
  startOffset: number
  endOffset: number
  containerPath: string
  placement: 'above' | 'below'
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  highlight: Highlight | null
}

export default function HighlightComments({ articleSlug, articleTitle = '' }: { articleSlug: string; articleTitle?: string }) {
  const { user, signInWithGitHub } = useAuth()
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [popover, setPopover] = useState<PopoverState>({
    visible: false, x: 0, y: 0, anchorBottom: 0,
    selectedText: '', startOffset: 0, endOffset: 0, containerPath: '',
    placement: 'below',
  })
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, highlight: null })
  const [commentInput, setCommentInput] = useState('')
  const [guestName, setGuestName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'toolbar' | 'input' | 'explain'>('toolbar')

  // 解释面板状态
  const [explainResult, setExplainResult] = useState<{ general: string; inContext: string } | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [savingConcept, setSavingConcept] = useState(false)
  const [savedConcept, setSavedConcept] = useState(false)
  const [conceptNote, setConceptNote] = useState('')

  // 编辑批注状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const tooltipLeaveRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { loadHighlights().catch(() => {}) }, [articleSlug])

  useEffect(() => {
    if (highlights.length > 0) renderHighlights()
  }, [highlights])

  useEffect(() => {
    if (popover.visible && mode === 'input') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [popover.visible, mode])

  async function loadHighlights() {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('highlights')
        .select('*')
        .eq('article_slug', articleSlug)
        .order('created_at', { ascending: true })
      if (data) setHighlights(data)
    } catch {
      // 网络不可达时静默失败
    }
  }

  function getContainerPath(node: Node): string | null {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element
    while (el) {
      const idx = el.getAttribute?.('data-p-idx')
      if (idx !== null && idx !== undefined) return idx
      el = el.parentElement
    }
    return null
  }

  function getTextOffset(container: Element, targetNode: Node, targetOffset: number): number {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let offset = 0
    let node: Node | null
    while ((node = walker.nextNode())) {
      if (node === targetNode) return offset + targetOffset
      offset += (node.textContent?.length || 0)
    }
    return offset
  }

  function computePlacement(rect: DOMRect): { placement: 'above' | 'below'; x: number; y: number; anchorBottom: number } {
    const POPOVER_HEIGHT = 200
    const MARGIN = 12
    const viewportH = window.innerHeight
    const spaceBelow = viewportH - rect.bottom
    const placement = spaceBelow > POPOVER_HEIGHT + MARGIN ? 'below' : 'above'
    let x = rect.left + rect.width / 2
    x = Math.max(180, Math.min(x, window.innerWidth - 180))
    return {
      placement,
      x,
      y: placement === 'below' ? rect.bottom + MARGIN : rect.top - MARGIN,
      anchorBottom: rect.bottom,
    }
  }

  // 监听文本选择（支持跨容器选择）
  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout>

    function handleMouseUp(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        selectionTimeout = setTimeout(() => {
          if (!popoverRef.current?.contains(document.activeElement)) {
            setPopover(p => ({ ...p, visible: false }))
            setCommentInput('')
            setError(null)
          }
        }, 150)
        return
      }

      const articleEl = document.getElementById('article-content')
      if (!articleEl) return

      const range = sel.getRangeAt(0)
      if (!articleEl.contains(range.commonAncestorContainer)) return

      const startPath = getContainerPath(range.startContainer)
      const endPath = getContainerPath(range.endContainer)
      if (startPath === null || endPath === null) return

      const startContainerEl = articleEl.querySelector(`[data-p-idx="${startPath}"]`)
      if (!startContainerEl) return

      const startOffset = getTextOffset(startContainerEl, range.startContainer, range.startOffset)

      let endOffset: number
      let containerPath: string

      if (startPath === endPath) {
        containerPath = startPath
        endOffset = getTextOffset(startContainerEl, range.endContainer, range.endOffset)
      } else {
        // 跨容器选择：存储 "startIdx:endIdx"
        containerPath = `${startPath}:${endPath}`
        const endContainerEl = articleEl.querySelector(`[data-p-idx="${endPath}"]`)
        if (!endContainerEl) return
        endOffset = getTextOffset(endContainerEl, range.endContainer, range.endOffset)
      }

      const rect = range.getBoundingClientRect()
      const pos = computePlacement(rect)

      setPopover({
        visible: true,
        ...pos,
        selectedText: sel.toString(),
        startOffset,
        endOffset,
        containerPath,
      })
      setMode('toolbar')
      setCommentInput('')
      setError(null)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      clearTimeout(selectionTimeout)
    }
  }, [])

  // 渲染所有高亮
  function renderHighlights() {
    const articleEl = document.getElementById('article-content')
    if (!articleEl) return

    articleEl.querySelectorAll('.hl-comment').forEach(el => {
      const parent = el.parentNode!
      parent.replaceChild(document.createTextNode(el.textContent || ''), el)
      parent.normalize()
    })

    highlights.forEach(h => {
      try { applyHighlight(articleEl, h) } catch { /* skip */ }
    })
  }

  function createMarkElement(h: Highlight): HTMLElement {
    const mark = document.createElement('mark')
    mark.className = 'hl-comment bg-yellow-100/60 hover:bg-yellow-200/80 cursor-pointer rounded-sm transition-colors border-b-2 border-yellow-300/50'
    mark.dataset.highlightId = h.id

    mark.addEventListener('mouseenter', () => {
      clearTimeout(tooltipLeaveRef.current)
      const rect = mark.getBoundingClientRect()
      setTooltip({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        highlight: h,
      })
      // 切换到新 highlight 时退出编辑模式
      setEditingId(null)
    })
    mark.addEventListener('mouseleave', () => {
      tooltipLeaveRef.current = setTimeout(() => {
        setTooltip(t => t.highlight?.id === h.id ? { visible: false, x: 0, y: 0, highlight: null } : t)
      }, 200)
    })

    return mark
  }

  function applyRangeToMark(range: Range, mark: HTMLElement) {
    try {
      range.surroundContents(mark)
    } catch {
      const contents = range.extractContents()
      mark.appendChild(contents)
      range.insertNode(mark)
    }
  }

  // 在单个容器内高亮 fromOffset..toOffset
  function applyHighlightSegment(container: Element, h: Highlight, fromOffset: number, toOffset: number) {
    if (fromOffset >= toOffset) return
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let offset = 0
    let startNode: Text | null = null, startNodeOffset = 0
    let endNode: Text | null = null, endNodeOffset = 0
    let node: Node | null

    while ((node = walker.nextNode())) {
      const textNode = node as Text
      const len = textNode.length
      if (!startNode && offset + len > fromOffset) {
        startNode = textNode
        startNodeOffset = fromOffset - offset
      }
      if (startNode && offset + len >= toOffset) {
        endNode = textNode
        endNodeOffset = toOffset - offset
        break
      }
      offset += len
    }

    if (!startNode || !endNode) return

    const range = document.createRange()
    range.setStart(startNode, startNodeOffset)
    range.setEnd(endNode, endNodeOffset)
    applyRangeToMark(range, createMarkElement(h))
  }

  // 主高亮函数：支持单容器和跨容器
  function applyHighlight(articleEl: Element, h: Highlight) {
    const parts = h.container_path.split(':')

    if (parts.length === 1) {
      // 单容器
      const container = articleEl.querySelector(`[data-p-idx="${parts[0]}"]`)
      if (!container) return
      applyHighlightSegment(container, h, h.start_offset, h.end_offset)
    } else {
      // 跨容器：startIdx:endIdx
      const startIdx = parseInt(parts[0])
      const endIdx = parseInt(parts[1])

      // 起始容器：从 startOffset 到末尾
      const startContainer = articleEl.querySelector(`[data-p-idx="${startIdx}"]`)
      if (startContainer) {
        const totalLen = startContainer.textContent?.length || 0
        applyHighlightSegment(startContainer, h, h.start_offset, totalLen)
      }

      // 中间容器：全部高亮
      for (let i = startIdx + 1; i < endIdx; i++) {
        const container = articleEl.querySelector(`[data-p-idx="${i}"]`)
        if (container) {
          const totalLen = container.textContent?.length || 0
          if (totalLen > 0) applyHighlightSegment(container, h, 0, totalLen)
        }
      }

      // 结束容器：从头到 endOffset
      const endContainer = articleEl.querySelector(`[data-p-idx="${endIdx}"]`)
      if (endContainer && h.end_offset > 0) {
        applyHighlightSegment(endContainer, h, 0, h.end_offset)
      }
    }
  }

  async function handleSubmitHighlight() {
    if (!commentInput.trim() || !supabase) return
    const name = user?.name || guestName.trim()
    if (!name) {
      setError('请输入昵称')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase.from('highlights').insert({
        article_slug: articleSlug,
        user_name: name,
        user_avatar: user?.avatar || null,
        user_github_id: user?.githubId || null,
        selected_text: popover.selectedText,
        comment: commentInput.trim(),
        start_offset: popover.startOffset,
        end_offset: popover.endOffset,
        container_path: popover.containerPath,
      })

      if (insertError) {
        setError(`提交失败: ${insertError.message}`)
      } else {
        setPopover(p => ({ ...p, visible: false }))
        setCommentInput('')
        window.getSelection()?.removeAllRanges()
        await loadHighlights()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveConcept() {
    if (!supabase || !user || !explainResult) return
    setSavingConcept(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const articleEl = document.getElementById('article-content')
      const container = articleEl?.querySelector(`[data-p-idx="${popover.containerPath.split(':')[0]}"]`)
      const sourceText = container?.textContent?.slice(0, 300) || ''
      const { error } = await supabase.from('concepts').insert({
        user_id: session.user.id,
        user_name: user.name,
        user_avatar: user.avatar || null,
        term: popover.selectedText,
        general_explanation: explainResult.general,
        context_explanation: explainResult.inContext || '',
        source_text: sourceText,
        article_slug: articleSlug,
        article_title: articleTitle,
        note: conceptNote.trim(),
      })
      if (!error) setSavedConcept(true)
    } finally {
      setSavingConcept(false)
    }
  }

  async function handleSaveEdit() {
    if (!supabase || !editingId || !editComment.trim()) return
    setEditSubmitting(true)
    try {
      const { error: updateError } = await supabase
        .from('highlights')
        .update({ comment: editComment.trim() })
        .eq('id', editingId)
      if (!updateError) {
        setEditingId(null)
        setTooltip({ visible: false, x: 0, y: 0, highlight: null })
        await loadHighlights()
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleExplain() {
    setMode('explain')
    setExplainResult(null)
    setExplainError(null)
    setExplainLoading(true)
    setSavedConcept(false)
    setConceptNote('')

    // 获取选中文字所在段落作为上下文
    const articleEl = document.getElementById('article-content')
    const container = articleEl?.querySelector(`[data-p-idx="${popover.containerPath.split(':')[0]}"]`)
    const context = container?.textContent || ''

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: popover.selectedText, context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '解释失败')
      setExplainResult(data)
    } catch (e: any) {
      setExplainError(e.message || '解释服务暂时不可用')
    } finally {
      setExplainLoading(false)
    }
  }

  function handleClose() {
    setPopover(p => ({ ...p, visible: false }))
    setCommentInput('')
    setError(null)
    setExplainResult(null)
    setExplainError(null)
    setSavedConcept(false)
    setConceptNote('')
    window.getSelection()?.removeAllRanges()
  }

  const popoverStyle: React.CSSProperties = {
    left: popover.x,
    top: popover.y,
  }
  const popoverTransform = popover.placement === 'above'
    ? 'translate(-50%, -100%)'
    : 'translate(-50%, 0)'

  // 当前用户是否是批注作者（用于显示编辑按钮）
  function isOwner(h: Highlight) {
    if (!user) return false
    if (user.githubId && h.user_github_id) return user.githubId === h.user_github_id
    return user.name === h.user_name
  }

  return (
    <>
      {/* 选中文字后的批注面板 */}
      {popover.visible && (
        <div
          ref={popoverRef}
          className="fixed z-[100]"
          style={{ ...popoverStyle, transform: popoverTransform }}
        >
          {(mode === 'input' || mode === 'explain') && (
            <div className={`
              absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45
              ${mode === 'explain' ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-200'}
              ${popover.placement === 'below'
                ? '-top-1.5 border-t border-l'
                : '-bottom-1.5 border-b border-r'}
            `} />
          )}

          {mode === 'toolbar' ? (
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl flex items-center overflow-hidden">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(popover.selectedText)
                  handleClose()
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-white/90 text-xs hover:bg-white/10 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                复制
              </button>
              <div className="w-px h-5 bg-white/20" />
              <button
                onClick={handleExplain}
                className="flex items-center gap-1.5 px-3 py-2 text-amber-300/90 text-xs hover:bg-white/10 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                不懂
              </button>
              <div className="w-px h-5 bg-white/20" />
              <button
                onClick={() => setMode('input')}
                className="flex items-center gap-1.5 px-3 py-2 text-white/90 text-xs hover:bg-white/10 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                批注
              </button>
            </div>
          ) : mode === 'explain' ? (
            /* 解释面板 */
            <div
              className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 flex flex-col"
              style={{ maxHeight: popover.placement === 'below' ? `calc(100vh - ${Math.round(popover.y) + 16}px)` : `${Math.round(popover.y) - 16}px` }}
            >
              <div className="px-4 pt-3 pb-2 bg-amber-50 border-b border-amber-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    概念解释
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-5 h-5 flex items-center justify-center rounded text-amber-400 hover:text-amber-700 hover:bg-amber-100 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-amber-800 mt-1.5 font-medium line-clamp-1">
                  &ldquo;{popover.selectedText.slice(0, 60)}{popover.selectedText.length > 60 ? '...' : ''}&rdquo;
                </p>
              </div>
              <div className="p-4 overflow-y-auto">
                {explainLoading && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs py-4 justify-center">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    AI 正在解释...
                  </div>
                )}
                {explainError && (
                  <p className="text-red-500 text-xs">{explainError}</p>
                )}
                {explainResult && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">通用解释</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{explainResult.general}</p>
                    </div>
                    {explainResult.inContext && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">在本文中</p>
                        <p className="text-sm text-amber-800 leading-relaxed">{explainResult.inContext}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-100">
                      <textarea
                        value={conceptNote}
                        onChange={e => setConceptNote(e.target.value)}
                        placeholder="写下你的笔记（可选）..."
                        rows={2}
                        className="w-full p-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition placeholder:text-gray-300 mb-2"
                      />
                      <div className="flex justify-end">
                      {user ? (
                        <button
                          onClick={handleSaveConcept}
                          disabled={savingConcept || savedConcept}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            savedConcept
                              ? 'bg-green-50 text-green-600 ring-1 ring-green-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200'
                          } disabled:opacity-60`}
                        >
                          {savedConcept ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              已收藏
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              {savingConcept ? '收藏中...' : '收藏到知识库'}
                            </>
                          )}
                        </button>
                      ) : (
                        <button onClick={signInWithGitHub} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                          登录后可收藏
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
              <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    添加批注
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2 italic">
                  &ldquo;{popover.selectedText.slice(0, 80)}{popover.selectedText.length > 80 ? '...' : ''}&rdquo;
                </p>
              </div>
              <div className="p-3">
                {error && (
                  <div className="mb-2 px-2 py-1.5 bg-red-50 border border-red-100 rounded text-red-600 text-xs">{error}</div>
                )}
                {!user && (
                  <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="你的昵称"
                    className="w-full px-3 py-1.5 mb-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition" />
                )}
                <textarea ref={inputRef} value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="写下你的批注..."
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition placeholder:text-gray-300"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitHighlight()
                    if (e.key === 'Escape') handleClose()
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {user ? (
                      <div className="flex items-center gap-1.5">
                        {user.avatar && <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />}
                        <span className="text-xs text-gray-400">{user.name}</span>
                      </div>
                    ) : (
                      <button type="button" onClick={signInWithGitHub} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                        GitHub 登录
                      </button>
                    )}
                  </div>
                  <button onClick={handleSubmitHighlight}
                    disabled={!commentInput.trim() || submitting || (!user && !guestName.trim())}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >{submitting ? '提交中...' : '提交批注'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 已有批注的 Hover tooltip */}
      {tooltip.visible && tooltip.highlight && (
        <div
          className="fixed z-[100] transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
          onMouseEnter={() => clearTimeout(tooltipLeaveRef.current)}
          onMouseLeave={() => {
            tooltipLeaveRef.current = setTimeout(() => {
              setTooltip({ visible: false, x: 0, y: 0, highlight: null })
              setEditingId(null)
            }, 200)
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-xl shadow-xl px-4 py-3 max-w-xs mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              {tooltip.highlight.user_avatar ? (
                <img src={tooltip.highlight.user_avatar} className="w-5 h-5 rounded-full ring-1 ring-white/20" alt="" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] font-medium">
                  {(tooltip.highlight.user_name || '?')[0]}
                </div>
              )}
              <span className="text-xs text-gray-300 font-medium">{tooltip.highlight.user_name}</span>
              <span className="text-[10px] text-gray-500">
                {new Date(tooltip.highlight.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
              {/* 编辑按钮（仅作者可见） */}
              {isOwner(tooltip.highlight) && editingId !== tooltip.highlight.id && (
                <button
                  onClick={() => {
                    setEditingId(tooltip.highlight!.id)
                    setEditComment(tooltip.highlight!.comment)
                  }}
                  className="ml-auto p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-white/10 transition"
                  title="编辑批注"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>

            {editingId === tooltip.highlight.id ? (
              /* 编辑模式 */
              <div className="mt-1">
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder:text-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-white/40"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSubmitting || !editComment.trim()}
                    className="px-2.5 py-1 bg-blue-500 text-white text-[10px] font-medium rounded hover:bg-blue-400 disabled:opacity-40 transition"
                  >
                    {editSubmitting ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              /* 显示模式 */
              <p className="leading-relaxed text-gray-100">{tooltip.highlight.comment}</p>
            )}

            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900/95" />
          </div>
        </div>
      )}
    </>
  )
}
