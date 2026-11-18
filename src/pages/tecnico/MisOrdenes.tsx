import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Estado, fechaCorta, horaCorta, hoy, Tarjeta, Titulo, Vacio } from '../../components/ui'
import { db } from '../../lib/db'
import { diaLocal } from '../../lib/horas'
import { ESTADOS_ABIERTOS, estaEnSitio } from '../../lib/reglas'
import { useSesion } from '../../lib/sesion'
import { BotonNotificaciones } from '../../components/BotonNotificaciones'

// CU-07 Consultar mis órdenes (funciona sin señal: todo sale de la base local).
export function MisOrdenes() {
  const { sesion } = useSesion()
  const yo = sesion!.usuario.id
  const datos = useLiveQuery(async () => {
    const mias = await db.orden_tecnicos.where('tecnico_id').equals(yo).filter((a) => !a.eliminado).toArray()
    const ordenes = (await db.ordenes.bulkGet(mias.map((a) => a.orden_id))).filter(Boolean)
    const clientes = await db.clientes.toArray()
    const registros = await db.registros_tiempo.where('tecnico_id').equals(yo).toArray()
    return { ordenes: ordenes as NonNullable<(typeof ordenes)[number]>[], clientes, registros }
  }, [yo])
  if (!datos) return <p>Cargando…</p>
  const { ordenes, clientes, registros } = datos
  const enSitio = ordenes.filter((o) => estaEnSitio(registros, yo, o.id))
  const abiertas = ordenes.filter((o) => ESTADOS_ABIERTOS.includes(o.estado)).sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))
  const deHoy = abiertas.filter((o) => o.fecha_programada <= hoy())
  const proximas = abiertas.filter((o) => o.fecha_programada > hoy())
  const terminadas = ordenes.filter((o) => !ESTADOS_ABIERTOS.includes(o.estado)).slice(0, 5)

  const Item = ({ o }: { o: (typeof ordenes)[number] }) => {
    const c = clientes.find((x) => x.id === o.cliente_id)
    return (
      <Link to={`/orden/${o.id}`} className="block rounded-2xl border border-campo-100 bg-white p-4 shadow-sm active:scale-[0.99]">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Folio {o.folio ?? '—'} · {fechaCorta(o.fecha_programada)}</span>
          <Estado estado={o.estado} />
        </div>
        <div className="mt-1 text-lg font-semibold leading-snug">{o.titulo}</div>
        <div className="text-sm text-neutral-600">{c?.nombre} · {c?.direccion}</div>
      </Link>
    )
  }

  return (
    <div className="space-y-5">
      <Titulo>Hola, {sesion!.usuario.nombre.split(' ')[0]} 👋</Titulo>
      <BotonNotificaciones />
      {enSitio.map((o) => {
        const ultima = registros.filter((r) => r.orden_id === o.id && r.tipo === 'llegada').sort((a, b) => a.hora_dispositivo.localeCompare(b.hora_dispositivo)).at(-1)
        const deOtroDia = ultima && diaLocal(ultima.hora_dispositivo) < hoy()
        return (
          <Tarjeta key={o.id} className={deOtroDia ? 'border-amber-400 bg-amber-50' : 'border-sky-200 bg-sky-50'}>
            <p className="font-semibold">{deOtroDia ? '⚠️ Te faltó registrar tu salida' : '📍 Estás en sitio'}: {o.titulo}</p>
            <p className="text-sm">Llegaste {ultima ? `a las ${horaCorta(ultima.hora_dispositivo)}${deOtroDia ? ` del ${new Date(ultima.hora_dispositivo).toLocaleDateString('es-MX')}` : ''}` : ''}. <Link to={`/orden/${o.id}`} className="font-semibold underline">Abrir orden</Link></p>
          </Tarjeta>
        )
      })}
      <section>
        <h2 className="mb-2 font-bold text-campo-900">Para hoy</h2>
        {deHoy.length ? <div className="space-y-2">{deHoy.map((o) => <Item key={o.id} o={o} />)}</div> : <Vacio>No tienes órdenes para hoy.</Vacio>}
      </section>
      {proximas.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-campo-900">Próximas</h2>
          <div className="space-y-2">{proximas.map((o) => <Item key={o.id} o={o} />)}</div>
        </section>
      )}
      {terminadas.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-campo-900">Terminadas recientemente</h2>
          <div className="space-y-2">{terminadas.map((o) => <Item key={o.id} o={o} />)}</div>
        </section>
      )}
    </div>
  )
}
