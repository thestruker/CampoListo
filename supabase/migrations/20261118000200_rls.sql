-- CampoListo · Políticas RLS (RNF de seguridad y RN-07)
-- Regla general: solo se ven y se escriben filas de la propia empresa.
-- Los técnicos solo ven las órdenes que tienen asignadas (y sus clientes).

create or replace function mi_empresa() returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios where id = auth.uid() and activo
$$;

create or replace function mi_rol() returns rol_usuario language sql stable security definer set search_path = public as $$
  select rol from usuarios where id = auth.uid() and activo
$$;

create or replace function es_gestor() returns boolean language sql stable as $$
  select mi_rol() in ('administrador', 'encargado')
$$;

create or replace function tengo_orden(p_orden uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from orden_tecnicos where orden_id = p_orden and tecnico_id = auth.uid() and not eliminado)
$$;

alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table ordenes enable row level security;
alter table orden_tecnicos enable row level security;
alter table registros_tiempo enable row level security;
alter table adjuntos enable row level security;
alter table firmas enable row level security;
alter table materiales_usados enable row level security;
alter table push_suscripciones enable row level security;
alter table bitacora enable row level security;

-- Empresa
create policy empresa_ver on empresas for select using (id = mi_empresa());
create policy empresa_editar on empresas for update using (id = mi_empresa() and mi_rol() = 'administrador');
-- La app sincroniza con upsert (INSERT ... ON CONFLICT): Postgres revisa también la política de INSERT.
create policy empresa_upsert on empresas for insert with check (id = mi_empresa() and mi_rol() = 'administrador');

-- Usuarios: todos ven a los de su empresa; solo el administrador los cambia.
create policy usuarios_ver on usuarios for select using (empresa_id = mi_empresa());
create policy usuarios_admin on usuarios for update using (empresa_id = mi_empresa() and mi_rol() = 'administrador');
create policy usuarios_upsert on usuarios for insert with check (empresa_id = mi_empresa() and mi_rol() = 'administrador');

-- Clientes (RN-07: el técnico solo ve los clientes de sus órdenes)
create policy clientes_gestor on clientes for all using (empresa_id = mi_empresa() and es_gestor()) with check (empresa_id = mi_empresa() and es_gestor());
create policy clientes_tecnico on clientes for select using (
  empresa_id = mi_empresa() and exists (select 1 from ordenes o where o.cliente_id = clientes.id and tengo_orden(o.id))
);

-- Órdenes
create policy ordenes_gestor on ordenes for all using (empresa_id = mi_empresa() and es_gestor()) with check (empresa_id = mi_empresa() and es_gestor());
create policy ordenes_tecnico_ver on ordenes for select using (empresa_id = mi_empresa() and tengo_orden(id));
-- El técnico actualiza estado y resultados de sus órdenes, pero no puede cerrarlas ni cancelarlas (RN-06).
create policy ordenes_tecnico_editar on ordenes for update using (empresa_id = mi_empresa() and tengo_orden(id))
  with check (empresa_id = mi_empresa() and estado not in ('cerrada', 'cancelada'));
-- Upsert del técnico sobre una orden que ya existe y tiene asignada (no puede crear órdenes nuevas).
create policy ordenes_tecnico_upsert on ordenes for insert with check (empresa_id = mi_empresa() and tengo_orden(id));

-- Asignaciones
create policy asignaciones_gestor on orden_tecnicos for all using (empresa_id = mi_empresa() and es_gestor()) with check (empresa_id = mi_empresa() and es_gestor());
create policy asignaciones_tecnico on orden_tecnicos for select using (empresa_id = mi_empresa() and tecnico_id = auth.uid());

-- Registros de campo: el técnico solo agrega en sus órdenes y a su nombre; el gestor ve todo.
create policy registros_ver on registros_tiempo for select using (empresa_id = mi_empresa() and (es_gestor() or tecnico_id = auth.uid()));
create policy registros_agregar on registros_tiempo for insert with check (empresa_id = mi_empresa() and tecnico_id = auth.uid() and tengo_orden(orden_id));
-- Permite el upsert idempotente (el trigger impide cambios reales).
create policy registros_upsert on registros_tiempo for update using (empresa_id = mi_empresa() and tecnico_id = auth.uid());

create policy adjuntos_ver on adjuntos for select using (empresa_id = mi_empresa() and (es_gestor() or tengo_orden(orden_id)));
create policy adjuntos_agregar on adjuntos for insert with check (empresa_id = mi_empresa() and autor_id = auth.uid() and (es_gestor() or tengo_orden(orden_id)));
create policy adjuntos_upsert on adjuntos for update using (empresa_id = mi_empresa() and autor_id = auth.uid());

create policy firmas_ver on firmas for select using (empresa_id = mi_empresa() and (es_gestor() or tengo_orden(orden_id)));
create policy firmas_escribir on firmas for insert with check (empresa_id = mi_empresa() and tengo_orden(orden_id));
create policy firmas_upsert on firmas for update using (empresa_id = mi_empresa() and tengo_orden(orden_id));

create policy materiales_ver on materiales_usados for select using (empresa_id = mi_empresa() and (es_gestor() or tengo_orden(orden_id)));
create policy materiales_escribir on materiales_usados for insert with check (empresa_id = mi_empresa() and tengo_orden(orden_id));
create policy materiales_upsert on materiales_usados for update using (empresa_id = mi_empresa() and tengo_orden(orden_id));

create policy push_propia on push_suscripciones for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and empresa_id = mi_empresa());

create policy bitacora_admin on bitacora for select using (empresa_id = mi_empresa() and mi_rol() = 'administrador');

-- Storage: bucket privado "evidencias", carpeta por empresa.
insert into storage.buckets (id, name, public) values ('evidencias', 'evidencias', false) on conflict do nothing;
create policy evidencias_ver on storage.objects for select using (bucket_id = 'evidencias' and (storage.foldername(name))[1] = mi_empresa()::text);
create policy evidencias_subir on storage.objects for insert with check (bucket_id = 'evidencias' and (storage.foldername(name))[1] = mi_empresa()::text);
create policy evidencias_reemplazar on storage.objects for update using (bucket_id = 'evidencias' and (storage.foldername(name))[1] = mi_empresa()::text);
