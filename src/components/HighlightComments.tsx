'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

interface Highlight {
  id: string
  selected_text: string
  comment: string
  user_name: string
  user_avatar: string | null
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

export default function HighlightComments({ articleSlug }: { articleSlug: string }) {
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
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadHighlights() }, [articleSlug])

  useEffect(() => {
    if (highlights.length > 0) renderHighlights()
  }, [highlights])

  // 弹窗出现后自动 focus 输入框
  useEffect(() => {
    if (popover.visible) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [popover.visible])

  async function loadHighlights() {
    if (!supabase) return
    const { data } = await supabase
      .from('highlights')
      .select('*')
      .eq('article_slug', articleSlug)
      .order('created_at', { ascending: true })
    if (data) setHighlights(data)
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

  // 智能定位：默认在选区下方，空间不够时在上方
  function computePlacement(rect: DOMRect): { placement: 'above' | 'below'; x: number; y: number; anchorBottom: number } {
    const POPOVER_HEIGHT = 200 // 预估弹窗高度
    const MARGIN = 12
    const viewportH = window.innerHeight
    const spaceBelow = viewportH - rect.bottom
    const placement = spaceBelow > POPOVER_HEIGHT + MARGIN ? 'below' : 'above'
    // 水平：居中但不超出屏幕
    let x = rect.left + rect.width / 2
    x = Math.max(180, Math.min(x, window.innerWidth - 180))

    return {
      placement,
      x,
      y: placement === 'below' ? rect.bottom + MARGIN : rect.top - MARGIN,
      anchorBottom: rect.bottom,
    }
  }

  // 监听文本选择
  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout>

    function handleMouseUp(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        // 点击空白处关闭（延迟一下避免误触）
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

      const containerPath = getContainerPath(range.startContainer)
      if (containerPath === null) return

      const container = articleEl.querySelector(`[data-p-idx="${containerPath}"]`)
      if (!container) return

      const startOffset = getTextOffset(container, range.startContainer, range.startOffset)
      const endOffset = getTextOffset(container, range.endContainer, range.endOffset)

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
      setCommentInput('')
      setError(null)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      clearTimeout(selectionTimeout)
    }
  }, [])

  // 渲染已有高亮
  function renderHighlights() {
    const articleEl = document.getElementById('article-content')
    if (!articleEl) return

    articleEl.querySelectorAll('.hl-comment').forEach(el => {
      const parent = el.parentNode!
      parent.replaceChild(document.createTextNode(el.textContent || ''), el)
      parent.normalize()
    })

    highlights.forEach(h => {
      const container = articleEl.querySelector(`[data-p-idx="${h.container_path}"]`)
      if (!container) return
      try { applyHighlight(container, h) } catch { /* skip */ }
    })
  }

  function applyHighlight(container: Element, h: Highlight) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let offset = 0
    let startNode: Text | null = null, startNodeOffset = 0
    let endNode: Text | null = null, endNodeOffset = 0
    let node: Node | null

    while ((node = walker.nextNode())) {
      const textNode = node as Text
      const len = textNode.length
      if (!startNode && offset + len > h.start_offset) {
        startNode = textNode
        startNodeOffset = h.start_offset - offset
      }
      if (offset + len >= h.end_offset) {
        endNode = textNode
        endNodeOffset = h.end_offset - offset
        break
      }
      offset += len
    }

    if (!startNode || !endNode) return

    const range = document.createRange()
    range.setStart(startNode, startNodeOffset)
    range.setEnd(endNode, endNodeOffset)

    const mark = document.createElement('mark')
    mark.className = 'hl-comment bg-yellow-100/60 hover:bg-yellow-200/80 cursor-pointer rounded-sm transition-colors border-b-2 border-yellow-300/50'
    mark.dataset.highlightId = h.id

    mark.addEventListener('mouseenter', () => {
      const rect = mark.getBoundingClientRect()
      setTooltip({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        highlight: h,
      })
    })
    mark.addEventListener('mouseleave', () => {
      setTooltip({ visible: false, x: 0, y: 0, highlight: null })
    })

    range.surroundContents(mark)
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

  function handleClose() {
    setPopover(p => ({ ...p, visible: false }))
    setCommentInput('')
    setError(null)
    window.getSelection()?.removeAllRanges()
  }

  // 弹窗位置样式
  const popoverStyle: React.CSSProperties = {
    left: popover.x,
    top: popover.y,
  }
  const popoverTransform = popover.placement === 'above'
    ? 'translate(-50%, -100%)'
    : 'translate(-50%, 0)'

  return (
    <>
      {/* 选中文字后的批注面板 —— 直接展开输入框 */}
      {popover.visible && (
        <div
          ref={popoverRef}
          className="fixed z-[100]"
          style={{ ...popoverStyle, transform: popoverTransform }}
        >
          {/* 箭头指示器 */}
          <div className={`
            absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-gray-200 rotate-45
            ${popover.placement === 'below'
              ? '-top-1.5 border-t border-l'
              : '-bottom-1.5 border-b border-r'}
          `} />

          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
            {/* 选中文本预览 */}
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

            {/* 输入区域 */}
            <div className="p-3">
              {/* 错误提示 */}
              {error && (
                <div className="mb-2 px-2 py-1.5 bg-red-50 border border-red-100 rounded text-red-600 text-xs">
                  {error}
                </div>
              )}

              {/* 昵称输入（未登录时） */}
              {!user && (
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full px-3 py-1.5 mb-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition"
                />
              )}

              {/* 评论输入 */}
              <textarea
                ref={inputRef}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="写下你的批注..."
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition placeholder:text-gray-300"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitHighlight()
                  if (e.key === 'Escape') handleClose()
                }}
              />

              {/* 操作栏 */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {user ? (
                    <div className="flex items-center gap-1.5">
                      {user.avatar && (
                        <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
                      )}
                      <span className="text-xs text-gray-400">{user.name}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={signInWithGitHub}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      GitHub 登录
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-300 hidden sm:inline">
                    {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
                  </span>
                  <button
                    onClick={handleSubmitHighlight}
                    disabled={!commentInput.trim() || submitting || (!user && !guestName.trim())}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        提交中
                      </span>
                    ) : '提交批注'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 已有批注的 Hover tooltip */}
      {tooltip.visible && tooltip.highlight && (
        <div
          className="fixed z-[100] transform -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
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
            </div>
            <p className="leading-relaxed text-gray-100">{tooltip.highlight.comment}</p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900/95" />
          </div>
        </div>
      )}
    </>
  )
}
