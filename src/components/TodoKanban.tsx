'use client'

import { type Todo, type TodoStatus, STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from '@/lib/todos'

interface TodoKanbanProps {
  todos: Todo[]
  onUpdate: (id: string, changes: Partial<Todo>) => void
}

const COLUMNS: TodoStatus[] = ['backlog', 'todo', 'in_progress', 'done']

export default function TodoKanban({ todos, onUpdate }: TodoKanbanProps) {
  const columns = COLUMNS.map(status => ({
    status,
    config: STATUS_CONFIG[status],
    items: todos.filter(t => t.status === status),
  }))

  const nextStatus: Record<TodoStatus, TodoStatus> = {
    backlog: 'todo',
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(col => (
        <div key={col.status} className="bg-gray-50/80 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ${col.config.color}`}>
                {col.config.label}
              </span>
              <span className="text-xs text-gray-400">{col.items.length}</span>
            </div>
          </div>

          <div className="space-y-2 min-h-[100px]">
            {col.items.length === 0 && (
              <div className="flex items-center justify-center h-[100px] text-xs text-gray-300">
                暂无任务
              </div>
            )}
            {col.items.map(todo => {
              const priorityCfg = PRIORITY_CONFIG[todo.priority]
              const categoryCfg = CATEGORY_CONFIG[todo.category] || { color: 'text-gray-500 bg-gray-50 ring-gray-200' }
              return (
                <button
                  key={todo.id}
                  onClick={() => onUpdate(todo.id, { status: nextStatus[todo.status] })}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:shadow-sm transition-all group"
                  title={`点击移至 → ${STATUS_CONFIG[nextStatus[todo.status]].label}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${priorityCfg.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-sm leading-snug ${col.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ring-1 ${categoryCfg.color}`}>
                          {todo.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-300 mt-1 opacity-0 group-hover:opacity-100 transition text-right">
                    点击 → {STATUS_CONFIG[nextStatus[todo.status]].label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
