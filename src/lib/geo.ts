// Ubicación del celular. El GPS funciona sin internet; si tarda o se niega el permiso,
// el registro se guarda igual sin coordenadas.
export interface Posicion {
  lat: number
  lng: number
  precision_m: number
}

export function obtenerPosicion(timeoutMs = 12_000): Promise<Posicion | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision_m: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000
  const rad = (x: number) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function enlaceMapa(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
