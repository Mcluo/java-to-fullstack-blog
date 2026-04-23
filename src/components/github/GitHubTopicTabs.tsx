'use client'

import { PRESET_TOPICS } from '@/lib/github'
import type { PresetTopic } from '@/lib/github'

export interface CustomTopic {
  key: string
  label: string
  queries: string[]
  sort: 'stars' | 'forks' | 'updated'
}

interface Props {
  activeKey: string
  customTopics: CustomTopic[]
  onSelect: (key: string) => void
  onManage: () => void
  recommendationActive?: boolean
  onRecommendation?: () => void
}

export default function GitHubTopicTabs({ activeKey, customTopics, onSelect, onManage, recommendationActive, onRecommendation }: Props) {
  const allTopics: (PresetTopic | CustomTopic)[] = [
    ...PRESET_TOPICS,
    ...customTopics,
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 为你推荐 Tab */}
      {onRecommendation && (
        <button
          onClick={onRecommendation}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            recommendationActive
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm shadow-purple-200'
              : 'bg-gradient-to-r from-blue-50 to-purple-50 text-purple-600 hover:from-blue-100 hover:to-purple-100 border border-purple-200'
          }`}
        >
          <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          为你推荐
        </button>
      )}

      {/* 分隔线 */}
      {onRecommendation && (
        <div className="w-px h-6 bg-gray-200" />
      )}

      {allTopics.map(topic => (
        <button
          key={topic.key}
          onClick={() => onSelect(topic.key)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeKey === topic.key
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {topic.label}
          {/* 自定义标记 */}
          {'builtin' in topic ? '' : (
            <span className="ml-1 text-[10px] opacity-60">*</span>
          )}
        </button>
      ))}

      {/* 管理按钮 */}
      <button
        onClick={onManage}
        className="px-3 py-2 text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-dashed border-gray-300 hover:border-blue-300"
        title="管理自定义榜单"
      >
        <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
