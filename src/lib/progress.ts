// 学习进度管理工具
export interface UserProgress {
  completedArticles: string[]  // 已完成文章的 slugs
  checklistItems: {
    [articleSlug: string]: string[]  // 每篇文章完成的清单项ID
  }
  lastUpdated: string
}

const STORAGE_KEY = 'blog_learning_progress'

// 默认进度
const defaultProgress: UserProgress = {
  completedArticles: [],
  checklistItems: {},
  lastUpdated: new Date().toISOString()
}

// 加载进度（客户端使用）
export function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load progress:', error)
  }
  return defaultProgress
}

// 保存进度（客户端使用）
export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return

  try {
    progress.lastUpdated = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('Failed to save progress:', error)
  }
}

// 标记文章为已完成
export function markArticleCompleted(slug: string): void {
  const progress = loadProgress()
  if (!progress.completedArticles.includes(slug)) {
    progress.completedArticles.push(slug)
    saveProgress(progress)
  }
}

// 检查文章是否已完成
export function isArticleCompleted(slug: string): boolean {
  const progress = loadProgress()
  return progress.completedArticles.includes(slug)
}

// 标记清单项为已完成
export function markChecklistItemCompleted(articleSlug: string, itemId: string): void {
  const progress = loadProgress()
  if (!progress.checklistItems[articleSlug]) {
    progress.checklistItems[articleSlug] = []
  }
  if (!progress.checklistItems[articleSlug].includes(itemId)) {
    progress.checklistItems[articleSlug].push(itemId)
    saveProgress(progress)
  }
}

// 获取文章的清单完成情况
export function getChecklistProgress(articleSlug: string): string[] {
  const progress = loadProgress()
  return progress.checklistItems[articleSlug] || []
}

// 清除所有进度（用于重置）
export function clearProgress(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
