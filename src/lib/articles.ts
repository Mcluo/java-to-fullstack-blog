import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface ArticleMeta {
  title: string
  excerpt: string
  category: string
  slug: string
  tags: string[]
  difficulty?: string
  readTime?: number
  publishedAt?: string
  updatedAt?: string
  notebook?: string
}

export interface Article extends ArticleMeta {
  content: string
}

export interface ArticleNavigation {
  previous?: ArticleMeta
  next?: ArticleMeta
  related?: ArticleMeta[]
}

export const CATEGORY_CONFIG: Record<string, { name: string; group: string; bgColor: string; textColor: string }> = {
  // 学习路径
  quickstart: { name: '快速启动', group: '学习路径', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  frontend: { name: '前端', group: '学习路径', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  backend: { name: '后端', group: '学习路径', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  ai: { name: 'AI', group: '学习路径', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  devops: { name: 'DevOps', group: '学习路径', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  architecture: { name: '架构设计', group: '学习路径', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  // 技术实践
  'tools-and-tips': { name: '工具技巧', group: '技术实践', bgColor: 'bg-teal-100', textColor: 'text-teal-800' },
  research: { name: '技术调研', group: '技术实践', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  'product-design': { name: '产品设计', group: '技术实践', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
  skill: { name: 'Skill', group: '技术实践', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  'work-logs': { name: '工作记录', group: '技术实践', bgColor: 'bg-slate-100', textColor: 'text-slate-800' },
  troubleshooting: { name: '问题排查', group: '技术实践', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  'ai-brief': { name: 'AI论文简报', group: '技术实践', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  feeds: { name: '订阅日报', group: '技术实践', bgColor: 'bg-rose-100', textColor: 'text-rose-800' },
  // 思考
  'personal-growth': { name: '个人成长', group: '思考', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
}

export const CATEGORY_GROUPS = ['学习路径', '技术实践', '思考'] as const

const CONTENT_DIR = path.join(process.cwd(), 'content', 'articles')

/**
 * 获取所有文章的元数据（不含正文）
 */
export function getAllArticles(): ArticleMeta[] {
  const articles: ArticleMeta[] = []

  if (!fs.existsSync(CONTENT_DIR)) return articles

  const categories = fs.readdirSync(CONTENT_DIR).filter(name => {
    const fullPath = path.join(CONTENT_DIR, name)
    return fs.statSync(fullPath).isDirectory()
  })

  for (const category of categories) {
    const categoryDir = path.join(CONTENT_DIR, category)
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'))

    for (const file of files) {
      const slug = file.replace(/\.md$/, '')
      const filePath = path.join(categoryDir, file)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(fileContents)
      articles.push({
        title: data.title || slug,
        excerpt: data.excerpt || '',
        category,
        slug,
        tags: data.tags || [],
        difficulty: data.difficulty,
        readTime: data.readTime,
        publishedAt: data.publishedAt,
        updatedAt: data.updatedAt,
        notebook: data.notebook,
      })
    }
  }

  // 按发布/更新时间倒序：优先用 frontmatter 中显式声明的 updatedAt，其次 publishedAt
  // 不使用 fileMtime，因为 git 操作会导致 mtime 不可靠
  articles.sort((a, b) => {
    const dateA = a.updatedAt || a.publishedAt || '1970-01-01'
    const dateB = b.updatedAt || b.publishedAt || '1970-01-01'
    return dateB.localeCompare(dateA)
  })

  return articles
}

/**
 * 根据 category 和 slug 获取单篇文章（含正文）
 */
export function getArticleBySlug(category: string, slug: string): Article | null {
  const decodedSlug = decodeURIComponent(slug)
  const filePath = path.join(CONTENT_DIR, category, `${decodedSlug}.md`)

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      title: data.title || slug,
      excerpt: data.excerpt || '',
      category,
      slug,
      tags: data.tags || [],
      difficulty: data.difficulty,
      readTime: data.readTime,
      publishedAt: data.publishedAt,
      updatedAt: data.updatedAt,
      notebook: data.notebook,
      content,
    }
  } catch {
    return null
  }
}

/**
 * 获取文章的前后导航关系（同分类内按文件名排序）
 */
export function getArticleNavigation(category: string, slug: string): ArticleNavigation {
  const allArticles = getAllArticles()
  const categoryArticles = allArticles
    .filter(a => a.category === category)
    .sort((a, b) => a.slug.localeCompare(b.slug))

  const currentIndex = categoryArticles.findIndex(a => a.slug === slug)
  if (currentIndex === -1) return {}

  const previous = currentIndex > 0 ? categoryArticles[currentIndex - 1] : undefined
  const next = currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : undefined

  // 相关文章：同分类的其他文章（最多3篇）
  const related = categoryArticles
    .filter(a => a.slug !== slug)
    .slice(0, 3)

  return { previous, next, related: related.length > 0 ? related : undefined }
}

/**
 * 获取所有分类列表
 */
export function getCategories(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return []

  return fs.readdirSync(CONTENT_DIR).filter(name => {
    const fullPath = path.join(CONTENT_DIR, name)
    if (!fs.statSync(fullPath).isDirectory()) return false
    // 只返回有文章的分类
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'))
    return files.length > 0
  })
}

/**
 * 获取分类显示名
 */
export function getCategoryName(category: string): string {
  return CATEGORY_CONFIG[category]?.name || category
}
