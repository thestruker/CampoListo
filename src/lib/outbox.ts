import { db, ahora } from './db'
import type { OutboxItem, TablaSync } from './types'

// Cola de salida (CU-12 / RF de sincronización).
// - Cada cambio se guarda en la tabla local y en la cola en la MISMA transacción.
// - El id del elemento de la cola es tabla:id, así guardar dos veces el mismo registro
//   no crea dos envíos, y reintentar un envío nunca duplica nada en el servidor (upsert por id).
// - Si falla, se reintenta con espera creciente.

/** Sin señal no es un error del registro: no cuenta como intento ni retrasa el siguiente. */
export class SinConexionError extends Error {
  constructor() {
    super('Sin conexión')
  }
}

export type Sender = (tabla: TablaSync, registro: Record<string, unknown>) => Promise<void>

export const ESPERA_BASE_MS = 5_000
export const ESPERA_MAX_MS = 10 * 60_000

export function esperaReintento(intentos: number): number {
  return Math.min(ESPERA_BASE_MS * 2 ** Math.max(0, intentos - 1), ESPERA_MAX_MS)
}

export async function guardar<T extends { id: string; updated_at: string }>(tabla: TablaSync, registro: T) {
  const conFecha = { ...registro, updated_at: ahora() }
  await db.transaction('rw', db.table(tabla), db.outbox, async () => {
    await db.table(tabla).put(conFecha)
    const id = `${tabla}:${registro.id}`
    const previo = await db.outbox.get(id)
    const item: OutboxItem = {
      id,
      tabla,
      registro_id: registro.id,
      creado: previo?.creado ?? Date.now(),
      version: (previo?.version ?? 0) + 1,
      intentos: 0,
      proximo_intento: 0,
    }
    await db.outbox.put(item)
  })
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('campolisto:cambio'))
  return conFecha
}

export async function pendientes(): Promise<number> {
  return db.outbox.count()
}

let enCurso = false

// Envía lo pendiente. Devuelve cuántos elementos se subieron.
export async function vaciarCola(sender: Sender, ahoraMs = Date.now()): Promise<{ enviados: number; fallidos: number }> {
  if (enCurso) return { enviados: 0, fallidos: 0 }
  enCurso = true
  let enviados = 0
  let fallidos = 0
  try {
    for (let vuelta = 0; vuelta < 5; vuelta++) {
      const enviadosAntes = enviados
      const listos = await db.outbox.where('proximo_intento').belowOrEqual(ahoraMs).sortBy('creado')
      // Orden de dependencias: primero padres (clientes, órdenes), luego hijos.
      const prioridad: TablaSync[] = [
        'empresas', 'usuarios', 'clientes', 'ordenes', 'orden_tecnicos',
        'registros_tiempo', 'materiales_usados', 'firmas', 'adjuntos',
      ]
      listos.sort((a, b) => prioridad.indexOf(a.tabla) - prioridad.indexOf(b.tabla) || a.creado - b.creado)
      for (const item of listos) {
        const registro = await db.table(item.tabla).get(item.registro_id)
        if (!registro) {
          await db.outbox.delete(item.id)
          continue
        }
        try {
          await sender(item.tabla, registro)
          // Solo se borra si nadie lo volvió a modificar mientras se enviaba.
          await db.transaction('rw', db.outbox, async () => {
            const actual = await db.outbox.get(item.id)
            if (actual && actual.version === item.version) {
              await db.outbox.delete(item.id)
            }
          })
          enviados++
        } catch (e) {
          if (e instanceof SinConexionError) break
          fallidos++
          const intentos = item.intentos + 1
          await db.outbox.update(item.id, {
            intentos,
            proximo_intento: ahoraMs + esperaReintento(intentos),
            ultimo_error: e instanceof Error ? e.message : String(e),
          })
        }
      }
      // Si alguien guardó algo mientras se enviaba, se da otra vuelta.
      if (enviados === enviadosAntes || fallidos) break
    }
  } finally {
    enCurso = false
  }
  return { enviados, fallidos }
}
