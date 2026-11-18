import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ListaAdjuntos } from '../../components/Adjuntos'
import { ArrowLeft, Camera, Check, Clock, FileDown, Lock, MapPin, MessageCircle, Package, PenLine, Phone, UserSquare2, XCircle } from 'lucide-react'
import { Avatar, Boton, Estado, fechaCorta, Seccion } from '../../components/ui'
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

  const ORIGEN: Record<string, string> = { boton: 'botón', evidencia: 'con la 1.ª evidencia', firma: 'con la firma', terminar: 'al terminar' }
  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-campo-700"><ArrowLeft className="h-4 w-4" /> Tablero</Link>
      {params.get('nueva') && (
        <div className="aparecer flex flex-wrap items-center gap-3 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500 text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>
          <p className="flex-1 font-bold text-emerald-900">Orden creada{orden.folio ? ` con folio ${orden.folio}` : ''}.</p>
          {wa && <a href={wa} target="_blank" rel="noreferrer"><Boton variante="sol" icono={MessageCircle}>Avisar al cliente por WhatsApp</Boton></a>}
        </div>
      )}

      <div className="rounded-[2rem] bg-white p-6 shadow-suave ring-1 ring-campo-100/80">
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span className="rounded-lg bg-campo-50 px-2 py-0.5 font-bold text-campo-700">#{orden.folio ?? 'por asignar'}</span>
          <span>{orden.tipo}</span>·<span>{fechaCorta(orden.fecha_programada)}</span>
          <span className="ml-auto"><Estado estado={orden.estado} /></span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-campo-900 sm:text-3xl">{orden.titulo}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Boton onClick={hoja} disabled={generando} icono={FileDown}>{generando ? 'Generando…' : 'Hoja de servicio'}</Boton>
          {wa && <a href={wa} target="_blank" rel="noreferrer"><Boton variante="secundario" icono={MessageCircle}>Avisar por WhatsApp</Boton></a>}
          {abierta && orden.estado === 'terminada' && <Boton variante="sol" icono={Lock} onClick={() => cerrarOrden(orden.id, sesion!.usuario.rol)}>Cerrar orden</Boton>}
          {abierta && <Boton variante="fantasma" icono={XCircle} onClick={() => confirm('¿Cancelar esta orden?') && cancelarOrden(orden.id, sesion!.usuario.rol)}>Cancelar</Boton>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion icono={UserSquare2} titulo="Cliente e instrucciones">
          {cliente ? (
            <div className="space-y-1 text-sm">
              <Link to={`/clientes/${cliente.id}`} className="font-bold text-campo-700 hover:underline">{cliente.nombre}</Link>
              <p className="text-neutral-600">{cliente.direccion}</p>
              <div className="flex flex-wrap gap-3 pt-1 text-campo-700">
                {cliente.telefono && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{cliente.telefono}</span>}
                {cliente.lat != null && cliente.lng != null && <a className="inline-flex items-center gap-1 font-semibold hover:underline" target="_blank" rel="noreferrer" href={enlaceMapa(cliente.lat, cliente.lng)}><MapPin className="h-3.5 w-3.5" />Abrir en mapa</a>}
              </div>
            </div>
          ) : '—'}
          <div className="mt-4 rounded-2xl bg-campo-50/70 p-3 text-sm whitespace-pre-wrap ring-1 ring-campo-100">{orden.instrucciones}</div>
        </Seccion>

        <Seccion icono={Clock} titulo="Técnicos y tiempos" accion={abierta && <Boton variante="fantasma" onClick={() => setEditando(!editando)}>{editando ? 'Listo' : 'Cambiar'}</Boton>}>
          {editando ? (
            <div className="space-y-1.5">
              {tecnicos.map((t) => (
                <label key={t.id} className="flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm hover:bg-campo-50">
                  <input type="checkbox" className="h-4 w-4 accent-campo-700" checked={asignados.includes(t.id)}
                    onChange={(e) => asignarTecnicos(orden.id, e.target.checked ? [...asignados, t.id] : asignados.filter((x) => x !== t.id))} />
                  <Avatar nombre={t.nombre} tam="sm" />{t.nombre}
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {asignados.length ? asignados.map((t) => (
                <span key={t} className="inline-flex items-center gap-2 rounded-full bg-campo-50 py-1 pr-3 pl-1 text-sm ring-1 ring-campo-100"><Avatar nombre={nombre(t)} tam="sm" />{nombre(t)}</span>
              )) : <span className="text-sm text-neutral-500">Sin técnico asignado</span>}
            </div>
          )}
          <ol className="relative mt-5 space-y-3 border-l-2 border-campo-100 pl-5">
            {!registros.length && <li className="text-sm text-neutral-500">Nadie ha llegado todavía.</li>}
            {registros.map((r) => (
              <li key={r.id} className="relative text-sm">
                <span className={`absolute top-1 -left-[27px] h-3 w-3 rounded-full ring-4 ring-white ${r.tipo === 'llegada' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                <div className="font-semibold text-campo-900">{r.tipo === 'llegada' ? 'Llegó' : 'Salió'} · {nombre(r.tecnico_id)}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                  {new Date(r.hora_dispositivo).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                  {r.origen && r.origen !== 'boton' && <span className="rounded bg-sol-100 px-1.5 font-semibold text-sol-600">automática {ORIGEN[r.origen]}</span>}
                  {r.lat != null && r.lng != null && <a className="font-semibold text-campo-700 hover:underline" target="_blank" rel="noreferrer" href={enlaceMapa(r.lat, r.lng)}>ver ubicación</a>}
                  {r.revisar && <span className="font-semibold text-red-700">revisar hora</span>}
                </div>
              </li>
            ))}
          </ol>
          {intervalos(registros).filter((i) => i.fin).map((i) => (
            <p key={i.inicio + i.tecnico_id} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100"><Clock className="h-3.5 w-3.5" />{nombre(i.tecnico_id).split(' ')[0]}: {formatoHoras(i.minutos)}</p>
          ))}
        </Seccion>
      </div>

      <Seccion icono={Camera} titulo={`Evidencias (${adjuntos.length})`}>
        <ListaAdjuntos adjuntos={adjuntos} />
      </Seccion>

      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion icono={Package} titulo="Piezas, resultados y observaciones">
          {!materiales.length ? <p className="text-sm text-neutral-500">Ninguna pieza registrada.</p> : (
            <ul className="divide-y divide-campo-100 rounded-2xl bg-campo-50/60 px-4 ring-1 ring-campo-100">
              {materiales.map((m) => <li key={m.id} className="flex justify-between py-2 text-sm"><span>{m.descripcion}</span><b className="text-campo-700">{m.cantidad} {m.unidad}</b></li>)}
            </ul>
          )}
          <h3 className="mt-4 text-xs font-bold tracking-wide text-campo-700 uppercase">Resultados</h3>
          <p className="text-sm whitespace-pre-wrap">{orden.resultados || '—'}</p>
          <h3 className="mt-3 text-xs font-bold tracking-wide text-campo-700 uppercase">Observaciones</h3>
          <p className="text-sm whitespace-pre-wrap">{orden.observaciones || '—'}</p>
        </Seccion>
        <Seccion icono={PenLine} titulo="Firma de recibido">
          {firma && (firma.imagen_data_url || firma.sin_firma_motivo) ? (
            <div>
              {firma.imagen_data_url ? <img src={firma.imagen_data_url} alt="Firma" className="max-h-32 rounded-2xl bg-white ring-1 ring-campo-100" /> : <p className="text-sm">Sin firma: {firma.sin_firma_motivo}</p>}
              <p className="mt-2 font-bold text-campo-900">{firma.nombre_recibe}</p>
            </div>
          ) : <p className="text-sm text-neutral-500">Aún no firma nadie.</p>}
        </Seccion>
      </div>
    </div>
  )
}
