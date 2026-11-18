import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { sincronizar } from '../lib/sync'
import { useSesion } from '../lib/sesion'

// Indicador de conexión y de elementos pendientes por subir (RNF: el usuario siempre sabe qué falta).
export function EstadoSync() {
  const { sesion } = useSesion()
  const pendientes = useLiveQuery(() => db.outbox.count(), [], 0)
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    const on = () => setEnLinea(true)
    const off = () => setEnLinea(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  async function ahora() {
    setSubiendo(true)
    await sincronizar(sesion?.empresa.id)
    setSubiendo(false)
  }

  return (
    <button
      onClick={ahora}
      data-testid="estado-sync"
      title="Sincronizar ahora"
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        enLinea ? (pendientes ? 'bg-sol-400 text-campo-900' : 'bg-white/15 text-white') : 'bg-red-600 text-white'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${enLinea ? 'bg-emerald-300' : 'bg-white'} ${subiendo ? 'animate-pulse' : ''}`} />
      {enLinea ? (pendientes ? `${pendientes} por subir` : 'Al día') : `Sin señal${pendientes ? ` · ${pendientes} guardados` : ''}`}
    </button>
  )
}
