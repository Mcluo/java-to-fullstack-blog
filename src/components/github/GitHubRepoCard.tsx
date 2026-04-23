'use client'

import type { GitHubRepo } from '@/lib/github'

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return '今天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

// 语言颜色映射
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d',
  C: '#555555', 'C#': '#178600', Swift: '#F05138', Kotlin: '#A97BFF',
  Ruby: '#701516', PHP: '#4F5D95', Shell: '#89e051', Dart: '#00B4AB',
  Scala: '#c22d40', Lua: '#000080', Zig: '#ec915c', Vue: '#41b883',
  HTML: '#e34c26', CSS: '#563d7c', Jupyter: '#DA5B0B',
}

export default function GitHubRepoCard({ repo, rank }: { repo: GitHubRepo; rank?: number }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        {/* 排名 */}
        {rank && (
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
            rank <= 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
            rank <= 10 ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {rank}
          </div>
        )}

        {/* 头像 */}
        <img
          src={repo.owner.avatar_url}
          alt={repo.owner.login}
          className="w-10 h-10 rounded-lg flex-shrink-0"
        />

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
              {repo.full_name}
            </h3>
            {repo.license && (
              <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">
                {repo.license.spdx_id}
              </span>
            )}
          </div>

          {repo.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{repo.description}</p>
          )}

          {/* Topics */}
          {repo.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {repo.topics.slice(0, 6).map(topic => (
                <span key={topic} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                  {topic}
                </span>
              ))}
              {repo.topics.length > 6 && (
                <span className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full">
                  +{repo.topics.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            {/* Stars */}
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {formatCount(repo.stargazers_count)}
            </span>

            {/* Forks */}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V3m10 4V3M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z" />
              </svg>
              {formatCount(repo.forks_count)}
            </span>

            {/* Language */}
            {repo.language && (
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: LANG_COLORS[repo.language] || '#ccc' }}
                />
                {repo.language}
              </span>
            )}

            {/* Updated */}
            <span className="ml-auto text-gray-400">
              Updated {timeAgo(repo.pushed_at)}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}
