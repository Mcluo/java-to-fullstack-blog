import fs from 'fs'
import path from 'path'

const MARKET_DIR = path.join(process.cwd(), 'content', 'market')
const LATEST_PATH = path.join(MARKET_DIR, 'latest.json')
const HISTORY_DIR = path.join(MARKET_DIR, 'history')

export interface SectorData {
  name: string
  change_pct: number
  volume?: number
  leading_stock?: string
  net_inflow?: number
  trend_5d?: number[]
}

export interface MarketSnapshot {
  market: string
  date: string
  timestamp: string
  index_name: string
  index_value?: number
  index_change_pct?: number
  up_count: number
  down_count: number
  sectors: SectorData[]
}

export interface DailyReport {
  date: string
  timestamp: string
  a_stock: MarketSnapshot | null
  us_stock: MarketSnapshot | null
}

export function loadLatestReport(): DailyReport | null {
  if (!fs.existsSync(LATEST_PATH)) return null
  return JSON.parse(fs.readFileSync(LATEST_PATH, 'utf8'))
}

export function listHistoryDates(): string[] {
  if (!fs.existsSync(HISTORY_DIR)) return []
  return fs.readdirSync(HISTORY_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse()
}

export function loadHistoryReport(date: string): DailyReport | null {
  const filePath = path.join(HISTORY_DIR, `${date}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}
