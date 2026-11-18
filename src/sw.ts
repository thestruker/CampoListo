/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

// La app completa queda guardada en el celular: abre aunque no haya señal.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// Notificaciones push (tarea 7.5 y 7.7).
self.addEventListener('push', (event) => {
  const datos = (() => {
    try {
      return event.data?.json() ?? {}
    } catch {
      return { body: event.data?.text() }
    }
  })() as { title?: string; body?: string; url?: string }
  event.waitUntil(
    self.registration.showNotification(datos.title ?? 'CampoListo', {
      body: datos.body ?? 'Tienes una novedad.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: datos.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string })?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ('focus' in v) {
          ;(v as WindowClient).navigate(url)
          return (v as WindowClient).focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
