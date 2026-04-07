'use client'

import { useState, useEffect } from 'react'
import { type TodoStatus, type TodoPriority, STATUS_CONFIG, PRIORITY_CONFIG, CATEGORIES } from '@/lib/todos'

export interface Filters {
  status: TodoStatus | 'all'
  priority: TodoPriority | 'all'
  category: string | 'all'
  search: string
}

interface TodoFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

export default function TodoFilters({ filters, onChange }: TodoFiltersProps) {
  const [articleTags, setArticleTags] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/articles')
      .then(r => r.json())
      .then((articles: { tags?: string[] }[]) => {
        const tags = new Set<string>()
        for (const a of articles) {
          if (a.tags) a.tags.forEach(t => tags.add(t))
        }
        setArticleTags(Array.from(tags).sort())
      })
      .catch(() => {})
  }, [])

  const set = (key: keyof Filters, value: string | number) =>
    onChange({ ...filters, [key]: value })

  // 合并预设分类 + 文章标签（去重）
  const allCategories = Array.from(new Set([...CATEGORIES, ...articleTags]))

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          placeholder="搜索任务..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition placeholder:text-gray-300"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-1 p-1 bg-gray-50 rounded-xl">
        <FilterButton active={filters.status === 'all'} onClick={() => set('status', 'all')}>全部</FilterButton>
        {(Object.keys(STATUS_CONFIG) as TodoStatus[]).map(s => (
          <FilterButton key={s} active={filters.status === s} onClick={() => set('status', s)}>
            {STATUS_CONFIG[s].label}
          </FilterButton>
        ))}
      </div>

      {/* Priority filter */}
      <select
        value={filters.priority === 'all' ? 'all' : filters.priority}
        onChange={e => set('priority', e.target.value === 'all' ? 'all' : Number(e.target.value))}
        className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-600"
      >
        <option value="all">全部优先级</option>
        {([1, 2, 3, 4] as TodoPriority[]).map(p => (
          <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
        ))}
      </select>

      {/* Category filter */}
      <select
        value={filters.category}
        onChange={e => set('category', e.target.value)}
        className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-600"
      >
        <option value="all">全部分类</option>
        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
        active
          ? 'bg-white text-gray-800 shadow-sm'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  )
}
