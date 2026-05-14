import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const EMBEDDING_CONFIG = {
  apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.EMBEDDING_API_BASE || 'https://api-inference.modelscope.cn/v1',
  model: process.env.EMBEDDING_MODEL || 'Qwen/Qwen3-Embedding-8B',
}

/**
 * 调用 OpenAI 兼容的 embedding API（支持 encoding_format 参数）
 */
async function callEmbeddingAPI(texts: string[]): Promise<number[][]> {
  const response = await fetch(`${EMBEDDING_CONFIG.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMBEDDING_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_CONFIG.model,
      input: texts,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Embedding API 错误 (${response.status}): ${err}`)
  }

  const data = await response.json()
  // 按 index 排序确保顺序正确
  const sorted = data.data.sort((a: any, b: any) => a.index - b.index)
  return sorted.map((item: any) => item.embedding)
}

interface ChunkMetadata {
  source: 'article' | 'note'
  title: string
  category: string
  slug: string
  filePath?: string  // 笔记的相对路径（相对于 NOTES_DIR）
  chunkIndex: number
}

interface EmbeddingChunk {
  text: string
  metadata: ChunkMetadata
  embedding: number[]
}

interface EmbeddingsData {
  model: string
  dimensions: number
  createdAt: string
  totalArticles: number
  totalChunks: number
  chunks: EmbeddingChunk[]
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'articles')
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'lib', 'embeddings.json')
const FINGERPRINT_PATH = path.join(process.cwd(), 'src', 'lib', 'embeddings.fingerprint')

// 笔记目录：支持逗号分隔的多个路径，路径中 ~ 会展开为 home 目录
const NOTES_DIRS: string[] = (process.env.NOTES_DIRS || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)
  .map(p => p.replace(/^~/, process.env.HOME || ''))

// 不纳入索引的文件名（精确匹配）
const NOTES_EXCLUDE_FILES = new Set(['TODO.md', 'README.md'])

async function getAllArticleContents(): Promise<Array<{
  title: string
  category: string
  slug: string
  content: string
}>> {
  const articles: Array<{ title: string; category: string; slug: string; content: string }> = []

  const categories = fs.readdirSync(CONTENT_DIR).filter(name => {
    return fs.statSync(path.join(CONTENT_DIR, name)).isDirectory()
  })

  for (const category of categories) {
    const categoryDir = path.join(CONTENT_DIR, category)
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md'))

    for (const file of files) {
      const filePath = path.join(categoryDir, file)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContents)
      const slug = file.replace(/\.md$/, '')

      articles.push({
        title: data.title || slug,
        category,
        slug,
        content,
      })
    }
  }

  return articles
}

/**
 * 递归读取笔记目录下所有 .md 文件
 */
async function getAllNotesContents(notesDir: string): Promise<Array<{
  title: string
  filePath: string  // 相对于 notesDir
  content: string
}>> {
  const notes: Array<{ title: string; filePath: string; content: string }> = []

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.name.endsWith('.md') && !NOTES_EXCLUDE_FILES.has(entry.name)) {
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)
        const relPath = path.relative(notesDir, fullPath)

        // 标题优先用 frontmatter，其次用第一个 # 标题，最后用文件名
        let title = data.title as string
        if (!title) {
          const h1Match = content.match(/^#\s+(.+)$/m)
          title = h1Match ? h1Match[1] : path.basename(entry.name, '.md')
        }

        // 跳过内容过短的文件（< 100 字符）
        if (content.trim().length < 100) continue

        notes.push({ title, filePath: relPath, content })
      }
    }
  }

  walkDir(notesDir)
  return notes
}

/**
 * 收集所有源文件的路径列表（文章 + 笔记）
 */
function collectSourceFiles(): string[] {
  const files: string[] = []

  // 博客文章
  if (fs.existsSync(CONTENT_DIR)) {
    const categories = fs.readdirSync(CONTENT_DIR).filter(name =>
      fs.statSync(path.join(CONTENT_DIR, name)).isDirectory()
    )
    for (const category of categories) {
      const categoryDir = path.join(CONTENT_DIR, category)
      fs.readdirSync(categoryDir)
        .filter(f => f.endsWith('.md'))
        .forEach(f => files.push(path.join(categoryDir, f)))
    }
  }

  // 笔记
  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) walkDir(fullPath)
      else if (entry.name.endsWith('.md') && !NOTES_EXCLUDE_FILES.has(entry.name)) {
        files.push(fullPath)
      }
    }
  }
  for (const notesDir of NOTES_DIRS) walkDir(notesDir)

  return files.sort()
}

/**
 * 根据文件的 mtime + size 生成指纹字符串
 */
function computeFingerprint(files: string[]): string {
  const parts = files.map(f => {
    try {
      const stat = fs.statSync(f)
      return `${f}:${stat.mtimeMs}:${stat.size}`
    } catch {
      return `${f}:missing`
    }
  })
  return parts.join('\n')
}

async function main() {
  console.log('🚀 开始生成 embeddings...\n')

  // 检查是否需要重建
  const sourceFiles = collectSourceFiles()
  const currentFingerprint = computeFingerprint(sourceFiles)

  if (fs.existsSync(FINGERPRINT_PATH) && fs.existsSync(OUTPUT_PATH)) {
    const savedFingerprint = fs.readFileSync(FINGERPRINT_PATH, 'utf8')
    if (savedFingerprint === currentFingerprint) {
      console.log('✅ 内容无变化，跳过重建 embeddings')
      return
    }
  }

  // 1. 读取所有文章
  const articles = await getAllArticleContents()
  console.log(`📄 博客文章: ${articles.length} 篇`)

  // 2. 读取笔记
  let totalNotes = 0
  const notesSources: Array<{ dir: string; notes: Awaited<ReturnType<typeof getAllNotesContents>> }> = []
  for (const notesDir of NOTES_DIRS) {
    const notes = await getAllNotesContents(notesDir)
    notesSources.push({ dir: notesDir, notes })
    totalNotes += notes.length
    console.log(`📝 笔记 (${notesDir}): ${notes.length} 篇`)
  }
  console.log(`\n📊 合计: ${articles.length + totalNotes} 个知识源\n`)

  // 3. 分块
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', ' '],
  })

  const allChunks: Array<{ text: string; metadata: ChunkMetadata }> = []

  // 处理博客文章
  for (const article of articles) {
    const docs = await splitter.createDocuments(
      [article.content],
      [{ title: article.title, category: article.category, slug: article.slug }]
    )

    docs.forEach((doc, index) => {
      const textWithTitle = `[博客文章: ${article.title}]\n\n${doc.pageContent}`
      allChunks.push({
        text: textWithTitle,
        metadata: {
          source: 'article',
          title: article.title,
          category: article.category,
          slug: article.slug,
          chunkIndex: index,
        },
      })
    })
  }

  // 处理笔记
  for (const { notes } of notesSources) {
    for (const note of notes) {
      const docs = await splitter.createDocuments(
        [note.content],
        [{ title: note.title, filePath: note.filePath }]
      )

      docs.forEach((doc, index) => {
        const textWithTitle = `[个人笔记: ${note.title}]\n\n${doc.pageContent}`
        allChunks.push({
          text: textWithTitle,
          metadata: {
            source: 'note',
            title: note.title,
            category: 'notes',
            slug: note.filePath.replace(/\.md$/, '').replace(/\//g, '-'),
            filePath: note.filePath,
            chunkIndex: index,
          },
        })
      })
    }
  }

  console.log(`✂️  分块完成: ${allChunks.length} 个 chunks\n`)

  // 3. 生成 embeddings
  if (!EMBEDDING_CONFIG.apiKey) {
    console.error('❌ 请设置 EMBEDDING_API_KEY 或 OPENAI_API_KEY 环境变量')
    process.exit(1)
  }

  console.log(`🧠 正在生成 embeddings (${EMBEDDING_CONFIG.model})...`)
  console.log(`   端点: ${EMBEDDING_CONFIG.baseUrl}`)

  // 批量生成 embedding，每批 20 个（避免请求过大）
  const batchSize = 20
  const embeddingChunks: EmbeddingChunk[] = []

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize)
    const texts = batch.map(c => c.text)
    const vectors = await callEmbeddingAPI(texts)

    for (let j = 0; j < batch.length; j++) {
      embeddingChunks.push({
        text: batch[j].text,
        metadata: batch[j].metadata,
        embedding: vectors[j],
      })
    }

    console.log(`   进度: ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`)
  }

  // 4. 保存到 JSON
  const data: EmbeddingsData = {
    model: EMBEDDING_CONFIG.model,
    dimensions: embeddingChunks[0]?.embedding.length || 0,
    createdAt: new Date().toISOString(),
    totalArticles: articles.length,
    totalChunks: embeddingChunks.length,
    chunks: embeddingChunks,
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data))
  fs.writeFileSync(FINGERPRINT_PATH, currentFingerprint)
  const fileSizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)

  console.log(`\n✅ Embeddings 生成完成!`)
  console.log(`   📊 文章数: ${articles.length}`)
  console.log(`   📊 Chunks: ${embeddingChunks.length}`)
  console.log(`   📊 向量维度: ${data.dimensions}`)
  console.log(`   📊 文件大小: ${fileSizeMB} MB`)
  console.log(`   📁 保存到: ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('❌ 错误:', err)
  process.exit(1)
})
