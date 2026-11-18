import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ListaAdjuntos } from '../../components/Adjuntos'
import { FirmaPad } from '../../components/FirmaPad'
import { Grabadora } from '../../components/Grabadora'
import { Boton, entrada, Estado, fechaCorta, horaCorta, Tarjeta } from '../../components/ui'
import { agregarAdjunto, agregarMaterial, guardarFirma, registrarLlegada, registrarSalida, terminarOrden } from '../../lib/acciones'
import { db } from '../../lib/db'
import { enlaceMapa } from '../../lib/geo'
import { ESTADOS_ABIERTOS, estaEnSitio, faltantesParaTerminar } from '../../lib/reglas'
import { useSesion } from '../../lib/sesion'
import type { Momento } from '../../lib/types'

// Flujo del técnico en campo: Llegué → evidencia y piezas → firma → Terminé.
// CU-08, CU-09, CU-10 y CU-11. Todo se guarda en el celular aunque no haya señal.
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

  if (!orden) return <p>Cargando…</p>
  const enSitio = estaEnSitio(registros, yo, orden.id)
  const abierta = ESTADOS_ABIERTOS.includes(orden.estado)
  const misRegistros = registros.filter((r) => r.tecnico_id === yo).sort((a, b) => a.hora_dispositivo.localeCompare(b.hora_dispositivo))
  const reporte = adjuntos.filter((a) => a.momento === 'reporte')
  const evidencias = adjuntos.filter((a) => a.momento !== 'reporte')
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
      <div className="flex flex-col items-center py-16 text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-campo-700 text-5xl text-white">✓</div>
        <h1 className="mt-4 text-3xl font-bold text-campo-900">Recibido</h1>
        <p className="mt-1 text-neutral-600">Folio {orden.folio ?? '—'} · {orden.titulo}</p>
        <p className="mt-1 text-sm text-neutral-500">{firma?.nombre_recibe ? `Firmó ${firma.nombre_recibe}.` : ''} Se sube sola cuando haya señal.</p>
        <Link to="/" className="mt-6"><Boton grande>Volver a mis órdenes</Boton></Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>Folio {orden.folio ?? '—'} · {fechaCorta(orden.fecha_programada)}</span>
          <Estado estado={orden.estado} />
        </div>
        <h1 className="text-2xl font-bold text-campo-900">{orden.titulo}</h1>
      </div>

      <Tarjeta className="space-y-2 text-sm">
        <p className="font-semibold">{cliente?.nombre}</p>
        <p>{cliente?.direccion}</p>
        <div className="flex flex-wrap gap-2">
          {cliente?.lat != null && cliente.lng != null && <a href={enlaceMapa(cliente.lat, cliente.lng)} target="_blank" rel="noreferrer"><Boton variante="secundario">🗺️ Abrir mapa</Boton></a>}
          {cliente?.telefono && <a href={`tel:${cliente.telefono}`}><Boton variante="secundario">📞 Llamar</Boton></a>}
        </div>
        <h2 className="pt-2 font-bold">Qué hay que hacer</h2>
        <p className="whitespace-pre-wrap">{orden.instrucciones}</p>
        {reporte.length > 0 && <><h2 className="pt-2 font-bold">Reporte de la falla</h2><ListaAdjuntos adjuntos={reporte} /></>}
      </Tarjeta>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {/* Paso 1: llegada */}
      {abierta && !enSitio && (
        <Boton grande className="w-full" disabled={ocupado} onClick={() => correr(() => registrarLlegada(orden.id, yo))}>
          📍 {ocupado ? 'Registrando…' : 'Llegué'}
        </Boton>
      )}
      {misRegistros.length > 0 && (
        <p className="text-sm text-neutral-600">
          {misRegistros.map((r) => `${r.tipo === 'llegada' ? 'Llegaste' : 'Saliste'} ${horaCorta(r.hora_dispositivo)}${r.lat == null ? ' (sin GPS)' : ''}`).join(' · ')}
        </p>
      )}

      {enSitio && (
        <>
          {/* Paso 2: evidencia */}
          <Tarjeta className="space-y-3">
            <h2 className="text-lg font-bold">1. Evidencia</h2>
            <div className="flex gap-2">
              {(['antes', 'despues'] as Momento[]).map((m) => (
                <Boton key={m} type="button" variante={momento === m ? 'primario' : 'secundario'} onClick={() => setMomento(m)}>{m === 'antes' ? 'Antes' : 'Después'}</Boton>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-campo-700 px-5 font-semibold text-white">
                📷 Tomar foto
                <input type="file" accept="image/*" capture="environment" className="hidden" data-testid="foto"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) correr(() => agregarAdjunto(orden, yo, { tipo: 'foto', momento, archivo: f })); e.target.value = '' }} />
              </label>
              <Grabadora onListo={(a) => correr(() => agregarAdjunto(orden, yo, { tipo: 'audio', momento: 'evidencia', archivo: a }))} />
            </div>
            <div className="flex gap-2">
              <input className={entrada} placeholder="Nota: qué hiciste o qué encontraste" value={nota} onChange={(e) => setNota(e.target.value)} />
              <Boton type="button" disabled={!nota.trim()} onClick={() => correr(async () => { await agregarAdjunto(orden, yo, { tipo: 'texto', momento: 'evidencia', texto: nota.trim() }); setNota('') })}>Agregar</Boton>
            </div>
            <ListaAdjuntos adjuntos={evidencias} />
          </Tarjeta>

          {/* Paso 3: piezas */}
          <Tarjeta className="space-y-3">
            <h2 className="text-lg font-bold">2. Piezas y materiales</h2>
            <form className="grid grid-cols-[1fr_4.5rem_5rem] gap-2" onSubmit={(e) => {
              e.preventDefault()
              correr(async () => { await agregarMaterial(orden, pieza.descripcion.trim(), Number(pieza.cantidad) || 1, pieza.unidad); setPieza({ descripcion: '', cantidad: '1', unidad: 'pza' }) })
            }}>
              <input required className={entrada} placeholder="Ej. Conector MC4" value={pieza.descripcion} onChange={(e) => setPieza({ ...pieza, descripcion: e.target.value })} />
              <input className={entrada} inputMode="decimal" value={pieza.cantidad} onChange={(e) => setPieza({ ...pieza, cantidad: e.target.value })} />
              <select className={entrada} value={pieza.unidad} onChange={(e) => setPieza({ ...pieza, unidad: e.target.value })}>
                {['pza', 'm', 'kg', 'l', 'tramos', 'juego'].map((u) => <option key={u}>{u}</option>)}
              </select>
              <Boton className="col-span-3" variante="secundario">+ Agregar pieza</Boton>
            </form>
            {materiales.length > 0 && <ul className="text-sm">{materiales.map((m) => <li key={m.id}>• {m.descripcion} — {m.cantidad} {m.unidad}</li>)}</ul>}
          </Tarjeta>

          {/* Paso 4: firma */}
          <Tarjeta className="space-y-3">
            <h2 className="text-lg font-bold">3. Firma de recibido</h2>
            {firma && (firma.imagen_data_url || firma.sin_firma_motivo) ? (
              <div className="text-sm">
                {firma.imagen_data_url ? <img src={firma.imagen_data_url} alt="Firma" className="max-h-24 rounded border" /> : <p>Sin firma: {firma.sin_firma_motivo}</p>}
                <p className="font-semibold">{firma.nombre_recibe}</p>
                <Boton variante="fantasma" onClick={() => correr(() => guardarFirma(orden, { nombre_recibe: '', imagen_data_url: '', sin_firma_motivo: '' }))}>Volver a firmar</Boton>
              </div>
            ) : (
              <>
                <input className={entrada} placeholder="Nombre de quien recibe" value={nombreRecibe} onChange={(e) => setNombreRecibe(e.target.value)} />
                {!sinFirma ? <FirmaPad onCambio={setTrazo} /> : (
                  <input className={entrada} placeholder="¿Por qué no hay firma? Ej. no había nadie en el domicilio" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                )}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sinFirma} onChange={(e) => setSinFirma(e.target.checked)} /> No hay quien firme</label>
                <Boton type="button" disabled={sinFirma ? !motivo.trim() : !trazo || !nombreRecibe.trim()}
                  onClick={() => correr(() => guardarFirma(orden, { nombre_recibe: nombreRecibe.trim(), imagen_data_url: sinFirma ? '' : trazo, sin_firma_motivo: sinFirma ? motivo.trim() : '' }))}>
                  Guardar firma
                </Boton>
              </>
            )}
          </Tarjeta>

          {/* Paso 5: terminar */}
          <Tarjeta className="space-y-3">
            <h2 className="text-lg font-bold">4. Terminar</h2>
            <textarea rows={2} className={entrada} placeholder="Resultados: ¿cómo quedó?" value={resultados} onChange={(e) => setResultados(e.target.value)} />
            <textarea rows={2} className={entrada} placeholder="Observaciones (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            {faltan.length > 0 && <p className="text-sm text-amber-800">Para terminar falta: {faltan.join(' y ')}.</p>}
            <Boton grande variante="sol" className="w-full" disabled={ocupado || faltan.length > 0}
              onClick={() => correr(async () => { await terminarOrden(orden.id, yo, resultados.trim(), observaciones.trim()); setHecho(true) })}>
              ✓ Terminé
            </Boton>
            <Boton variante="fantasma" className="w-full" disabled={ocupado} onClick={() => correr(() => registrarSalida(orden.id, yo))}>
              Salir sin terminar (regreso otro día)
            </Boton>
          </Tarjeta>
        </>
      )}
    </div>
  )
}
