'use client'

import { useState, useRef } from 'react'

// Map highlight.js class names to display labels
const LANGUAGE_MAP: Record<string, string> = {
  'language-js': 'JavaScript',
  'language-javascript': 'JavaScript',
  'language-ts': 'TypeScript',
  'language-typescript': 'TypeScript',
  'language-jsx': 'JSX',
  'language-tsx': 'TSX',
  'language-java': 'Java',
  'language-python': 'Python',
  'language-py': 'Python',
  'language-go': 'Go',
  'language-rust': 'Rust',
  'language-c': 'C',
  'language-cpp': 'C++',
  'language-csharp': 'C#',
  'language-cs': 'C#',
  'language-ruby': 'Ruby',
  'language-rb': 'Ruby',
  'language-php': 'PHP',
  'language-swift': 'Swift',
  'language-kotlin': 'Kotlin',
  'language-sql': 'SQL',
  'language-bash': 'Bash',
  'language-shell': 'Shell',
  'language-sh': 'Shell',
  'language-zsh': 'Zsh',
  'language-html': 'HTML',
  'language-css': 'CSS',
  'language-scss': 'SCSS',
  'language-json': 'JSON',
  'language-yaml': 'YAML',
  'language-yml': 'YAML',
  'language-xml': 'XML',
  'language-markdown': 'Markdown',
  'language-md': 'Markdown',
  'language-dockerfile': 'Dockerfile',
  'language-docker': 'Docker',
  'language-nginx': 'Nginx',
  'language-graphql': 'GraphQL',
  'language-toml': 'TOML',
  'language-ini': 'INI',
  'language-lua': 'Lua',
  'language-r': 'R',
  'language-scala': 'Scala',
  'language-dart': 'Dart',
  'language-elixir': 'Elixir',
  'language-haskell': 'Haskell',
  'language-plaintext': 'Text',
  'language-text': 'Text',
  'language-diff': 'Diff',
  'language-mermaid': 'Mermaid',
}

function getLanguageLabel(className?: string): string | null {
  if (!className) return null
  const classes = className.split(/\s+/)
  for (const cls of classes) {
    if (LANGUAGE_MAP[cls]) return LANGUAGE_MAP[cls]
    // Fallback: extract from language-xxx pattern
    const match = cls.match(/^language-(.+)$/)
    if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1)
  }
  return null
}

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  'data-p-idx'?: number
}

export default function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const child = Array.isArray(children) ? children[0] : children
  const codeClassName = (child as any)?.props?.className || ''
  const language = getLanguageLabel(codeClassName)

  async function handleCopy() {
    const text = preRef.current?.textContent || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="group relative my-6 rounded-xl overflow-hidden shadow-sm border border-gray-800">
      {/* Header bar with language label and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs font-medium text-gray-400 select-none">
          {language || 'Code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre
        ref={preRef}
        className="bg-gray-950 overflow-x-auto !my-0 !rounded-none"
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}
