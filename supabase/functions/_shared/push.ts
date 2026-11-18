// Utilidad compartida: enviar Web Push con VAPID a todas las suscripciones de un usuario.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soporte@campolisto.mx',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

export const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

export async function enviarPush(usuarioId: string, mensaje: { title: string; body: string; url?: string }) {
  const { data: subs } = await admin.from('push_suscripciones').select('endpoint, suscripcion').eq('usuario_id', usuarioId)
  let enviados = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(s.suscripcion, JSON.stringify(mensaje))
      enviados++
    } catch (e) {
      // 404/410: la suscripción ya no existe (app desinstalada); se borra.
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_suscripciones').delete().eq('endpoint', s.endpoint)
    }
  }
  return enviados
}
