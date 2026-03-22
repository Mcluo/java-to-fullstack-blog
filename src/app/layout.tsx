import type { Metadata } from 'next'
import './globals.css'
import AIAssistant from '@/components/AIAssistant'

export const metadata: Metadata = {
  title: 'Java 工程师全栈+AI 转型博客',
  description: '帮助 Java 工程师转型为全栈开发工程师和 AI 工程师',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">
                  Java → 全栈+AI
                </h1>
              </div>
              <div className="flex space-x-8">
                <a href="/" className="text-gray-700 hover:text-blue-600">首页</a>
                <a href="/articles" className="text-gray-700 hover:text-blue-600">教程</a>
                <a href="/roadmap" className="text-gray-700 hover:text-blue-600">学习路径</a>
              </div>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              © 2026 Java 工程师全栈+AI 转型博客
            </p>
          </div>
        </footer>
        <AIAssistant />
      </body>
    </html>
  )
}
