import TodoBoard from '@/components/TodoBoard'

export const metadata = {
  title: '待办事项 - Java → 全栈+AI',
  description: '个人任务管理面板',
}

export default function TodosPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">待办事项</h1>
        <p className="text-sm text-gray-400 mt-1">管理你的任务和计划</p>
      </div>
      <TodoBoard />
    </div>
  )
}
