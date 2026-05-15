'use client'

import { useState, useMemo } from 'react'

interface Sector {
  name: string
  change_pct: number
  volume?: number
  leading_stock?: string
  net_inflow?: number
  trend_5d?: number[]
}

type SortKey = 'name' | 'change_pct' | 'volume' | 'net_inflow'
type FilterMode = 'all' | 'up' | 'down'

// 迷你折线图 SVG
function MiniSparkline({ data, isCN }: { data: number[], isCN: boolean }) {
  if (!data.length) return <span className="text-gray-300">—</span>

  const h = 20, w = 48
  const max = Math.max(...data.map(Math.abs), 0.01)
  const mid = h / 2
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w
    const y = mid - (v / max) * (mid - 2)
    return `${x},${y}`
  })

  const lastVal = data[data.length - 1]
  const lineColor = lastVal > 0
    ? (isCN ? '#ef4444' : '#22c55e')
    : lastVal < 0
      ? (isCN ? '#22c55e' : '#ef4444')
      : '#9ca3af'

  return (
    <svg width={w} height={h} className="inline-block">
      {/* 零线 */}
      <line x1="0" y1={mid} x2={w} y2={mid} stroke="#e5e7eb" strokeWidth="0.5" />
      {/* 折线 */}
      <polyline
        fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        points={points.join(' ')}
      />
      {/* 终点圆点 */}
      {points.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1].split(',')[0])}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r="2" fill={lineColor}
        />
      )}
    </svg>
  )
}

// 涨跌幅柱状条
function ChangeBar({ pct, maxAbs, isCN }: { pct: number, maxAbs: number, isCN: boolean }) {
  const width = maxAbs > 0 ? Math.min(Math.abs(pct) / maxAbs * 100, 100) : 0
  const isUp = pct > 0
  const barColor = isUp
    ? (isCN ? 'bg-red-400/30' : 'bg-green-400/30')
    : (isCN ? 'bg-green-400/30' : 'bg-red-400/30')
  const textColor = isUp
    ? (isCN ? 'text-red-600' : 'text-green-600')
    : pct < 0
      ? (isCN ? 'text-green-600' : 'text-red-500')
      : 'text-gray-400'

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
        {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
      </span>
      <div className="w-16 h-3 bg-gray-50 rounded-sm overflow-hidden relative">
        <div
          className={`absolute top-0 h-full rounded-sm transition-all ${barColor} ${isUp ? 'left-0' : 'right-0'}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function formatVolume(v: number | undefined, unit: string): string {
  if (v == null) return '—'
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return v.toFixed(1) + unit
}

export default function SectorTable({
  sectors,
  market,
}: {
  sectors: Sector[]
  market: 'A股' | 'US'
}) {
  const [sortBy, setSortBy] = useState<SortKey>('change_pct')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<FilterMode>('all')

  const isCN = market === 'A股'
  const maxAbs = useMemo(() => Math.max(...(sectors || []).map(s => Math.abs(s.change_pct)), 0.01), [sectors])

  const filtered = useMemo(() => {
    if (!sectors) return []
    let list = [...sectors]
    if (filter === 'up') list = list.filter(s => s.change_pct > 0)
    if (filter === 'down') list = list.filter(s => s.change_pct < 0)
    return list.sort((a, b) => {
      const va = (a[sortBy] as number) ?? (sortAsc ? Infinity : -Infinity)
      const vb = (b[sortBy] as number) ?? (sortAsc ? Infinity : -Infinity)
      if (sortBy === 'name') return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
      return sortAsc ? va - vb : vb - va
    })
  }, [sectors, sortBy, sortAsc, filter])

  if (!sectors?.length) return null

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <span className="ml-1 text-gray-300 text-[10px]">⇅</span>
    return <span className="ml-1 text-blue-500 text-[10px]">{sortAsc ? '▲' : '▼'}</span>
  }

  const upCount = sectors.filter(s => s.change_pct > 0).length
  const downCount = sectors.filter(s => s.change_pct < 0).length

  return (
    <div>
      {/* Filter controls */}
      <div className="flex items-center gap-2 mb-3">
        {[
          { key: 'all' as FilterMode, label: `全部 (${sectors.length})` },
          { key: 'up' as FilterMode, label: `上涨 (${upCount})`, color: isCN ? 'text-red-500' : 'text-green-600' },
          { key: 'down' as FilterMode, label: `下跌 (${downCount})`, color: isCN ? 'text-green-600' : 'text-red-500' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              filter === f.key
                ? 'bg-gray-900 text-white border-gray-900'
                : `bg-white border-gray-200 text-gray-500 hover:border-gray-400 ${f.color ?? ''}`
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 sticky top-0">
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left py-2.5 px-3 font-semibold w-8">#</th>
              <th className="text-left py-2.5 px-3 font-semibold cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('name')}>
                行业<SortIcon col="name" />
              </th>
              <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('change_pct')}>
                涨跌幅<SortIcon col="change_pct" />
              </th>
              <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('volume')}>
                {isCN ? '成交额' : '成交量'}<SortIcon col="volume" />
              </th>
              {isCN ? (
                <>
                  <th className="text-left py-2.5 px-3 font-semibold">领涨股</th>
                  <th className="text-right py-2.5 px-3 font-semibold cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort('net_inflow')}>
                    主力净流入<SortIcon col="net_inflow" />
                  </th>
                </>
              ) : (
                <th className="text-center py-2.5 px-3 font-semibold">5日走势</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s, i) => (
              <tr key={s.name} className="hover:bg-blue-50/40 transition group">
                <td className="py-2.5 px-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                <td className="py-2.5 px-3">
                  <span className="font-medium text-gray-800 group-hover:text-blue-700 transition">{s.name}</span>
                </td>
                <td className="py-2.5 px-3">
                  <ChangeBar pct={s.change_pct} maxAbs={maxAbs} isCN={isCN} />
                </td>
                <td className="py-2.5 px-3 text-right text-gray-600 tabular-nums text-xs">
                  {formatVolume(s.volume, isCN ? '亿' : 'M')}
                </td>
                {isCN ? (
                  <>
                    <td className="py-2.5 px-3 text-gray-600 text-xs">{s.leading_stock ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-xs">
                      {s.net_inflow != null ? (
                        <span className={`font-medium ${s.net_inflow > 0 ? 'text-red-500' : s.net_inflow < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {s.net_inflow > 0 ? '+' : ''}{s.net_inflow.toFixed(2)}亿
                        </span>
                      ) : '—'}
                    </td>
                  </>
                ) : (
                  <td className="py-2.5 px-3 text-center">
                    <MiniSparkline data={s.trend_5d ?? []} isCN={false} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-6 text-gray-400 text-sm">
          暂无{filter === 'up' ? '上涨' : '下跌'}行业
        </div>
      )}
    </div>
  )
}
