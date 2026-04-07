'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadTodos, addTodo, updateTodo, deleteTodo, filterTodos, sortTodos, getStats, type Todo, type TodoPriority } from '@/lib/todos'
import TodoInput from './TodoInput'
import TodoItem from './TodoItem'
import TodoKanban from './TodoKanban'
import TodoFilters, { type Filters } from './TodoFilters'
import TodoExtractor from './TodoExtractor'

type ViewMode = 'list' | 'kanban'

export default function TodoBoard() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [view, setView] = useState<ViewMode>('list')
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: '',
  })
  const [mounted, setMounted] = useState(false)
  const [showExtractor, setShowExtractor] = useState(false)

  const refresh = useCallback(async () => {
    const data = await loadTodos()
    setTodos(data)
  }, [])

  useEffect(() => {
    refresh().then(() => setMounted(true))
  }, [refresh])

  if (!mounted) {
    return <div className="animate-pulse space-y-4">
      <div className="h-14 bg-gray-100 rounded-2xl" />
      <div className="h-10 bg-gray-50 rounded-xl" />
      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}</div>
    </div>
  }

  const stats = getStats(todos)
  const filtered = sortTodos(filterTodos(todos, filters))

  const handleAdd = async (data: { title: string; priority: TodoPriority; category: string }) => {
    await addTodo(data)
    await refresh()
  }

  const handleUpdate = async (id: string, changes: Partial<Todo>) => {
    await updateTodo(id, changes)
    await refresh()
  }

  const handleDelete = async (id: string) => {
    await deleteTodo(id)
    await refresh()
  }

  const handleExtracted = async (items: { title: string; priority: TodoPriority; category: string }[]) => {
    for (const item of items) {
      await addTodo(item)
    }
    await refresh()
    setShowExtractor(false)
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="待处理" value={stats.todo + stats.backlog} color="text-blue-600 bg-blue-50" />
        <StatCard label="进行中" value={stats.inProgress} color="text-amber-600 bg-amber-50" />
        <StatCard label="已完成" value={stats.done} color="text-emerald-600 bg-emerald-50" />
        <StatCard label="总计" value={stats.total} color="text-gray-600 bg-gray-50" />
      </div>

      {/* Input + Extract Button */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <TodoInput onAdd={handleAdd} />
        </div>
        <button
          onClick={() => setShowExtractor(!showExtractor)}
          className={`mt-0.5 px-4 py-[11px] text-sm font-medium rounded-2xl border transition-all flex items-center gap-2 ${
            showExtractor
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-white text-gray-500 border-gray-100 hover:border-violet-200 hover:text-violet-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          从文章提炼
        </button>
      </div>

      {/* Extractor Panel */}
      {showExtractor && (
        <TodoExtractor
          onExtracted={handleExtracted}
          onClose={() => setShowExtractor(false)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <TodoFilters filters={filters} onChange={setFilters} />
        <div className="flex gap-1 p-1 bg-gray-50 rounded-xl flex-shrink-0">
          <ViewButton active={view === 'list'} onClick={() => setView('list')} title="列表视图">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ViewButton>
          <ViewButton active={view === 'kanban'} onClick={() => setView('kanban')} title="看板视图">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </ViewButton>
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-sm">
                {todos.length === 0 ? '还没有任务，添加一个吧' : '没有匹配的任务'}
              </p>
            </div>
          )}
          {filtered.map(todo => (
            <TodoItem key={todo.id} todo={todo} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <TodoKanban todos={filtered} onUpdate={handleUpdate} />
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-xl px-4 py-3`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-60 mt-0.5">{label}</div>
    </div>
  )
}

function ViewButton({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${
        active ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {children}
    </button>
  )
}
