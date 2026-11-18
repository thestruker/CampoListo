import { ahora, db, nuevoId } from './db'
import { obtenerPosicion } from './geo'
import { comprimirFoto } from './imagen'
import { guardar } from './outbox'
import {
  estadoTrasAsignacion,
  estadoTrasEvidencia,
  estadoTrasLlegada,
  faltantesParaTerminar,
  puedeCerrarOCancelar,
  puedeRegistrarLlegada,
  puedeRegistrarSalida,
} from './reglas'
import { MODO_DEMO, supabase } from './supabase'
import type { Adjunto, Cliente, Empresa, Firma, Momento, Orden, OrigenRegistro, RegistroTiempo, Usuario } from './types'

// Acciones de la app. Todas guardan primero en el celular (con su elemento en la cola de salida),
// así funcionan igual con o sin señal.

/* ---------- Empresa (membrete) ---------- */
export async function guardarEmpresa(e: Empresa) {
  return guardar('empresas', e)
}

/* ---------- CU-02 Usuarios y roles ---------- */
export async function crearUsuario(empresaId: string, datos: Pick<Usuario, 'nombre' | 'correo' | 'telefono' | 'rol'>): Promise<string | null> {
  if (!MODO_DEMO && supabase) {
    // En producción el alta pasa por una Edge Function que envía la invitación por correo.
    const { data, error } = await supabase.functions.invoke('invitar-usuario', { body: { ...datos, empresa_id: empresaId } })
    if (error) return 'No se pudo invitar al usuario. Revisa tu conexión.'
    if (data?.usuario) await db.usuarios.put(data.usuario)
    return null
  }
  await guardar('usuarios', { id: nuevoId(), empresa_id: empresaId, activo: true, updated_at: ahora(), ...datos })
  return null
}

export async function actualizarUsuario(u: Usuario) {
  return guardar('usuarios', u)
}

/* ---------- CU-03 Clientes ---------- */
export async function guardarCliente(c: Omit<Cliente, 'id' | 'updated_at'> & { id?: string }) {
  return guardar('clientes', { ...c, id: c.id ?? nuevoId(), updated_at: ahora() })
}

/* ---------- CU-04 Crear orden y CU-05 Asignar técnicos ---------- */
async function siguienteFolio(empresaId: string): Promise<number | null> {
  if (!MODO_DEMO) return null // en el servidor un trigger asigna el folio consecutivo por empresa
  const ordenes = await db.ordenes.where('empresa_id').equals(empresaId).toArray()
  return ordenes.reduce((m, o) => Math.max(m, o.folio ?? 0), 0) + 1
}

export interface NuevaOrden {
  cliente_id: string
  tipo: string
  titulo: string
  instrucciones: string
  fecha_programada: string
}

export async function crearOrden(empresaId: string, autorId: string, datos: NuevaOrden, tecnicos: string[], reporte?: { texto?: string; foto?: File | null; audio?: Blob | null }) {
  const t = ahora()
  const orden: Orden = {
    id: nuevoId(), empresa_id: empresaId, folio: await siguienteFolio(empresaId), estado: 'pendiente',
    resultados: '', observaciones: '', creada_por: autorId, created_at: t, updated_at: t, cerrada_at: null, ...datos,
  }
  await guardar('ordenes', orden)
  if (reporte?.texto?.trim()) await agregarAdjunto(orden, autorId, { tipo: 'texto', momento: 'reporte', texto: reporte.texto.trim() }, false)
  if (reporte?.foto) await agregarAdjunto(orden, autorId, { tipo: 'foto', momento: 'reporte', archivo: reporte.foto }, false)
  if (reporte?.audio) await agregarAdjunto(orden, autorId, { tipo: 'audio', momento: 'reporte', archivo: reporte.audio }, false)
  await asignarTecnicos(orden.id, tecnicos)
  return orden
}

export async function actualizarOrden(orden: Orden, cambios: Partial<Orden>) {
  return guardar('ordenes', { ...orden, ...cambios })
}

export async function asignarTecnicos(ordenId: string, tecnicos: string[]) {
  const orden = (await db.ordenes.get(ordenId))!
  const actuales = await db.orden_tecnicos.where('orden_id').equals(ordenId).toArray()
  for (const a of actuales) {
    const debe = tecnicos.includes(a.tecnico_id)
    if (!!a.eliminado === debe) await guardar('orden_tecnicos', { ...a, eliminado: !debe })
  }
  for (const id of tecnicos) {
    if (!actuales.some((a) => a.tecnico_id === id)) {
      await guardar('orden_tecnicos', { id: nuevoId(), orden_id: ordenId, tecnico_id: id, empresa_id: orden.empresa_id, eliminado: false, updated_at: ahora() })
    }
  }
  const nuevo = estadoTrasAsignacion(orden.estado, tecnicos.length)
  if (nuevo !== orden.estado) await guardar('ordenes', { ...orden, estado: nuevo })
}

export async function tecnicosDeOrden(ordenId: string) {
  const a = await db.orden_tecnicos.where('orden_id').equals(ordenId).toArray()
  return a.filter((x) => !x.eliminado).map((x) => x.tecnico_id)
}

/* ---------- CU-08 Llegada y CU-11 Salida ---------- */
async function registrar(orden: Orden, tecnicoId: string, tipo: RegistroTiempo['tipo'], origen: OrigenRegistro) {
  const pos = await obtenerPosicion()
  const r: RegistroTiempo = {
    id: nuevoId(), empresa_id: orden.empresa_id, orden_id: orden.id, tecnico_id: tecnicoId, tipo, origen,
    hora_dispositivo: ahora(), hora_servidor: null, lat: pos?.lat ?? null, lng: pos?.lng ?? null,
    precision_m: pos?.precision_m ?? null, revisar: false, updated_at: ahora(),
  }
  await guardar('registros_tiempo', r)
  return r
}

export async function registrarLlegada(ordenId: string, tecnicoId: string, origen: OrigenRegistro = 'boton') {
  const orden = (await db.ordenes.get(ordenId))!
  const registros = await db.registros_tiempo.where('orden_id').equals(ordenId).toArray()
  if (!puedeRegistrarLlegada(orden, registros, tecnicoId)) throw new Error('Ya registraste tu llegada a esta orden.')
  const r = await registrar(orden, tecnicoId, 'llegada', origen)
  const estado = estadoTrasLlegada(orden.estado)
  if (estado !== orden.estado) await guardar('ordenes', { ...orden, estado })
  return r
}

export async function registrarSalida(ordenId: string, tecnicoId: string, origen: OrigenRegistro = 'boton') {
  const orden = (await db.ordenes.get(ordenId))!
  const registros = await db.registros_tiempo.where('orden_id').equals(ordenId).toArray()
  if (!puedeRegistrarSalida(registros, tecnicoId, ordenId)) throw new Error('Primero registra tu llegada.')
  return registrar(orden, tecnicoId, 'salida', origen)
}

/** Si el técnico está asignado y no está en sitio, registra su llegada sin que tenga que acordarse. */
async function llegadaAutomatica(orden: Orden, tecnicoId: string) {
  const asignado = (await tecnicosDeOrden(orden.id)).includes(tecnicoId)
  if (!asignado) return null
  const registros = await db.registros_tiempo.where('orden_id').equals(orden.id).toArray()
  if (!puedeRegistrarLlegada(orden, registros, tecnicoId)) return null
  return registrarLlegada(orden.id, tecnicoId, 'evidencia')
}

/* ---------- CU-09 Evidencia y piezas ---------- */
export async function agregarAdjunto(
  orden: Orden,
  autorId: string,
  datos: { tipo: Adjunto['tipo']; momento: Momento; texto?: string; archivo?: Blob | null },
  actualizaEstado = true,
) {
  // La primera evidencia del técnico marca su llegada (con la hora y el GPS de ese momento).
  if (actualizaEstado && datos.momento !== 'reporte') await llegadaAutomatica((await db.ordenes.get(orden.id)) ?? orden, autorId)
  let blob: Blob | null = null
  if (datos.archivo) blob = datos.tipo === 'foto' ? await comprimirFoto(datos.archivo) : datos.archivo
  const t = ahora()
  const a: Adjunto = {
    id: nuevoId(), empresa_id: orden.empresa_id, orden_id: orden.id, autor_id: autorId, tipo: datos.tipo,
    momento: datos.momento, texto: datos.texto ?? '', blob, storage_path: null, created_at: t, updated_at: t,
  }
  await guardar('adjuntos', a)
  if (actualizaEstado) {
    const actual = (await db.ordenes.get(orden.id))!
    const estado = estadoTrasEvidencia(actual.estado)
    if (estado !== actual.estado) await guardar('ordenes', { ...actual, estado })
  }
  return a
}

export async function agregarMaterial(orden: Orden, descripcion: string, cantidad: number, unidad: string) {
  return guardar('materiales_usados', { id: nuevoId(), empresa_id: orden.empresa_id, orden_id: orden.id, descripcion, cantidad, unidad, updated_at: ahora() })
}

/* ---------- CU-10 Firma ---------- */
export async function guardarFirma(orden: Orden, datos: Pick<Firma, 'nombre_recibe' | 'sin_firma_motivo' | 'imagen_data_url'>, tecnicoId?: string) {
  const previa = await db.firmas.where('orden_id').equals(orden.id).first()
  const t = ahora()
  const firma = await guardar('firmas', { id: previa?.id ?? nuevoId(), empresa_id: orden.empresa_id, orden_id: orden.id, created_at: previa?.created_at ?? t, updated_at: t, ...datos })
  // La firma del cliente marca la salida del técnico.
  if (tecnicoId && (datos.imagen_data_url || datos.sin_firma_motivo)) {
    const registros = await db.registros_tiempo.where('orden_id').equals(orden.id).toArray()
    if (puedeRegistrarSalida(registros, tecnicoId, orden.id)) await registrarSalida(orden.id, tecnicoId, 'firma')
  }
  return firma
}

/* ---------- CU-11 Terminar visita ---------- */
export async function terminarOrden(ordenId: string, tecnicoId: string, resultados: string, observaciones: string) {
  const orden = (await db.ordenes.get(ordenId))!
  const adjuntos = await db.adjuntos.where('orden_id').equals(ordenId).toArray()
  const firma = await db.firmas.where('orden_id').equals(ordenId).first()
  const faltan = faltantesParaTerminar(adjuntos, firma)
  if (faltan.length) throw new Error(`Para terminar falta: ${faltan.join(' y ')}.`)
  const registros = await db.registros_tiempo.where('orden_id').equals(ordenId).toArray()
  if (puedeRegistrarSalida(registros, tecnicoId, ordenId)) await registrarSalida(ordenId, tecnicoId, 'terminar')
  return guardar('ordenes', { ...orden, estado: 'terminada', resultados, observaciones })
}

/* ---------- CU-13 Cerrar o cancelar (encargado) ---------- */
export async function cerrarOrden(ordenId: string, rol: Usuario['rol']) {
  if (!puedeCerrarOCancelar(rol)) throw new Error('Solo el encargado o el administrador pueden cerrar órdenes.')
  const orden = (await db.ordenes.get(ordenId))!
  return guardar('ordenes', { ...orden, estado: 'cerrada', cerrada_at: ahora() })
}

export async function cancelarOrden(ordenId: string, rol: Usuario['rol']) {
  if (!puedeCerrarOCancelar(rol)) throw new Error('Solo el encargado o el administrador pueden cancelar órdenes.')
  const orden = (await db.ordenes.get(ordenId))!
  return guardar('ordenes', { ...orden, estado: 'cancelada' })
}
