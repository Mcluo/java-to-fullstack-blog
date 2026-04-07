import Link from 'next/link'
import { getFeedDigests } from '@/lib/feeds'
import { getCategoryName, CATEGORY_CONFIG } from '@/lib/articles'
import FeedConfigManager from '@/components/FeedConfigManager'

export const metadata = {
  title: '订阅日报 - Java 工程师全栈+AI 转型博客',
  description: '每日从 RSS 订阅源自动拉取并智能摘要的技术资讯',
}

function DigestList() {
  const digests = getFeedDigests()

  if (digests.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-4">📰</div>
        <p className="text-base">还没有日报</p>
        <p className="text-sm mt-2">配置订阅源后运行 <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">bun run fetch:feeds</code> 生成日报</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {digests.map(digest => (
        <Link
          key={digest.slug}
          href={`/articles/feeds/${digest.slug}`}
          className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {digest.title}
              </h3>
              {digest.excerpt && (
                <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{digest.excerpt}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                {digest.publishedAt && (
                  <span className="text-xs text-gray-400">{digest.publishedAt}</span>
                )}
                {digest.readTime && (
                  <span className="text-xs text-gray-400">{digest.readTime} 分钟</span>
                )}
                {digest.tags && digest.tags.length > 0 && (
                  <div className="flex gap-1">
                    {digest.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-rose-50 text-rose-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function FeedsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-lg shadow-sm">
            📡
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">订阅日报</h1>
            <p className="text-sm text-gray-500">RSS 订阅源的每日智能摘要</p>
          </div>
        </div>
      </div>

      {/* Two sections */}
      <div className="space-y-8">
        {/* Digest list */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">历史日报</h2>
          <p className="text-sm text-gray-400 mb-5">每日自动生成的技术资讯摘要</p>
          <DigestList />
        </section>

        {/* Feed config manager */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">管理订阅源</h2>
          <p className="text-sm text-gray-400 mb-5">添加、编辑或删除 RSS 订阅源</p>
          <FeedConfigManager />
        </section>
      </div>
    </main>
  )
}
