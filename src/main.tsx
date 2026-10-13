import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/anton/400.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/inter-tight/index.css'
import '@fontsource/jetbrains-mono/400.css'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/store.tsx'

// PWA: offline cache + install prompt. Dev server skips the service worker so edits show instantly.
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js')
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installPrompt = e
  window.dispatchEvent(new Event('lm-installable'))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider><App /></StoreProvider>
  </StrictMode>,
)
