import type { RegistroTiempo } from './types'

// RN-04: las horas de un técnico son la suma de sus intervalos llegada–salida.

export interface Intervalo {
  tecnico_id: string
  orden_id: string
  inicio: string
  fin: string | null // null = sigue en sitio (no cuenta para las horas)
  minutos: number
}

export function intervalos(registros: RegistroTiempo[]): Intervalo[] {
  const porClave = new Map<string, RegistroTiempo[]>()
  for (const r of registros) {
    const k = `${r.tecnico_id}|${r.orden_id}`
    porClave.set(k, [...(porClave.get(k) ?? []), r])
  }
  const res: Intervalo[] = []
  for (const lista of porClave.values()) {
    lista.sort((a, b) => a.hora_dispositivo.localeCompare(b.hora_dispositivo))
    let abierta: RegistroTiempo | null = null
    for (const r of lista) {
      if (r.tipo === 'llegada') {
        if (!abierta) abierta = r
      } else if (abierta) {
        const minutos = Math.max(0, (Date.parse(r.hora_dispositivo) - Date.parse(abierta.hora_dispositivo)) / 60_000)
        res.push({ tecnico_id: r.tecnico_id, orden_id: r.orden_id, inicio: abierta.hora_dispositivo, fin: r.hora_dispositivo, minutos })
        abierta = null
      }
    }
    if (abierta) {
      res.push({ tecnico_id: abierta.tecnico_id, orden_id: abierta.orden_id, inicio: abierta.hora_dispositivo, fin: null, minutos: 0 })
    }
  }
  return res
}

/** Fecha local yyyy-mm-dd (zona del navegador). */
export function diaLocal(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Lunes de la semana de una fecha yyyy-mm-dd. */
export function lunesDe(dia: string): string {
  const [y, m, d] = dia.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  const dow = (f.getDay() + 6) % 7
  f.setDate(f.getDate() - dow)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`
}

export interface FilaHoras {
  tecnico_id: string
  dia: string
  minutos: number
  servicios: number
}

/** Minutos por técnico y por día (el día es el de la llegada). */
export function horasPorDia(registros: RegistroTiempo[]): FilaHoras[] {
  const mapa = new Map<string, FilaHoras>()
  for (const i of intervalos(registros)) {
    if (!i.fin) continue
    const dia = diaLocal(i.inicio)
    const k = `${i.tecnico_id}|${dia}`
    const f = mapa.get(k) ?? { tecnico_id: i.tecnico_id, dia, minutos: 0, servicios: 0 }
    f.minutos += i.minutos
    f.servicios += 1
    mapa.set(k, f)
  }
  return [...mapa.values()].sort((a, b) => a.dia.localeCompare(b.dia) || a.tecnico_id.localeCompare(b.tecnico_id))
}

export function horasPorSemana(registros: RegistroTiempo[]): FilaHoras[] {
  const mapa = new Map<string, FilaHoras>()
  for (const f of horasPorDia(registros)) {
    const semana = lunesDe(f.dia)
    const k = `${f.tecnico_id}|${semana}`
    const s = mapa.get(k) ?? { tecnico_id: f.tecnico_id, dia: semana, minutos: 0, servicios: 0 }
    s.minutos += f.minutos
    s.servicios += f.servicios
    mapa.set(k, s)
  }
  return [...mapa.values()].sort((a, b) => a.dia.localeCompare(b.dia))
}

export function formatoHoras(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = Math.round(minutos % 60)
  return `${h} h ${String(m).padStart(2, '0')} min`
}
