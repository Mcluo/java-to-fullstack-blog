import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import ArticleProgress from '@/components/ArticleProgress'
import ArticleNavigation from '@/components/ArticleNavigation'
import ArticleTags from '@/components/ArticleTags'
import NotebookLinks from '@/components/NotebookLinks'
import { getArticleNavigation } from '@/lib/articleNavigation'

export async function generateStaticParams() {
  return [
    { category: 'quickstart', slug: '01-typescript-react-30min' },
    { category: 'frontend', slug: '01-typescript-for-java-developers' },
    { category: 'frontend', slug: '02-react-vs-spring' },
    { category: 'backend', slug: '01-nodejs-async-programming' },
    { category: 'ai', slug: '01-python-for-java-developers' },
  ]
}

async function getArticle(category: string, slug: string) {
  const filePath = path.join(process.cwd(), 'content', 'articles', category, `${slug}.md`)

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)
    return { frontmatter: data, content }
  } catch (error) {
    return null
  }
}

export default async function ArticlePage({
  params,
}: {
  params: { category: string; slug: string }
}) {
  const article = await getArticle(params.category, params.slug)

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

  const { frontmatter, content } = article

  // 获取文章导航关系
  const navigation = getArticleNavigation(params.category, params.slug)

  const categoryName = {
    quickstart: '🚀 快速启动',
    frontend: '前端',
    backend: '后端',
    ai: 'AI',
    devops: 'DevOps',
    projects: '实战项目'
  }[params.category] || params.category

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 面包屑 */}
      <nav className="mb-8 text-sm text-gray-600">
        <a href="/" className="hover:text-blue-600">首页</a>
        <span className="mx-2">/</span>
        <a href="/articles" className="hover:text-blue-600">教程</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{categoryName}</span>
      </nav>

      {/* 文章头部 */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${params.category === 'quickstart' ? 'bg-orange-100 text-orange-800' : ''}
            ${params.category === 'frontend' ? 'bg-blue-100 text-blue-800' : ''}
            ${params.category === 'backend' ? 'bg-green-100 text-green-800' : ''}
            ${params.category === 'ai' ? 'bg-purple-100 text-purple-800' : ''}
          `}>
            {categoryName}
          </span>
          {frontmatter.difficulty && (
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${frontmatter.difficulty === 'beginner' ? 'bg-green-100 text-green-700' : ''}
              ${frontmatter.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' : ''}
              ${frontmatter.difficulty === 'advanced' ? 'bg-red-100 text-red-700' : ''}
            `}>
              {frontmatter.difficulty === 'beginner' ? '初级' : ''}
              {frontmatter.difficulty === 'intermediate' ? '中级' : ''}
              {frontmatter.difficulty === 'advanced' ? '高级' : ''}
            </span>
          )}
          {frontmatter.readTime && (
            <span className="text-sm text-gray-500">
              阅读时间：{frontmatter.readTime} 分钟
            </span>
          )}
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {frontmatter.title}
        </h1>

        {frontmatter.excerpt && (
          <p className="text-xl text-gray-600 mb-6">
            {frontmatter.excerpt}
          </p>
        )}

        {frontmatter.tags && <ArticleTags tags={frontmatter.tags} />}
      </header>

      {/* Jupyter Notebook 链接 */}
      {frontmatter.notebook && (
        <NotebookLinks
          notebookPath={frontmatter.notebook}
          title="💻 交互式代码实践"
        />
      )}

      {/* 文章内容 */}
      <article className="prose prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-5 mb-2 text-gray-900" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
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
          {content}
        </ReactMarkdown>
      </article>

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
  )
}
