import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, FileDown, MapPin, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Boton, COLOR_ESTADO, entrada, fechaCorta, hoy, Kpi, Titulo, Vacio } from '../../components/ui'
import { db } from '../../lib/db'
import { abiertasSinSalida, estaEnSitio, ETIQUETA_ESTADO } from '../../lib/reglas'
import { useSesion } from '../../lib/sesion'
import type { EstadoOrden } from '../../lib/types'

const COLUMNAS: EstadoOrden[] = ['pendiente', 'asignada', 'en_sitio', 'con_avance', 'terminada', 'cerrada', 'cancelada']

// CU-13 Tablero de órdenes por estado, con filtros y aviso de órdenes abiertas sin salida (7.7).
export function Tablero() {
  const { sesion } = useSesion()
  const empresaId = sesion!.empresa.id
  const ordenes = useLiveQuery(() => db.ordenes.where('empresa_id').equals(empresaId).toArray(), [empresaId], [])
  const clientes = useLiveQuery(() => db.clientes.where('empresa_id').equals(empresaId).toArray(), [empresaId], [])
  const usuarios = useLiveQuery(() => db.usuarios.where('empresa_id').equals(empresaId).toArray(), [empresaId], [])
  const asign = useLiveQuery(() => db.orden_tecnicos.toArray(), [], [])
  const registros = useLiveQuery(() => db.registros_tiempo.toArray(), [], [])
  const [fecha, setFecha] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [cliente, setCliente] = useState('')
  const [verCerradas, setVerCerradas] = useState(false)
  const [generando, setGenerando] = useState(false)

  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)
  const sinSalida = useMemo(() => abiertasSinSalida(registros, inicioHoy), [registros])
  const ordenesSinSalida = new Set(sinSalida.map((s) => s.orden_id))
  const tecnicos = usuarios.filter((u) => u.rol === 'tecnico')
  const enSitioAhora = tecnicos.filter((t) => ordenes.some((o) => estaEnSitio(registros, t.id, o.id))).length

  const filtradas = ordenes
    .filter((o) => !fecha || o.fecha_programada === fecha)
    .filter((o) => !cliente || o.cliente_id === cliente)
    .filter((o) => !tecnico || asign.some((a) => a.orden_id === o.id && a.tecnico_id === tecnico && !a.eliminado))
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada) || (a.folio ?? 0) - (b.folio ?? 0))

  const usuario = (id: string) => usuarios.find((u) => u.id === id)
  const nombre = (id: string) => usuario(id)?.nombre.split(' ')[0] ?? '¿?'
  const columnas = COLUMNAS.filter((c) => verCerradas || (c !== 'cerrada' && c !== 'cancelada'))

  async function descargarDia() {
    setGenerando(true)
    const dia = fecha || hoy()
    const { doc, nombre, total } = await (await import('../../lib/pdf')).pdfDelDia(dia, empresaId)
    setGenerando(false)
    if (!total) return alert(`No hay órdenes programadas para ${fechaCorta(dia)}.`)
    doc.save(nombre)
  }

  return (
    <div className="space-y-5">
      <Titulo
        sub={new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        accion={<Link to="/ordenes/nueva"><Boton icono={Plus}>Nueva orden</Boton></Link>}
      >
        Tablero
      </Titulo>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icono={CalendarDays} valor={ordenes.filter((o) => o.fecha_programada === hoy() && o.estado !== 'cancelada').length} etiqueta="Órdenes para hoy" />
        <Kpi icono={MapPin} tono="azul" valor={enSitioAhora} etiqueta="Técnicos en sitio ahora" />
        <Kpi icono={AlertTriangle} tono="ambar" valor={sinSalida.length} etiqueta="Pendientes de cierre" />
        <Kpi icono={CheckCircle2} tono="sol" valor={ordenes.filter((o) => o.estado === 'terminada').length} etiqueta="Terminadas por cerrar" />
      </div>

      {sinSalida.length > 0 && (
        <div className="flex gap-3 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
          <div className="text-sm text-amber-900">
            <p className="font-bold">{sinSalida.length} {sinSalida.length === 1 ? 'orden quedó abierta' : 'órdenes quedaron abiertas'} sin registrar salida</p>
            <ul className="mt-1 space-y-0.5">
              {sinSalida.map((s) => {
                const o = ordenes.find((x) => x.id === s.orden_id)
                return (
                  <li key={s.orden_id + s.tecnico_id}>
                    <Link className="font-semibold underline" to={`/ordenes/${s.orden_id}`}>Folio {o?.folio ?? '—'}</Link> · {nombre(s.tecnico_id)} llegó el{' '}
                    {new Date(s.llegada).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-white p-3 shadow-suave ring-1 ring-campo-100/80">
        <input aria-label="Fecha" type="date" className={`${entrada} w-auto flex-1 py-2`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <select aria-label="Técnico" className={`${entrada} w-auto flex-1 py-2`} value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
          <option value="">Todos los técnicos</option>
          {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select aria-label="Cliente" className={`${entrada} w-auto flex-1 py-2`} value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <Boton variante="secundario" icono={FileDown} onClick={descargarDia} disabled={generando}>
          {generando ? 'Generando…' : `PDF del ${fecha ? fechaCorta(fecha) : 'día'}`}
        </Boton>
        <label className="flex items-center gap-2 px-2 text-sm text-neutral-600">
          <input type="checkbox" className="h-4 w-4 accent-campo-700" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} /> Ver cerradas
        </label>
      </div>

      {!filtradas.length ? (
        <Vacio icono={SearchX}>No hay órdenes con estos filtros.</Vacio>
      ) : (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3">
          {columnas.map((col) => {
            const lista = filtradas.filter((o) => o.estado === col)
            return (
              <section key={col} className="min-w-52 flex-1">
                <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-campo-900">
                  <span className={`h-2.5 w-2.5 rounded-full ${COLOR_ESTADO[col].punto}`} />
                  {ETIQUETA_ESTADO[col]}
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500 shadow-sm ring-1 ring-campo-100">{lista.length}</span>
                </h2>
                <div className="space-y-3">
                  {!lista.length && <div className="rounded-2xl border-2 border-dashed border-campo-100 p-4 text-center text-xs text-neutral-400">Sin órdenes</div>}
                  {lista.map((o) => {
                    const tecs = asign.filter((a) => a.orden_id === o.id && !a.eliminado).map((a) => usuario(a.tecnico_id)).filter(Boolean)
                    const pendiente = ordenesSinSalida.has(o.id)
                    return (
                      <Link key={o.id} to={`/ordenes/${o.id}`}
                        className={`group relative block overflow-hidden rounded-2xl bg-white p-4 pl-5 shadow-suave ring-1 transition hover:-translate-y-0.5 hover:shadow-alta ${pendiente ? 'ring-2 ring-amber-300' : 'ring-campo-100/80'}`}>
                        <span className={`absolute inset-y-0 left-0 w-1.5 ${COLOR_ESTADO[o.estado].barra}`} />
                        <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                          <span className="rounded-md bg-campo-50 px-1.5 py-0.5 text-campo-700">#{o.folio ?? '—'}</span>
                          <span>{fechaCorta(o.fecha_programada)}</span>
                        </div>
                        <div className="mt-2 font-bold leading-snug text-campo-900 group-hover:text-campo-700">{o.titulo}</div>
                        <div className="mt-0.5 truncate text-sm text-neutral-500">{clientes.find((c) => c.id === o.cliente_id)?.nombre}</div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {tecs.length ? tecs.map((t) => <Avatar key={t!.id} nombre={t!.nombre} tam="sm" />) : <span className="text-xs text-neutral-400">Sin técnico</span>}
                          </div>
                          {pendiente && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Pendiente de cierre</span>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {!ordenes.length && <Vacio icono={ClipboardList}>Todavía no hay órdenes.</Vacio>}
    </div>
  )
}
