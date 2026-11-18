// Comprime fotos antes de guardarlas: máximo 1600 px y JPEG al 70 %.
export async function comprimirFoto(archivo: File | Blob, maxLado = 1600, calidad = 0.7): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(archivo)
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * escala)
    const h = Math.round(bmp.height * escala)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo comprimir'))), 'image/jpeg', calidad))
  } catch {
    return archivo
  }
}

export function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(blob)
  })
}
