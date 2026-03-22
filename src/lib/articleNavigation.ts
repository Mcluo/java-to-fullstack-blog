// 文章导航和关联关系定义
interface Article {
  title: string
  category: string
  slug: string
}

interface ArticleRelations {
  previous?: Article
  next?: Article
  related?: Article[]
}

// 文章导航映射表
const articleNavigations: Record<string, ArticleRelations> = {
  // 快速启动系列
  'quickstart/01-typescript-react-30min': {
    next: {
      title: 'React核心概念',
      category: 'frontend',
      slug: '02-react-vs-spring'
    },
    related: [
      {
        title: 'TypeScript快速入门',
        category: 'frontend',
        slug: '01-typescript-for-java-developers'
      },
      {
        title: 'Node.js异步编程',
        category: 'backend',
        slug: '01-nodejs-async-programming'
      }
    ]
  },

  // 前端系列
  'frontend/01-typescript-for-java-developers': {
    next: {
      title: 'React核心概念',
      category: 'frontend',
      slug: '02-react-vs-spring'
    },
    related: [
      {
        title: 'TypeScript + React 30分钟',
        category: 'quickstart',
        slug: '01-typescript-react-30min'
      }
    ]
  },

  'frontend/02-react-vs-spring': {
    previous: {
      title: 'TypeScript快速入门',
      category: 'frontend',
      slug: '01-typescript-for-java-developers'
    },
    next: {
      title: 'Node.js异步编程',
      category: 'backend',
      slug: '01-nodejs-async-programming'
    },
    related: [
      {
        title: 'TypeScript + React 30分钟',
        category: 'quickstart',
        slug: '01-typescript-react-30min'
      }
    ]
  },

  // 后端系列
  'backend/01-nodejs-async-programming': {
    previous: {
      title: 'React核心概念',
      category: 'frontend',
      slug: '02-react-vs-spring'
    },
    next: {
      title: 'Python for Java',
      category: 'ai',
      slug: '01-python-for-java-developers'
    },
    related: [
      {
        title: 'TypeScript快速入门',
        category: 'frontend',
        slug: '01-typescript-for-java-developers'
      }
    ]
  },

  // AI系列
  'ai/01-python-for-java-developers': {
    previous: {
      title: 'Node.js异步编程',
      category: 'backend',
      slug: '01-nodejs-async-programming'
    },
    related: [
      {
        title: 'TypeScript快速入门',
        category: 'frontend',
        slug: '01-typescript-for-java-developers'
      }
    ]
  }
}

// 获取文章的导航关系
export function getArticleNavigation(category: string, slug: string): ArticleRelations {
  const key = `${category}/${slug}`
  return articleNavigations[key] || {}
}

// 获取所有文章列表（用于进度统计）
export function getAllArticles(): Article[] {
  return [
    // 快速启动
    { title: 'TypeScript + React 30分钟', category: 'quickstart', slug: '01-typescript-react-30min' },

    // 前端
    { title: 'TypeScript快速入门', category: 'frontend', slug: '01-typescript-for-java-developers' },
    { title: 'React核心概念', category: 'frontend', slug: '02-react-vs-spring' },

    // 后端
    { title: 'Node.js异步编程', category: 'backend', slug: '01-nodejs-async-programming' },

    // AI
    { title: 'Python for Java', category: 'ai', slug: '01-python-for-java-developers' }
  ]
}
