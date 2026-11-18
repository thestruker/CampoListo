-- CampoListo · Esquema inicial (tarea 4.2)
-- Multiempresa: cada fila lleva empresa_id y las políticas RLS impiden ver datos de otra empresa.
-- Los ids los genera el celular (UUID) para que la sincronización sea idempotente (upsert por id).

create extension if not exists pgcrypto;

create type rol_usuario as enum ('administrador', 'encargado', 'tecnico');
create type estado_orden as enum ('pendiente', 'asignada', 'en_sitio', 'con_avance', 'terminada', 'cerrada', 'cancelada');

create table empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  razon_social text not null default '',
  telefono text not null default '',
  correo text not null default '',
  direccion text not null default '',
  logo_data_url text,
  ultimo_folio integer not null default 0,
  updated_at timestamptz not null default now()
);

create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references empresas (id),
  nombre text not null,
  correo text not null,
  telefono text not null default '',
  rol rol_usuario not null default 'tecnico',
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table clientes (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  nombre text not null,
  telefono text not null default '',
  direccion text not null default '',
  lat double precision,
  lng double precision,
  notas text not null default '',
  updated_at timestamptz not null default now()
);

create table ordenes (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  folio integer,
  cliente_id uuid not null references clientes (id),
  tipo text not null default 'Servicio y mantenimiento',
  titulo text not null,
  instrucciones text not null default '',
  fecha_programada date not null,
  estado estado_orden not null default 'pendiente',
  resultados text not null default '',
  observaciones text not null default '',
  creada_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cerrada_at timestamptz,
  aviso_sin_salida_at timestamptz,
  unique (empresa_id, folio)
);

create table orden_tecnicos (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  orden_id uuid not null references ordenes (id) on delete cascade,
  tecnico_id uuid not null references usuarios (id),
  eliminado boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (orden_id, tecnico_id)
);

-- Tablas de solo agregar (append-only): los registros de campo no se editan ni se borran.
create table registros_tiempo (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  orden_id uuid not null references ordenes (id),
  tecnico_id uuid not null references usuarios (id),
  tipo text not null check (tipo in ('llegada', 'salida')),
  hora_dispositivo timestamptz not null,
  hora_servidor timestamptz not null default now(),
  lat double precision,
  lng double precision,
  precision_m integer,
  revisar boolean not null default false,
  updated_at timestamptz not null default now()
);

create table adjuntos (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  orden_id uuid not null references ordenes (id),
  autor_id uuid not null references usuarios (id),
  tipo text not null check (tipo in ('foto', 'audio', 'texto')),
  momento text not null check (momento in ('reporte', 'antes', 'despues', 'evidencia')),
  texto text not null default '',
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table firmas (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  orden_id uuid not null references ordenes (id),
  nombre_recibe text not null default '',
  sin_firma_motivo text not null default '',
  imagen_data_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table materiales_usados (
  id uuid primary key,
  empresa_id uuid not null references empresas (id),
  orden_id uuid not null references ordenes (id),
  descripcion text not null,
  cantidad numeric not null default 1,
  unidad text not null default 'pza',
  updated_at timestamptz not null default now()
);

create table push_suscripciones (
  endpoint text primary key,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  empresa_id uuid not null references empresas (id),
  suscripcion jsonb not null,
  created_at timestamptz not null default now()
);

create table bitacora (
  id bigint generated always as identity primary key,
  empresa_id uuid not null,
  usuario_id uuid,
  tabla text not null,
  registro_id uuid not null,
  accion text not null,
  creado_at timestamptz not null default now()
);

create index on usuarios (empresa_id);
create index on clientes (empresa_id);
create index on ordenes (empresa_id, estado, fecha_programada);
create index on orden_tecnicos (tecnico_id);
create index on registros_tiempo (orden_id, tecnico_id, hora_dispositivo);
create index on adjuntos (orden_id);
create index on firmas (orden_id);
create index on materiales_usados (orden_id);
