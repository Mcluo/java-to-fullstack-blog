import { supabase } from './supabase'

export type TodoStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type TodoPriority = 1 | 2 | 3 | 4

export interface Todo {
  id: string
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  category: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export const CATEGORIES = ['工作', '学习', '博客', '生活', '工具'] as const

export const STATUS_CONFIG: Record<TodoStatus, { label: string; color: string }> = {
  backlog: { label: '待定', color: 'text-gray-500 bg-gray-50 ring-gray-200' },
  todo: { label: '待处理', color: 'text-blue-600 bg-blue-50 ring-blue-200' },
  in_progress: { label: '进行中', color: 'text-amber-600 bg-amber-50 ring-amber-200' },
  done: { label: '已完成', color: 'text-emerald-600 bg-emerald-50 ring-emerald-200' },
}

export const PRIORITY_CONFIG: Record<TodoPriority, { label: string; color: string; dot: string }> = {
  1: { label: 'P1 紧急', color: 'text-rose-600', dot: 'bg-rose-500' },
  2: { label: 'P2 高', color: 'text-orange-500', dot: 'bg-orange-400' },
  3: { label: 'P3 中', color: 'text-blue-500', dot: 'bg-blue-400' },
  4: { label: 'P4 低', color: 'text-gray-400', dot: 'bg-gray-300' },
}

export const CATEGORY_CONFIG: Record<string, { color: string }> = {
  '工作': { color: 'text-indigo-600 bg-indigo-50 ring-indigo-200' },
  '学习': { color: 'text-violet-600 bg-violet-50 ring-violet-200' },
  '博客': { color: 'text-cyan-600 bg-cyan-50 ring-cyan-200' },
  '生活': { color: 'text-emerald-600 bg-emerald-50 ring-emerald-200' },
  '工具': { color: 'text-teal-600 bg-teal-50 ring-teal-200' },
}

const STORAGE_KEY = 'blog_todos'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// --- snake_case <-> camelCase 转换 ---

interface TodoRow {
  id: string
  title: string
  description: string | null
  status: TodoStatus
  priority: number
  category: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    priority: row.priority as TodoPriority,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
  }
}

function todoToRow(todo: Todo): TodoRow {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description || null,
    status: todo.status,
    priority: todo.priority,
    category: todo.category,
    created_at: todo.createdAt,
    updated_at: todo.updatedAt,
    completed_at: todo.completedAt || null,
  }
}

// --- localStorage fallback ---

function loadFromLocalStorage(): Todo[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveToLocalStorage(todos: Todo[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

// --- Supabase CRUD（带 localStorage fallback）---

export async function loadTodos(): Promise<Todo[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        const todos = (data as TodoRow[]).map(rowToTodo)
        saveToLocalStorage(todos)
        return todos
      }
    } catch {}
  }
  return loadFromLocalStorage()
}

export async function addTodo(
  data: { title: string; priority?: TodoPriority; category?: string; status?: TodoStatus; description?: string }
): Promise<Todo> {
  const now = new Date().toISOString()
  const todo: Todo = {
    id: generateId(),
    title: data.title,
    description: data.description,
    status: data.status || 'todo',
    priority: data.priority || 3,
    category: data.category || '工作',
    createdAt: now,
    updatedAt: now,
  }

  if (supabase) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const { error } = await supabase.from('todos').insert(todoToRow(todo)).abortSignal(controller.signal)
      clearTimeout(timeout)
      if (!error) return todo
    } catch {}
  }

  // fallback: localStorage
  const existing = loadFromLocalStorage()
  saveToLocalStorage([todo, ...existing])
  return todo
}

export async function updateTodo(
  id: string,
  changes: Partial<Todo>
): Promise<void> {
  const now = new Date().toISOString()
  const rowChanges: Record<string, unknown> = { updated_at: now }

  if (changes.title !== undefined) rowChanges.title = changes.title
  if (changes.description !== undefined) rowChanges.description = changes.description || null
  if (changes.status !== undefined) rowChanges.status = changes.status
  if (changes.priority !== undefined) rowChanges.priority = changes.priority
  if (changes.category !== undefined) rowChanges.category = changes.category

  if (changes.status === 'done') {
    rowChanges.completed_at = now
  } else if (changes.status) {
    rowChanges.completed_at = null
  }

  if (supabase) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const { error } = await supabase.from('todos').update(rowChanges).eq('id', id).abortSignal(controller.signal)
      clearTimeout(timeout)
      if (!error) return
    } catch {}
  }

  // fallback: localStorage
  const existing = loadFromLocalStorage()
  const updated = existing.map(t => {
    if (t.id !== id) return t
    const merged = { ...t, ...changes, updatedAt: now }
    if (changes.status === 'done' && t.status !== 'done') merged.completedAt = now
    if (changes.status && changes.status !== 'done') merged.completedAt = undefined
    return merged
  })
  saveToLocalStorage(updated)
}

export async function deleteTodo(id: string): Promise<void> {
  if (supabase) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const { error } = await supabase.from('todos').delete().eq('id', id).abortSignal(controller.signal)
      clearTimeout(timeout)
      if (!error) return
    } catch {}
  }

  // fallback: localStorage
  const existing = loadFromLocalStorage()
  saveToLocalStorage(existing.filter(t => t.id !== id))
}

// --- 纯函数（不变）---

export function filterTodos(todos: Todo[], filters: { status?: TodoStatus | 'all'; priority?: TodoPriority | 'all'; category?: string | 'all'; search?: string }): Todo[] {
  return todos.filter(t => {
    if (filters.status && filters.status !== 'all' && t.status !== filters.status) return false
    if (filters.priority && filters.priority !== 'all' && t.priority !== filters.priority) return false
    if (filters.category && filters.category !== 'all' && t.category !== filters.category) return false
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function getStats(todos: Todo[]) {
  return {
    total: todos.length,
    backlog: todos.filter(t => t.status === 'backlog').length,
    todo: todos.filter(t => t.status === 'todo').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    done: todos.filter(t => t.status === 'done').length,
  }
}
