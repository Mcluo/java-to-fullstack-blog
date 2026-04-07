'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

interface Comment {
  id: string
  user_name: string
  user_avatar: string | null
  content: string
  created_at: string
}

export default function CommentSection({ articleSlug }: { articleSlug: string }) {
  const { user, signInWithGitHub } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [guestName, setGuestName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadComments = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    try {
      const { data, error: queryError } = await supabase
        .from('comments')
        .select('*')
        .eq('article_slug', articleSlug)
        .order('created_at', { ascending: true })

      if (queryError) {
        console.error('Failed to load comments:', queryError)
        setError('评论加载失败')
      } else {
        setComments(data || [])
        setError(null)
      }
    } catch (e) {
      console.error('Comments fetch error:', e)
      setError('网络错误，无法加载评论')
    } finally {
      setLoading(false)
    }
  }, [articleSlug])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !supabase) return

    const name = user?.name || guestName.trim()
    if (!name) {
      setError('请输入昵称')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase.from('comments').insert({
        article_slug: articleSlug,
        user_name: name,
        user_avatar: user?.avatar || null,
        user_github_id: user?.githubId || null,
        content: content.trim(),
      })

      if (insertError) {
        console.error('Insert comment error:', insertError)
        setError(`评论提交失败: ${insertError.message}`)
      } else {
        setContent('')
        if (!user) setGuestName('')
        await loadComments()
      }
    } catch (e) {
      console.error('Submit error:', e)
      setError('网络错误，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        评论 ({comments.length})
      </h3>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="mb-4 text-gray-400 text-sm">加载评论中...</div>
      )}

      {/* 评论列表 */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-8">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-4 bg-white rounded-lg shadow-sm">
              {c.user_avatar ? (
                <img src={c.user_avatar} alt={c.user_name} className="w-8 h-8 rounded-full shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium shrink-0">
                  {(c.user_name || '?')[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{c.user_name}</span>
                  <span className="text-xs text-gray-400">{formatTime(c.created_at)}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 评论输入 - 支持登录用户和匿名用户 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4">
        {user ? (
          <div className="flex items-center gap-2 mb-3">
            {user.avatar && (
              <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
            )}
            <span className="text-sm text-gray-600">以 {user.name} 的身份评论</span>
          </div>
        ) : (
          <div className="mb-3">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="你的昵称"
              className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的评论..."
          className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          {!user && (
            <button
              type="button"
              onClick={signInWithGitHub}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              用 GitHub 登录
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || submitting || (!user && !guestName.trim())}
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? '提交中...' : '发表评论'}
          </button>
        </div>
      </form>
    </div>
  )
}
