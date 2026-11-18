import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CalendarCheck2, ChevronRight, Clock, MapPin, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BotonNotificaciones } from '../../components/BotonNotificaciones'
import { Estado, fechaCorta, horaCorta, hoy, Vacio } from '../../components/ui'
import { db } from '../../lib/db'
import { diaLocal } from '../../lib/horas'
import { ESTADOS_ABIERTOS, estaEnSitio } from '../../lib/reglas'
import { useSesion } from '../../lib/sesion'
import type { Cliente, Orden } from '../../lib/types'

function Item({ o, c, enSitio }: { o: Orden; c?: Cliente; enSitio?: boolean }) {
  return (
    <Link to={`/orden/${o.id}`} className={`group flex items-center gap-3 rounded-3xl bg-white p-4 shadow-suave ring-1 transition active:scale-[0.99] ${enSitio ? 'ring-2 ring-sky-300' : 'ring-campo-100/80'}`}>
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-campo-50 text-center leading-none text-campo-700">
        <div>
          <div className="text-[10px] font-bold uppercase">{new Date(o.fecha_programada + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}</div>
          <div className="text-xl font-extrabold">{o.fecha_programada.slice(8)}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-400">#{o.folio ?? '—'}</span>
          <Estado estado={o.estado} />
        </div>
        <div className="mt-1 truncate font-bold text-campo-900">{o.titulo}</div>
        <div className="flex items-center gap-1 truncate text-sm text-neutral-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{c?.nombre} · {c?.direccion}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-campo-300 transition group-hover:translate-x-0.5" />
    </Link>
  )
}

// CU-07 Consultar mis órdenes (funciona sin señal: todo sale de la base local).
export function MisOrdenes() {
  const { sesion } = useSesion()
  const yo = sesion!.usuario.id
  const datos = useLiveQuery(async () => {
    const mias = await db.orden_tecnicos.where('tecnico_id').equals(yo).filter((a) => !a.eliminado).toArray()
    const ordenes = (await db.ordenes.bulkGet(mias.map((a) => a.orden_id))).filter(Boolean) as Orden[]
    const clientes = await db.clientes.toArray()
    const registros = await db.registros_tiempo.where('tecnico_id').equals(yo).toArray()
    return { ordenes, clientes, registros }
  }, [yo])
  if (!datos) return null
  const { ordenes, clientes, registros } = datos
  const cliente = (id: string) => clientes.find((x) => x.id === id)
  const enSitio = ordenes.filter((o) => estaEnSitio(registros, yo, o.id))
  const abiertas = ordenes.filter((o) => ESTADOS_ABIERTOS.includes(o.estado)).sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))
  const deHoy = abiertas.filter((o) => o.fecha_programada <= hoy())
  const proximas = abiertas.filter((o) => o.fecha_programada > hoy())
  const terminadas = ordenes.filter((o) => !ESTADOS_ABIERTOS.includes(o.estado)).slice(0, 5)
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-campo-700 to-campo-500 p-6 text-white shadow-alta">
        <Sun className="absolute -top-4 -right-4 h-28 w-28 text-sol-400/25" />
        <p className="text-sm text-campo-100">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{saludo}, {sesion!.usuario.nombre.split(' ')[0]} 👋</h1>
        <p className="mt-2 text-campo-50">
          {deHoy.length ? <>Tienes <b className="text-sol-400">{deHoy.length} {deHoy.length === 1 ? 'servicio' : 'servicios'}</b> para hoy.</> : 'No tienes servicios pendientes para hoy.'}
        </p>
      </div>

      <BotonNotificaciones />

      {enSitio.map((o) => {
        const ultima = registros.filter((r) => r.orden_id === o.id && r.tipo === 'llegada').sort((a, b) => a.hora_dispositivo.localeCompare(b.hora_dispositivo)).at(-1)
        const deOtroDia = ultima && diaLocal(ultima.hora_dispositivo) < hoy()
        return (
          <Link key={o.id} to={`/orden/${o.id}`} className={`flex items-center gap-3 rounded-3xl p-4 ring-1 ${deOtroDia ? 'bg-amber-50 ring-amber-200' : 'bg-sky-50 ring-sky-200'}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${deOtroDia ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
              {deOtroDia ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div className="text-sm">
              <p className="font-bold">{deOtroDia ? 'Te faltó cerrar este servicio' : 'Estás en sitio'}</p>
              <p className="text-neutral-600">{o.titulo} · llegaste {ultima ? `${deOtroDia ? new Date(ultima.hora_dispositivo).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' ' : ''}a las ${horaCorta(ultima.hora_dispositivo)}` : ''}</p>
            </div>
          </Link>
        )
      })}

      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wide text-campo-700 uppercase">Para hoy</h2>
        {deHoy.length ? <div className="space-y-3">{deHoy.map((o) => <Item key={o.id} o={o} c={cliente(o.cliente_id)} enSitio={estaEnSitio(registros, yo, o.id)} />)}</div> : <Vacio icono={CalendarCheck2}>Nada pendiente para hoy.</Vacio>}
      </section>
      {proximas.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold tracking-wide text-campo-700 uppercase">Próximas</h2>
          <div className="space-y-3">{proximas.map((o) => <Item key={o.id} o={o} c={cliente(o.cliente_id)} />)}</div>
        </section>
      )}
      {terminadas.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold tracking-wide text-campo-700 uppercase">Terminadas</h2>
          <div className="space-y-3 opacity-80">{terminadas.map((o) => <Item key={o.id} o={o} c={cliente(o.cliente_id)} />)}</div>
        </section>
      )}
      <p className="text-center text-xs text-neutral-400">{fechaCorta(hoy())} · los datos se guardan en tu celular</p>
    </div>
  )
}
