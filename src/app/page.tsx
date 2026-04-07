import Link from 'next/link'

export default function Home() {
  const articles = [
    {
      title: 'TypeScript 快速入门：Java 工程师视角',
      excerpt: '从 Java 开发者的角度理解 TypeScript，对比两种语言的类型系统、面向对象特性和开发模式',
      category: 'frontend',
      slug: '01-typescript-for-java-developers',
      tags: ['typescript', 'javascript', 'java'],
      difficulty: 'beginner',
      readTime: 20,
      icon: '🔤',
    },
    {
      title: 'React 核心概念：对比 Java Spring 框架',
      excerpt: '通过 Spring 框架的概念类比，快速理解 React 的组件、状态管理和生命周期',
      category: 'frontend',
      slug: '02-react-vs-spring',
      tags: ['react', 'spring', 'components'],
      difficulty: 'beginner',
      readTime: 25,
      icon: '⚛️',
    },
    {
      title: 'Node.js 异步编程：对比 Java 多线程模型',
      excerpt: '理解 Node.js 的事件循环机制，对比 Java 的多线程并发模型',
      category: 'backend',
      slug: '01-nodejs-async-programming',
      tags: ['nodejs', 'async', 'java'],
      difficulty: 'intermediate',
      readTime: 25,
      icon: '🔄',
    },
    {
      title: 'Supabase 入门：Java 工程师的 BaaS 指南',
      excerpt: '从 Spring Boot 视角理解 Supabase，掌握数据库、认证、存储、实时推送能力',
      category: 'backend',
      slug: '02-supabase-for-java-developers',
      tags: ['supabase', 'postgresql', 'baas'],
      difficulty: 'beginner',
      readTime: 18,
      icon: '⚡',
    },
  ]

  const learningPaths = [
    {
      title: '初级路线',
      duration: '1-2 个月',
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50',
      topics: ['JavaScript/TypeScript 基础', 'React 入门', 'Node.js 基础', '第一个全栈项目'],
    },
    {
      title: '中级路线',
      duration: '3-4 个月',
      gradient: 'from-blue-500 to-indigo-600',
      lightBg: 'bg-blue-50',
      topics: ['React 高级特性', '数据库设计', 'RESTful API', 'Python 基础'],
    },
    {
      title: '高级路线',
      duration: '5-6 个月',
      gradient: 'from-violet-500 to-purple-600',
      lightBg: 'bg-violet-50',
      topics: ['性能优化', '微服务架构', '机器学习入门', 'LangChain 和 RAG'],
    },
  ]

  const categoryColors: Record<string, string> = {
    frontend: 'text-blue-600 bg-blue-50 ring-blue-100',
    backend: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
    ai: 'text-violet-600 bg-violet-50 ring-violet-100',
  }

  const categoryNames: Record<string, string> = {
    frontend: '前端',
    backend: '后端',
    ai: 'AI',
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 ring-1 ring-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              持续更新中
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Java 工程师
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                全栈 + AI 转型
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto">
              系统化学习路径，用你熟悉的 Java 经验类比前端、后端和 AI 技术，
              <br className="hidden sm:block" />
              从 Spring Boot 到 Next.js，从 JPA 到 Supabase。
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/articles"
                className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition shadow-lg shadow-gray-900/10 hover:shadow-xl hover:shadow-gray-900/15"
              >
                开始学习
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/roadmap"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-7 py-3.5 rounded-xl font-semibold text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition shadow-sm"
              >
                查看路线图
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-12 mt-16 text-center">
            {[
              { value: '30+', label: '篇教程' },
              { value: '10+', label: '技术领域' },
              { value: 'Java', label: '类比教学' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">学习路径</h2>
          <p className="text-gray-500">选择适合你的节奏，系统化提升技能</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {learningPaths.map((path, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-7 border border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg hover:shadow-gray-100/50"
            >
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${path.gradient} mb-5`}>
                {path.duration}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-5">{path.title}</h3>
              <ul className="space-y-3">
                {path.topics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <svg className="w-5 h-5 text-gray-300 shrink-0 mt-0.5 group-hover:text-green-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-600">{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Articles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">最新教程</h2>
            <p className="text-gray-500">从 Java 视角快速上手新技术</p>
          </div>
          <Link href="/articles" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition hidden sm:block">
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article, index) => (
            <Link
              key={index}
              href={`/articles/${article.category}/${article.slug}`}
              className="group flex gap-5 bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg hover:shadow-gray-100/50"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {article.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${categoryColors[article.category]}`}>
                    {categoryNames[article.category]}
                  </span>
                  <span className="text-xs text-gray-400">{article.readTime} min</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition truncate">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-1">
                  {article.excerpt}
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 shrink-0 self-center transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8 sm:hidden">
          <Link href="/articles" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition">
            查看全部教程 →
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-8 py-14 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.2),transparent)]" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">准备好开始转型了吗？</h2>
            <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
              从第一篇教程开始，用你的 Java 经验快速掌握全栈开发和 AI 技术
            </p>
            <Link
              href="/articles/frontend/01-typescript-for-java-developers"
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-100 transition shadow-lg"
            >
              开始第一课
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
