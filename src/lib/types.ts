// Modelo de datos de CampoListo. Los nombres coinciden con las tablas de Supabase (ver supabase/migrations).

export type Rol = 'administrador' | 'encargado' | 'tecnico'

export type EstadoOrden =
  | 'pendiente'
  | 'asignada'
  | 'en_sitio'
  | 'con_avance'
  | 'terminada'
  | 'cerrada'
  | 'cancelada'

export interface Empresa {
  id: string
  nombre: string
  razon_social: string
  telefono: string
  correo: string
  direccion: string
  logo_data_url?: string // logo para la hoja membretada
  updated_at: string
}

export interface Usuario {
  id: string
  empresa_id: string
  nombre: string
  correo: string
  telefono: string
  rol: Rol
  activo: boolean
  updated_at: string
}

export interface Cliente {
  id: string
  empresa_id: string
  nombre: string
  telefono: string
  direccion: string
  lat?: number | null
  lng?: number | null
  notas: string
  updated_at: string
}

export interface Orden {
  id: string
  empresa_id: string
  folio: number | null // lo asigna el servidor; en modo demo, el dispositivo
  cliente_id: string
  tipo: string
  titulo: string
  instrucciones: string
  fecha_programada: string // yyyy-mm-dd
  estado: EstadoOrden
  resultados: string
  observaciones: string
  creada_por: string
  created_at: string
  updated_at: string
  cerrada_at?: string | null
}

export interface OrdenTecnico {
  id: string
  orden_id: string
  tecnico_id: string
  empresa_id: string
  eliminado?: boolean // baja lógica: así la desasignación también se sincroniza
  updated_at: string
}

export type TipoRegistro = 'llegada' | 'salida'

export interface RegistroTiempo {
  id: string
  empresa_id: string
  orden_id: string
  tecnico_id: string
  tipo: TipoRegistro
  hora_dispositivo: string
  hora_servidor?: string | null
  lat?: number | null
  lng?: number | null
  precision_m?: number | null
  revisar?: boolean // RN-05: diferencia de más de 10 min con el servidor
  updated_at: string
}

export type TipoAdjunto = 'foto' | 'audio' | 'texto'
export type Momento = 'reporte' | 'antes' | 'despues' | 'evidencia'

export interface Adjunto {
  id: string
  empresa_id: string
  orden_id: string
  autor_id: string
  tipo: TipoAdjunto
  momento: Momento
  texto: string
  blob?: Blob | null // contenido local hasta que se sube
  storage_path?: string | null
  created_at: string
  updated_at: string
}

export interface Firma {
  id: string
  empresa_id: string
  orden_id: string
  nombre_recibe: string
  sin_firma_motivo: string
  imagen_data_url: string
  created_at: string
  updated_at: string
}

export interface MaterialUsado {
  id: string
  empresa_id: string
  orden_id: string
  descripcion: string
  cantidad: number
  unidad: string
  updated_at: string
}

export type TablaSync =
  | 'empresas'
  | 'usuarios'
  | 'clientes'
  | 'ordenes'
  | 'orden_tecnicos'
  | 'registros_tiempo'
  | 'adjuntos'
  | 'firmas'
  | 'materiales_usados'

export interface OutboxItem {
  id: string // mismo id que el registro: así un reintento nunca duplica (upsert)
  tabla: TablaSync
  registro_id: string
  creado: number
  version: number // sube cada vez que el registro se vuelve a guardar
  intentos: number
  proximo_intento: number
  ultimo_error?: string
}
