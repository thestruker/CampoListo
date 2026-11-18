import { useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { Boton } from './ui'

// Grabar una nota de voz (para el reporte de falla o la evidencia).
export function Grabadora({ onListo }: { onListo: (audio: Blob) => void }) {
  const [grabando, setGrabando] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)
  const partes = useRef<Blob[]>([])

  async function iniciar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      partes.current = []
      r.ondataavailable = (e) => partes.current.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        onListo(new Blob(partes.current, { type: r.mimeType || 'audio/webm' }))
      }
      r.start()
      rec.current = r
      setGrabando(true)
    } catch {
      alert('No se pudo usar el micrófono. Revisa los permisos.')
    }
  }

  return grabando ? (
    <Boton type="button" variante="peligro" icono={Square} className="min-h-14 latido" onClick={() => { rec.current?.stop(); setGrabando(false) }}>
      Detener
    </Boton>
  ) : (
    <Boton type="button" variante="secundario" icono={Mic} className="min-h-14" onClick={iniciar}>
      Grabar audio
    </Boton>
  )
}
