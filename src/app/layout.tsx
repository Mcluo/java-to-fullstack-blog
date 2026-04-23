import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import AIAssistant from '@/components/AIAssistant'
import AuthProvider from '@/components/AuthProvider'
import SettingsProvider from '@/components/SettingsProvider'
import LoginButton from '@/components/LoginButton'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen text-gray-900">
        <AuthProvider>
        <SettingsProvider>
        {/* Navigation */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-200/60">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-200 group-hover:shadow-md group-hover:shadow-blue-200 transition-shadow">
                  J
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Java → 全栈+AI
                </span>
              </Link>
              <div className="flex items-center gap-1">
                <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition">
                  首页
                </Link>
                <Link href="/articles" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition">
                  教程
                </Link>
                <Link href="/roadmap" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition">
                  学习路径
                </Link>
                <Link href="/todos" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition">
                  待办
                </Link>
                <Link href="/feeds" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition">
                  订阅
                </Link>
                <Link href="/github" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition">
                  GitHub
                </Link>
                <Link href="/settings" className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100/80 transition" title="设置">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <LoginButton />
              </div>
            </div>
          </nav>
        </header>

        <main className="min-h-[calc(100vh-8rem)]">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200/60 bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-[10px]">
                  J
                </div>
                <span className="text-sm font-semibold text-gray-700">Java → 全栈+AI</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <Link href="/articles" className="hover:text-gray-700 transition">教程</Link>
                <Link href="/roadmap" className="hover:text-gray-700 transition">学习路径</Link>
                <Link href="/todos" className="hover:text-gray-700 transition">待办</Link>
                <a href="https://github.com/Mcluo/java-to-fullstack-blog" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition">
                  GitHub
                </a>
              </div>
              <p className="text-xs text-gray-400">
                © 2026 · Powered by Next.js + Claude
              </p>
            </div>
          </div>
        </footer>

        <AIAssistant />
        </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
