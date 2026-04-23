'use client'

import { useState } from 'react'
import type { CustomTopic } from './GitHubTopicTabs'

interface Props {
  open: boolean
  topics: CustomTopic[]
  onClose: () => void
  onSave: (topics: CustomTopic[]) => void
}

const QUERY_EXAMPLES = [
  { label: 'Rust 生态', queries: ['topic:rust stars:>1000', 'language:Rust stars:>5000'] },
  { label: 'UI 组件库', queries: ['topic:ui-components stars:>3000', 'topic:design-system stars:>3000'] },
  { label: '游戏开发', queries: ['topic:gamedev stars:>2000', 'topic:game-engine stars:>2000'] },
  { label: '安全工具', queries: ['topic:security stars:>5000', 'topic:hacking stars:>3000'] },
]

export default function CustomTopicModal({ open, topics, onClose, onSave }: Props) {
  const [editingTopics, setEditingTopics] = useState<CustomTopic[]>(topics)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newQueries, setNewQueries] = useState('')
  const [newSort, setNewSort] = useState<'stars' | 'forks' | 'updated'>('stars')

  if (!open) return null

  const handleAdd = () => {
    const label = newLabel.trim()
    const queries = newQueries
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (!label || queries.length === 0) return

    const key = `custom_${Date.now()}`
    const updated = [...editingTopics, { key, label, queries, sort: newSort }]
    setEditingTopics(updated)
    setNewLabel('')
    setNewQueries('')
    setShowAdd(false)
  }

  const handleDelete = (key: string) => {
    setEditingTopics(editingTopics.filter(t => t.key !== key))
  }

  const handleSave = () => {
    onSave(editingTopics)
    onClose()
  }

  const handleUseExample = (example: typeof QUERY_EXAMPLES[0]) => {
    setNewLabel(example.label)
    setNewQueries(example.queries.join('\n'))
    setShowAdd(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">管理自定义榜单</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 已有自定义榜单 */}
          {editingTopics.length > 0 ? (
            <div className="space-y-3">
              {editingTopics.map(topic => (
                <div key={topic.key} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{topic.label}</div>
                    <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                      {topic.queries.map((q, i) => (
                        <div key={i} className="font-mono truncate">{q}</div>
                      ))}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      排序: {topic.sort === 'stars' ? 'Stars' : topic.sort === 'forks' ? 'Forks' : '最近更新'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(topic.key)}
                    className="ml-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              还没有自定义榜单
            </div>
          )}

          {/* 添加新榜单 */}
          {showAdd ? (
            <div className="p-4 border-2 border-blue-200 bg-blue-50/50 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">榜单名称</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="例如: Rust 生态"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  查询条件（每行一个，使用 GitHub 搜索语法）
                </label>
                <textarea
                  value={newQueries}
                  onChange={e => setNewQueries(e.target.value)}
                  placeholder={"topic:rust stars:>1000\nlanguage:Rust stars:>5000"}
                  rows={3}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  语法参考: <code className="bg-gray-100 px-1 rounded">topic:xxx</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">language:xxx</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">stars:&gt;N</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">created:&gt;YYYY-MM-DD</code>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">排序方式</label>
                <select
                  value={newSort}
                  onChange={e => setNewSort(e.target.value as typeof newSort)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400"
                >
                  <option value="stars">Stars 最多</option>
                  <option value="forks">Forks 最多</option>
                  <option value="updated">最近更新</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newLabel.trim() || !newQueries.trim()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  添加
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3 text-sm text-blue-600 font-medium border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 transition"
            >
              + 添加自定义榜单
            </button>
          )}

          {/* 快速模板 */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-2">快速添加模板</h3>
            <div className="flex flex-wrap gap-2">
              {QUERY_EXAMPLES.map(example => (
                <button
                  key={example.label}
                  onClick={() => handleUseExample(example)}
                  className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
