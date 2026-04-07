'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">出了点问题</h2>
      <p className="text-gray-500 mb-6 text-center max-w-md">
        {error.message || '页面加载时发生错误，请稍后再试。'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition"
      >
        重试
      </button>
    </div>
  )
}
