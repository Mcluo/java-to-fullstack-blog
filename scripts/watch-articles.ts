import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'articles')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function rebuild() {
  console.log('\n📝 检测到文章变更，重新生成 embeddings...')
  try {
    execSync('bun run scripts/build-embeddings.ts', { stdio: 'inherit', cwd: process.cwd() })
    console.log('✅ Embeddings 已更新\n')
  } catch (err) {
    console.error('❌ Embeddings 更新失败:', err)
  }
}

function debouncedRebuild() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(rebuild, 2000) // 2秒防抖
}

// 递归监听目录
function watchDir(dir: string) {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      console.log(`🔄 文件变更: ${filename}`)
      debouncedRebuild()
    }
  })
}

console.log(`👀 监听文章目录: ${CONTENT_DIR}`)
console.log('   文章变更时将自动重建 embeddings\n')
watchDir(CONTENT_DIR)
