import Link from 'next/link'

interface Article {
  title: string
  category: string
  slug: string
}

interface ArticleNavigationProps {
  previous?: Article
  next?: Article
  relatedArticles?: Article[]
}

export default function ArticleNavigation({
  previous,
  next,
  relatedArticles = []
}: ArticleNavigationProps) {
  return (
    <div className="mt-12 space-y-8">
      {/* 前后文章导航 */}
      {(previous || next) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {previous ? (
            <Link
              href={`/articles/${previous.category}/${previous.slug}`}
              className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition group"
            >
              <div className="text-sm text-gray-500 mb-2">← 上一篇</div>
              <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                {previous.title}
              </div>
            </Link>
          ) : (
            <div></div>
          )}

          {next && (
            <Link
              href={`/articles/${next.category}/${next.slug}`}
              className="p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 transition group text-right"
            >
              <div className="text-sm text-gray-500 mb-2">下一篇 →</div>
              <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                {next.title}
              </div>
            </Link>
          )}
        </div>
      )}

      {/* 相关文章推荐 */}
      {relatedArticles.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
          <h3 className="text-lg font-bold text-blue-900 mb-4">📚 相关文章推荐</h3>
          <div className="space-y-2">
            {relatedArticles.map((article, index) => (
              <Link
                key={index}
                href={`/articles/${article.category}/${article.slug}`}
                className="block text-blue-700 hover:text-blue-900 hover:underline"
              >
                • {article.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
