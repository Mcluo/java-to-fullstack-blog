'use client'

import { POPULAR_LANGUAGES } from '@/lib/github'

export interface FilterValues {
  language: string
  sort: string
  min_stars: string
}

interface Props {
  filters: FilterValues
  onChange: (filters: FilterValues) => void
}

export default function GitHubFilters({ filters, onChange }: Props) {
  const update = (key: keyof FilterValues, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 语言 */}
      <select
        value={filters.language}
        onChange={e => update('language', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-blue-400 transition"
      >
        <option value="">所有语言</option>
        {POPULAR_LANGUAGES.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>

      {/* 排序 */}
      <select
        value={filters.sort}
        onChange={e => update('sort', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-blue-400 transition"
      >
        <option value="stars">Stars 最多</option>
        <option value="forks">Forks 最多</option>
        <option value="updated">最近更新</option>
        <option value="best-match">最佳匹配</option>
      </select>

      {/* 最低 Stars */}
      <select
        value={filters.min_stars}
        onChange={e => update('min_stars', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-blue-400 transition"
      >
        <option value="">Stars 不限</option>
        <option value="100">&ge; 100</option>
        <option value="1000">&ge; 1k</option>
        <option value="5000">&ge; 5k</option>
        <option value="10000">&ge; 10k</option>
        <option value="50000">&ge; 50k</option>
      </select>
    </div>
  )
}
