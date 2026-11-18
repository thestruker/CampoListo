import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Camera, Check, Clock, LogOut, MapPin, Map as MapaIcono, Package, PenLine, Phone, Plus, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ListaAdjuntos } from '../../components/Adjuntos'
import { FirmaPad } from '../../components/FirmaPad'
import { Grabadora } from '../../components/Grabadora'
import { Boton, entrada, Estado, fechaCorta, horaCorta } from '../../components/ui'
import { agregarAdjunto, agregarMaterial, guardarFirma, registrarLlegada, registrarSalida, terminarOrden } from '../../lib/acciones'
import { db } from '../../lib/db'
import { enlaceMapa } from '../../lib/geo'
import { ESTADOS_ABIERTOS, estaEnSitio, faltantesParaTerminar } from '../../lib/reglas'
import { useSesion } from '../../lib/sesion'
import type { Momento, OrigenRegistro } from '../../lib/types'

const ORIGEN: Record<OrigenRegistro, string> = {
  boton: 'con el botón',
  evidencia: 'automática con tu primera evidencia',
  firma: 'automática con la firma del cliente',
  terminar: 'al terminar',
}

function Paso({ n, titulo, hecho, opcional, children }: { n: number; titulo: string; hecho: boolean; opcional?: boolean; children: ReactNode }) {
  return (
    <section className="relative rounded-3xl bg-white p-5 shadow-suave ring-1 ring-campo-100/80">
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold transition ${hecho ? 'bg-emerald-500 text-white' : 'bg-campo-50 text-campo-700 ring-1 ring-campo-100'}`}>
          {hecho ? <Check className="h-5 w-5" strokeWidth={3} /> : n}
        </span>
        <h2 className="text-lg font-extrabold text-campo-900">{titulo}</h2>
        {opcional && <span className="ml-auto text-xs text-neutral-400">opcional</span>}
      </div>
      {children}
    </section>
  )
}

// Flujo del técnico en campo: evidencia → piezas → firma → Terminé.
// La llegada se registra sola con la primera evidencia y la salida con la firma del cliente
// (entrevista 3: un botón extra se olvida). CU-08 a CU-11. Todo funciona sin señal.
export function OrdenTecnico() {
  const { id } = useParams()
  const { sesion } = useSesion()
  const yo = sesion!.usuario.id
  const orden = useLiveQuery(() => db.ordenes.get(id!), [id])
  const cliente = useLiveQuery(() => (orden ? db.clientes.get(orden.cliente_id) : undefined), [orden?.cliente_id])
  const registros = useLiveQuery(() => db.registros_tiempo.where('orden_id').equals(id!).toArray(), [id], [])
  const adjuntos = useLiveQuery(() => db.adjuntos.where('orden_id').equals(id!).sortBy('created_at'), [id], [])
  const materiales = useLiveQuery(() => db.materiales_usados.where('orden_id').equals(id!).toArray(), [id], [])
  const firma = useLiveQuery(() => db.firmas.where('orden_id').equals(id!).first(), [id])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [momento, setMomento] = useState<Momento>('antes')
  const [pieza, setPieza] = useState({ descripcion: '', cantidad: '1', unidad: 'pza' })
  const [nombreRecibe, setNombreRecibe] = useState('')
  const [trazo, setTrazo] = useState('')
  const [sinFirma, setSinFirma] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [resultados, setResultados] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [hecho, setHecho] = useState(false)

  if (!orden) return null
  const enSitio = estaEnSitio(registros, yo, orden.id)
  const abierta = ESTADOS_ABIERTOS.includes(orden.estado)
  const misRegistros = registros.filter((r) => r.tecnico_id === yo).sort((a, b) => a.hora_dispositivo.localeCompare(b.hora_dispositivo))
  const ultimaLlegada = [...misRegistros].reverse().find((r) => r.tipo === 'llegada')
  const ultimaSalida = [...misRegistros].reverse().find((r) => r.tipo === 'salida')
  const reporte = adjuntos.filter((a) => a.momento === 'reporte')
  const evidencias = adjuntos.filter((a) => a.momento !== 'reporte')
  const firmaLista = !!firma && !!(firma.imagen_data_url || firma.sin_firma_motivo)
  const faltan = faltantesParaTerminar(adjuntos, firma)

  async function correr(f: () => Promise<unknown>) {
    setError(null)
    setOcupado(true)
    try {
      await f()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  if (hecho || orden.estado === 'terminada' || orden.estado === 'cerrada') {
    return (
      <div className="aparecer mx-auto flex max-w-md flex-col items-center py-14 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-300/40" />
          <div className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-campo-700 text-white shadow-alta">
            <Check className="h-14 w-14" strokeWidth={3} />
          </div>
        </div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-campo-900">Recibido</h1>
        <p className="mt-2 font-semibold text-campo-700">#{orden.folio ?? '—'} · {orden.titulo}</p>
        <div className="mt-4 w-full space-y-1 rounded-3xl bg-white p-4 text-sm text-neutral-600 shadow-suave ring-1 ring-campo-100">
          {firma?.nombre_recibe && <p>Firmó <b>{firma.nombre_recibe}</b></p>}
          {ultimaLlegada && <p>Llegada {horaCorta(ultimaLlegada.hora_dispositivo)}{ultimaSalida ? ` · Salida ${horaCorta(ultimaSalida.hora_dispositivo)}` : ''}</p>}
          <p className="text-xs text-neutral-400">Si no hay señal, se sube solo cuando regrese.</p>
        </div>
        <Link to="/" className="mt-6 w-full"><Boton grande className="w-full">Volver a mis órdenes</Boton></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-campo-700"><ArrowLeft className="h-4 w-4" /> Mis órdenes</Link>

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-suave ring-1 ring-campo-100/80">
        <div className="bg-gradient-to-br from-campo-50 to-white p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-neutral-400">#{orden.folio ?? '—'} · {fechaCorta(orden.fecha_programada)}</span>
            <Estado estado={orden.estado} />
          </div>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-campo-900">{orden.titulo}</h1>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-neutral-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-campo-500" /><span><b className="text-campo-900">{cliente?.nombre}</b> · {cliente?.direccion}</span></p>
          <div className="mt-3 flex gap-2">
            {cliente?.lat != null && cliente.lng != null && <a href={enlaceMapa(cliente.lat, cliente.lng)} target="_blank" rel="noreferrer"><Boton variante="secundario" icono={MapaIcono}>Mapa</Boton></a>}
            {cliente?.telefono && <a href={`tel:${cliente.telefono}`}><Boton variante="secundario" icono={Phone}>Llamar</Boton></a>}
          </div>
        </div>
        <div className="border-t border-campo-100 p-5">
          <h2 className="text-xs font-bold tracking-wide text-campo-700 uppercase">Qué hay que hacer</h2>
          <p className="mt-1 whitespace-pre-wrap text-campo-900">{orden.instrucciones}</p>
          {reporte.length > 0 && <div className="mt-4"><h2 className="mb-2 text-xs font-bold tracking-wide text-campo-700 uppercase">Reporte de la falla</h2><ListaAdjuntos adjuntos={reporte} /></div>}
        </div>
      </div>

      {/* Tiempo: se registra solo */}
      {abierta && (
        <div className={`flex items-center gap-3 rounded-3xl p-4 ring-1 ${enSitio ? 'bg-sky-50 ring-sky-200' : 'bg-sol-100/60 ring-sol-400/30'}`} data-testid="estado-tiempo">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${enSitio ? 'bg-sky-100 text-sky-700' : 'bg-sol-100 text-sol-600'}`}>
            {enSitio ? <Clock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </span>
          <div className="flex-1 text-sm">
            {enSitio && ultimaLlegada ? (
              <>
                <p className="font-bold text-campo-900">En sitio desde las {horaCorta(ultimaLlegada.hora_dispositivo)}</p>
                <p className="text-neutral-600">Llegada {ORIGEN[ultimaLlegada.origen ?? 'boton']}{ultimaLlegada.lat == null ? ' (sin GPS)' : ''}. La salida se registra con la firma.</p>
              </>
            ) : ultimaSalida ? (
              <>
                <p className="font-bold text-campo-900">Salida a las {horaCorta(ultimaSalida.hora_dispositivo)}</p>
                <p className="text-neutral-600">Registrada {ORIGEN[ultimaSalida.origen ?? 'boton']}.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-campo-900">No tienes que marcar tu llegada</p>
                <p className="text-neutral-600">Se registra sola con tu primera foto o nota.</p>
              </>
            )}
          </div>
          {!enSitio && !ultimaSalida && (
            <Boton variante="fantasma" disabled={ocupado} onClick={() => correr(() => registrarLlegada(orden.id, yo))}>Ya llegué</Boton>
          )}
        </div>
      )}

      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">{error}</p>}

      {abierta && (
        <>
          <Paso n={1} titulo="Evidencia" hecho={evidencias.length > 0}>
            <div className="mb-3 inline-flex rounded-2xl bg-campo-50 p-1 ring-1 ring-campo-100">
              {(['antes', 'despues'] as Momento[]).map((m) => (
                <button key={m} type="button" onClick={() => setMomento(m)}
                  className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${momento === m ? 'bg-white text-campo-900 shadow-sm' : 'text-neutral-500'}`}>
                  {m === 'antes' ? 'Antes' : 'Después'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-campo-700 px-4 font-bold text-white shadow-suave active:scale-[0.98]">
                <Camera className="h-5 w-5" /> Tomar foto
                <input type="file" accept="image/*" capture="environment" className="hidden" data-testid="foto"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) correr(() => agregarAdjunto(orden, yo, { tipo: 'foto', momento, archivo: f })); e.target.value = '' }} />
              </label>
              <Grabadora onListo={(a) => correr(() => agregarAdjunto(orden, yo, { tipo: 'audio', momento: 'evidencia', archivo: a }))} />
            </div>
            <div className="mt-2 flex gap-2">
              <input className={entrada} placeholder="Nota: qué hiciste o qué encontraste" value={nota} onChange={(e) => setNota(e.target.value)} />
              <Boton type="button" disabled={!nota.trim() || ocupado} onClick={() => correr(async () => { await agregarAdjunto(orden, yo, { tipo: 'texto', momento: 'evidencia', texto: nota.trim() }); setNota('') })}>Agregar</Boton>
            </div>
            {evidencias.length > 0 && <div className="mt-4"><ListaAdjuntos adjuntos={evidencias} /></div>}
          </Paso>

          <Paso n={2} titulo="Piezas y materiales" hecho={materiales.length > 0} opcional>
            <form className="grid grid-cols-[1fr_4.5rem_5.5rem] gap-2" onSubmit={(e) => {
              e.preventDefault()
              correr(async () => { await agregarMaterial(orden, pieza.descripcion.trim(), Number(pieza.cantidad) || 1, pieza.unidad); setPieza({ descripcion: '', cantidad: '1', unidad: 'pza' }) })
            }}>
              <input required className={entrada} placeholder="Ej. Conector MC4" value={pieza.descripcion} onChange={(e) => setPieza({ ...pieza, descripcion: e.target.value })} />
              <input className={`${entrada} px-2 text-center`} inputMode="decimal" aria-label="Cantidad" value={pieza.cantidad} onChange={(e) => setPieza({ ...pieza, cantidad: e.target.value })} />
              <select className={`${entrada} px-2`} aria-label="Unidad" value={pieza.unidad} onChange={(e) => setPieza({ ...pieza, unidad: e.target.value })}>
                {['pza', 'm', 'kg', 'l', 'tramos', 'juego'].map((u) => <option key={u}>{u}</option>)}
              </select>
              <Boton className="col-span-3" variante="secundario" icono={Plus}>Agregar pieza</Boton>
            </form>
            {materiales.length > 0 && (
              <ul className="mt-3 divide-y divide-campo-100 rounded-2xl bg-campo-50/60 px-4 ring-1 ring-campo-100">
                {materiales.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 py-2.5 text-sm">
                    <Package className="h-4 w-4 text-campo-500" />
                    <span className="flex-1 font-medium">{m.descripcion}</span>
                    <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-bold text-campo-700 ring-1 ring-campo-100">{m.cantidad} {m.unidad}</span>
                  </li>
                ))}
              </ul>
            )}
          </Paso>

          <Paso n={3} titulo="Firma de recibido" hecho={firmaLista}>
            {firmaLista ? (
              <div className="flex items-center gap-4 rounded-2xl bg-campo-50/60 p-3 ring-1 ring-campo-100">
                {firma!.imagen_data_url ? <img src={firma!.imagen_data_url} alt="Firma" className="h-16 rounded-xl bg-white ring-1 ring-campo-100" /> : <PenLine className="h-6 w-6 text-neutral-400" />}
                <div className="flex-1 text-sm">
                  <p className="font-bold text-campo-900">{firma!.nombre_recibe || 'Sin firma'}</p>
                  {!firma!.imagen_data_url && <p className="text-neutral-500">Motivo: {firma!.sin_firma_motivo}</p>}
                </div>
                <Boton variante="fantasma" onClick={() => correr(() => guardarFirma(orden, { nombre_recibe: '', imagen_data_url: '', sin_firma_motivo: '' }))}>Repetir</Boton>
              </div>
            ) : (
              <div className="space-y-3">
                <input className={entrada} placeholder="Nombre de quien recibe" value={nombreRecibe} onChange={(e) => setNombreRecibe(e.target.value)} />
                {!sinFirma ? <FirmaPad onCambio={setTrazo} /> : (
                  <input className={entrada} placeholder="¿Por qué no hay firma? Ej. no había nadie en el domicilio" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                )}
                <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" className="h-4 w-4 accent-campo-700" checked={sinFirma} onChange={(e) => setSinFirma(e.target.checked)} /> No hay quien firme</label>
                <Boton type="button" className="w-full" icono={PenLine} disabled={ocupado || (sinFirma ? !motivo.trim() : !trazo || !nombreRecibe.trim())}
                  onClick={() => correr(() => guardarFirma(orden, { nombre_recibe: nombreRecibe.trim(), imagen_data_url: sinFirma ? '' : trazo, sin_firma_motivo: sinFirma ? motivo.trim() : '' }, yo))}>
                  Guardar firma
                </Boton>
              </div>
            )}
          </Paso>

          <Paso n={4} titulo="Terminar" hecho={false}>
            <div className="space-y-2">
              <textarea rows={2} className={entrada} placeholder="Resultados: ¿cómo quedó?" value={resultados} onChange={(e) => setResultados(e.target.value)} />
              <textarea rows={2} className={entrada} placeholder="Observaciones (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            {faltan.length > 0 && <p className="mt-3 rounded-2xl bg-sol-100/70 p-3 text-sm text-campo-900">Para terminar falta: {faltan.join(' y ')}.</p>}
            <Boton grande variante="sol" icono={Check} className="mt-3 w-full" disabled={ocupado || faltan.length > 0}
              onClick={() => correr(async () => { await terminarOrden(orden.id, yo, resultados.trim(), observaciones.trim()); setHecho(true) })}>
              Terminé
            </Boton>
            {enSitio && (
              <Boton variante="fantasma" icono={LogOut} className="mt-1 w-full" disabled={ocupado} onClick={() => correr(() => registrarSalida(orden.id, yo))}>
                Salir sin terminar (regreso otro día)
              </Boton>
            )}
          </Paso>
        </>
      )}
    </div>
  )
}
