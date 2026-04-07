'use client'

import { useState, useEffect } from 'react'
import { CATEGORIES, type TodoPriority, PRIORITY_CONFIG } from '@/lib/todos'

interface TodoInputProps {
  onAdd: (data: { title: string; priority: TodoPriority; category: string }) => void
}

export default function TodoInput({ onAdd }: TodoInputProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TodoPriority>(3)
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [expanded, setExpanded] = useState(false)
  const [allCategories, setAllCategories] = useState<string[]>([...CATEGORIES])

  useEffect(() => {
    fetch('/api/articles')
      .then(r => r.json())
      .then((articles: { tags?: string[] }[]) => {
        const tags = new Set<string>(CATEGORIES)
        for (const a of articles) {
          if (a.tags) a.tags.forEach(t => tags.add(t))
        }
        setAllCategories(Array.from(tags))
      })
      .catch(() => {})
  }, [])

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd({ title: trimmed, priority, category })
    setTitle('')
    setPriority(3)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            onFocus={() => setExpanded(true)}
            placeholder="添加新任务... (Enter 提交)"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-300"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl hover:shadow-md hover:shadow-blue-200 disabled:opacity-40 disabled:hover:shadow-none transition-all"
        >
          添加
        </button>
      </div>

      {expanded && (
        <div className="flex items-center gap-4 mt-3 pl-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">优先级</span>
            <div className="flex gap-1">
              {([1, 2, 3, 4] as TodoPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                    priority === p
                      ? `${PRIORITY_CONFIG[p].color} bg-current/10 ring-1 ring-current/20 scale-110`
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  P{p}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-gray-100" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">分类</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-600"
            >
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => setExpanded(false)} className="ml-auto text-xs text-gray-300 hover:text-gray-500">
            收起
          </button>
        </div>
      )}
    </div>
  )
}
