import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { agregarAdjunto, crearOrden, guardarFirma } from './acciones'
import { db } from './db'

// Entrevista 3: "se les va a olvidar". La hora no depende de un botón.
describe('registro de tiempo automático', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await db.empresas.put({ id: 'e', nombre: 'E', razon_social: '', telefono: '', correo: '', direccion: '', updated_at: '' })
    await db.clientes.put({ id: 'c', empresa_id: 'e', nombre: 'Cliente', telefono: '', direccion: '', notas: '', updated_at: '' })
  })

  async function nueva() {
    return crearOrden('e', 'enc', { cliente_id: 'c', tipo: 'Servicio', titulo: 'T', instrucciones: 'I', fecha_programada: '2026-11-18' }, ['tec'])
  }

  it('la primera evidencia del técnico registra su llegada y pone la orden con avance', async () => {
    const o = await nueva()
    await agregarAdjunto(o, 'tec', { tipo: 'texto', momento: 'evidencia', texto: 'Revisé el inversor' })
    const regs = await db.registros_tiempo.where('orden_id').equals(o.id).toArray()
    expect(regs).toHaveLength(1)
    expect(regs[0]).toMatchObject({ tipo: 'llegada', origen: 'evidencia', tecnico_id: 'tec' })
    expect((await db.ordenes.get(o.id))?.estado).toBe('con_avance')
  })

  it('la segunda evidencia no duplica la llegada', async () => {
    const o = await nueva()
    await agregarAdjunto(o, 'tec', { tipo: 'texto', momento: 'evidencia', texto: 'a' })
    await agregarAdjunto(o, 'tec', { tipo: 'texto', momento: 'evidencia', texto: 'b' })
    expect(await db.registros_tiempo.count()).toBe(1)
  })

  it('la firma del cliente registra la salida', async () => {
    const o = await nueva()
    await agregarAdjunto(o, 'tec', { tipo: 'texto', momento: 'evidencia', texto: 'a' })
    await guardarFirma(o, { nombre_recibe: 'Sra. López', imagen_data_url: 'data:image/png;base64,xx', sin_firma_motivo: '' }, 'tec')
    const tipos = (await db.registros_tiempo.where('orden_id').equals(o.id).sortBy('hora_dispositivo')).map((r) => `${r.tipo}:${r.origen}`)
    expect(tipos).toEqual(['llegada:evidencia', 'salida:firma'])
  })

  it('el reporte de falla del encargado no registra llegada de nadie', async () => {
    const o = await nueva()
    await agregarAdjunto(o, 'enc', { tipo: 'texto', momento: 'evidencia', texto: 'nota del encargado' })
    expect(await db.registros_tiempo.count()).toBe(0)
  })
})
