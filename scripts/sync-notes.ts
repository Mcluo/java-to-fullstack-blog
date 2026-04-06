import fs from 'fs'
import path from 'path'
import os from 'os'

const NOTES_DIR = path.join(os.homedir(), 'docs', 'tech-notes')
const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles')

const CATEGORY_MAP: Record<string, string> = {
  architecture: 'architecture',
  'personal-growth': 'personal-growth',
  'tools-and-tips': 'tools-and-tips',
  'product-design': 'product-design',
  research: 'research',
  'work-logs': 'work-logs',
}

interface NoteMetadata {
  title: string
  type: string
  createdAt: string
  tags: string[]
  keywords: string[]
  excerpt: string
}

function parseNoteMetadata(content: string, filename: string): NoteMetadata {
  const lines = content.split('\n')
  let title = '', type = '', createdAt = ''
  const tags: string[] = [], keywords: string[] = []

  for (const line of lines) {
    if (!title && line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim()
      continue
    }

    // 格式1: > **key**：value（标准 blockquote + 加粗）
    const m1 = line.match(/^>\s+\*\*(.+?)\*\*[：:]\s*(.+)$/)
    // 格式2: > key：value（blockquote 无加粗）
    const m2 = line.match(/^>\s+(文档类型|创建时间|标签|关键词|分类|来源|项目|更新时间)[：:]\s*(.+)$/)
    // 格式3: **key**: value（加粗无 blockquote）
    const m3 = line.match(/^\*\*(.+?)\*\*[：:]\s*(.+)$/)

    const m = m1 || m2 || m3
    if (m) {
      const [, key, value] = m
      if (key === '文档类型' || key === '分类') type = value.trim()
      else if (key === '创建时间' || key === '更新时间') {
        if (!createdAt) createdAt = value.trim()
      }
      else if (key === '标签') {
        const tm = value.match(/#[\w\u4e00-\u9fff-]+/g)
        if (tm) tags.push(...tm.map(t => t.replace('#', '')))
      }
      else if (key === '关键词') {
        keywords.push(...value.split(/[,，]/).map(k => k.trim()).filter(Boolean))
      }
    }
  }

  if (!title) title = filename.replace(/\.md$/, '').replace(/-/g, ' ')

  // 生成摘要：多种段落标题兼容
  let excerpt = ''
  // 尝试多种概述段落格式
  const overviewPatterns = [
    /## 概述\s*\n+([\s\S]*?)(?=\n---|\n##|$)/,
    /## 🎯\s*.+\s*\n+([\s\S]*?)(?=\n---|\n##|$)/,
    /## 引言\s*\n+([\s\S]*?)(?=\n---|\n##|$)/,
    /## 📋\s*执行摘要\s*\n+([\s\S]*?)(?=\n---|\n##|$)/,
  ]
  for (const pattern of overviewPatterns) {
    const match = content.match(pattern)
    if (match) {
      excerpt = match[1]
        .replace(/\n/g, ' ')
        .replace(/[#*>`\[\]]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150)
      if (excerpt) break
    }
  }

  // 回退：取正文第一个非空段落
  if (!excerpt) {
    const bodyStart = content.indexOf('\n---\n')
    if (bodyStart !== -1) {
      const afterSep = content.slice(bodyStart + 5).trim()
      const paragraphs = afterSep.split(/\n\n+/)
      for (const p of paragraphs) {
        const clean = p.replace(/^#+\s+.*/m, '').replace(/[#*>`\[\]]/g, '').replace(/\s+/g, ' ').trim()
        if (clean.length > 20) {
          excerpt = clean.slice(0, 150)
          break
        }
      }
    }
  }

  if (!excerpt && keywords.length > 0) {
    excerpt = `${title}。涉及 ${keywords.slice(0, 4).join('、')} 等主题。`
  }
  if (!excerpt) excerpt = title

  return { title, type, createdAt, tags, keywords, excerpt }
}

function estimateReadTime(content: string): number {
  const charCount = content.replace(/[^\u4e00-\u9fff\w]/g, '').length
  return Math.max(5, Math.round(charCount / 400))
}

/**
 * 提取正文：移除标题行、blockquote 元数据、以及元数据后紧跟的第一个 --- 分隔线
 */
function extractBody(content: string): string {
  const lines = content.split('\n')
  const bodyLines: string[] = []
  let inHeader = true // 仍在头部区域（标题 + 元数据 + 分隔线）

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (inHeader) {
      // 跳过标题行
      if (line.startsWith('# ')) continue
      // 跳过 blockquote 元数据行（含加粗和不含加粗）
      if (line.match(/^>\s+(\*\*.+?\*\*|文档类型|创建时间|标签|关键词|分类|来源|项目|更新时间)[：:]/)) continue
      // 跳过加粗格式的元数据行
      if (line.match(/^\*\*(文档类型|创建时间|标签|关键词|分类|来源|项目|更新时间)\*\*[：:]/)) continue
      // 跳过空行（头部区域中的）
      if (line.trim() === '') continue
      // 跳过 --- 分隔线（头部结束标记）
      if (line.trim() === '---') {
        inHeader = false
        continue
      }
      // 遇到非头部内容，停止跳过
      inHeader = false
    }

    bodyLines.push(line)
  }

  // 去掉开头空行
  while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
    bodyLines.shift()
  }

  return bodyLines.join('\n')
}

function convertToBlogFormat(content: string, meta: NoteMetadata, category: string): string {
  const readTime = estimateReadTime(content)
  const body = extractBody(content)

  const frontmatter = [
    '---',
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `excerpt: "${meta.excerpt.replace(/"/g, '\\"')}"`,
    `category: "${category}"`,
    `tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]`,
    `publishedAt: "${meta.createdAt || new Date().toISOString().split('T')[0]}"`,
    `readTime: ${readTime}`,
    '---',
  ].join('\n')

  return frontmatter + '\n\n' + body
}

function syncNotes() {
  console.log('=== 笔记同步到博客 ===\n')
  const stats = { synced: 0, skipped: 0, errors: 0 }

  for (const [noteCategory, blogCategory] of Object.entries(CATEGORY_MAP)) {
    const noteCategoryDir = path.join(NOTES_DIR, noteCategory)
    if (!fs.existsSync(noteCategoryDir)) continue

    const files = fs.readdirSync(noteCategoryDir).filter(f =>
      f.endsWith('.md') && f !== 'README.md'
    )
    if (files.length === 0) continue

    const targetDir = path.join(ARTICLES_DIR, blogCategory)
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

    for (const file of files) {
      const sourcePath = path.join(noteCategoryDir, file)
      const targetPath = path.join(targetDir, file)

      try {
        if (fs.existsSync(targetPath)) {
          if (fs.statSync(sourcePath).mtimeMs <= fs.statSync(targetPath).mtimeMs) {
            stats.skipped++
            continue
          }
        }

        const content = fs.readFileSync(sourcePath, 'utf8')
        const meta = parseNoteMetadata(content, file)
        fs.writeFileSync(targetPath, convertToBlogFormat(content, meta, blogCategory), 'utf8')
        stats.synced++
        console.log(`  + ${blogCategory}/${file} (${meta.title})`)
      } catch (err: any) {
        console.error(`  ! 错误: ${file}:`, err.message)
        stats.errors++
      }
    }
  }

  console.log('\n=== 同步完成 ===')
  console.log(`  同步: ${stats.synced} 篇`)
  console.log(`  跳过: ${stats.skipped} 篇 (未变更)`)
  console.log(`  错误: ${stats.errors} 篇`)
}

syncNotes()
