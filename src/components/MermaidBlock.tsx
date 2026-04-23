'use client'

import { useEffect, useRef, useState } from 'react'

interface MermaidBlockProps {
  chart: string
}

export default function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          flowchart: { curve: 'basis', padding: 16 },
          themeVariables: {
            primaryColor: '#e1f5fe',
            primaryTextColor: '#1a1a1a',
            primaryBorderColor: '#90caf9',
            lineColor: '#64748b',
            secondaryColor: '#fff3e0',
            tertiaryColor: '#e8f5e9',
          },
        })
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        if (!cancelled) setSvg(renderedSvg)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Mermaid render failed')
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <pre className="bg-gray-950 text-gray-200 p-4 rounded-xl overflow-x-auto text-sm font-mono my-6">
        <code>{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="my-6 p-8 bg-gray-50 rounded-xl border border-gray-200 text-center text-gray-400 text-sm">
        Loading diagram...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto bg-white rounded-xl border border-gray-100 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
