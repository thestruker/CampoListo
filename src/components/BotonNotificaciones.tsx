import { useState } from 'react'
import { activarNotificaciones, pushSoportado } from '../lib/push'
import { useSesion } from '../lib/sesion'
import { Boton } from './ui'

export function BotonNotificaciones() {
  const { sesion } = useSesion()
  const [msg, setMsg] = useState<string | null>(null)
  if (!pushSoportado() || Notification.permission === 'granted') return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
      <span className="flex-1">🔔 Activa los avisos para enterarte cuando te asignen una orden.</span>
      <Boton variante="secundario" onClick={async () => setMsg(await activarNotificaciones(sesion!.usuario))}>Activar</Boton>
      {msg && <p className="w-full text-xs text-neutral-600">{msg}</p>}
    </div>
  )
}
