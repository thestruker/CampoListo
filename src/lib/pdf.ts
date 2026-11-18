import { jsPDF } from 'jspdf'
import { db } from './db'
import { enlaceMapa } from './geo'
import { formatoHoras, intervalos } from './horas'
import { blobADataUrl } from './imagen'
import { ETIQUETA_ESTADO } from './reglas'
import { urlAdjunto } from './sync'
import type { Adjunto, Cliente, Empresa, Firma, MaterialUsado, Orden, RegistroTiempo, Usuario } from './types'

// CU-14 Hoja de servicio en PDF, en hoja membretada (tarea 7.6) y con la estructura
// del reporte que la empresa piloto ya conocía: folio, cliente, dirección con mapa,
// responsables, llegada/salida/duración, tareas, resultados, piezas, fotos, observaciones y firma.

export interface DatosHoja {
  empresa: Empresa
  orden: Orden
  cliente?: Cliente
  tecnicos: Usuario[]
  registros: RegistroTiempo[]
  adjuntos: (Adjunto & { dataUrl?: string | null })[]
  materiales: MaterialUsado[]
  firma?: Firma
}

async function aDataUrl(a: Adjunto): Promise<string | null> {
  if (a.blob) return blobADataUrl(a.blob)
  const url = await urlAdjunto(a)
  if (!url) return null
  try {
    const r = await fetch(url)
    return blobADataUrl(await r.blob())
  } catch {
    return null
  }
}

export async function cargarDatosHoja(ordenId: string): Promise<DatosHoja> {
  const orden = await db.ordenes.get(ordenId)
  if (!orden) throw new Error('Orden no encontrada')
  const empresa = (await db.empresas.get(orden.empresa_id))!
  const cliente = await db.clientes.get(orden.cliente_id)
  const asign = await db.orden_tecnicos.where('orden_id').equals(ordenId).toArray()
  const tecnicos = (await db.usuarios.bulkGet(asign.map((a) => a.tecnico_id))).filter(Boolean) as Usuario[]
  const registros = await db.registros_tiempo.where('orden_id').equals(ordenId).toArray()
  const adjuntosBase = await db.adjuntos.where('orden_id').equals(ordenId).toArray()
  const adjuntos = await Promise.all(
    adjuntosBase.map(async (a) => ({ ...a, dataUrl: a.tipo === 'foto' ? await aDataUrl(a) : null })),
  )
  const materiales = await db.materiales_usados.where('orden_id').equals(ordenId).toArray()
  const firma = await db.firmas.where('orden_id').equals(ordenId).first()
  return { empresa, orden, cliente, tecnicos, registros, adjuntos, materiales, firma }
}

const VERDE: [number, number, number] = [31, 78, 61]
const GRIS: [number, number, number] = [90, 90, 90]

function fechaHora(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatoImagen(dataUrl: string) {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

/** Dibuja una hoja de servicio en el documento (empieza en la página actual). */
export function dibujarHoja(doc: jsPDF, d: DatosHoja) {
  const M = 15
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  let y = M

  const membrete = () => {
    let x = M
    if (d.empresa.logo_data_url) {
      try {
        doc.addImage(d.empresa.logo_data_url, formatoImagen(d.empresa.logo_data_url), M, y, 22, 22)
        x = M + 26
      } catch {
        /* logo inválido: se omite */
      }
    }
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...VERDE)
    doc.text(d.empresa.nombre, x, y + 6)
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...GRIS)
    const lineas = [d.empresa.razon_social, d.empresa.direccion, [d.empresa.telefono, d.empresa.correo].filter(Boolean).join(' · ')].filter(Boolean)
    lineas.forEach((l, i) => doc.text(l, x, y + 11 + i * 4))
    doc.setDrawColor(...VERDE).setLineWidth(0.8).line(M, y + 25, ancho - M, y + 25)
    y += 31
  }

  const salto = (necesario: number) => {
    if (y + necesario > alto - 18) {
      doc.addPage()
      y = M
      membrete()
    }
  }

  const titulo = (t: string) => {
    salto(12)
    doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...VERDE)
    doc.text(t.toUpperCase(), M, y)
    y += 5.5
    doc.setTextColor(30, 30, 30)
  }

  const parrafo = (t: string) => {
    doc.setFont('helvetica', 'normal').setFontSize(9.5)
    const lineas = doc.splitTextToSize(t || '—', ancho - 2 * M)
    for (const l of lineas) {
      salto(5)
      doc.text(l, M, y)
      y += 4.6
    }
    y += 2
  }

  const campo = (etiqueta: string, valor: string, x: number, w: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GRIS)
    doc.text(etiqueta, x, y)
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(30, 30, 30)
    const l = doc.splitTextToSize(valor || '—', w)
    doc.text(l, x, y + 4.5)
    return l.length
  }

  membrete()

  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(30, 30, 30)
  doc.text(`Hoja de servicio${d.orden.folio ? ` · Folio ${d.orden.folio}` : ''}`, M, y)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS)
  doc.text(`${d.orden.tipo} · ${ETIQUETA_ESTADO[d.orden.estado]}`, ancho - M, y, { align: 'right' })
  y += 8

  const col = (ancho - 2 * M) / 2
  const n1 = Math.max(
    campo('Cliente', d.cliente?.nombre ?? '—', M, col - 4),
    campo('Fecha programada', new Date(d.orden.fecha_programada + 'T12:00:00').toLocaleDateString('es-MX', { dateStyle: 'long' }), M + col, col),
  )
  y += 5 + n1 * 4.5
  const n2 = Math.max(
    campo('Dirección', d.cliente?.direccion ?? '—', M, col - 4),
    campo('Técnicos responsables', d.tecnicos.map((t) => t.nombre).join(', '), M + col, col),
  )
  y += 5 + n2 * 4.5

  const llegadaConGps = d.registros.find((r) => r.tipo === 'llegada' && r.lat != null)
  const ubic = llegadaConGps ?? (d.cliente?.lat != null ? { lat: d.cliente.lat, lng: d.cliente.lng } : null)
  if (ubic && ubic.lat != null && ubic.lng != null) {
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GRIS)
    doc.text(llegadaConGps ? 'Ubicación registrada al llegar' : 'Ubicación del cliente', M, y)
    doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(20, 80, 160)
    doc.textWithLink(`${ubic.lat.toFixed(5)}, ${ubic.lng.toFixed(5)} (ver en mapa)`, M, y + 4.5, { url: enlaceMapa(ubic.lat, ubic.lng) })
    doc.setTextColor(30, 30, 30)
    y += 11
  }

  titulo('Llegada, salida y duración')
  const ivs = intervalos(d.registros)
  if (!ivs.length) parrafo('Sin registros de tiempo.')
  doc.setFontSize(9)
  for (const i of ivs) {
    salto(6)
    const tec = d.tecnicos.find((t) => t.id === i.tecnico_id)?.nombre ?? 'Técnico'
    doc.setFont('helvetica', 'bold').text(tec, M, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`Llegada: ${fechaHora(i.inicio)}`, M + 62, y)
    doc.text(i.fin ? `Salida: ${fechaHora(i.fin)}` : 'Salida: sin registrar', M + 112, y)
    doc.text(i.fin ? formatoHoras(i.minutos) : '—', ancho - M, y, { align: 'right' })
    y += 5.5
  }
  y += 2

  titulo('Tareas solicitadas')
  parrafo(d.orden.instrucciones)

  const notas = d.adjuntos.filter((a) => a.tipo === 'texto' && a.momento !== 'reporte')
  titulo('Tareas realizadas')
  parrafo(notas.map((n) => `• ${n.texto}`).join('\n') || '—')

  titulo('Resultados')
  parrafo(d.orden.resultados)

  titulo('Piezas y materiales usados')
  if (!d.materiales.length) parrafo('Ninguno.')
  for (const m of d.materiales) {
    salto(5)
    doc.setFont('helvetica', 'normal').setFontSize(9.5)
    doc.text(`• ${m.descripcion}`, M, y)
    doc.text(`${m.cantidad} ${m.unidad}`, ancho - M, y, { align: 'right' })
    y += 5
  }
  y += 2

  const fotos = d.adjuntos.filter((a) => a.tipo === 'foto' && a.dataUrl)
  titulo(`Fotos de evidencia (${fotos.length})`)
  if (!fotos.length) parrafo('Sin fotos.')
  const anchoFoto = (ancho - 2 * M - 8) / 3
  const altoFoto = anchoFoto * 0.75
  fotos.forEach((f, i) => {
    if (i % 3 === 0) salto(altoFoto + 8)
    const x = M + (i % 3) * (anchoFoto + 4)
    try {
      doc.addImage(f.dataUrl!, formatoImagen(f.dataUrl!), x, y, anchoFoto, altoFoto, undefined, 'FAST')
    } catch {
      doc.rect(x, y, anchoFoto, altoFoto)
    }
    doc.setFontSize(7.5).setTextColor(...GRIS)
    doc.text(f.momento === 'antes' ? 'Antes' : f.momento === 'despues' ? 'Después' : f.momento === 'reporte' ? 'Reporte de falla' : 'Evidencia', x, y + altoFoto + 3.5)
    doc.setTextColor(30, 30, 30)
    if (i % 3 === 2 || i === fotos.length - 1) y += altoFoto + 7
  })
  y += 2

  titulo('Observaciones')
  parrafo(d.orden.observaciones)

  titulo('Firma de recibido')
  salto(36)
  if (d.firma?.imagen_data_url) {
    try {
      doc.addImage(d.firma.imagen_data_url, 'PNG', M, y, 60, 20)
    } catch {
      /* firma ilegible */
    }
    y += 22
  } else if (d.firma?.sin_firma_motivo) {
    parrafo(`Sin firma. Motivo: ${d.firma.sin_firma_motivo}`)
  } else {
    y += 18
  }
  doc.setDrawColor(150, 150, 150).setLineWidth(0.3).line(M, y, M + 80, y)
  doc.setFontSize(9).text(d.firma?.nombre_recibe || 'Nombre de quien recibe', M, y + 4.5)
  y += 10

}

function pies(doc: jsPDF) {
  const M = 15
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5).setTextColor(...GRIS)
    doc.text(`Generado con CampoListo · ${fechaHora(new Date().toISOString())}`, M, alto - 8)
    doc.text(`Página ${p} de ${paginas}`, ancho - M, alto - 8, { align: 'right' })
  }
}

export async function pdfHoja(ordenId: string) {
  const datos = await cargarDatosHoja(ordenId)
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  dibujarHoja(doc, datos)
  pies(doc)
  return { doc, nombre: `hoja-servicio-${datos.orden.folio ?? datos.orden.id.slice(0, 8)}.pdf` }
}

/** PDF del día: todas las hojas de las órdenes con actividad en una fecha, en un solo archivo. */
export async function pdfDelDia(dia: string, empresaId: string) {
  const ordenes = (await db.ordenes.where('empresa_id').equals(empresaId).toArray()).filter(
    (o) => o.fecha_programada === dia && o.estado !== 'cancelada',
  )
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  let primera = true
  for (const o of ordenes.sort((a, b) => (a.folio ?? 0) - (b.folio ?? 0))) {
    if (!primera) doc.addPage()
    primera = false
    dibujarHoja(doc, await cargarDatosHoja(o.id))
  }
  pies(doc)
  return { doc, nombre: `hojas-${dia}.pdf`, total: ordenes.length }
}
