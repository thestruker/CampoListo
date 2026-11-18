-- CampoListo · Reglas del servidor: updated_at, folio consecutivo, RN-05, bitácora (RF-33)

create or replace function tocar_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['empresas','usuarios','clientes','ordenes','orden_tecnicos','registros_tiempo','adjuntos','firmas','materiales_usados']
  loop
    execute format('create trigger %I_updated before insert or update on %I for each row execute function tocar_updated_at()', t, t);
  end loop;
end $$;

-- Folio consecutivo por empresa, asignado en el servidor al insertar.
create or replace function asignar_folio() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.folio is null then
    update empresas set ultimo_folio = ultimo_folio + 1 where id = new.empresa_id returning ultimo_folio into new.folio;
  end if;
  return new;
end $$;
create trigger ordenes_folio before insert on ordenes for each row execute function asignar_folio();

-- El folio no se cambia una vez asignado.
create or replace function conservar_folio() returns trigger language plpgsql as $$
begin
  if old.folio is not null then new.folio := old.folio; end if;
  new.created_at := old.created_at;
  return new;
end $$;
create trigger ordenes_conservar_folio before update on ordenes for each row execute function conservar_folio();

-- RN-05: si la hora del celular difiere más de 10 minutos de la del servidor, se marca para revisión.
create or replace function revisar_hora() returns trigger language plpgsql as $$
begin
  new.hora_servidor := now();
  -- Si el registro se hizo sin señal y se subió tarde, la diferencia es normal: solo se marca
  -- cuando la hora del celular está en el FUTURO respecto al servidor (reloj adelantado o manipulado).
  new.revisar := new.hora_dispositivo > now() + interval '10 minutes';
  return new;
end $$;
create trigger registros_revisar before insert on registros_tiempo for each row execute function revisar_hora();

-- Registros de campo de solo agregar: un upsert repetido no cambia nada (idempotente).
create or replace function bloquear_cambios() returns trigger language plpgsql as $$
begin
  return old;
end $$;
create trigger registros_inmutables before update on registros_tiempo for each row execute function bloquear_cambios();

-- RN-02: no se registra salida sin llegada previa del mismo técnico en la orden.
create or replace function validar_salida() returns trigger language plpgsql as $$
declare ultimo text;
begin
  if new.tipo = 'salida' then
    select tipo into ultimo from registros_tiempo
      where orden_id = new.orden_id and tecnico_id = new.tecnico_id and hora_dispositivo < new.hora_dispositivo
      order by hora_dispositivo desc limit 1;
    if ultimo is distinct from 'llegada' then
      raise exception 'RN-02: no hay llegada previa para esta salida';
    end if;
  end if;
  return new;
end $$;
create trigger registros_validar_salida before insert on registros_tiempo for each row execute function validar_salida();

-- RF-33: bitácora de quién crea o modifica órdenes, asignaciones y registros de tiempo.
create or replace function registrar_bitacora() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into bitacora (empresa_id, usuario_id, tabla, registro_id, accion)
  values (new.empresa_id, auth.uid(), tg_table_name, new.id, lower(tg_op));
  return new;
end $$;
create trigger ordenes_bitacora after insert or update on ordenes for each row execute function registrar_bitacora();
create trigger asignaciones_bitacora after insert or update on orden_tecnicos for each row execute function registrar_bitacora();
create trigger registros_bitacora after insert on registros_tiempo for each row execute function registrar_bitacora();
