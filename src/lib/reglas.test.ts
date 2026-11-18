import { describe, expect, it } from 'vitest'
import {
  abiertasSinSalida, estadoTrasAsignacion, estadoTrasEvidencia, estadoTrasLlegada, faltantesParaTerminar,
  puedeCerrarOCancelar, puedeRegistrarLlegada, puedeRegistrarSalida, requiereRevision,
} from './reglas'
import type { Adjunto, Firma, Orden, RegistroTiempo } from './types'

const orden = { id: 'o1', estado: 'asignada' } as Orden
const reg = (tipo: 'llegada' | 'salida', hora: string, tecnico = 't1'): RegistroTiempo => ({
  id: tipo + hora + tecnico, empresa_id: 'e', orden_id: 'o1', tecnico_id: tecnico, tipo, hora_dispositivo: hora, updated_at: hora,
})
const adj = (momento: Adjunto['momento']) => ({ momento } as Adjunto)

describe('estados de la orden', () => {
  it('pasa a asignada al asignar técnicos y regresa a pendiente si se quitan', () => {
    expect(estadoTrasAsignacion('pendiente', 2)).toBe('asignada')
    expect(estadoTrasAsignacion('asignada', 0)).toBe('pendiente')
    expect(estadoTrasAsignacion('en_sitio', 0)).toBe('en_sitio')
  })
  it('RN-03: la primera llegada la pone en sitio', () => {
    expect(estadoTrasLlegada('asignada')).toBe('en_sitio')
    expect(estadoTrasLlegada('con_avance')).toBe('con_avance')
  })
  it('la primera evidencia la pone con avance', () => {
    expect(estadoTrasEvidencia('en_sitio')).toBe('con_avance')
  })
})

describe('reglas de registro', () => {
  it('RN-02: no hay salida sin llegada', () => {
    expect(puedeRegistrarSalida([], 't1', 'o1')).toBe(false)
    expect(puedeRegistrarSalida([reg('llegada', '2026-11-16T08:00:00Z')], 't1', 'o1')).toBe(true)
  })
  it('no permite dos llegadas seguidas del mismo técnico', () => {
    expect(puedeRegistrarLlegada(orden, [reg('llegada', '2026-11-16T08:00:00Z')], 't1')).toBe(false)
    expect(puedeRegistrarLlegada(orden, [reg('llegada', '2026-11-16T08:00:00Z')], 't2')).toBe(true)
  })
  it('no permite llegar a una orden cerrada', () => {
    expect(puedeRegistrarLlegada({ ...orden, estado: 'cerrada' }, [], 't1')).toBe(false)
  })
  it('RN-01: para terminar faltan evidencia y firma', () => {
    expect(faltantesParaTerminar([adj('reporte')], undefined)).toHaveLength(2)
    const firma = { imagen_data_url: 'data:image/png;base64,x', sin_firma_motivo: '' } as Firma
    expect(faltantesParaTerminar([adj('antes')], firma)).toEqual([])
    const sinFirma = { imagen_data_url: '', sin_firma_motivo: 'No había nadie' } as Firma
    expect(faltantesParaTerminar([adj('evidencia')], sinFirma)).toEqual([])
  })
  it('RN-05: marca para revisión si el reloj del celular va más de 10 minutos adelantado', () => {
    expect(requiereRevision('2026-11-16T08:09:00Z', '2026-11-16T08:00:00Z')).toBe(false)
    expect(requiereRevision('2026-11-16T08:11:00Z', '2026-11-16T08:00:00Z')).toBe(true)
    // Registrado sin señal y subido 3 horas después: es normal
    expect(requiereRevision('2026-11-16T08:00:00Z', '2026-11-16T11:00:00Z')).toBe(false)
  })
  it('RN-06: solo encargado o administrador cierran', () => {
    expect(puedeCerrarOCancelar('tecnico')).toBe(false)
    expect(puedeCerrarOCancelar('encargado')).toBe(true)
  })
  it('detecta órdenes abiertas sin salida (hallazgo de Trackpoint)', () => {
    const regs = [reg('llegada', '2026-11-16T08:00:00Z'), reg('llegada', '2026-11-16T09:00:00Z', 't2'), reg('salida', '2026-11-16T12:00:00Z', 't2')]
    const res = abiertasSinSalida(regs, new Date('2026-11-17T00:00:00Z'))
    expect(res).toEqual([{ orden_id: 'o1', tecnico_id: 't1', llegada: '2026-11-16T08:00:00Z' }])
  })
})
