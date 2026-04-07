'use client'

import { useSettings } from '@/components/SettingsProvider'
import { ACCENT_COLORS, FONT_SIZE_MAP, CONTENT_WIDTH_MAP, type UserSettings } from '@/lib/settings'
import { loadProgress, clearProgress } from '@/lib/progress'
import { useRef } from 'react'

// --- Reusable UI pieces ---

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-400 mb-5">{description}</p>}
      {!description && <div className="mb-5" />}
      <div className="space-y-6">{children}</div>
    </section>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function OptionGroup<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-blue-500' : 'bg-gray-200'
      }`}
      style={checked ? { backgroundColor: `hsl(var(--accent-hue, 220) 80% 55%)` } : undefined}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-5' : ''
      }`} />
    </button>
  )
}

// --- Page ---

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportProgress = () => {
    const progress = loadProgress()
    const data = {
      exportTime: new Date().toISOString(),
      settings,
      progress,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blog-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.progress) {
          localStorage.setItem('blog_learning_progress', JSON.stringify(data.progress))
        }
        if (data.settings) {
          updateSettings(data.settings)
        }
        alert('导入成功！页面即将刷新。')
        window.location.reload()
      } catch {
        alert('导入失败：文件格式不正确')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleResetAll = () => {
    if (!confirm('确定要重置所有数据？这将清除学习进度、聊天记录和设置。此操作不可恢复。')) return
    clearProgress()
    localStorage.removeItem('ai_chat_sessions')
    localStorage.removeItem('ai_active_session')
    // Clear all session messages
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('ai_session_')) {
        localStorage.removeItem(key)
      }
    }
    resetSettings()
    alert('所有数据已重置。')
    window.location.reload()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">设置</h1>
        <p className="text-gray-500">自定义你的博客阅读体验</p>
      </div>

      <div className="space-y-5">
        {/* ── Appearance ── */}
        <Section title="外观" description="主题模式与配色方案">
          <SettingRow label="主题模式" description="控制页面的明暗风格">
            <OptionGroup
              value={settings.theme}
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
                { value: 'system', label: '系统' },
              ]}
              onChange={(v) => updateSettings({ theme: v })}
            />
          </SettingRow>

          <SettingRow label="主题色" description="影响链接、按钮和高亮色">
            <div className="flex gap-2">
              {(Object.entries(ACCENT_COLORS) as [UserSettings['accentColor'], typeof ACCENT_COLORS['blue']][]).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => updateSettings({ accentColor: key })}
                  className={`w-8 h-8 rounded-full ${c.preview} transition-all ${
                    settings.accentColor === key
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105 opacity-60 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </SettingRow>

          <SettingRow label="代码块主题">
            <OptionGroup
              value={settings.codeTheme}
              options={[
                { value: 'github-dark', label: 'GitHub Dark' },
                { value: 'one-dark', label: 'One Dark' },
                { value: 'dracula', label: 'Dracula' },
              ]}
              onChange={(v) => updateSettings({ codeTheme: v })}
            />
          </SettingRow>
        </Section>

        {/* ── Reading ── */}
        <Section title="阅读" description="文章排版与显示偏好">
          <SettingRow label="正文字号" description="调整文章正文的字体大小">
            <OptionGroup
              value={settings.fontSize}
              options={[
                { value: 'sm', label: '小' },
                { value: 'md', label: '中' },
                { value: 'lg', label: '大' },
                { value: 'xl', label: '特大' },
              ]}
              onChange={(v) => updateSettings({ fontSize: v })}
            />
          </SettingRow>

          <SettingRow label="内容宽度" description="文章正文区域的最大宽度">
            <OptionGroup
              value={settings.contentWidth}
              options={[
                { value: 'compact', label: '紧凑' },
                { value: 'standard', label: '标准' },
                { value: 'wide', label: '宽松' },
              ]}
              onChange={(v) => updateSettings({ contentWidth: v })}
            />
          </SettingRow>

          <SettingRow label="显示文章目录" description="在文章右侧显示章节导航">
            <Toggle checked={settings.showToc} onChange={(v) => updateSettings({ showToc: v })} />
          </SettingRow>
        </Section>

        {/* ── AI Assistant ── */}
        <Section title="AI 助手">
          <SettingRow label="显示浮动按钮" description="右下角的 AI 助手入口">
            <Toggle checked={settings.showAiButton} onChange={(v) => updateSettings({ showAiButton: v })} />
          </SettingRow>
        </Section>

        {/* ── Data ── */}
        <Section title="数据管理" description="导出、导入或重置你的学习数据">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportProgress}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出数据
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入数据
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportProgress} />

            <button
              onClick={handleResetAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              重置所有数据
            </button>
          </div>
        </Section>

        {/* ── Preview ── */}
        <Section title="预览" description="实时预览你的阅读设置">
          <div
            className="rounded-xl border border-gray-100 p-6 bg-gray-50/50"
            style={{ fontSize: `var(--prose-size, 16px)`, maxWidth: `var(--prose-width, 768px)` }}
          >
            <h3 className="text-lg font-bold mb-2 text-gray-900">示例标题：TypeScript 类型系统</h3>
            <p className="text-gray-600 leading-[1.8] mb-3">
              TypeScript 的类型系统与 Java 有很多相似之处。两者都支持泛型、接口和类，但 TypeScript 额外支持联合类型、交叉类型和类型推断。
            </p>
            <pre className="bg-gray-950 text-gray-200 p-4 rounded-xl text-sm font-mono overflow-x-auto">
              <code>{`interface User {\n  name: string\n  age: number\n}`}</code>
            </pre>
          </div>
        </Section>
      </div>
    </div>
  )
}
