'use client'

import type { RecommendedRepo } from '@/lib/github-preferences'

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

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d',
  C: '#555555', 'C#': '#178600', Swift: '#F05138', Kotlin: '#A97BFF',
  Ruby: '#701516', PHP: '#4F5D95', Shell: '#89e051', Dart: '#00B4AB',
  Scala: '#c22d40', Lua: '#000080', Zig: '#ec915c', Vue: '#41b883',
}

interface Props {
  repo: RecommendedRepo
  onDismiss?: (repoId: number) => void
}

export default function RecommendationCard({ repo, onDismiss }: Props) {
  const rec = repo.recommendation

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
      {/* 推荐理由区域 */}
      {rec && (
        <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-b border-blue-100/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold text-blue-600">AI 推荐理由</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{rec.reason}</p>
              {rec.summary && (
                <p className="mt-1.5 text-xs text-gray-500 italic">{rec.summary}</p>
              )}
              {/* 匹配标签 */}
              {rec.matchedInterests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {rec.matchedInterests.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* 不感兴趣按钮 */}
            {onDismiss && (
              <button
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDismiss(repo.id)
                }}
                className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="不感兴趣"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 仓库信息 */}
      <a
        href={repo.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-5"
      >
        <div className="flex items-start gap-4">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-10 h-10 rounded-lg flex-shrink-0"
          />

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
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {formatCount(repo.stargazers_count)}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V3m10 4V3M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z" />
                </svg>
                {formatCount(repo.forks_count)}
              </span>
              {repo.language && (
                <span className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: LANG_COLORS[repo.language] || '#ccc' }}
                  />
                  {repo.language}
                </span>
              )}
              <span className="ml-auto text-gray-400">
                Updated {timeAgo(repo.pushed_at)}
              </span>
            </div>
          </div>
        </div>
      </a>
    </div>
  )
}
