import { loadLatestReport, listHistoryDates } from '@/lib/market'
import MarketPageClient from './MarketPageClient'

export const metadata = {
  title: '行情 · 全球行业趋势',
  description: 'A股和美股各行业每日涨跌趋势一览',
}

export const dynamic = 'force-dynamic'

export default function MarketPage() {
  const report = loadLatestReport()
  const history = listHistoryDates().slice(0, 30)

  return <MarketPageClient initialReport={report} historyDates={history} />
}
