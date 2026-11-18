// CU-06 Aviso al cliente por WhatsApp: enlace wa.me con el mensaje prellenado.
export function soloDigitos(tel: string) {
  let d = tel.replace(/\D/g, '')
  if (d.length === 10) d = '52' + d // número mexicano sin lada de país
  return d
}

export function mensajeAviso(p: { empresa: string; cliente: string; folio: number | null; fecha: string; tecnicos: string[] }) {
  const fecha = new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const quienes = p.tecnicos.length ? p.tecnicos.join(', ') : 'nuestro personal técnico'
  return (
    `Hola, ${p.cliente}. Le escribimos de ${p.empresa}. ` +
    `Recibimos una orden de servicio a su nombre${p.folio ? ` (folio ${p.folio})` : ''}. ` +
    `Lo visitará ${quienes} el ${fecha}. Cualquier duda, responda a este mensaje.`
  )
}

export function enlaceWhatsApp(telefono: string, mensaje: string) {
  return `https://wa.me/${soloDigitos(telefono)}?text=${encodeURIComponent(mensaje)}`
}
