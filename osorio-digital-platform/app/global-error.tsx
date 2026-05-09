'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isProd = process.env.NODE_ENV === 'production'

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: '#0A0A0A', color: '#fff', fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Algo deu errado
          </h1>
          <p style={{ color: '#888', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Ocorreu um erro inesperado. Nossa equipe já foi notificada.
            {error.digest && ` (ref: ${error.digest})`}
          </p>

          {!isProd && (
            <pre style={{ background: '#111', border: '1px solid #222', padding: '1rem', borderRadius: 8, textAlign: 'left', fontSize: 11, overflowX: 'auto', marginBottom: '1.5rem', color: '#ff6b6b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          )}

          <button
            onClick={reset}
            style={{ background: '#EACE00', color: '#000', padding: '0.75rem 2rem', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
