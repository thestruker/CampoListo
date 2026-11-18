import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './index.css'
import { cargarDemoSiHaceFalta } from './lib/demo'
import { esDemo, SesionProvider } from './lib/sesion'

registerSW({ immediate: true })

// Pide al navegador que no borre los datos locales (importante si hay registros sin subir).
navigator.storage?.persist?.().catch(() => {})

async function iniciar() {
  if (esDemo) await cargarDemoSiHaceFalta()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SesionProvider>
        <App />
      </SesionProvider>
    </StrictMode>,
  )
}
iniciar()
