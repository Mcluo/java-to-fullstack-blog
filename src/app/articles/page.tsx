import { getAllArticles, getCategories, CATEGORY_CONFIG, CATEGORY_GROUPS } from '@/lib/articles'
import ArticleListClient from '@/components/ArticleListClient'

export default function ArticlesPage({
  searchParams,
}: {
  searchParams: { tag?: string }
}) {
  const articles = getAllArticles()
  const activeCategorySlugs = getCategories()

  const categories = activeCategorySlugs.map(slug => {
    const config = CATEGORY_CONFIG[slug]
    return {
      name: config?.name || slug,
      slug,
      group: config?.group || '其他',
      color: config ? `${config.bgColor} ${config.textColor}` : 'bg-gray-100 text-gray-800',
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <ArticleListClient
        articles={articles}
        categories={categories}
        groups={[...CATEGORY_GROUPS]}
        initialTag={searchParams.tag ?? null}
      />
    </div>
  )
}
