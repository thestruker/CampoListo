import { Bell } from 'lucide-react'
import { useState } from 'react'
import { activarNotificaciones, pushSoportado } from '../lib/push'
import { useSesion } from '../lib/sesion'
import { Boton } from './ui'

export function BotonNotificaciones() {
  const { sesion } = useSesion()
  const [msg, setMsg] = useState<string | null>(null)
  if (!pushSoportado() || Notification.permission === 'granted') return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 text-sm shadow-suave ring-1 ring-campo-100/80">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sol-100 text-sol-600"><Bell className="h-5 w-5" /></span>
      <span className="flex-1">Activa los avisos para enterarte cuando te asignen una orden.</span>
      <Boton variante="secundario" onClick={async () => setMsg(await activarNotificaciones(sesion!.usuario))}>Activar</Boton>
      {msg && <p className="w-full text-xs text-neutral-600">{msg}</p>}
    </div>
  )
}
