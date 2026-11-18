import { db, getMeta, setMeta } from './db'
import { SinConexionError, vaciarCola, type Sender } from './outbox'
import { BUCKET_EVIDENCIAS, MODO_DEMO, supabase } from './supabase'
import type { TablaSync } from './types'

// Sincronización (CU-12). Disparadores: al recuperar la conexión, al abrir la app
// y cada 60 s mientras está abierta con elementos pendientes.

const TABLAS: TablaSync[] = [
  'empresas', 'usuarios', 'clientes', 'ordenes', 'orden_tecnicos',
  'registros_tiempo', 'materiales_usados', 'firmas', 'adjuntos',
]

function extension(tipo: string) {
  if (tipo.includes('jpeg') || tipo.includes('jpg')) return 'jpg'
  if (tipo.includes('png')) return 'png'
  if (tipo.includes('webm')) return 'webm'
  if (tipo.includes('mp4') || tipo.includes('m4a') || tipo.includes('aac')) return 'm4a'
  return 'bin'
}

/** En modo demo no hay servidor: "subir" solo funciona si el navegador dice que hay conexión. */
const senderDemo: Sender = async () => {
  if (!navigator.onLine) throw new SinConexionError()
  await new Promise((r) => setTimeout(r, 120))
}

const senderSupabase: Sender = async (tabla, registro) => {
  if (!supabase) throw new Error('Supabase no configurado')
  if (!navigator.onLine) throw new SinConexionError()
  const fila: Record<string, unknown> = { ...registro }
  if (tabla === 'adjuntos') {
    const blob = registro.blob as Blob | null | undefined
    if (blob && !registro.storage_path) {
      const ruta = `${registro.empresa_id}/${registro.orden_id}/${registro.id}.${extension(blob.type)}`
      const { error } = await supabase.storage.from(BUCKET_EVIDENCIAS).upload(ruta, blob, { upsert: true, contentType: blob.type })
      if (error) throw error
      fila.storage_path = ruta
      await db.adjuntos.update(String(registro.id), { storage_path: ruta })
    }
    delete fila.blob
  }
  if (tabla === 'registros_tiempo') {
    delete fila.hora_servidor // la pone el servidor
    delete fila.revisar // lo calcula un trigger (RN-05)
  }
  if (tabla === 'ordenes' && fila.folio == null) delete fila.folio // el trigger asigna el folio
  const { error } = await supabase.from(tabla).upsert(fila, { onConflict: 'id' })
  if (error) throw error
}

/** Baja los cambios del servidor desde la última sincronización. */
async function bajarCambios(empresaId: string) {
  if (!supabase) return
  const desde = (await getMeta<string>('ultima_bajada')) ?? '1970-01-01T00:00:00Z'
  const inicio = new Date().toISOString()
  for (const tabla of TABLAS) {
    let q = supabase.from(tabla).select('*').gt('updated_at', desde)
    q = tabla === 'empresas' ? q.eq('id', empresaId) : q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    if (!data?.length) continue
    const pendientes = new Set((await db.outbox.where('tabla').equals(tabla).toArray()).map((o) => o.registro_id))
    for (const fila of data) {
      if (pendientes.has(fila.id)) continue // lo local gana mientras no se haya subido
      if (tabla === 'adjuntos') {
        const local = await db.adjuntos.get(fila.id)
        await db.adjuntos.put({ ...fila, blob: local?.blob ?? null })
      } else {
        await db.table(tabla).put(fila)
      }
    }
  }
  await setMeta('ultima_bajada', inicio)
}

export async function sincronizar(empresaId?: string) {
  const resultado = await vaciarCola(MODO_DEMO ? senderDemo : senderSupabase)
  if (!MODO_DEMO && empresaId && navigator.onLine) {
    try {
      await bajarCambios(empresaId)
    } catch (e) {
      console.warn('No se pudieron bajar cambios', e)
    }
  }
  window.dispatchEvent(new CustomEvent('campolisto:sync', { detail: resultado }))
  return resultado
}

let intervalo: number | undefined

export function iniciarSincronizacion(empresaId?: string) {
  const correr = () => void sincronizar(empresaId)
  let espera: number | undefined
  const alCambiar = () => {
    window.clearTimeout(espera)
    espera = window.setTimeout(correr, 800) // sube en cuanto hay señal, sin esperar al siguiente minuto
  }
  window.addEventListener('online', correr)
  window.addEventListener('campolisto:cambio', alCambiar)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') correr()
  })
  window.clearInterval(intervalo)
  intervalo = window.setInterval(correr, 60_000)
  correr()
  return () => {
    window.removeEventListener('online', correr)
    window.removeEventListener('campolisto:cambio', alCambiar)
    window.clearInterval(intervalo)
  }
}

/** URL para ver un adjunto: el blob local si existe, si no, una URL firmada de Storage. */
export async function urlAdjunto(adjunto: { blob?: Blob | null; storage_path?: string | null }): Promise<string | null> {
  if (adjunto.blob) return URL.createObjectURL(adjunto.blob)
  if (supabase && adjunto.storage_path) {
    const { data } = await supabase.storage.from(BUCKET_EVIDENCIAS).createSignedUrl(adjunto.storage_path, 3600)
    return data?.signedUrl ?? null
  }
  return null
}
