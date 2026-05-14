'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface Concept {
  id: string
  term: string
  general_explanation: string
  context_explanation: string
  source_text: string
  article_slug: string
  article_title: string
  note: string
  mastered: boolean
  created_at: string
}

type Filter = 'all' | 'pending' | 'mastered'

export default function ConceptsPage() {
  const { user, loading, signInWithGitHub } = useAuth()
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [fetching, setFetching] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  useEffect(() => {
    if (!loading) {
      if (user) loadConcepts()
      else setFetching(false)
    }
  }, [user, loading])

  async function loadConcepts() {
    if (!supabase) return
    setFetching(true)
    try {
      const { data } = await supabase
        .from('concepts')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setConcepts(data)
    } catch { /* ignore */ } finally {
      setFetching(false)
    }
  }

  async function toggleMastered(id: string, current: boolean) {
    if (!supabase) return
    await supabase.from('concepts').update({ mastered: !current }).eq('id', id)
    setConcepts(prev => prev.map(c => c.id === id ? { ...c, mastered: !current } : c))
  }

  async function saveNote(id: string) {
    if (!supabase) return
    await supabase.from('concepts').update({ note: editingNoteText }).eq('id', id)
    setConcepts(prev => prev.map(c => c.id === id ? { ...c, note: editingNoteText } : c))
    setEditingNoteId(null)
  }

  async function deleteConcept(id: string) {
    if (!supabase) return
    await supabase.from('concepts').delete().eq('id', id)
    setConcepts(prev => prev.filter(c => c.id !== id))
  }

  const filtered = concepts.filter(c => {
    if (filter === 'pending' && c.mastered) return false
    if (filter === 'mastered' && !c.mastered) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return c.term.toLowerCase().includes(q) || c.general_explanation.toLowerCase().includes(q)
    }
    return true
  })

  const total = concepts.length
  const masteredCount = concepts.filter(c => c.mastered).length
  const pendingCount = total - masteredCount

  if (loading || fetching) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-6">📖</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">我的概念知识库</h1>
        <p className="text-gray-500 mb-8">登录后可收藏阅读中不懂的概念，沉淀为个人知识卡片</p>
        <button
          onClick={signInWithGitHub}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
          GitHub 登录
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* 页头 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">我的概念知识库</h1>
        <p className="text-gray-500 text-sm">收藏阅读中不懂的概念，逐步消化掌握</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: '已收藏', value: total, color: 'text-gray-900' },
          { label: '待掌握', value: pendingCount, color: 'text-amber-600' },
          { label: '已掌握', value: masteredCount, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 搜索 + 筛选 */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索概念..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          {(['all', 'pending', 'mastered'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 transition ${filter === f ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待掌握' : '已掌握'}
            </button>
          ))}
        </div>
      </div>

      {/* 概念列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">🔍</div>
          <p>{concepts.length === 0 ? '还没有收藏任何概念' : '没有匹配的概念'}</p>
          {concepts.length === 0 && (
            <p className="text-sm mt-2">在阅读文章时，选中不懂的词语，点击「不懂」即可收藏</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div
              key={c.id}
              className={`bg-white rounded-xl border shadow-sm transition-all ${
                c.mastered ? 'border-green-100' : 'border-gray-100'
              }`}
            >
              {/* 卡片头部 */}
              <div className="flex items-start gap-3 p-4">
                <button
                  onClick={() => toggleMastered(c.id, c.mastered)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    c.mastered
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  title={c.mastered ? '标记为未掌握' : '标记为已掌握'}
                >
                  {c.mastered && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold text-sm ${c.mastered ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {c.term}
                    </h3>
                    {c.mastered && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-medium">已掌握</span>
                    )}
                  </div>
                  <p className={`text-sm text-gray-600 mt-1 leading-relaxed ${expandedId !== c.id ? 'line-clamp-2' : ''}`}>{c.general_explanation}</p>

                  {/* 个人笔记 */}
                  {editingNoteId === c.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editingNoteText}
                        onChange={e => setEditingNoteText(e.target.value)}
                        autoFocus
                        rows={3}
                        className="w-full p-2 text-xs border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(c.id)
                          if (e.key === 'Escape') setEditingNoteId(null)
                        }}
                      />
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => setEditingNoteId(null)} className="text-[10px] text-gray-400 hover:text-gray-600 transition">取消</button>
                        <button onClick={() => saveNote(c.id)} className="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition">保存</button>
                      </div>
                    </div>
                  ) : c.note ? (
                    <div
                      className="mt-2 p-2 bg-blue-50 rounded-lg border-l-2 border-blue-200 cursor-pointer hover:bg-blue-100 transition group"
                      onClick={() => { setEditingNoteId(c.id); setEditingNoteText(c.note) }}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">我的笔记</p>
                        <svg className="w-2.5 h-2.5 text-blue-300 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">{c.note}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNoteId(c.id); setEditingNoteText('') }}
                      className="mt-2 text-xs text-gray-300 hover:text-blue-400 transition flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      添加笔记
                    </button>
                  )}

                  {/* 展开/收起 */}
                  {(c.context_explanation || c.source_text) && (
                    <button
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      className="mt-2 text-xs text-amber-600 hover:text-amber-800 transition"
                    >
                      {expandedId === c.id ? '收起' : '查看更多'}
                    </button>
                  )}

                  {expandedId === c.id && (
                    <div className="mt-3 space-y-2">
                      {c.context_explanation && (
                        <div className="p-2.5 bg-amber-50 rounded-lg">
                          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">在原文中</p>
                          <p className="text-xs text-amber-800 leading-relaxed">{c.context_explanation}</p>
                        </div>
                      )}
                      {c.source_text && (
                        <div className="p-2.5 bg-gray-50 rounded-lg border-l-2 border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">原文段落</p>
                          <p className="text-xs text-gray-500 leading-relaxed italic">{c.source_text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {c.article_slug && (
                    <Link
                      href={`/articles/${c.article_slug}#:~:text=${encodeURIComponent(c.term)}`}
                      className="p-1.5 text-gray-300 hover:text-blue-500 transition"
                      title={c.article_title || '查看原文'}
                      target="_blank"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  )}
                  <button
                    onClick={() => deleteConcept(c.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition"
                    title="删除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 来源文章 */}
              {c.article_title && (
                <div className="px-4 pb-3 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[11px] text-gray-400">{c.article_title}</span>
                  <span className="text-[11px] text-gray-300 ml-auto">
                    {new Date(c.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
