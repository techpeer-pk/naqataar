import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './sentry.js'
import App from './App.jsx'

// After a new deploy, a tab left open from before the deploy can request a
// route chunk that no longer exists on the server. Reload once to pick up
// the new build; the sessionStorage guard stops a reload loop if the retry
// still fails (e.g. a genuine network outage, not a stale-chunk mismatch).
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('vite-reload-once')) {
    sessionStorage.setItem('vite-reload-once', '1')
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="loading-screen">Something went wrong. Please refresh the page.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
