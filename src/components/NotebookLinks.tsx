interface NotebookLinksProps {
  notebookPath: string
  repoUrl?: string
  title?: string
}

export default function NotebookLinks({
  notebookPath,
  repoUrl = 'https://github.com/mcluo/java-to-fullstack-blog',
  title = '在云端运行代码'
}: NotebookLinksProps) {
  // 构建完整的 notebook URL
  const githubUrl = `${repoUrl}/blob/main/public/notebooks/${notebookPath}`
  const colabUrl = `https://colab.research.google.com/github/${repoUrl.replace('https://github.com/', '')}/blob/main/public/notebooks/${notebookPath}`
  const binderUrl = `https://mybinder.org/v2/gh/${repoUrl.replace('https://github.com/', '')}/main?filepath=public/notebooks/${notebookPath}`

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            🚀 {title}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            在浏览器中直接运行 Python 代码，无需安装任何软件！
          </p>

          <div className="flex flex-wrap gap-3">
            {/* Google Colab */}
            <a
              href={colabUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.49 10 10-4.49 10-10 10z"/>
                <circle cx="8" cy="12" r="2.5"/>
                <circle cx="16" cy="12" r="2.5"/>
              </svg>
              Google Colab
            </a>

            {/* Binder */}
            <a
              href={binderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-medium transition shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5 13h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
              Binder
            </a>

            {/* GitHub */}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              查看源码
            </a>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 <strong>提示</strong>: Google Colab 最快（需要 Google 账号），Binder 无需登录但启动较慢（~2分钟）
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
