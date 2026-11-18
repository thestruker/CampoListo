import type { Adjunto, EstadoOrden, Firma, Orden, RegistroTiempo, Rol } from './types'

// Reglas de negocio del SRS (RN-01 a RN-07) en funciones puras, para poder probarlas.

export const ETIQUETA_ESTADO: Record<EstadoOrden, string> = {
  pendiente: 'Pendiente',
  asignada: 'Asignada',
  en_sitio: 'En sitio',
  con_avance: 'Con avance',
  terminada: 'Terminada',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
}

export const ESTADOS_ABIERTOS: EstadoOrden[] = ['pendiente', 'asignada', 'en_sitio', 'con_avance']

/** Último registro (llegada o salida) de un técnico en una orden. */
export function ultimoRegistro(registros: RegistroTiempo[], tecnicoId: string, ordenId: string) {
  return registros
    .filter((r) => r.tecnico_id === tecnicoId && r.orden_id === ordenId)
    .sort((a, b) => a.hora_dispositivo.localeCompare(b.hora_dispositivo))
    .at(-1)
}

/** ¿El técnico está ahora mismo en sitio (llegó y no ha salido)? */
export function estaEnSitio(registros: RegistroTiempo[], tecnicoId: string, ordenId: string) {
  return ultimoRegistro(registros, tecnicoId, ordenId)?.tipo === 'llegada'
}

/** RN-02: no se registra salida sin llegada previa en esa orden. */
export function puedeRegistrarSalida(registros: RegistroTiempo[], tecnicoId: string, ordenId: string) {
  return estaEnSitio(registros, tecnicoId, ordenId)
}

/** No se registra una nueva llegada si ya está en sitio. */
export function puedeRegistrarLlegada(orden: Orden, registros: RegistroTiempo[], tecnicoId: string) {
  return ESTADOS_ABIERTOS.includes(orden.estado) && !estaEnSitio(registros, tecnicoId, orden.id)
}

/** RN-03: la orden pasa a "En sitio" con la primera llegada. */
export function estadoTrasLlegada(estado: EstadoOrden): EstadoOrden {
  return estado === 'pendiente' || estado === 'asignada' ? 'en_sitio' : estado
}

export function estadoTrasEvidencia(estado: EstadoOrden): EstadoOrden {
  return estado === 'en_sitio' ? 'con_avance' : estado
}

export function estadoTrasAsignacion(estado: EstadoOrden, numTecnicos: number): EstadoOrden {
  if (estado === 'pendiente' && numTecnicos > 0) return 'asignada'
  if (estado === 'asignada' && numTecnicos === 0) return 'pendiente'
  return estado
}

/** RN-01: para terminar se necesita al menos una evidencia y la firma o el motivo de no firma. */
export function faltantesParaTerminar(adjuntos: Adjunto[], firma: Firma | undefined): string[] {
  const faltan: string[] = []
  if (!adjuntos.some((a) => a.momento !== 'reporte')) faltan.push('al menos una evidencia (foto, audio o nota)')
  if (!firma || (!firma.imagen_data_url && !firma.sin_firma_motivo.trim())) faltan.push('la firma de recibido o el motivo de no firma')
  return faltan
}

/** RN-06: solo encargado o administrador cierran o cancelan. */
export function puedeCerrarOCancelar(rol: Rol) {
  return rol === 'encargado' || rol === 'administrador'
}

/**
 * RN-05: marcar para revisión si la hora del celular está más de 10 min ADELANTADA respecto al servidor.
 * Un registro hecho sin señal y subido horas después es normal y no se marca.
 * (El servidor aplica la misma regla en el trigger revisar_hora.)
 */
export function requiereRevision(horaDispositivo: string, horaServidor: string, toleranciaMin = 10) {
  return Date.parse(horaDispositivo) - Date.parse(horaServidor) > toleranciaMin * 60_000
}

/**
 * Hallazgo de Trackpoint (tarea 7.7): técnicos que registraron llegada y no salida.
 * Devuelve las parejas orden/técnico abiertas cuya llegada es anterior al límite.
 */
export function abiertasSinSalida(registros: RegistroTiempo[], limite: Date) {
  const claves = new Set(registros.map((r) => `${r.orden_id}|${r.tecnico_id}`))
  const res: { orden_id: string; tecnico_id: string; llegada: string }[] = []
  for (const clave of claves) {
    const [ordenId, tecnicoId] = clave.split('|')
    const ultimo = ultimoRegistro(registros, tecnicoId, ordenId)
    if (ultimo?.tipo === 'llegada' && Date.parse(ultimo.hora_dispositivo) < limite.getTime()) {
      res.push({ orden_id: ordenId, tecnico_id: tecnicoId, llegada: ultimo.hora_dispositivo })
    }
  }
  return res
}
