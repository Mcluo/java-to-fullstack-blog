import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import 'highlight.js/styles/github-dark.css'
import ArticleProgress from '@/components/ArticleProgress'
import ArticleNavigation from '@/components/ArticleNavigation'
import ArticleTags from '@/components/ArticleTags'
import NotebookLinks from '@/components/NotebookLinks'
import TableOfContents from '@/components/TableOfContents'
import CommentSection from '@/components/CommentSection'
import HighlightComments from '@/components/HighlightComments'
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 面包屑 */}
      <nav className="mb-8 text-sm text-gray-600">
        <a href="/" className="hover:text-blue-600">首页</a>
        <span className="mx-2">/</span>
        <a href="/articles" className="hover:text-blue-600">教程</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{categoryName}</span>
      </nav>

      <div className="lg:flex lg:gap-8">
        {/* 文章主体 */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {/* 文章头部 */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {categoryName}
              </span>
              {article.difficulty && (
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${article.difficulty === 'beginner' ? 'bg-green-100 text-green-700' : ''}
                  ${article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${article.difficulty === 'advanced' ? 'bg-red-100 text-red-700' : ''}
                `}>
                  {article.difficulty === 'beginner' ? '初级' : ''}
                  {article.difficulty === 'intermediate' ? '中级' : ''}
                  {article.difficulty === 'advanced' ? '高级' : ''}
                </span>
              )}
              {article.readTime && (
                <span className="text-sm text-gray-500">
                  阅读时间：{article.readTime} 分钟
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-xl text-gray-600 mb-6">
                {article.excerpt}
              </p>
            )}

            {article.tags && <ArticleTags tags={article.tags} />}

            {/* 时间信息 */}
            {(article.publishedAt || article.updatedAt) && (
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
                {article.publishedAt && (
                  <span>发布于 {article.publishedAt.slice(0, 10)}</span>
                )}
                {article.updatedAt && (
                  <span>· 更新于 {article.updatedAt}</span>
                )}
              </div>
            )}
          </header>

          {/* Jupyter Notebook 链接 */}
          {article.notebook && (
            <NotebookLinks
              notebookPath={article.notebook}
              title="交互式代码实践"
            />
          )}

          {/* 文章内容 */}
          <article id="article-content" className="prose prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeSlug]}
              components={{
                h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-5 mb-2 text-gray-900" {...props} />,
                p: ({node, ...props}) => <p data-p-idx={pIdx++} className="mb-4 text-gray-700 leading-relaxed" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                code: ({node, inline, ...props}: any) =>
                  inline ?
                    <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm" {...props} /> :
                    <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-gray-900 rounded-lg overflow-x-auto my-4" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4" {...props} />,
                table: ({node, ...props}) => <table className="min-w-full divide-y divide-gray-200 my-4" {...props} />,
                th: ({node, ...props}) => <th className="px-4 py-2 bg-gray-50 text-left font-semibold" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-2 border-t" {...props} />,
              }}
            >
              {article.content}
            </ReactMarkdown>
          </article>

          {/* 划线评论 */}
          <HighlightComments articleSlug={articleSlug} />

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
          <div className="mt-12 pt-8 border-t">
            <a
              href="/articles"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              返回文章列表
            </a>
          </div>
        </div>

        {/* 右侧目录 */}
        <aside className="hidden lg:block w-64 shrink-0 pt-2">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin pr-1">
            <TableOfContents content={article.content} />
          </div>
        </aside>
      </div>
    </div>
  )
}
