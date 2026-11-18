import { MODO_DEMO, supabase } from './supabase'
import type { Usuario } from './types'

// Notificaciones push (tarea 7.5). En iPhone solo funcionan con la app instalada (iOS 16.4+).

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function base64ABytes(b64: string) {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4)
  const crudo = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0))
}

export async function activarNotificaciones(usuario: Usuario): Promise<string> {
  if (!pushSoportado()) return 'Este navegador no permite notificaciones. En iPhone, instala la app en la pantalla de inicio.'
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return 'No diste permiso para notificaciones.'
  const reg = await navigator.serviceWorker.ready
  if (MODO_DEMO || !VAPID || !supabase) {
    await reg.showNotification('CampoListo', { body: 'Así te avisaremos cuando te asignen una orden.', icon: '/icon-192.png' })
    return 'Notificaciones activadas (prueba local del modo demo).'
  }
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ABytes(VAPID) })
  const json = sub.toJSON()
  const { error } = await supabase.from('push_suscripciones').upsert(
    { endpoint: json.endpoint, usuario_id: usuario.id, empresa_id: usuario.empresa_id, suscripcion: json },
    { onConflict: 'endpoint' },
  )
  return error ? 'No se pudo guardar la suscripción. Intenta con señal.' : 'Listo: te avisaremos cuando te asignen una orden.'
}
