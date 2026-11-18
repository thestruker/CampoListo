import { describe, expect, it } from 'vitest'
import { formatoHoras, horasPorDia, horasPorSemana, intervalos } from './horas'
import type { RegistroTiempo } from './types'

const r = (tecnico: string, orden: string, tipo: 'llegada' | 'salida', hora: string): RegistroTiempo => ({
  id: `${tecnico}${orden}${tipo}${hora}`, empresa_id: 'e', orden_id: orden, tecnico_id: tecnico, tipo,
  hora_dispositivo: hora, updated_at: hora,
})

describe('cálculo de horas (RN-04)', () => {
  it('suma los intervalos llegada–salida de cada técnico', () => {
    const regs = [
      r('luis', 'o1', 'llegada', '2026-11-16T08:00:00'),
      r('luis', 'o1', 'salida', '2026-11-16T10:30:00'),
      r('luis', 'o2', 'llegada', '2026-11-16T11:00:00'),
      r('luis', 'o2', 'salida', '2026-11-16T13:00:00'),
      r('ramon', 'o1', 'llegada', '2026-11-16T08:10:00'),
      r('ramon', 'o1', 'salida', '2026-11-16T09:10:00'),
    ]
    const dia = horasPorDia(regs)
    expect(dia.find((f) => f.tecnico_id === 'luis')).toMatchObject({ minutos: 270, servicios: 2 })
    expect(dia.find((f) => f.tecnico_id === 'ramon')).toMatchObject({ minutos: 60, servicios: 1 })
  })

  it('no cuenta una llegada sin salida, pero la reporta como abierta', () => {
    const iv = intervalos([r('luis', 'o1', 'llegada', '2026-11-16T08:00:00')])
    expect(iv).toHaveLength(1)
    expect(iv[0].fin).toBeNull()
    expect(horasPorDia([r('luis', 'o1', 'llegada', '2026-11-16T08:00:00')])).toEqual([])
  })

  it('permite salir y regresar a la misma orden otro día', () => {
    const regs = [
      r('luis', 'o1', 'llegada', '2026-11-16T08:00:00'),
      r('luis', 'o1', 'salida', '2026-11-16T09:00:00'),
      r('luis', 'o1', 'llegada', '2026-11-17T08:00:00'),
      r('luis', 'o1', 'salida', '2026-11-17T08:45:00'),
    ]
    expect(horasPorDia(regs).map((f) => f.minutos)).toEqual([60, 45])
    expect(horasPorSemana(regs)).toEqual([{ tecnico_id: 'luis', dia: '2026-11-16', minutos: 105, servicios: 2 }])
  })

  it('da formato legible', () => {
    expect(formatoHoras(135)).toBe('2 h 15 min')
    expect(formatoHoras(5)).toBe('0 h 05 min')
  })
})
