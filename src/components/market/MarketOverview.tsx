'use client'

interface MarketSnapshot {
  market: string
  index_name: string
  index_value?: number
  index_change_pct?: number
  up_count: number
  down_count: number
  timestamp?: string
}

function getTimeDelta(timestamp?: string): string {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

export default function MarketOverview({ data }: { data: MarketSnapshot }) {
  const isUp = (data.index_change_pct ?? 0) >= 0
  const total = data.up_count + data.down_count
  const upRatio = total > 0 ? (data.up_count / total) * 100 : 50
  const flag = data.market === 'A股' ? '🇨🇳' : '🇺🇸'
  const timeDelta = getTimeDelta(data.timestamp)

  // A股惯例: 红涨绿跌; 美股: 绿涨红跌
  const isCN = data.market === 'A股'
  const upColor = isCN ? 'text-red-500' : 'text-green-600'
  const downColor = isCN ? 'text-green-600' : 'text-red-500'
  const changeColor = isUp ? upColor : downColor
  const upBarColor = isCN ? 'bg-red-400' : 'bg-green-500'
  const downBarColor = isCN ? 'bg-green-500' : 'bg-red-400'

  return (
    <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: Market label + freshness */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{flag}</span>
          <span className="text-sm font-semibold text-gray-700">{data.index_name}</span>
        </div>
        {timeDelta && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {timeDelta}更新
          </span>
        )}
      </div>

      {/* Core metric: Index value + change */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-bold tracking-tight text-gray-900">
          {data.index_value?.toLocaleString('en-US', { maximumFractionDigits: 2 }) ?? '—'}
        </span>
        {data.index_change_pct != null && (
          <div className={`flex items-center gap-1 ${changeColor}`}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              {isUp
                ? <path d="M8 4l5 8H3z" />
                : <path d="M8 12l5-8H3z" />
              }
            </svg>
            <span className="text-lg font-bold">
              {Math.abs(data.index_change_pct).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Advance/Decline bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className={`font-semibold ${upColor}`}>
            {data.up_count} 上涨
          </span>
          <span className={`font-semibold ${downColor}`}>
            {data.down_count} 下跌
          </span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
          <div
            className={`${upBarColor} transition-all duration-500`}
            style={{ width: `${upRatio}%` }}
          />
          <div
            className={`${downBarColor} transition-all duration-500`}
            style={{ width: `${100 - upRatio}%` }}
          />
        </div>
        <div className="text-center">
          <span className="text-xs text-gray-400">
            涨跌比 {data.up_count}:{data.down_count}
          </span>
        </div>
      </div>
    </div>
  )
}
