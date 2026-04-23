'use client'

import { useState, useEffect } from 'react'
import {
  type GitHubPreferences,
  DEFAULT_PREFERENCES,
  INTEREST_PRESETS,
  FOCUS_OPTIONS,
  loadPreferences,
  savePreferences,
} from '@/lib/github-preferences'
import { POPULAR_LANGUAGES } from '@/lib/github'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (prefs: GitHubPreferences) => void
}

export default function PreferencesPanel({ open, onClose, onSave }: Props) {
  const [prefs, setPrefs] = useState<GitHubPreferences>(DEFAULT_PREFERENCES)
  const [keywordInput, setKeywordInput] = useState('')
  const [customInterestInput, setCustomInterestInput] = useState('')

  useEffect(() => {
    if (open) {
      setPrefs(loadPreferences())
    }
  }, [open])

  const toggleInterest = (interest: string) => {
    setPrefs(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const addCustomInterest = () => {
    const v = customInterestInput.trim()
    if (v && !prefs.interests.includes(v)) {
      setPrefs(prev => ({ ...prev, interests: [...prev.interests, v] }))
      setCustomInterestInput('')
    }
  }

  const toggleLanguage = (lang: string) => {
    setPrefs(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }))
  }

  const toggleFocus = (key: 'trending' | 'new' | 'underrated') => {
    setPrefs(prev => ({
      ...prev,
      focus: prev.focus.includes(key)
        ? prev.focus.filter(f => f !== key)
        : [...prev.focus, key],
    }))
  }

  const addKeyword = () => {
    const v = keywordInput.trim()
    if (v && !prefs.keywords.includes(v)) {
      setPrefs(prev => ({ ...prev, keywords: [...prev.keywords, v] }))
      setKeywordInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    setPrefs(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }))
  }

  const handleSave = () => {
    savePreferences(prefs)
    onSave(prefs)
    onClose()
  }

  const handleReset = () => {
    setPrefs(DEFAULT_PREFERENCES)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">偏好设置</h2>
            <p className="text-sm text-gray-500 mt-0.5">告诉我你的兴趣，获取个性化推荐</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 兴趣领域 */}
          <section>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              兴趣领域
              <span className="ml-2 text-xs font-normal text-gray-400">选择你关注的技术方向</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_PRESETS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    prefs.interests.includes(interest)
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            {/* 自定义兴趣 */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customInterestInput}
                onChange={e => setCustomInterestInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
                placeholder="添加自定义兴趣..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={addCustomInterest}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
              >
                添加
              </button>
            </div>
            {/* 已选中的自定义兴趣（非预设的） */}
            {prefs.interests.filter(i => !INTEREST_PRESETS.includes(i)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {prefs.interests.filter(i => !INTEREST_PRESETS.includes(i)).map(interest => (
                  <span
                    key={interest}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                  >
                    {interest}
                    <button onClick={() => toggleInterest(interest)} className="hover:text-purple-900">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 编程语言 */}
          <section>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              编程语言
              <span className="ml-2 text-xs font-normal text-gray-400">可选，筛选特定语言的项目</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    prefs.languages.includes(lang)
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </section>

          {/* 关注维度 */}
          <section>
            <label className="block text-sm font-semibold text-gray-800 mb-2">关注维度</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => toggleFocus(opt.key)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    prefs.focus.includes(opt.key)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-medium ${prefs.focus.includes(opt.key) ? 'text-blue-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 最低 Star 数 */}
          <section>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              最低 Star 数
              <span className="ml-2 text-xs font-normal text-gray-400">
                当前: {prefs.minStars.toLocaleString()}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={10000}
              step={100}
              value={prefs.minStars}
              onChange={e => setPrefs(prev => ({ ...prev, minStars: Number(e.target.value) }))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>1k</span>
              <span>5k</span>
              <span>10k</span>
            </div>
          </section>

          {/* 自定义关键词 */}
          <section>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              自定义关键词
              <span className="ml-2 text-xs font-normal text-gray-400">添加你特别关注的技术关键词</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="例如: rag, agent framework, edge runtime"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                添加
              </button>
            </div>
            {prefs.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {prefs.keywords.map(kw => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-100 text-amber-700 rounded-full"
                  >
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-amber-900">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-red-600 transition"
          >
            重置偏好
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              保存并推荐
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
