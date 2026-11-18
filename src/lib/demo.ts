import { db, nuevoId } from './db'
import type { Cliente, Empresa, Orden, RegistroTiempo, Usuario } from './types'

// Datos de ejemplo para el modo demo. Son ficticios.

const EMPRESA_ID = '00000000-0000-4000-8000-000000000001'

function hace(dias: number, hora: number, minuto = 0) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(hora, minuto, 0, 0)
  return d.toISOString()
}

function dia(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function firmaFalsa(): string {
  try {
    const c = document.createElement('canvas')
    c.width = 360
    c.height = 120
    const g = c.getContext('2d')!
    g.fillStyle = '#fff'
    g.fillRect(0, 0, 360, 120)
    g.strokeStyle = '#1b2a4a'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(20, 80)
    for (let x = 20; x < 340; x += 8) g.lineTo(x, 70 + Math.sin(x / 14) * 22 - (x > 200 ? 10 : 0))
    g.stroke()
    return c.toDataURL('image/png')
  } catch {
    return ''
  }
}

export async function cargarDemoSiHaceFalta() {
  if ((await db.empresas.count()) > 0) return
  const t = new Date().toISOString()
  const empresa: Empresa = {
    id: EMPRESA_ID,
    nombre: 'Energía Solar del Desierto (demo)',
    razon_social: 'Energía Solar del Desierto S.A. de C.V.',
    telefono: '637 000 0000',
    correo: 'contacto@ejemplo.mx',
    direccion: 'Caborca, Sonora',
    updated_at: t,
  }
  const u = (id: string, nombre: string, rol: Usuario['rol'], correo: string): Usuario => ({
    id, empresa_id: EMPRESA_ID, nombre, correo, telefono: '', rol, activo: true, updated_at: t,
  })
  const usuarios = [
    u('00000000-0000-4000-8000-000000000010', 'Dueño (administrador)', 'administrador', 'admin@demo.mx'),
    u('00000000-0000-4000-8000-000000000011', 'Encargado en turno', 'encargado', 'encargado@demo.mx'),
    u('00000000-0000-4000-8000-000000000021', 'Luis – ayudante general', 'tecnico', 'luis@demo.mx'),
    u('00000000-0000-4000-8000-000000000022', 'Ramón – soldador técnico', 'tecnico', 'ramon@demo.mx'),
    u('00000000-0000-4000-8000-000000000023', 'Karla – ayudante administrativa', 'tecnico', 'karla@demo.mx'),
  ]
  const [, encargado, luis, ramon] = usuarios
  const c = (nombre: string, telefono: string, direccion: string, lat: number, lng: number): Cliente => ({
    id: nuevoId(), empresa_id: EMPRESA_ID, nombre, telefono, direccion, lat, lng, notas: '', updated_at: t,
  })
  const clientes = [
    c('Rancho El Saguaro', '526370000001', 'Carretera a Puerto Libertad km 12, Caborca', 30.735, -112.21),
    c('Taller Mecánico Hermanos Ruiz', '526370000002', 'Av. Obregón 210, Centro, Caborca', 30.716, -112.159),
    c('Casa Familia Morales', '526370000003', 'Calle 5 y Av. K, Caborca', 30.709, -112.152),
    c('Empacadora Valle Norte', '526370000004', 'Parque Industrial, Caborca', 30.727, -112.14),
  ]
  const o = (folio: number, cli: Cliente, titulo: string, instrucciones: string, estado: Orden['estado'], dias: number): Orden => ({
    id: nuevoId(), empresa_id: EMPRESA_ID, folio, cliente_id: cli.id, tipo: 'Servicio y mantenimiento', titulo,
    instrucciones, fecha_programada: dia(dias), estado, resultados: '', observaciones: '', creada_por: encargado.id,
    created_at: hace(dias + 1, 9), updated_at: t, cerrada_at: null,
  })
  const o1 = o(1, clientes[0], 'Instalación de bases y paneles', 'Instalar base para 4 paneles de 250 W con poste de 4 pulgadas. Unos 12 m al punto del sistema.', 'cerrada', 3)
  o1.resultados = 'Todo quedó bien. Sistema operando.'
  o1.observaciones = 'Se dejó tubería de PVC pesado a la vista para revisión del cliente.'
  o1.cerrada_at = hace(2, 18)
  const o2 = o(2, clientes[1], 'Revisión de inversor que marca falla', 'El cliente reporta que el inversor muestra error de aislamiento desde ayer.', 'terminada', 1)
  o2.resultados = 'Se encontró conector MC4 dañado; se reemplazó y el inversor volvió a operar.'
  const o3 = o(3, clientes[2], 'Limpieza de paneles y revisión de cableado', 'Limpieza de 8 paneles y revisión general.', 'en_sitio', 0)
  const o4 = o(4, clientes[3], 'Mantenimiento preventivo de bomba solar', 'Revisar variador y conexiones de la bomba del pozo 2.', 'asignada', 0)
  const o5 = o(5, clientes[2], 'Cotizar ampliación de 4 paneles', 'Tomar medidas del techo para la cotización.', 'pendiente', -1)
  const ordenes = [o1, o2, o3, o4, o5]
  const asig = (orden: Orden, tec: Usuario) => ({ id: nuevoId(), orden_id: orden.id, tecnico_id: tec.id, empresa_id: EMPRESA_ID, updated_at: t })
  const ot = [asig(o1, luis), asig(o1, ramon), asig(o2, ramon), asig(o3, luis), asig(o4, ramon), asig(o4, luis)]
  const r = (orden: Orden, tec: Usuario, tipo: RegistroTiempo['tipo'], hora: string, cli: Cliente): RegistroTiempo => ({
    id: nuevoId(), empresa_id: EMPRESA_ID, orden_id: orden.id, tecnico_id: tec.id, tipo, hora_dispositivo: hora,
    hora_servidor: hora, lat: cli.lat, lng: cli.lng, precision_m: 12, revisar: false, updated_at: t,
  })
  const registros = [
    r(o1, luis, 'llegada', hace(3, 8, 10), clientes[0]), r(o1, luis, 'salida', hace(3, 14, 40), clientes[0]),
    r(o1, ramon, 'llegada', hace(3, 8, 12), clientes[0]), r(o1, ramon, 'salida', hace(3, 15, 5), clientes[0]),
    r(o2, ramon, 'llegada', hace(1, 10, 0), clientes[1]), r(o2, ramon, 'salida', hace(1, 12, 25), clientes[1]),
    // Llegada de ayer sin salida: aparece como "pendiente de cierre" (hallazgo de Trackpoint)
    r(o3, luis, 'llegada', hace(1, 16, 30), clientes[2]),
  ]
  const firma = firmaFalsa()
  const firmas = [o1, o2].map((ord, i) => ({
    id: nuevoId(), empresa_id: EMPRESA_ID, orden_id: ord.id, nombre_recibe: i === 0 ? 'Santiago Martínez (encargado del rancho)' : 'José Ruiz (dueño del taller)',
    sin_firma_motivo: '', imagen_data_url: firma, created_at: t, updated_at: t,
  }))
  const adjuntos = [o1, o2].flatMap((ord) => [
    { id: nuevoId(), empresa_id: EMPRESA_ID, orden_id: ord.id, autor_id: ramon.id, tipo: 'texto' as const, momento: 'evidencia' as const,
      texto: 'Trabajo terminado y probado con el cliente presente.', blob: null, storage_path: null, created_at: t, updated_at: t },
  ])
  const materiales = [
    { id: nuevoId(), empresa_id: EMPRESA_ID, orden_id: o1.id, descripcion: 'Cable fotovoltaico 6 mm²', cantidad: 15, unidad: 'm', updated_at: t },
    { id: nuevoId(), empresa_id: EMPRESA_ID, orden_id: o1.id, descripcion: 'Tubería PVC pesado 1"', cantidad: 4, unidad: 'tramos', updated_at: t },
    { id: nuevoId(), empresa_id: EMPRESA_ID, orden_id: o2.id, descripcion: 'Conector MC4 (par)', cantidad: 1, unidad: 'pza', updated_at: t },
  ]
  await db.transaction('rw', [db.empresas, db.usuarios, db.clientes, db.ordenes, db.orden_tecnicos, db.registros_tiempo, db.firmas, db.adjuntos, db.materiales_usados], async () => {
    await db.empresas.put(empresa)
    await db.usuarios.bulkPut(usuarios)
    await db.clientes.bulkPut(clientes)
    await db.ordenes.bulkPut(ordenes)
    await db.orden_tecnicos.bulkPut(ot)
    await db.registros_tiempo.bulkPut(registros)
    await db.firmas.bulkPut(firmas)
    await db.adjuntos.bulkPut(adjuntos)
    await db.materiales_usados.bulkPut(materiales)
  })
}

export async function reiniciarDemo() {
  await db.delete()
  location.reload()
}
