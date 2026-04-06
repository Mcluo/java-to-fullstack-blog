'use client'

import { useState, useEffect } from 'react'
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
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
  }, [articleSlug])

  async function loadComments() {
    if (!supabase) return
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('article_slug', articleSlug)
      .order('created_at', { ascending: true })

    if (data) setComments(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !user || !supabase) return

    setSubmitting(true)
    const { error } = await supabase.from('comments').insert({
      article_slug: articleSlug,
      user_name: user.name,
      user_avatar: user.avatar,
      user_github_id: user.githubId,
      content: content.trim(),
    })

    if (!error) {
      setContent('')
      await loadComments()
    }
    setSubmitting(false)
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

      {/* 评论列表 */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-8">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 p-4 bg-white rounded-lg shadow-sm">
              {c.user_avatar ? (
                <img src={c.user_avatar} alt={c.user_name} className="w-8 h-8 rounded-full shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium shrink-0">
                  {c.user_name[0]}
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

      {/* 评论输入 */}
      {user ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            {user.avatar && (
              <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
            )}
            <span className="text-sm text-gray-600">以 {user.name} 的身份评论</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的评论..."
            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? '提交中...' : '发表评论'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-3">登录后即可发表评论</p>
          <button
            onClick={signInWithGitHub}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            用 GitHub 登录
          </button>
        </div>
      )}
    </div>
  )
}
