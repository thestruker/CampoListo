# Supabase de CampoListo

Pasos para dejar el backend listo (unos 15 minutos). Mientras no lo configures, la app funciona en **modo demo**.

1. Crea un proyecto en <https://supabase.com> (plan gratuito). Región sugerida: `us-west-1`.
2. En **SQL Editor**, ejecuta en orden los archivos de `migrations/`:
   1. `20261118000000_esquema.sql`
   2. `20261118000100_reglas_y_triggers.sql`
   3. `20261118000200_rls.sql`
   4. `20261118000300_notificaciones.sql` (antes activa `pg_net` y `pg_cron` en **Database → Extensions** y guarda los dos secretos de Vault que indica el archivo).
   - Con la CLI es más rápido: `npx supabase link --project-ref TU_REF` y `npx supabase db push`.
3. Crea al dueño en **Authentication → Users → Add user** y ejecuta `seed.sql` con su UUID.
4. Genera las llaves para push: `npx web-push generate-vapid-keys`.
5. Publica las funciones y sus secretos:
   ```bash
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@correo.mx
   npx supabase functions deploy notificar-asignacion --no-verify-jwt
   npx supabase functions deploy ordenes-abiertas --no-verify-jwt
   npx supabase functions deploy invitar-usuario
   ```
6. En la raíz del proyecto copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_VAPID_PUBLIC_KEY`.

## Qué hace cada pieza

| Pieza | Para qué |
|---|---|
| `esquema.sql` | Tablas multiempresa. Los ids vienen del celular (UUID) para que reenviar no duplique. |
| `reglas_y_triggers.sql` | Folio consecutivo por empresa, `updated_at`, RN-02 (no hay salida sin llegada), RN-05 (hora del celular adelantada), registros de campo inmutables y bitácora (RF-33). |
| `rls.sql` | Cada empresa solo ve lo suyo; el técnico solo ve sus órdenes y los clientes de esas órdenes (RN-07); solo encargado o administrador cierran o cancelan (RN-06). Bucket privado `evidencias`. |
| `notificaciones.sql` | Push al asignar una orden (7.5) y revisión nocturna de órdenes sin salida (7.7). |

> Ojo: el plan gratuito pausa el proyecto tras 7 días sin uso (riesgo RI-07). Entra a la app la víspera de una demo.
