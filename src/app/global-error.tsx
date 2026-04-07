'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>出了点问题</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error.message || '页面加载失败'}</p>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', background: '#111', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer' }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
