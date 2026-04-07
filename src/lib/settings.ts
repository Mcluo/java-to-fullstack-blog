export interface UserSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system'
  accentColor: 'blue' | 'purple' | 'green' | 'orange'
  codeTheme: 'github-dark' | 'one-dark' | 'dracula'

  // Reading
  fontSize: 'sm' | 'md' | 'lg' | 'xl'
  contentWidth: 'compact' | 'standard' | 'wide'
  showToc: boolean

  // AI
  showAiButton: boolean
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  accentColor: 'blue',
  codeTheme: 'github-dark',
  fontSize: 'md',
  contentWidth: 'standard',
  showToc: true,
  showAiButton: true,
}

const SETTINGS_KEY = 'blog_settings'

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

// CSS variable mappings
export const FONT_SIZE_MAP: Record<UserSettings['fontSize'], string> = {
  sm: '15px',
  md: '16px',
  lg: '18px',
  xl: '20px',
}

export const CONTENT_WIDTH_MAP: Record<UserSettings['contentWidth'], string> = {
  compact: '640px',
  standard: '768px',
  wide: '896px',
}

export const ACCENT_COLORS: Record<UserSettings['accentColor'], { name: string; hue: string; preview: string }> = {
  blue:   { name: '蓝色', hue: '220', preview: 'bg-blue-500' },
  purple: { name: '紫色', hue: '270', preview: 'bg-purple-500' },
  green:  { name: '绿色', hue: '160', preview: 'bg-emerald-500' },
  orange: { name: '橙色', hue: '25',  preview: 'bg-orange-500' },
}

export function applySettings(settings: UserSettings): void {
  if (typeof document === 'undefined') return
  const html = document.documentElement

  // Theme
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
  html.setAttribute('data-theme', isDark ? 'dark' : 'light')
  html.classList.toggle('dark', isDark)

  // Accent color
  html.setAttribute('data-accent', settings.accentColor)
  html.style.setProperty('--accent-hue', ACCENT_COLORS[settings.accentColor].hue)

  // Reading
  html.style.setProperty('--prose-size', FONT_SIZE_MAP[settings.fontSize])
  html.style.setProperty('--prose-width', CONTENT_WIDTH_MAP[settings.contentWidth])

  // TOC
  html.setAttribute('data-show-toc', settings.showToc ? 'true' : 'false')
}
