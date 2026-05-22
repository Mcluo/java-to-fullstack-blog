import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeKatex from 'rehype-katex'
import 'highlight.js/styles/github-dark.css'
import MermaidBlock from '@/components/MermaidBlock'
import CodeBlock from '@/components/CodeBlock'
import ImageLightbox from '@/components/ImageLightbox'
import ArticleProgress from '@/components/ArticleProgress'
import ArticleNavigation from '@/components/ArticleNavigation'
import ArticleTags from '@/components/ArticleTags'
import NotebookLinks from '@/components/NotebookLinks'
import TableOfContents from '@/components/TableOfContents'
import RelatedKnowledge from '@/components/RelatedKnowledge'
import CommentSection from '@/components/CommentSection'
import HighlightComments from '@/components/HighlightComments'
import ArticleReadingAssistant from '@/components/ArticleReadingAssistant'
import ReadingPositionResume from '@/components/ReadingPositionResume'
import ArticleKeyPoints from '@/components/ArticleKeyPoints'
import AiBriefRenderer from '@/components/AiBriefRenderer'
import {
  getAllArticles,
  getArticleBySlug,
  getArticleNavigation,
  getCategoryName,
} from '@/lib/articles'

export async function generateStaticParams() {
  const articles = getAllArticles()
  return articles.map(a => ({ category: a.category, slug: a.slug }))
}

export default async function ArticlePage({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const article = getArticleBySlug(params.category, params.slug)

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">文章未找到</h1>
        <p className="mt-4 text-gray-600">抱歉，您访问的文章不存在。</p>
        <a href="/articles" className="mt-6 inline-block text-blue-600 hover:underline">
          返回文章列表
        </a>
      </div>
    )
  }

  const navigation = getArticleNavigation(params.category, params.slug)
  const categoryName = getCategoryName(params.category)
  const articleSlug = `${params.category}/${params.slug}`
  let pIdx = 0

  // AI论文简报 使用专用渲染器
  if (params.category === 'ai-brief') {
    return (
      <AiBriefRenderer
        content={article.content}
        title={article.title}
        publishedAt={article.publishedAt}
        excerpt={article.excerpt}
        navigation={navigation}
        slug={params.slug}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 面包屑 */}
      <nav className="mb-8 flex items-center gap-1.5 text-sm text-gray-400">
        <a href="/" className="hover:text-gray-600 transition">首页</a>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <a href="/articles" className="hover:text-gray-600 transition">教程</a>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-gray-700 font-medium">{categoryName}</span>
      </nav>

      <div className="lg:flex lg:gap-8">
        {/* 文章主体 */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {/* 文章头部 */}
          <header className="mb-10 pb-8 border-b border-gray-100">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                {categoryName}
              </span>
              {article.difficulty && (
                <span className={`
                  px-2.5 py-0.5 rounded-md text-xs font-medium
                  ${article.difficulty === 'beginner' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : ''}
                  ${article.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : ''}
                  ${article.difficulty === 'advanced' ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100' : ''}
                `}>
                  {article.difficulty === 'beginner' ? '初级' : ''}
                  {article.difficulty === 'intermediate' ? '中级' : ''}
                  {article.difficulty === 'advanced' ? '高级' : ''}
                </span>
              )}
              {article.readTime && (
                <span className="text-xs text-gray-400">
                  {article.readTime} min read
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-lg text-gray-500 mb-5 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            {article.tags && <ArticleTags tags={article.tags} />}

            {/* 时间信息 */}
            {(article.publishedAt || article.updatedAt) && (
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-4 tabular-nums">
                {article.publishedAt && (
                  <span>{article.publishedAt.slice(0, 10)}</span>
                )}
                {article.updatedAt && (
                  <span>· 更新 {article.updatedAt}</span>
                )}
              </div>
            )}
          </header>

          {/* TL;DR 核心要点 */}
          {article.keyPoints && <ArticleKeyPoints keyPoints={article.keyPoints} />}

          {/* Jupyter Notebook 链接 */}
          {article.notebook && (
            <NotebookLinks
              notebookPath={article.notebook}
              title="交互式代码实践"
            />
          )}

          {/* 阅读位置记忆 */}
          <ReadingPositionResume articleSlug={articleSlug} />

          {/* 图片点击预览 */}
          <ImageLightbox />

          {/* 文章内容 */}
          <article id="article-content" className="prose prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight, rehypeSlug]}
              components={{
                h1: ({node, ...props}) => <h1 data-p-idx={pIdx++} className="text-3xl font-extrabold mt-10 mb-4 text-gray-900 tracking-tight" {...props} />,
                h2: ({node, ...props}) => <h2 data-p-idx={pIdx++} className="text-2xl font-bold mt-12 mb-4 text-gray-900 tracking-tight scroll-mt-20 pb-2 border-b border-gray-100" {...props} />,
                h3: ({node, ...props}) => <h3 data-p-idx={pIdx++} className="text-xl font-bold mt-8 mb-3 text-gray-900 scroll-mt-20" {...props} />,
                p: ({node, ...props}) => <p data-p-idx={pIdx++} className="mb-5 text-gray-600 leading-[1.8]" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-200 hover:decoration-blue-400 transition" {...props} />,
                code: ({node, inline, className, children, ...props}: any) => {
                  const match = /language-mermaid/.exec(className || '')
                  if (!inline && match) {
                    const chart = String(children).replace(/\n$/, '')
                    return <MermaidBlock chart={chart} />
                  }
                  return inline ?
                    <code className="bg-gray-100 !text-gray-900 px-1.5 py-0.5 rounded text-[0.85em] font-mono border-0" {...props}>{children}</code> :
                    <code className={`block text-gray-200 p-4 overflow-x-auto text-sm font-mono leading-relaxed ${className || ''}`} {...props}>{children}</code>
                },
                pre: ({node, children, ...props}: any) => {
                  const child = Array.isArray(children) ? children[0] : children
                  if (child?.props?.className?.includes('language-mermaid')) {
                    return <>{children}</>
                  }
                  return <CodeBlock data-p-idx={pIdx++} className={child?.props?.className}>{children}</CodeBlock>
                },
                ul: ({node, ...props}) => <ul data-p-idx={pIdx++} className="list-disc pl-6 mb-5 space-y-2 text-gray-600 leading-[1.8]" {...props} />,
                ol: ({node, ...props}) => <ol data-p-idx={pIdx++} className="list-decimal pl-6 mb-5 space-y-2 text-gray-600 leading-[1.8]" {...props} />,
                blockquote: ({node, ...props}) => <blockquote data-p-idx={pIdx++} className="border-l-[3px] border-blue-400 pl-5 my-6 text-gray-500 italic bg-blue-50/30 py-3 pr-4 rounded-r-lg" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto my-6 rounded-xl border border-gray-200"><table data-p-idx={pIdx++} className="min-w-full divide-y divide-gray-200" {...props} /></div>,
                th: ({node, ...props}) => <th data-p-idx={pIdx++} className="px-4 py-2.5 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500" {...props} />,
                td: ({node, ...props}) => <td data-p-idx={pIdx++} className="px-4 py-2.5 border-t border-gray-100 text-sm" {...props} />,
                li: ({node, ...props}) => <li data-p-idx={pIdx++} {...props} />,
                kbd: ({node, ...props}) => <kbd className="inline-flex items-center px-2 py-0.5 rounded text-[0.85em] font-mono font-medium bg-gray-100 text-gray-900 border border-gray-300 shadow-[0_1px_0_rgba(0,0,0,0.15)]" {...props} />,
              }}
            >
              {article.content}
            </ReactMarkdown>
          </article>

          {/* AI 精读助手 */}
          <ArticleReadingAssistant
            articleTitle={article.title}
            articleContent={article.content}
            articleSlug={articleSlug}
          />

          {/* 划线评论 */}
          <HighlightComments articleSlug={articleSlug} articleTitle={article.title} />

          {/* 文章评论 */}
          <CommentSection articleSlug={articleSlug} />

          {/* 文章完成按钮 */}
          <div className="mt-8">
            <ArticleProgress slug={params.slug} category={params.category} />
          </div>

          {/* 文章导航 */}
          <ArticleNavigation
            previous={navigation.previous}
            next={navigation.next}
            relatedArticles={navigation.related}
          />

          {/* 底部导航 */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <a
              href="/articles"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回文章列表
            </a>
          </div>
        </div>

        {/* 右侧栏：目录 + 相关知识 */}
        <aside className="hidden lg:block w-64 shrink-0 pt-2">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin pr-1">
            <TableOfContents content={article.content} />
            <RelatedKnowledge
              title={article.title}
              excerpt={article.excerpt}
              currentSlug={articleSlug}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
