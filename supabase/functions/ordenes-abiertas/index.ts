// Tarea 7.7: revisión nocturna de órdenes con llegada pero sin salida.
// Avisa al técnico (para que registre su salida) y a los encargados de su empresa.
import { admin, enviarPush } from '../_shared/push.ts'

Deno.serve(async () => {
  const { data: regs } = await admin
    .from('registros_tiempo')
    .select('orden_id, tecnico_id, tipo, hora_dispositivo, empresa_id')
    .gte('hora_dispositivo', new Date(Date.now() - 7 * 86_400_000).toISOString())
    .order('hora_dispositivo')
  const ultimo = new Map<string, { tipo: string; empresa_id: string; orden_id: string; tecnico_id: string }>()
  for (const r of regs ?? []) ultimo.set(`${r.orden_id}|${r.tecnico_id}`, r)
  const abiertas = [...ultimo.values()].filter((r) => r.tipo === 'llegada')
  const porEmpresa = new Map<string, number>()
  for (const a of abiertas) {
    await enviarPush(a.tecnico_id, { title: 'Te faltó registrar tu salida', body: 'Abre la orden y presiona "Terminé" o "Salir sin terminar".', url: `/orden/${a.orden_id}` })
    await admin.from('ordenes').update({ aviso_sin_salida_at: new Date().toISOString() }).eq('id', a.orden_id)
    porEmpresa.set(a.empresa_id, (porEmpresa.get(a.empresa_id) ?? 0) + 1)
  }
  for (const [empresa, n] of porEmpresa) {
    const { data: gestores } = await admin.from('usuarios').select('id').eq('empresa_id', empresa).in('rol', ['administrador', 'encargado']).eq('activo', true)
    for (const g of gestores ?? []) {
      await enviarPush(g.id, { title: 'Órdenes pendientes de cierre', body: `${n} ${n === 1 ? 'orden quedó abierta' : 'órdenes quedaron abiertas'} sin salida registrada.`, url: '/' })
    }
  }
  return Response.json({ abiertas: abiertas.length })
})
