import fs from 'fs'
import path from 'path'

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

export interface RetrievedChunk {
  text: string
  metadata: ChunkMetadata
  score: number
}

const EMBEDDING_CONFIG = {
  apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.EMBEDDING_API_BASE || 'https://api-inference.modelscope.cn/v1',
  model: process.env.EMBEDDING_MODEL || 'Qwen/Qwen3-Embedding-8B',
}

// 单例缓存
let cachedEmbeddings: EmbeddingsData | null = null

/**
 * 加载 embeddings 数据（带缓存）
 */
function loadEmbeddings(): EmbeddingsData | null {
  if (cachedEmbeddings) return cachedEmbeddings

  const filePath = path.join(process.cwd(), 'src', 'lib', 'embeddings.json')

  try {
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ embeddings.json 未找到，RAG 功能不可用。请运行 npm run build:embeddings')
      return null
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    cachedEmbeddings = JSON.parse(raw)
    return cachedEmbeddings
  } catch {
    console.warn('⚠️ embeddings.json 加载失败，RAG 功能不可用')
    return null
  }
}

/**
 * 调用 embedding API 生成查询向量
 */
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(`${EMBEDDING_CONFIG.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EMBEDDING_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_CONFIG.model,
      input: query,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding API 错误 (${response.status})`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * 余弦相似度
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0
  return dotProduct / denominator
}

/**
 * 检索与查询最相关的文章片段
 */
export async function searchRelevantChunks(
  query: string,
  topK: number = 5,
  minScore: number = 0.3
): Promise<RetrievedChunk[]> {
  const data = loadEmbeddings()
  if (!data) return []

  if (!EMBEDDING_CONFIG.apiKey) {
    console.warn('⚠️ EMBEDDING_API_KEY 未设置，RAG 功能不可用')
    return []
  }

  const queryVector = await getQueryEmbedding(query)

  // 计算相似度并排序
  const scored = data.chunks
    .map(chunk => ({
      text: chunk.text,
      metadata: chunk.metadata,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)

  // 去重：同一篇文章最多取 2 个 chunk
  const articleCounts: Record<string, number> = {}
  const deduped: RetrievedChunk[] = []

  for (const item of scored) {
    const key = `${item.metadata.category}/${item.metadata.slug}`
    const count = articleCounts[key] || 0
    if (count >= 2) continue

    articleCounts[key] = count + 1
    deduped.push(item)

    if (deduped.length >= topK) break
  }

  return deduped
}

/**
 * 将检索结果格式化为 context 字符串，注入到 system prompt
 */
export function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  const sections = chunks.map((chunk, i) => {
    const { title, category, slug } = chunk.metadata
    const articleUrl = `/articles/${category}/${slug}`
    return `### 来源 ${i + 1}: ${title}\n**链接**: ${articleUrl}\n**相关度**: ${(chunk.score * 100).toFixed(0)}%\n\n${chunk.text}`
  })

  return `## 以下是从网站文章中检索到的相关内容\n\n请基于这些内容回答用户问题。如果这些内容足以回答，请引用来源文章。如果不够，可以结合你的通用知识补充。\n\n${sections.join('\n\n---\n\n')}`
}

/**
 * 检查 RAG 是否可用
 */
export function isRagAvailable(): boolean {
  return loadEmbeddings() !== null && !!EMBEDDING_CONFIG.apiKey
}
