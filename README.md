# CampoListo

**Cada servicio, registrado y firmado. Aunque no haya señal.**

CampoListo es una app web instalable (PWA) para empresas con técnicos en campo: el encargado crea y asigna órdenes de servicio, y el técnico registra llegada, evidencias, piezas y la firma del cliente desde su celular, con o sin internet. Al final se genera la hoja de servicio en PDF membretada y el reporte de horas por técnico para el registro de jornada.

Proyecto de Negocios Electrónicos (UAZ) · Angel Misael Mazón Domínguez · 2026.

## Probarla en 1 minuto (modo demo)

```bash
npm install
npm run dev
```

Abre <http://localhost:5173> y entra como **Encargado** o como un **técnico** (Luis, Ramón o Karla). Sin archivo `.env` la app trabaja en **modo demo**: datos de ejemplo guardados solo en tu navegador. El botón *Reiniciar demo* los regresa al inicio.

Para verla en tu celular en la misma red: `npm run dev -- --host` y abre la IP que aparece.

## Qué hace

| Rol | Funciones |
|---|---|
| Encargado / administrador | Tablero por estado con filtros, crear orden con reporte de falla (foto, audio o texto), asignar técnicos, aviso al cliente por WhatsApp, expediente por cliente, hoja de servicio en PDF y PDF del día, cerrar o cancelar, horas por técnico con exportación a Excel (CSV), aviso de órdenes abiertas sin salida |
| Administrador | Usuarios y roles, datos de la empresa y logo para el membrete |
| Técnico | Mis órdenes (funciona sin señal), **Llegué** con hora y GPS, fotos del antes y después, notas y audios, piezas y materiales, firma con el dedo, **Terminé** |

## Cómo funciona sin señal

1. Todo se guarda primero en el celular (IndexedDB con Dexie).
2. Cada cambio entra a una **cola de salida** en la misma transacción.
3. Al volver la señal, la cola se envía sola en orden (primero clientes y órdenes, luego registros y fotos). El id de cada registro lo genera el celular, así que reintentar nunca duplica (upsert por id).
4. Si el servidor falla, se reintenta con espera creciente; quedarse sin señal no cuenta como fallo.
5. El indicador de arriba siempre dice cuántos registros faltan por subir.

## Estructura

```
src/
  lib/        lógica: base local, cola, sincronización, reglas de negocio, horas, PDF, WhatsApp
  pages/      pantallas del encargado y del técnico
  components/ piezas de interfaz (firma, grabadora, indicador de sincronización)
  sw.ts       service worker: app disponible sin señal y notificaciones push
supabase/     migraciones SQL, políticas RLS y Edge Functions (ver supabase/README.md)
tests/        pruebas de extremo a extremo (Playwright)
```

## Documentos

- [Manual de usuario](docs/manual-de-usuario.pdf)
- [Mockups de las pantallas](docs/mockups.pdf)
- [Pitch](docs/pitch.pdf)

## Pruebas

```bash
npm test          # pruebas unitarias (Vitest): horas, reglas, cola de salida, WhatsApp, CSV
npm run test:e2e  # extremo a extremo (Playwright): técnico sin señal, encargado y todas las pantallas
```

## Conectar el backend (Supabase)

Sigue [`supabase/README.md`](supabase/README.md) y después copia `.env.example` a `.env` con tus llaves.

## Publicar (Cloudflare Pages)

1. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elige este repositorio.
2. Build command: `npm run build` · Build output: `dist` · Variable `NODE_VERSION=22`.
3. Agrega las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_VAPID_PUBLIC_KEY` (o déjalas vacías para publicar el modo demo).
4. Cada `git push` a `main` publica una nueva versión. `public/_redirects` y `public/_headers` ya están listos para que las rutas y el service worker funcionen.

> En iPhone, las notificaciones y el almacenamiento duradero requieren instalar la app: **Compartir → Agregar a pantalla de inicio** (iOS 16.4 o más nuevo).
