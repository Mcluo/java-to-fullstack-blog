import fs from 'fs'
import path from 'path'

export interface SearchHistoryItem {
  query: string
  searchedAt: string
}

const SEARCH_HISTORY_PATH = path.join(process.cwd(), 'content', 'github', 'search-history.json')

export function loadSearchHistory(): SearchHistoryItem[] {
  try {
    if (!fs.existsSync(SEARCH_HISTORY_PATH)) return []
    return JSON.parse(fs.readFileSync(SEARCH_HISTORY_PATH, 'utf8'))
  } catch { return [] }
}

export function saveSearchHistory(items: SearchHistoryItem[]): void {
  const dir = path.dirname(SEARCH_HISTORY_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const tmp = SEARCH_HISTORY_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2) + '\n', 'utf8')
  fs.renameSync(tmp, SEARCH_HISTORY_PATH)
}
