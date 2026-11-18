import { useState } from 'react'

// En iPhone las notificaciones y el almacenamiento duradero solo funcionan si la app
// está instalada en la pantalla de inicio (riesgo RI-03). Este aviso lo explica.
export function AvisoInstalar() {
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone
  const [cerrado, setCerrado] = useState(() => {
    try {
      return localStorage.getItem('aviso-instalar') === '1'
    } catch {
      return false
    }
  })
  if (!esIOS || instalada || cerrado) return null
  return (
    <div className="mx-auto mt-3 max-w-5xl px-4">
      <div className="flex items-start gap-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
        <span>📲</span>
        <p className="flex-1">
          Para recibir avisos y no perder datos en iPhone, instala la app: toca <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>.
        </p>
        <button
          onClick={() => {
            setCerrado(true)
            try {
              localStorage.setItem('aviso-instalar', '1')
            } catch {
              /* sin almacenamiento */
            }
          }}
          className="text-sky-700"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
