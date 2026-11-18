// Tarea 7.5: push al técnico cuando se le asigna una orden. La llama un trigger de la base de datos.
import { admin, enviarPush } from '../_shared/push.ts'

Deno.serve(async (req) => {
  const { orden_id, tecnico_id } = await req.json()
  const { data: orden } = await admin.from('ordenes').select('folio, titulo, fecha_programada, clientes(nombre)').eq('id', orden_id).single()
  if (!orden) return new Response('orden no encontrada', { status: 404 })
  const cliente = (orden.clientes as unknown as { nombre: string } | null)?.nombre ?? ''
  const enviados = await enviarPush(tecnico_id, {
    title: `Nueva orden${orden.folio ? ` · folio ${orden.folio}` : ''}`,
    body: `${orden.titulo} — ${cliente} (${orden.fecha_programada})`,
    url: `/orden/${orden_id}`,
  })
  return Response.json({ enviados })
})
