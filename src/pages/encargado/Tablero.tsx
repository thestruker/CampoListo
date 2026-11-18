import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, entrada, Estado, fechaCorta, hoy, Tarjeta, Titulo, Vacio } from '../../components/ui'
import { db } from '../../lib/db'
import { abiertasSinSalida, ETIQUETA_ESTADO } from '../../lib/reglas'
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

  const filtradas = ordenes
    .filter((o) => !fecha || o.fecha_programada === fecha)
    .filter((o) => !cliente || o.cliente_id === cliente)
    .filter((o) => !tecnico || asign.some((a) => a.orden_id === o.id && a.tecnico_id === tecnico && !a.eliminado))
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada) || (a.folio ?? 0) - (b.folio ?? 0))

  const nombre = (id: string) => usuarios.find((u) => u.id === id)?.nombre.split(' ')[0] ?? '¿?'
  const tecnicos = usuarios.filter((u) => u.rol === 'tecnico')
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
    <div>
      <Titulo accion={<Link to="/ordenes/nueva"><Boton>+ Nueva orden</Boton></Link>}>Tablero</Titulo>

      {sinSalida.length > 0 && (
        <Tarjeta className="mb-4 border-amber-300 bg-amber-50" >
          <p className="font-semibold text-amber-900">⚠️ {sinSalida.length} {sinSalida.length === 1 ? 'orden quedó abierta' : 'órdenes quedaron abiertas'} sin registrar salida</p>
          <ul className="mt-1 text-sm text-amber-900">
            {sinSalida.map((s) => {
              const o = ordenes.find((x) => x.id === s.orden_id)
              return (
                <li key={s.orden_id + s.tecnico_id}>
                  <Link className="underline" to={`/ordenes/${s.orden_id}`}>Folio {o?.folio ?? '—'}</Link> · {nombre(s.tecnico_id)} llegó el{' '}
                  {new Date(s.llegada).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                </li>
              )
            })}
          </ul>
        </Tarjeta>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input aria-label="Fecha" type="date" className={entrada} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <select aria-label="Técnico" className={entrada} value={tecnico} onChange={(e) => setTecnico(e.target.value)}>
          <option value="">Todos los técnicos</option>
          {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select aria-label="Cliente" className={entrada} value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <Boton variante="secundario" onClick={descargarDia} disabled={generando}>
          {generando ? 'Generando…' : `📄 PDF del ${fecha ? fechaCorta(fecha) : 'día'}`}
        </Boton>
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm text-neutral-600">
        <input type="checkbox" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} /> Ver cerradas y canceladas
      </label>

      {!filtradas.length ? (
        <Vacio>No hay órdenes con estos filtros.</Vacio>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {columnas.map((col) => {
            const lista = filtradas.filter((o) => o.estado === col)
            return (
              <section key={col} className="min-w-52 flex-1">
                <h2 className="mb-2 flex items-center justify-between text-sm font-bold text-campo-900">
                  {ETIQUETA_ESTADO[col]} <span className="rounded-full bg-campo-100 px-2 text-xs">{lista.length}</span>
                </h2>
                <div className="space-y-2">
                  {lista.map((o) => {
                    const tecs = asign.filter((a) => a.orden_id === o.id && !a.eliminado).map((a) => nombre(a.tecnico_id))
                    return (
                      <Link key={o.id} to={`/ordenes/${o.id}`} className={`block rounded-xl border bg-white p-3 shadow-sm hover:border-campo-500 ${ordenesSinSalida.has(o.id) ? 'border-amber-400 ring-2 ring-amber-200' : 'border-campo-100'}`}>
                        <div className="flex items-center justify-between text-xs text-neutral-500">
                          <span>Folio {o.folio ?? 'por asignar'}</span>
                          <span>{fechaCorta(o.fecha_programada)}</span>
                        </div>
                        <div className="mt-1 font-semibold leading-snug">{o.titulo}</div>
                        <div className="text-sm text-neutral-600">{clientes.find((c) => c.id === o.cliente_id)?.nombre}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <Estado estado={o.estado} />
                          <span className="text-xs text-neutral-500">{tecs.join(', ') || 'Sin técnico'}</span>
                        </div>
                        {ordenesSinSalida.has(o.id) && <div className="mt-1 text-xs font-semibold text-amber-700">Pendiente de cierre</div>}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
