import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ListaAdjuntos } from '../../components/Adjuntos'
import { Boton, Estado, fechaCorta, Tarjeta, Titulo } from '../../components/ui'
import { asignarTecnicos, cancelarOrden, cerrarOrden } from '../../lib/acciones'
import { db } from '../../lib/db'
import { enlaceMapa } from '../../lib/geo'
import { formatoHoras, intervalos } from '../../lib/horas'
import { useSesion } from '../../lib/sesion'
import { enlaceWhatsApp, mensajeAviso } from '../../lib/whatsapp'

// Detalle de la orden para el encargado: línea de tiempo, evidencias, firma y acciones.
export function OrdenDetalle() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { sesion } = useSesion()
  const orden = useLiveQuery(() => db.ordenes.get(id!), [id])
  const cliente = useLiveQuery(() => (orden ? db.clientes.get(orden.cliente_id) : undefined), [orden?.cliente_id])
  const usuarios = useLiveQuery(() => db.usuarios.toArray(), [], [])
  const asign = useLiveQuery(() => db.orden_tecnicos.where('orden_id').equals(id!).toArray(), [id], [])
  const registros = useLiveQuery(() => db.registros_tiempo.where('orden_id').equals(id!).sortBy('hora_dispositivo'), [id], [])
  const adjuntos = useLiveQuery(() => db.adjuntos.where('orden_id').equals(id!).sortBy('created_at'), [id], [])
  const materiales = useLiveQuery(() => db.materiales_usados.where('orden_id').equals(id!).toArray(), [id], [])
  const firma = useLiveQuery(() => db.firmas.where('orden_id').equals(id!).first(), [id])
  const [editando, setEditando] = useState(false)
  const [generando, setGenerando] = useState(false)

  if (!orden) return <p>Cargando…</p>
  const asignados = asign.filter((a) => !a.eliminado).map((a) => a.tecnico_id)
  const nombre = (uid: string) => usuarios.find((u) => u.id === uid)?.nombre ?? '—'
  const tecnicos = usuarios.filter((u) => u.rol === 'tecnico' && u.activo)
  const abierta = !['cerrada', 'cancelada'].includes(orden.estado)
  const wa = cliente?.telefono
    ? enlaceWhatsApp(cliente.telefono, mensajeAviso({ empresa: sesion!.empresa.nombre, cliente: cliente.nombre, folio: orden.folio, fecha: orden.fecha_programada, tecnicos: asignados.map((t) => nombre(t).split(' –')[0]) }))
    : null

  async function hoja() {
    setGenerando(true)
    try {
      const { doc, nombre } = await (await import('../../lib/pdf')).pdfHoja(orden!.id)
      doc.save(nombre)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-4">
      {params.get('nueva') && (
        <Tarjeta className="border-emerald-300 bg-emerald-50">
          <p className="font-semibold text-emerald-900">✓ Orden creada{orden.folio ? ` con folio ${orden.folio}` : ''}.</p>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="mt-2 inline-block"><Boton variante="sol">Avisar al cliente por WhatsApp</Boton></a>}
        </Tarjeta>
      )}
      <Titulo accion={<Estado estado={orden.estado} />}>
        {orden.titulo}
      </Titulo>
      <p className="-mt-3 text-sm text-neutral-500">Folio {orden.folio ?? 'por asignar al sincronizar'} · {orden.tipo} · {fechaCorta(orden.fecha_programada)}</p>

      <div className="flex flex-wrap gap-2">
        <Boton onClick={hoja} disabled={generando}>📄 {generando ? 'Generando…' : 'Hoja de servicio'}</Boton>
        {wa && <a href={wa} target="_blank" rel="noreferrer"><Boton variante="secundario">💬 Avisar por WhatsApp</Boton></a>}
        {abierta && orden.estado === 'terminada' && <Boton variante="sol" onClick={() => cerrarOrden(orden.id, sesion!.usuario.rol)}>Cerrar orden</Boton>}
        {abierta && <Boton variante="fantasma" onClick={() => confirm('¿Cancelar esta orden?') && cancelarOrden(orden.id, sesion!.usuario.rol)}>Cancelar</Boton>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-2 font-bold">Cliente</h2>
          {cliente ? (
            <div className="space-y-1 text-sm">
              <Link to={`/clientes/${cliente.id}`} className="font-semibold text-campo-700 underline">{cliente.nombre}</Link>
              <p>{cliente.direccion}</p>
              {cliente.telefono && <p>📞 {cliente.telefono}</p>}
              {cliente.lat != null && cliente.lng != null && <a className="text-campo-700 underline" target="_blank" rel="noreferrer" href={enlaceMapa(cliente.lat, cliente.lng)}>Abrir en mapa</a>}
            </div>
          ) : '—'}
          <h2 className="mb-1 mt-4 font-bold">Instrucciones</h2>
          <p className="whitespace-pre-wrap text-sm">{orden.instrucciones}</p>
        </Tarjeta>

        <Tarjeta>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Técnicos</h2>
            {abierta && <Boton variante="fantasma" onClick={() => setEditando(!editando)}>{editando ? 'Listo' : 'Cambiar'}</Boton>}
          </div>
          {editando ? (
            <div className="space-y-1">
              {tecnicos.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-campo-700" checked={asignados.includes(t.id)}
                    onChange={(e) => asignarTecnicos(orden.id, e.target.checked ? [...asignados, t.id] : asignados.filter((x) => x !== t.id))} />
                  {t.nombre}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm">{asignados.map(nombre).join(', ') || 'Sin técnico asignado'}</p>
          )}
          <h2 className="mb-1 mt-4 font-bold">Llegadas y salidas</h2>
          {!registros.length && <p className="text-sm text-neutral-500">Nadie ha llegado todavía.</p>}
          <ul className="space-y-1 text-sm">
            {registros.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 text-xs font-semibold ${r.tipo === 'llegada' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>{r.tipo === 'llegada' ? 'Llegó' : 'Salió'}</span>
                {nombre(r.tecnico_id)} · {new Date(r.hora_dispositivo).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                {r.lat != null && r.lng != null && <a className="text-xs text-campo-700 underline" target="_blank" rel="noreferrer" href={enlaceMapa(r.lat, r.lng)}>ubicación</a>}
                {r.revisar && <span className="text-xs font-semibold text-red-700">revisar hora</span>}
              </li>
            ))}
          </ul>
          {intervalos(registros).filter((i) => i.fin).map((i) => (
            <p key={i.inicio + i.tecnico_id} className="mt-1 text-xs text-neutral-600">{nombre(i.tecnico_id)}: {formatoHoras(i.minutos)}</p>
          ))}
        </Tarjeta>
      </div>

      <Tarjeta>
        <h2 className="mb-2 font-bold">Evidencias</h2>
        <ListaAdjuntos adjuntos={adjuntos} />
      </Tarjeta>

      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-2 font-bold">Piezas y materiales</h2>
          {!materiales.length ? <p className="text-sm text-neutral-500">Ninguno registrado.</p> : (
            <ul className="text-sm">{materiales.map((m) => <li key={m.id}>• {m.descripcion} — {m.cantidad} {m.unidad}</li>)}</ul>
          )}
          <h2 className="mb-1 mt-4 font-bold">Resultados</h2>
          <p className="whitespace-pre-wrap text-sm">{orden.resultados || '—'}</p>
          <h2 className="mb-1 mt-4 font-bold">Observaciones</h2>
          <p className="whitespace-pre-wrap text-sm">{orden.observaciones || '—'}</p>
        </Tarjeta>
        <Tarjeta>
          <h2 className="mb-2 font-bold">Firma de recibido</h2>
          {firma ? (
            <div>
              {firma.imagen_data_url ? <img src={firma.imagen_data_url} alt="Firma" className="max-h-28 rounded border border-campo-100 bg-white" /> : <p className="text-sm">Sin firma: {firma.sin_firma_motivo}</p>}
              <p className="mt-1 text-sm font-semibold">{firma.nombre_recibe}</p>
            </div>
          ) : <p className="text-sm text-neutral-500">Aún no firma nadie.</p>}
        </Tarjeta>
      </div>
    </div>
  )
}
