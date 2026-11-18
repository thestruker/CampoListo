import { useLiveQuery } from 'dexie-react-hooks'
import { CloudCheck, CloudOff, CloudUpload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { useSesion } from '../lib/sesion'
import { sincronizar } from '../lib/sync'

// Indicador de conexión y de elementos pendientes por subir (el usuario siempre sabe qué falta).
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

  const Icono = !enLinea ? CloudOff : pendientes ? CloudUpload : CloudCheck
  return (
    <button
      onClick={ahora}
      data-testid="estado-sync"
      title="Sincronizar ahora"
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        enLinea ? (pendientes ? 'bg-sol-400 text-campo-900' : 'bg-white/12 text-white ring-1 ring-white/20') : 'bg-red-500 text-white'
      }`}
    >
      <Icono className={`h-4 w-4 ${subiendo || (enLinea && pendientes) ? 'latido' : ''}`} />
      {enLinea ? (pendientes ? `${pendientes} por subir` : 'Al día') : `Sin señal${pendientes ? ` · ${pendientes} guardados` : ''}`}
    </button>
  )
}
