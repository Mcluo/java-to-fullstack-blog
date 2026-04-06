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
  selectedText: string
  startOffset: number
  endOffset: number
  containerPath: string
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
    visible: false, x: 0, y: 0, selectedText: '', startOffset: 0, endOffset: 0, containerPath: '',
  })
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, highlight: null })
  const [commentInput, setCommentInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadHighlights()
  }, [articleSlug])

  useEffect(() => {
    if (highlights.length > 0) {
      renderHighlights()
    }
  }, [highlights])

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

  // 监听文本选择
  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (!showInput) setPopover(p => ({ ...p, visible: false }))
        return
      }

      const articleEl = document.getElementById('article-content')
      if (!articleEl) return

      const range = sel.getRangeAt(0)
      if (!articleEl.contains(range.commonAncestorContainer)) {
        if (!showInput) setPopover(p => ({ ...p, visible: false }))
        return
      }

      const containerPath = getContainerPath(range.startContainer)
      if (containerPath === null) return

      const container = articleEl.querySelector(`[data-p-idx="${containerPath}"]`)
      if (!container) return

      const startOffset = getTextOffset(container, range.startContainer, range.startOffset)
      const endOffset = getTextOffset(container, range.endContainer, range.endOffset)

      const rect = range.getBoundingClientRect()
      setPopover({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        selectedText: sel.toString(),
        startOffset,
        endOffset,
        containerPath,
      })
      setShowInput(false)
      setCommentInput('')
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [showInput])

  // 渲染已有高亮
  function renderHighlights() {
    const articleEl = document.getElementById('article-content')
    if (!articleEl) return

    // 清除旧高亮
    articleEl.querySelectorAll('.hl-comment').forEach(el => {
      const parent = el.parentNode!
      parent.replaceChild(document.createTextNode(el.textContent || ''), el)
      parent.normalize()
    })

    highlights.forEach(h => {
      const container = articleEl.querySelector(`[data-p-idx="${h.container_path}"]`)
      if (!container) return

      try {
        applyHighlight(container, h)
      } catch {
        // 文本可能已变化，跳过
      }
    })
  }

  function applyHighlight(container: Element, h: Highlight) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    let offset = 0
    let startNode: Text | null = null
    let startNodeOffset = 0
    let endNode: Text | null = null
    let endNodeOffset = 0
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
    mark.className = 'hl-comment bg-yellow-100/60 hover:bg-yellow-200/80 cursor-pointer rounded-sm transition-colors'
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
    if (!commentInput.trim() || !user || !supabase) return
    setSubmitting(true)

    const { error } = await supabase.from('highlights').insert({
      article_slug: articleSlug,
      user_name: user.name,
      user_avatar: user.avatar,
      user_github_id: user.githubId,
      selected_text: popover.selectedText,
      comment: commentInput.trim(),
      start_offset: popover.startOffset,
      end_offset: popover.endOffset,
      container_path: popover.containerPath,
    })

    if (!error) {
      setPopover(p => ({ ...p, visible: false }))
      setShowInput(false)
      setCommentInput('')
      window.getSelection()?.removeAllRanges()
      await loadHighlights()
    }
    setSubmitting(false)
  }

  return (
    <>
      {/* 选中文字后的评论按钮 */}
      {popover.visible && (
        <div
          ref={popoverRef}
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full"
          style={{ left: popover.x, top: popover.y }}
        >
          {showInput ? (
            <div className="bg-white rounded-lg shadow-lg border p-3 w-72">
              {user ? (
                <>
                  <div className="text-xs text-gray-400 mb-2 truncate">
                    &ldquo;{popover.selectedText.slice(0, 40)}{popover.selectedText.length > 40 ? '...' : ''}&rdquo;
                  </div>
                  <textarea
                    autoFocus
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="写下你的批注..."
                    className="w-full p-2 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitHighlight()
                      if (e.key === 'Escape') { setShowInput(false); setPopover(p => ({ ...p, visible: false })) }
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">Cmd+Enter 提交</span>
                    <button
                      onClick={handleSubmitHighlight}
                      disabled={!commentInput.trim() || submitting}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {submitting ? '...' : '批注'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500 mb-2">登录后可添加批注</p>
                  <button
                    onClick={signInWithGitHub}
                    className="px-3 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 transition"
                  >
                    GitHub 登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition"
              title="添加批注"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip.visible && tooltip.highlight && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="bg-gray-800 text-white text-sm rounded-lg shadow-lg px-3 py-2 max-w-xs mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              {tooltip.highlight.user_avatar && (
                <img src={tooltip.highlight.user_avatar} className="w-4 h-4 rounded-full" alt="" />
              )}
              <span className="text-xs text-gray-300">{tooltip.highlight.user_name}</span>
            </div>
            <p className="leading-snug">{tooltip.highlight.comment}</p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
          </div>
        </div>
      )}
    </>
  )
}
