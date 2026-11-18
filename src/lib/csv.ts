// Exportación a CSV (se abre en Excel). Usa ; y BOM para que Excel en español lo lea bien.
export function aCsv(filas: (string | number)[][]): string {
  const celda = (v: string | number) => {
    const s = String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
}

export function descargar(nombre: string, contenido: string | Blob, tipo = 'text/csv;charset=utf-8') {
  const blob = typeof contenido === 'string' ? new Blob([contenido], { type: tipo }) : contenido
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
