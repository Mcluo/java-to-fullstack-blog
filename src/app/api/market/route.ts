import { NextRequest, NextResponse } from 'next/server'
import { loadLatestReport, listHistoryDates, loadHistoryReport } from '@/lib/market'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (date) {
    const report = loadHistoryReport(date)
    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(report)
  }

  const latest = loadLatestReport()
  const history = listHistoryDates()

  return NextResponse.json({
    latest,
    history: history.slice(0, 30),
  })
}
