-- CampoListo · Notificaciones (tareas 7.5 y 7.7)
-- Requiere las extensiones pg_net y pg_cron (se activan desde el panel de Supabase: Database → Extensions).
-- Antes de aplicar, guarda en Vault la URL del proyecto y la service role key:
--   select vault.create_secret('https://TU-PROYECTO.supabase.co', 'project_url');
--   select vault.create_secret('TU_SERVICE_ROLE_KEY', 'service_role_key');

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function llamar_funcion(nombre text, cuerpo jsonb) returns void language plpgsql security definer set search_path = public as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  clave text := (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key');
begin
  if url is null or clave is null then return; end if;
  perform net.http_post(
    url := url || '/functions/v1/' || nombre,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || clave),
    body := cuerpo
  );
end $$;

-- 7.5: al asignar un técnico se le manda un push.
create or replace function avisar_asignacion() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.eliminado and (tg_op = 'INSERT' or old.eliminado) then
    perform llamar_funcion('notificar-asignacion', jsonb_build_object('orden_id', new.orden_id, 'tecnico_id', new.tecnico_id));
  end if;
  return new;
end $$;
create trigger asignacion_push after insert or update on orden_tecnicos for each row execute function avisar_asignacion();

-- 7.7: revisión nocturna de órdenes con llegada pero sin salida (hallazgo de Trackpoint).
-- Corre todos los días a las 20:00 de Sonora (03:00 UTC).
select cron.schedule('ordenes-abiertas', '0 3 * * *', $$ select llamar_funcion('ordenes-abiertas', '{}'::jsonb) $$);
