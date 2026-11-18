import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Avatar, Boton, Campo, entrada, Estado, fechaCorta, Tarjeta, Titulo, Vacio } from '../../components/ui'
import { guardarCliente } from '../../lib/acciones'
import { db } from '../../lib/db'
import { obtenerPosicion } from '../../lib/geo'
import { useSesion } from '../../lib/sesion'
import type { Cliente } from '../../lib/types'

function FormCliente({ inicial, onListo }: { inicial?: Cliente; onListo: (c: Cliente) => void }) {
  const { sesion } = useSesion()
  const [c, setC] = useState({
    nombre: inicial?.nombre ?? '', telefono: inicial?.telefono ?? '', direccion: inicial?.direccion ?? '',
    notas: inicial?.notas ?? '', lat: inicial?.lat ?? null, lng: inicial?.lng ?? null,
  })
  const [buscando, setBuscando] = useState(false)
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        onListo(await guardarCliente({ ...c, id: inicial?.id, empresa_id: sesion!.empresa.id }))
      }}
    >
      <Campo etiqueta="Nombre o razón social"><input required className={entrada} value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} /></Campo>
      <Campo etiqueta="Teléfono (WhatsApp)" ayuda="10 dígitos; se usa para avisarle de sus servicios.">
        <input inputMode="tel" className={entrada} value={c.telefono} onChange={(e) => setC({ ...c, telefono: e.target.value })} />
      </Campo>
      <Campo etiqueta="Dirección"><input className={entrada} value={c.direccion} onChange={(e) => setC({ ...c, direccion: e.target.value })} /></Campo>
      <div className="flex items-center gap-2 text-sm">
        <Boton type="button" variante="secundario" disabled={buscando} onClick={async () => {
          setBuscando(true)
          const p = await obtenerPosicion()
          setBuscando(false)
          if (p) setC({ ...c, lat: p.lat, lng: p.lng })
          else alert('No se pudo obtener la ubicación.')
        }}>📍 {buscando ? 'Buscando…' : 'Usar mi ubicación actual'}</Boton>
        {c.lat != null && <span className="text-neutral-500">{c.lat.toFixed(5)}, {c.lng?.toFixed(5)}</span>}
      </div>
      <Campo etiqueta="Notas"><textarea rows={2} className={entrada} value={c.notas} onChange={(e) => setC({ ...c, notas: e.target.value })} /></Campo>
      <Boton>Guardar cliente</Boton>
    </form>
  )
}

// CU-03 Gestionar clientes.
export function Clientes() {
  const { sesion } = useSesion()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [nuevo, setNuevo] = useState(!!params.get('nuevo'))
  const clientes = useLiveQuery(() => db.clientes.where('empresa_id').equals(sesion!.empresa.id).sortBy('nombre'), [sesion!.empresa.id], [])
  const ordenes = useLiveQuery(() => db.ordenes.toArray(), [], [])
  const lista = clientes.filter((c) => (c.nombre + c.direccion + c.telefono).toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <Titulo accion={<Boton onClick={() => setNuevo(!nuevo)}>{nuevo ? 'Cerrar' : '+ Cliente'}</Boton>}>Clientes</Titulo>
      {nuevo && (
        <Tarjeta className="mb-4">
          <FormCliente onListo={() => (params.get('nuevo') ? nav('/ordenes/nueva') : setNuevo(false))} />
        </Tarjeta>
      )}
      <input className={`${entrada} mb-3`} placeholder="Buscar por nombre, dirección o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!lista.length ? <Vacio>No hay clientes.</Vacio> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((c) => (
            <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-suave ring-1 ring-campo-100/80 transition hover:-translate-y-0.5 hover:shadow-alta">
              <Avatar nombre={c.nombre} tam="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-campo-900">{c.nombre}</div>
                <div className="truncate text-sm text-neutral-500">{c.direccion}</div>
              </div>
              <span className="rounded-full bg-campo-50 px-2.5 py-1 text-xs font-bold text-campo-700">{ordenes.filter((o) => o.cliente_id === c.id).length} servicios</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Expediente del cliente: historial de órdenes y sus hojas de servicio.
export function ClienteDetalle() {
  const { id } = useParams()
  const cliente = useLiveQuery(() => db.clientes.get(id!), [id])
  const ordenes = useLiveQuery(() => db.ordenes.where('cliente_id').equals(id!).reverse().sortBy('fecha_programada'), [id], [])
  const [editar, setEditar] = useState(false)
  if (!cliente) return <p>Cargando…</p>
  return (
    <div className="space-y-4">
      <Titulo accion={<Boton variante="secundario" onClick={() => setEditar(!editar)}>{editar ? 'Cerrar' : 'Editar'}</Boton>}>{cliente.nombre}</Titulo>
      {editar ? <Tarjeta><FormCliente inicial={cliente} onListo={() => setEditar(false)} /></Tarjeta> : (
        <Tarjeta className="text-sm">
          <p>{cliente.direccion}</p>
          {cliente.telefono && <p>📞 {cliente.telefono}</p>}
          {cliente.notas && <p className="mt-2 text-neutral-600">{cliente.notas}</p>}
        </Tarjeta>
      )}
      <h2 className="text-lg font-bold">Expediente ({ordenes.length} servicios)</h2>
      {!ordenes.length ? <Vacio>Este cliente todavía no tiene servicios.</Vacio> : (
        <div className="space-y-2">
          {ordenes.map((o) => (
            <Tarjeta key={o.id} className="flex flex-wrap items-center justify-between gap-2">
              <Link to={`/ordenes/${o.id}`} className="min-w-0">
                <div className="text-xs text-neutral-500">Folio {o.folio ?? '—'} · {fechaCorta(o.fecha_programada)}</div>
                <div className="font-semibold">{o.titulo}</div>
              </Link>
              <div className="flex items-center gap-2">
                <Estado estado={o.estado} />
                <Boton variante="fantasma" onClick={async () => { const { doc, nombre } = await (await import('../../lib/pdf')).pdfHoja(o.id); doc.save(nombre) }}>📄 PDF</Boton>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  )
}
