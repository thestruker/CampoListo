import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { ESPERA_BASE_MS, guardar, SinConexionError, vaciarCola } from './outbox'
import type { Cliente, TablaSync } from './types'

const cliente = (id: string, nombre = 'Cliente'): Cliente => ({
  id, empresa_id: 'e', nombre, telefono: '', direccion: '', notas: '', updated_at: '',
})

describe('cola de salida (CU-12)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('guarda en local y deja un solo pendiente aunque se guarde dos veces', async () => {
    await guardar('clientes', cliente('c1', 'A'))
    await guardar('clientes', cliente('c1', 'B'))
    expect(await db.outbox.count()).toBe(1)
    expect((await db.clientes.get('c1'))?.nombre).toBe('B')
  })

  it('envía en orden: primero padres y luego hijos', async () => {
    const enviados: TablaSync[] = []
    await guardar('registros_tiempo', { id: 'r1', empresa_id: 'e', orden_id: 'o1', tecnico_id: 't', tipo: 'llegada', hora_dispositivo: '', updated_at: '' })
    await guardar('clientes', cliente('c1'))
    const res = await vaciarCola(async (t) => { enviados.push(t) })
    expect(res.enviados).toBe(2)
    expect(enviados).toEqual(['clientes', 'registros_tiempo'])
    expect(await db.outbox.count()).toBe(0)
  })

  it('si falla, reintenta después con espera creciente y sin duplicar', async () => {
    await guardar('clientes', cliente('c1'))
    const t0 = 1_000_000
    let llamadas = 0
    await vaciarCola(async () => { llamadas++; throw new Error('500') }, t0)
    let item = (await db.outbox.toArray())[0]
    expect(item.intentos).toBe(1)
    expect(item.proximo_intento).toBe(t0 + ESPERA_BASE_MS)
    // Antes de tiempo no se reintenta
    await vaciarCola(async () => { llamadas++ }, t0 + 1000)
    expect(llamadas).toBe(1)
    await vaciarCola(async () => { llamadas++; throw new Error('500') }, t0 + ESPERA_BASE_MS)
    item = (await db.outbox.toArray())[0]
    expect(item.intentos).toBe(2)
    expect(item.proximo_intento).toBe(t0 + ESPERA_BASE_MS + 2 * ESPERA_BASE_MS)
    await vaciarCola(async () => { llamadas++ }, t0 + 60_000)
    expect(await db.outbox.count()).toBe(0)
  })

  it('sin señal no cuenta como intento fallido', async () => {
    await guardar('clientes', cliente('c1'))
    await vaciarCola(async () => { throw new SinConexionError() })
    const item = (await db.outbox.toArray())[0]
    expect(item.intentos).toBe(0)
    expect(item.proximo_intento).toBe(0)
  })

  it('si el registro cambia mientras se envía, no se pierde el cambio', async () => {
    await guardar('clientes', cliente('c1', 'A'))
    const vistos: string[] = []
    await vaciarCola(async (_t, reg) => {
      vistos.push(String(reg.nombre))
      if (vistos.length === 1) await guardar('clientes', cliente('c1', 'B')) // cambio a media subida
    })
    expect(vistos).toEqual(['A', 'B'])
    expect(await db.outbox.count()).toBe(0)
  })
})
