import FeedConfigManager from '@/components/FeedConfigManager'
import FeedItemList from '@/components/FeedItemList'
import FeedFavorites from '@/components/FeedFavorites'
import QuickSummarize from '@/components/QuickSummarize'
import Link from 'next/link'

export const metadata = {
  title: '订阅中心 - Java 工程师全栈+AI 转型博客',
  description: '视频/网页 AI 总结 + 订阅源管理',
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
            <h1 className="text-2xl font-bold text-gray-900">订阅中心</h1>
            <p className="text-sm text-gray-500">B站 / YouTube / RSS 订阅管理 + AI 总结</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {/* HN AI Daily */}
        <Link href="/feeds/hn-daily" className="block group">
          <section className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-6 transition hover:shadow-sm hover:border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  HN
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Hacker News AI 日报</h2>
                  <p className="text-sm text-gray-500">每日自动聚合 HN 社区 AI 热门讨论</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </section>
        </Link>

        {/* Quick summarize */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">快速总结</h2>
          <p className="text-sm text-gray-400 mb-5">粘贴任意视频/网页链接，一键生成 AI 总结</p>
          <QuickSummarize />
        </section>

        {/* Favorites */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">&#11088;</span>
            <h2 className="text-base font-semibold text-gray-900">我的收藏</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">收藏的视频和总结，方便随时查阅</p>
          <FeedFavorites />
        </section>

        {/* Latest content */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">订阅内容</h2>
          <p className="text-sm text-gray-400 mb-5">从订阅源爬取的最新视频和文章</p>
          <FeedItemList />
        </section>

        {/* Feed config manager */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">管理订阅源</h2>
          <p className="text-sm text-gray-400 mb-5">添加、编辑或删除订阅源 (RSS / B站 / YouTube)</p>
          <FeedConfigManager />
        </section>
      </div>
    </main>
  )
}
