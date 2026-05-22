'use client'

import { useState } from 'react'
import MarketOverview from '@/components/market/MarketOverview'
import IndustryHeatmap from '@/components/market/IndustryHeatmap'
import SectorTable from '@/components/market/SectorTable'

interface DailyReport {
  date: string
  timestamp: string
  a_stock: any
  us_stock: any
}

// 骨架屏组件
function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="p-5 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-24 h-4" />
            </div>
            <Skeleton className="w-40 h-9 mb-4" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="w-16 h-3" />
                <Skeleton className="w-16 h-3" />
              </div>
              <Skeleton className="w-full h-2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      {/* Heatmap skeleton */}
      <div>
        <Skeleton className="w-48 h-6 mb-3" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" style={{ flexBasis: `calc(${8 + Math.random() * 8}% - 6px)`, flexGrow: 1, minWidth: 80 }} />
          ))}
        </div>
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <Skeleton className="w-32 h-6 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <Skeleton className="w-6 h-4" />
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-24 h-4 ml-auto" />
            <Skeleton className="w-16 h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

// 市场情绪指标
function SentimentBar({ aStock, usStock }: { aStock: any; usStock: any }) {
  const items: { label: string; upCount: number; downCount: number; isCN: boolean }[] = []
  if (aStock) items.push({ label: 'A股', upCount: aStock.up_count, downCount: aStock.down_count, isCN: true })
  if (usStock) items.push({ label: '美股', upCount: usStock.up_count, downCount: usStock.down_count, isCN: false })

  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-6 px-4 py-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs text-gray-500">
      <span className="font-medium text-gray-700">市场情绪</span>
      <div className="w-px h-4 bg-gray-200" />
      {items.map(item => {
        const total = item.upCount + item.downCount
        const ratio = total > 0 ? item.upCount / total : 0.5
        let sentiment: string
        let sentimentColor: string
        if (ratio > 0.65) { sentiment = '强势'; sentimentColor = item.isCN ? 'text-red-500' : 'text-green-600' }
        else if (ratio > 0.5) { sentiment = '偏多'; sentimentColor = item.isCN ? 'text-red-400' : 'text-green-500' }
        else if (ratio > 0.35) { sentiment = '偏空'; sentimentColor = item.isCN ? 'text-green-500' : 'text-red-400' }
        else { sentiment = '弱势'; sentimentColor = item.isCN ? 'text-green-600' : 'text-red-500' }

        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <span>{item.label}</span>
            <span className={`font-semibold ${sentimentColor}`}>{sentiment}</span>
            <span className="text-gray-300">({item.upCount}/{item.downCount})</span>
          </div>
        )
      })}
    </div>
  )
}

// 数据新鲜度标签
function FreshnessTag({ timestamp }: { timestamp?: string }) {
  if (!timestamp) return null
  const diff = Date.now() - new Date(timestamp).getTime()
  const hours = diff / 3600000

  let label: string
  let color: string
  if (hours < 1) { label = '实时'; color = 'bg-green-100 text-green-700 border-green-200' }
  else if (hours < 6) { label = '较新'; color = 'bg-blue-50 text-blue-600 border-blue-200' }
  else if (hours < 24) { label = '今日'; color = 'bg-gray-100 text-gray-600 border-gray-200' }
  else { label = '过期'; color = 'bg-amber-50 text-amber-600 border-amber-200' }

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  )
}

export default function MarketPageClient({
  initialReport,
  historyDates,
}: {
  initialReport: DailyReport | null
  historyDates: string[]
}) {
  const [report, setReport] = useState<DailyReport | null>(initialReport)
  const [tab, setTab] = useState<'a' | 'us'>('a')
  const [loading, setLoading] = useState(false)

  const loadHistory = async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/market?date=${date}`)
      if (res.ok) {
        setReport(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">全球行业趋势</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">暂无市场数据。请先运行数据采集脚本生成行情快照。</p>
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <code className="text-sm text-gray-600">cd ~/projects/market-monitor && ./run_daily.sh</code>
        </div>
      </div>
    )
  }

  const a = report.a_stock
  const u = report.us_stock

  // 统计信息
  const aSectorCount = a?.sectors?.length ?? 0
  const uSectorCount = u?.sectors?.length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">全球行业趋势</h1>
            <FreshnessTag timestamp={report.timestamp} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {report.date} · {aSectorCount > 0 && `A股 ${aSectorCount} 行业`}{aSectorCount > 0 && uSectorCount > 0 && ' · '}{uSectorCount > 0 && `美股 ${uSectorCount} 行业`}
          </p>
        </div>
        {historyDates.length > 0 && (
          <select
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 w-fit"
            value={report.date}
            onChange={(e) => loadHistory(e.target.value)}
            disabled={loading}
          >
            {historyDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* Sentiment Bar */}
      <div className="mb-6">
        <SentimentBar aStock={a} usStock={u} />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {a && <MarketOverview data={a} />}
        {u && <MarketOverview data={u} />}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('a')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              tab === 'a' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            A股行业
          </button>
          <button
            onClick={() => setTab('us')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              tab === 'us' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            美股行业
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {tab === 'a' && a && (
            <div className="space-y-8">
              <IndustryHeatmap sectors={a.sectors} title="A股行业板块热力图" isCN={true} />
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">行业涨跌排行</h3>
                <SectorTable sectors={a.sectors} market="A股" />
              </div>
            </div>
          )}

          {tab === 'us' && u && (
            <div className="space-y-8">
              <IndustryHeatmap sectors={u.sectors} title="美股 GICS 行业热力图" isCN={false} />
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">行业涨跌排行</h3>
                <SectorTable sectors={u.sectors} market="US" />
              </div>
            </div>
          )}

          {tab === 'a' && !a && (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                🇨🇳
              </div>
              <p className="text-gray-500 font-medium">A股数据未采集</p>
              <p className="text-gray-400 text-sm mt-1">请运行 A 股数据采集脚本</p>
            </div>
          )}
          {tab === 'us' && !u && (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                🇺🇸
              </div>
              <p className="text-gray-500 font-medium">美股数据未采集</p>
              <p className="text-gray-400 text-sm mt-1">请运行美股数据采集脚本</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
