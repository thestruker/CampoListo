import { describe, expect, it } from 'vitest'
import { aCsv } from './csv'
import { distanciaM } from './geo'
import { enlaceWhatsApp, mensajeAviso, soloDigitos } from './whatsapp'

describe('aviso por WhatsApp (CU-06)', () => {
  it('agrega la lada de México a números de 10 dígitos', () => {
    expect(soloDigitos('637 123 4567')).toBe('526371234567')
    expect(soloDigitos('+52 637 123 4567')).toBe('526371234567')
  })
  it('arma el mensaje con folio, fecha y técnicos', () => {
    const m = mensajeAviso({ empresa: 'Solar', cliente: 'Juan', folio: 12, fecha: '2026-11-18', tecnicos: ['Luis', 'Ramón'] })
    expect(m).toContain('folio 12')
    expect(m).toContain('Luis, Ramón')
    expect(enlaceWhatsApp('6371234567', 'hola mundo')).toBe('https://wa.me/526371234567?text=hola%20mundo')
  })
})

describe('CSV para Excel', () => {
  it('usa punto y coma y escapa comillas', () => {
    expect(aCsv([['a', 'b;c', 'd"e']])).toBe('﻿a;"b;c";"d""e"')
  })
})

describe('distancia', () => {
  it('calcula metros entre dos puntos', () => {
    const d = distanciaM({ lat: 30.7, lng: -112.15 }, { lat: 30.701, lng: -112.15 })
    expect(Math.round(d)).toBe(111)
  })
})
