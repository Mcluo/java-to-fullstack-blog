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
      readTime: 20
    },
    {
      title: 'React 核心概念：对比 Java Spring 框架',
      excerpt: '通过 Spring 框架的概念类比，快速理解 React 的组件、状态管理、依赖注入和生命周期',
      category: 'frontend',
      slug: '02-react-vs-spring',
      tags: ['react', 'spring', 'components'],
      difficulty: 'beginner',
      readTime: 25
    },
    {
      title: 'Node.js 异步编程：对比 Java 多线程模型',
      excerpt: '理解 Node.js 的事件循环机制，对比 Java 的多线程并发模型，掌握 async/await 模式',
      category: 'backend',
      slug: '01-nodejs-async-programming',
      tags: ['nodejs', 'async', 'java'],
      difficulty: 'intermediate',
      readTime: 25
    },
    {
      title: 'Python 基础速成：Java 开发者版',
      excerpt: '通过 Java 对比快速掌握 Python 核心语法、数据结构和面向对象编程',
      category: 'ai',
      slug: '01-python-for-java-developers',
      tags: ['python', 'java', 'syntax'],
      difficulty: 'beginner',
      readTime: 20
    }
  ]

  const learningPaths = [
    {
      title: '初级路线',
      duration: '1-2 个月',
      topics: ['JavaScript/TypeScript 基础', 'React 入门', 'Node.js 基础', '第一个全栈项目']
    },
    {
      title: '中级路线',
      duration: '3-4 个月',
      topics: ['React 高级特性', '数据库设计', 'RESTful API', 'Python 基础']
    },
    {
      title: '高级路线',
      duration: '5-6 个月',
      topics: ['性能优化', '微服务架构', '机器学习入门', 'LangChain 和 RAG']
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Java 工程师转型全栈+AI 开发
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          系统化学习路径，从 Java 到全栈开发工程师和 AI 工程师
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/articles"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            开始学习
          </Link>
          <Link
            href="/roadmap"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition"
          >
            查看路线图
          </Link>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">学习路径</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {learningPaths.map((path, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-600">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{path.title}</h3>
              <p className="text-gray-600 mb-4">{path.duration}</p>
              <ul className="space-y-2">
                {path.topics.map((topic, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span className="text-gray-700">{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Articles */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-8">最新教程</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {articles.map((article, index) => (
            <Link
              key={index}
              href={`/articles/${article.category}/${article.slug}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center mb-2">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium mr-2
                  ${article.category === 'frontend' ? 'bg-blue-100 text-blue-800' : ''}
                  ${article.category === 'backend' ? 'bg-green-100 text-green-800' : ''}
                  ${article.category === 'ai' ? 'bg-purple-100 text-purple-800' : ''}
                `}>
                  {article.category === 'frontend' ? '前端' : ''}
                  {article.category === 'backend' ? '后端' : ''}
                  {article.category === 'ai' ? 'AI' : ''}
                </span>
                <span className="text-sm text-gray-500">{article.readTime} 分钟阅读</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{article.title}</h3>
              <p className="text-gray-600 mb-4">{article.excerpt}</p>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, i) => (
                  <span key={i} className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 bg-blue-600 rounded-lg p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">准备好开始转型了吗？</h2>
        <p className="text-xl mb-6">
          从第一篇教程开始，系统化地学习全栈开发和 AI 技术
        </p>
        <Link
          href="/articles/frontend/01-typescript-for-java-developers"
          className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          开始第一课
        </Link>
      </div>
    </div>
  )
}
