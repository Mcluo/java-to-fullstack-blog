'use client'

import { useState } from 'react'

interface Sector {
  name: string
  change_pct: number
  volume?: number
  leading_stock?: string
  net_inflow?: number
}

// 连续色阶: 深红 → 浅红 → 灰 → 浅绿 → 深绿
function getHeatColor(pct: number): { bg: string; text: string } {
  if (pct >= 5) return { bg: 'rgb(22, 163, 74)', text: 'white' }       // green-600
  if (pct >= 3) return { bg: 'rgb(34, 197, 94)', text: 'white' }       // green-500
  if (pct >= 1.5) return { bg: 'rgb(74, 222, 128)', text: '#14532d' }  // green-400
  if (pct >= 0.5) return { bg: 'rgb(187, 247, 208)', text: '#14532d' } // green-200
  if (pct > 0) return { bg: 'rgb(220, 252, 231)', text: '#166534' }    // green-100
  if (pct === 0) return { bg: 'rgb(243, 244, 246)', text: '#6b7280' }  // gray-100
  if (pct > -0.5) return { bg: 'rgb(254, 226, 226)', text: '#991b1b' } // red-100
  if (pct > -1.5) return { bg: 'rgb(254, 202, 202)', text: '#991b1b' } // red-200
  if (pct > -3) return { bg: 'rgb(248, 113, 113)', text: 'white' }     // red-400
  if (pct > -5) return { bg: 'rgb(239, 68, 68)', text: 'white' }       // red-500
  return { bg: 'rgb(185, 28, 28)', text: 'white' }                     // red-700
}

// 按成交额加权计算瓦片大小 (最小占比 3%, 最大 15%)
function calcTileWeights(sectors: Sector[]): number[] {
  const vols = sectors.map(s => Math.max(s.volume ?? 1, 0.1))
  const total = vols.reduce((a, b) => a + b, 0)
  return vols.map(v => Math.max(3, Math.min(15, (v / total) * 100)))
}

export default function IndustryHeatmap({
  sectors,
  title,
  isCN = true,
}: {
  sectors: Sector[]
  title: string
  isCN?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (!sectors?.length) {
    return <div className="text-gray-400 text-center py-8">暂无数据</div>
  }

  const weights = calcTileWeights(sectors)

  return (
    <div>
      {/* Header + Legend */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>跌</span>
          <div className="flex h-2.5 rounded-sm overflow-hidden">
            {['rgb(185,28,28)', 'rgb(239,68,68)', 'rgb(248,113,113)', 'rgb(254,202,202)', 'rgb(243,244,246)', 'rgb(187,247,208)', 'rgb(74,222,128)', 'rgb(34,197,94)', 'rgb(22,163,74)']
              .map((c, i) => <div key={i} className="w-4 h-full" style={{ background: c }} />)}
          </div>
          <span>涨</span>
        </div>
      </div>

      {/* Heatmap Grid - flex-wrap 按成交额加权大小 */}
      <div className="flex flex-wrap gap-1.5 relative">
        {sectors.map((s, i) => {
          const color = getHeatColor(isCN ? -s.change_pct : s.change_pct) // A股红涨绿跌反转显示
          const displayColor = isCN
            ? getHeatColor(-s.change_pct) // A股: 涨显示红色
            : getHeatColor(s.change_pct)  // 美股: 涨显示绿色
          const isHov = hovered === i

          return (
            <div
              key={s.name}
              className="relative rounded-lg cursor-pointer transition-all duration-200"
              style={{
                background: displayColor.bg,
                color: displayColor.text,
                flexBasis: `calc(${weights[i]}% - 6px)`,
                minWidth: '80px',
                flexGrow: 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="p-2.5 text-center">
                <div className="text-xs font-medium truncate">{s.name}</div>
                <div className="text-sm font-bold mt-0.5">
                  {s.change_pct > 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                </div>
              </div>

              {/* Hover Detail Card */}
              {isHov && (
                <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 p-3 text-gray-700 text-xs pointer-events-none">
                  <div className="font-semibold text-sm text-gray-900 mb-2">{s.name}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">涨跌幅</span>
                      <span className={`font-bold ${s.change_pct > 0 ? (isCN ? 'text-red-500' : 'text-green-600') : (isCN ? 'text-green-600' : 'text-red-500')}`}>
                        {s.change_pct > 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                      </span>
                    </div>
                    {s.volume != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">成交额</span>
                        <span>{s.volume.toLocaleString()}亿</span>
                      </div>
                    )}
                    {s.leading_stock && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">领涨股</span>
                        <span className="font-medium">{s.leading_stock}</span>
                      </div>
                    )}
                    {s.net_inflow != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">主力净流入</span>
                        <span className={s.net_inflow > 0 ? (isCN ? 'text-red-500' : 'text-green-600') : (isCN ? 'text-green-600' : 'text-red-500')}>
                          {s.net_inflow > 0 ? '+' : ''}{s.net_inflow.toFixed(2)}亿
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 统计摘要 */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
        <span>共 {sectors.length} 个行业</span>
        <span>瓦片大小 ∝ 成交额</span>
      </div>
    </div>
  )
}
