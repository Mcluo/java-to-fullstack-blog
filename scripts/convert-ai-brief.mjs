#!/usr/bin/env node
/**
 * AI论文简报内容转换脚本
 * 将 agent-browser 提取的原始文本转为博客 Markdown 格式
 *
 * Usage: node convert-ai-brief.mjs <input.txt> <output.md> <date> <title>
 */

import { readFileSync, writeFileSync } from 'fs'

const [,, inputFile, outputFile, date, rawTitle] = process.argv

if (!inputFile || !outputFile || !date) {
  console.error('Usage: node convert-ai-brief.mjs <input.txt> <output.md> <date> <title>')
  process.exit(1)
}

const raw = readFileSync(inputFile, 'utf8')
const lines = raw.split('\n')

// 提取标题（去掉网站名后缀）
let title = rawTitle || ''
title = title.replace(/\s*[-–—]\s*AI论文简报.*$/, '').trim()
if (!title) {
  // 从内容中提取
  for (const line of lines) {
    if (line.length > 10 && !line.includes('AI论文简报') && !line.includes('搜索') && !line.includes('方法论')) {
      title = line.trim()
      break
    }
  }
}

// 解析正文 - 从"今日概览"开始，到"分享"/"继续阅读"结束
let startIdx = -1
let endIdx = lines.length

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim()
  if (line === '今日概览' && startIdx === -1) {
    startIdx = i
  }
  if ((line === '分享' || line === '继续阅读' || line.startsWith('订阅AI论文简报')) && startIdx !== -1) {
    endIdx = i
    break
  }
}

if (startIdx === -1) startIdx = 0

const contentLines = lines.slice(startIdx, endIdx)

// 格式化内容
let content = []
let inSection = false
let currentSection = ''

for (let i = 0; i < contentLines.length; i++) {
  const line = contentLines[i].trim()

  if (!line) {
    content.push('')
    continue
  }

  // 跳过导航元素
  if (['微信', '微博', 'X', '复制链接'].includes(line)) continue

  // 今日概览
  if (line === '今日概览') {
    content.push('## 今日概览\n')
    continue
  }

  // 重点关注
  if (line === '重点关注') {
    content.push('\n---\n')
    content.push('## 重点关注\n')
    continue
  }

  // 也值得关注
  if (line === '也值得关注') {
    content.push('\n---\n')
    content.push('## 也值得关注\n')
    continue
  }

  // 编号标题 (01, 02, ...)
  const numMatch = line.match(/^(\d{2})$/)
  if (numMatch) {
    currentSection = numMatch[1]
    continue
  }

  // 分类标签行 (代码智能, 多模态, 评测, 检索 等)
  const tagLine = line.match(/^(代码智能|多模态|评测|检索|安全对齐|推理加速|AI for Science|模型架构|机器人|强化学习|数据|训练|架构|效率|Agent|生成)\s+(.+)$/)
  if (tagLine && currentSection) {
    content.push(`### ${currentSection}. ${tagLine[2]}`)
    content.push(`> **领域**: ${tagLine[1]}\n`)
    currentSection = ''
    continue
  }

  // 原文链接
  if (line.startsWith('原文：') || line.startsWith('原文:')) {
    content.push(`**${line}**\n`)
    continue
  }

  // 链接行
  if (line === '链接') {
    continue
  }

  // 要点列表（以特定词开头的短段落）
  if (line.length < 200 && (
    line.includes('说明') ||
    line.includes('表明') ||
    line.includes('对') ||
    line.includes('从') ||
    line.includes('利用')
  ) && i > 0 && contentLines[i-1]?.trim() === '') {
    // 可能是要点
  }

  // 带编号的简要提及 (05-14)
  const briefMatch = line.match(/^(\d{2})\s+(.+?)\s+(安全对齐|推理加速|AI for Science|模型架构|机器人|多模态|强化学习|数据|训练|评测|代码智能|检索|Agent|生成|效率|架构)$/)
  if (briefMatch) {
    content.push(`- **${briefMatch[1]}** [${briefMatch[3]}] ${briefMatch[2]}`)
    continue
  }

  content.push(line)
}

// 生成 excerpt
let excerpt = ''
const overviewStart = content.findIndex(l => l.includes('今日概览'))
if (overviewStart !== -1) {
  for (let i = overviewStart + 1; i < content.length; i++) {
    const l = content[i].trim()
    if (l && !l.startsWith('#') && !l.startsWith('---')) {
      excerpt = l.slice(0, 150)
      if (l.length > 150) excerpt += '...'
      break
    }
  }
}

// 提取标签
const tags = ['ai-paper', 'daily-brief']
const tagKeywords = {
  'LLM': 'llm', '多模态': 'multimodal', 'Agent': 'agent',
  'RAG': 'rag', '扩散': 'diffusion', 'RL': 'reinforcement-learning',
  '代码': 'code', '视觉': 'vision', '安全': 'safety'
}
for (const [keyword, tag] of Object.entries(tagKeywords)) {
  if (raw.includes(keyword) && !tags.includes(tag)) {
    tags.push(tag)
  }
}

// 估算阅读时间
const wordCount = content.join('\n').length
const readTime = Math.max(3, Math.ceil(wordCount / 500))

// 组装最终 Markdown
const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
category: "ai-brief"
tags: ${JSON.stringify(tags)}
publishedAt: "${date}"
readTime: ${readTime}
---

> 来源: [AI论文简报](https://ai-brief.liziran.com/zh) | 日期: ${date}

---

`

const finalContent = frontmatter + content.join('\n')

writeFileSync(outputFile, finalContent, 'utf8')
console.log(`[convert] 已生成: ${outputFile} (${readTime} min read, ${tags.length} tags)`)
