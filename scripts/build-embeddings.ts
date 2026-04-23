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
  title: string
  category: string
  slug: string
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

async function main() {
  console.log('🚀 开始生成文章 embeddings...\n')

  // 1. 读取所有文章
  const articles = await getAllArticleContents()
  console.log(`📄 找到 ${articles.length} 篇文章`)

  // 2. 分块
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', ' '],
  })

  const allChunks: Array<{ text: string; metadata: ChunkMetadata }> = []

  for (const article of articles) {
    const docs = await splitter.createDocuments(
      [article.content],
      [{ title: article.title, category: article.category, slug: article.slug }]
    )

    docs.forEach((doc, index) => {
      // 在 chunk 开头添加文章标题作为上下文
      const textWithTitle = `[文章: ${article.title}]\n\n${doc.pageContent}`
      allChunks.push({
        text: textWithTitle,
        metadata: {
          title: article.title,
          category: article.category,
          slug: article.slug,
          chunkIndex: index,
        },
      })
    })
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
