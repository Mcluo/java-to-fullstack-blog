'use client'

import { useState } from 'react'
import { type Todo, type TodoStatus, type TodoPriority, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG, CATEGORIES } from '@/lib/todos'

interface TodoItemProps {
  todo: Todo
  onUpdate: (id: string, changes: Partial<Todo>) => void
  onDelete: (id: string) => void
}

export default function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDesc, setEditDesc] = useState(todo.description || '')
  const [completing, setCompleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isDone = todo.status === 'done'
  const priorityCfg = PRIORITY_CONFIG[todo.priority]
  const statusCfg = STATUS_CONFIG[todo.status]
  const categoryCfg = CATEGORY_CONFIG[todo.category] || { color: 'text-gray-500 bg-gray-50 ring-gray-200' }

  const handleComplete = () => {
    if (isDone) {
      onUpdate(todo.id, { status: 'todo' })
      return
    }
    setCompleting(true)
    setTimeout(() => {
      onUpdate(todo.id, { status: 'done' })
      setCompleting(false)
    }, 400)
  }

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(todo.id, { title: editTitle.trim(), description: editDesc.trim() || undefined })
    }
    setEditing(false)
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(todo.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const nextStatus: Record<TodoStatus, TodoStatus> = {
    backlog: 'todo',
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  }

  return (
    <div className={`group bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-200 hover:shadow-sm transition-all ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleComplete}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
            isDone
              ? 'border-emerald-400 bg-emerald-400'
              : completing
                ? 'border-emerald-400 bg-emerald-400 scale-110'
                : `border-gray-300 hover:border-${priorityCfg.dot.replace('bg-', '')}`
          }`}
        >
          {(isDone || completing) && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditing(false) }}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                placeholder="添加描述..."
                rows={2}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={todo.priority}
                  onChange={e => onUpdate(todo.id, { priority: Number(e.target.value) as TodoPriority })}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
                >
                  {([1, 2, 3, 4] as TodoPriority[]).map(p => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
                <select
                  value={todo.category}
                  onChange={e => onUpdate(todo.id, { category: e.target.value })}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={todo.status}
                  onChange={e => onUpdate(todo.id, { status: e.target.value as TodoStatus })}
                  className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
                >
                  {(Object.keys(STATUS_CONFIG) as TodoStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
                <div className="flex-1" />
                <button onClick={handleSaveEdit} className="text-xs px-3 py-1 text-white bg-blue-500 rounded-lg hover:bg-blue-600">保存</button>
                <button onClick={() => setEditing(false)} className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700">取消</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {todo.title}
                </span>
              </div>
              {todo.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{todo.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} title={priorityCfg.label} />
                <button
                  onClick={() => onUpdate(todo.id, { status: nextStatus[todo.status] })}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ring-1 ${statusCfg.color} hover:opacity-80 transition`}
                >
                  {statusCfg.label}
                </button>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ring-1 ${categoryCfg.color}`}>
                  {todo.category}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => { setEditTitle(todo.title); setEditDesc(todo.description || ''); setEditing(true) }}
              className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-50"
              title="编辑"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-lg transition ${confirmDelete ? 'text-rose-500 bg-rose-50' : 'text-gray-300 hover:text-rose-400 hover:bg-gray-50'}`}
              title={confirmDelete ? '再次点击确认删除' : '删除'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
