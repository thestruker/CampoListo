import Dexie, { type Table } from 'dexie'
import type {
  Adjunto,
  Cliente,
  Empresa,
  Firma,
  MaterialUsado,
  Orden,
  OrdenTecnico,
  OutboxItem,
  RegistroTiempo,
  Usuario,
} from './types'

// Base de datos local (IndexedDB). Es la fuente de verdad del celular:
// todo se guarda aquí primero y la cola de salida (outbox) lo sube cuando hay señal.
export class CampoListoDB extends Dexie {
  empresas!: Table<Empresa, string>
  usuarios!: Table<Usuario, string>
  clientes!: Table<Cliente, string>
  ordenes!: Table<Orden, string>
  orden_tecnicos!: Table<OrdenTecnico, string>
  registros_tiempo!: Table<RegistroTiempo, string>
  adjuntos!: Table<Adjunto, string>
  firmas!: Table<Firma, string>
  materiales_usados!: Table<MaterialUsado, string>
  outbox!: Table<OutboxItem, string>
  meta!: Table<{ clave: string; valor: unknown }, string>

  constructor(nombre = 'campolisto') {
    super(nombre)
    this.version(1).stores({
      empresas: 'id',
      usuarios: 'id, empresa_id, correo, rol',
      clientes: 'id, empresa_id, nombre',
      ordenes: 'id, empresa_id, cliente_id, estado, fecha_programada, folio',
      orden_tecnicos: 'id, orden_id, tecnico_id, [orden_id+tecnico_id]',
      registros_tiempo: 'id, orden_id, tecnico_id, [orden_id+tecnico_id], hora_dispositivo',
      adjuntos: 'id, orden_id',
      firmas: 'id, orden_id',
      materiales_usados: 'id, orden_id',
      outbox: 'id, proximo_intento, tabla',
      meta: 'clave',
    })
  }
}

export const db = new CampoListoDB()

export const ahora = () => new Date().toISOString()

export function nuevoId(): string {
  return crypto.randomUUID()
}

export async function getMeta<T>(clave: string): Promise<T | undefined> {
  const r = await db.meta.get(clave)
  return r?.valor as T | undefined
}

export async function setMeta(clave: string, valor: unknown) {
  await db.meta.put({ clave, valor })
}
