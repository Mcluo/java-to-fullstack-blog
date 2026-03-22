import Link from 'next/link'

export default function RoadmapPage() {
  const learningPath = {
    quickStart: {
      title: '🚀 快速启动',
      duration: '1-3天',
      level: '初级',
      description: '快速上手，30分钟看到成果',
      completed: 1,
      total: 3,
      articles: [
        {
          title: 'TypeScript + React 30分钟',
          time: '30min',
          difficulty: '⭐',
          status: 'completed',
          link: '/articles/quickstart/01-typescript-react-30min'
        },
        {
          title: 'Node.js + Express 20分钟',
          time: '20min',
          difficulty: '⭐',
          status: 'planned',
          link: null
        },
        {
          title: 'Next.js全栈 1小时',
          time: '60min',
          difficulty: '⭐⭐',
          status: 'planned',
          link: null
        }
      ]
    },
    fundamentals: {
      title: '📚 基础知识',
      duration: '4-8周',
      level: '中级',
      description: '掌握核心技术栈',
      completed: 4,
      total: 12,
      sections: [
        {
          name: '前端开发',
          articles: [
            { title: 'TypeScript快速入门', status: 'completed', link: '/articles/frontend/01-typescript-for-java-developers' },
            { title: 'React核心概念', status: 'completed', link: '/articles/frontend/02-react-vs-spring' },
            { title: 'React Hooks实战', status: 'planned', link: null },
            { title: 'Next.js路由系统', status: 'planned', link: null }
          ]
        },
        {
          name: '后端开发',
          articles: [
            { title: 'Node.js异步编程', status: 'completed', link: '/articles/backend/01-nodejs-async-programming' },
            { title: 'RESTful API设计', status: 'planned', link: null },
            { title: 'Prisma ORM入门', status: 'planned', link: null },
            { title: 'JWT认证实战', status: 'planned', link: null }
          ]
        },
        {
          name: 'AI技术',
          articles: [
            { title: 'Python for Java', status: 'completed', link: '/articles/ai/01-python-for-java-developers' },
            { title: 'Claude API入门', status: 'planned', link: null },
            { title: '提示词工程', status: 'planned', link: null },
            { title: '向量检索基础', status: 'planned', link: null }
          ]
        }
      ]
    },
    projects: {
      title: '🎯 实战项目',
      duration: '4-8周',
      level: '高级',
      description: '完成3个可部署的真实项目',
      completed: 0,
      total: 3,
      items: [
        {
          title: '个人博客系统',
          weeks: 'Week 1-2',
          tech: ['Next.js', 'TypeScript', 'Tailwind', 'Vercel'],
          status: 'planned'
        },
        {
          title: 'AI聊天应用',
          weeks: 'Week 3-4',
          tech: ['Claude API', 'Supabase', 'LangChain'],
          status: 'planned'
        },
        {
          title: '智能搜索引擎',
          weeks: 'Week 5-6',
          tech: ['Embeddings', 'Vector DB', 'RAG'],
          status: 'planned'
        }
      ]
    }
  }

  // 计算总进度
  const totalArticles = learningPath.quickStart.total + learningPath.fundamentals.total + learningPath.projects.total
  const completedArticles = learningPath.quickStart.completed + learningPath.fundamentals.completed + learningPath.projects.completed
  const overallProgress = Math.round((completedArticles / totalArticles) * 100)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">学习路径</h1>
        <p className="text-xl text-gray-600 mb-6">
          系统化学习路线 - 从Java到全栈+AI工程师
        </p>

        {/* 整体进度 */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-semibold text-gray-700">整体进度</span>
            <span className="text-2xl font-bold text-blue-600">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            已完成 {completedArticles} / {totalArticles} 篇文章
          </div>
        </div>
      </div>

      {/* 学习路径 */}
      <div className="space-y-12">
        {/* 初级 - 快速启动 */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold text-gray-900">{learningPath.quickStart.title}</h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {learningPath.quickStart.level}
                </span>
              </div>
              <p className="text-gray-600">{learningPath.quickStart.description}</p>
            </div>
            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-medium">
              {learningPath.quickStart.duration}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-700">进度: {learningPath.quickStart.completed}/{learningPath.quickStart.total}</span>
              <span className="text-sm text-gray-500">
                {Math.round((learningPath.quickStart.completed / learningPath.quickStart.total) * 100)}%
              </span>
            </div>

            <div className="space-y-3">
              {learningPath.quickStart.articles.map((article, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-4">
                    <span className={article.status === 'completed' ? 'text-green-600 text-xl' : 'text-gray-400 text-xl'}>
                      {article.status === 'completed' ? '✓' : '○'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{article.title}</div>
                      <div className="text-sm text-gray-500">{article.time} · {article.difficulty}</div>
                    </div>
                  </div>
                  {article.link ? (
                    <Link
                      href={article.link}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      开始学习
                    </Link>
                  ) : (
                    <span className="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg">
                      即将推出
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 中级 - 基础知识 */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold text-gray-900">{learningPath.fundamentals.title}</h2>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  {learningPath.fundamentals.level}
                </span>
              </div>
              <p className="text-gray-600">{learningPath.fundamentals.description}</p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium">
              {learningPath.fundamentals.duration}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {learningPath.fundamentals.sections.map((section, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{section.name}</h3>
                <div className="space-y-2">
                  {section.articles.map((article, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className={article.status === 'completed' ? 'text-green-600 mt-1' : 'text-gray-400 mt-1'}>
                        {article.status === 'completed' ? '✓' : '○'}
                      </span>
                      {article.link ? (
                        <Link href={article.link} className="text-blue-600 hover:underline flex-1">
                          {article.title}
                        </Link>
                      ) : (
                        <span className="text-gray-500 flex-1">{article.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 高级 - 实战项目 */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold text-gray-900">{learningPath.projects.title}</h2>
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {learningPath.projects.level}
                </span>
              </div>
              <p className="text-gray-600">{learningPath.projects.description}</p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
              {learningPath.projects.duration}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {learningPath.projects.items.map((project, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
                  <span className="text-gray-400">○</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{project.weeks}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, j) => (
                    <span key={j} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <span className="text-sm text-gray-500">即将推出</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 学习建议 */}
      <div className="mt-12 bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
        <h3 className="text-lg font-bold text-blue-900 mb-2">💡 学习建议</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• <strong>新手入门</strong> → 从 🚀 快速启动开始，1-3天看到成果</li>
          <li>• <strong>30分钟法则</strong> → 每个教程都能在30分钟内完成</li>
          <li>• <strong>AI辅助学习</strong> → 遇到问题先问AI（Claude/ChatGPT）</li>
          <li>• <strong>项目驱动</strong> → 边做项目边学习，不要追求完美</li>
          <li>• <strong>循序渐进</strong> → 按初级→中级→高级顺序学习，打好基础</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="mt-8 bg-blue-600 rounded-lg p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">准备好开始学习了吗？</h2>
        <p className="text-xl mb-6">从第一篇教程开始你的转型之旅</p>
        <Link
          href="/articles/quickstart/01-typescript-react-30min"
          className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          开始第一课 →
        </Link>
      </div>
    </div>
  )
}
