import { useEffect, useRef, useState } from 'react'
import { Boton } from './ui'

// Área para firmar con el dedo (CU-10).
export function FirmaPad({ onCambio }: { onCambio: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  const [vacia, setVacia] = useState(true)

  useEffect(() => {
    const c = ref.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const g = c.getContext('2d')!
    g.scale(ratio, ratio)
    g.fillStyle = '#fff'
    g.fillRect(0, 0, c.width, c.height)
    g.lineWidth = 2.5
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.strokeStyle = '#1b2a4a'
  }, [])

  const punto = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  return (
    <div>
      <canvas
        ref={ref}
        data-testid="firma"
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-campo-200 bg-white"
        onPointerDown={(e) => {
          dibujando.current = true
          ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
          const g = ref.current!.getContext('2d')!
          const p = punto(e)
          g.beginPath()
          g.moveTo(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!dibujando.current) return
          const g = ref.current!.getContext('2d')!
          const p = punto(e)
          g.lineTo(p.x, p.y)
          g.stroke()
        }}
        onPointerUp={() => {
          dibujando.current = false
          setVacia(false)
          onCambio(ref.current!.toDataURL('image/png'))
        }}
      />
      <div className="mt-1 flex justify-between text-xs text-neutral-500">
        <span>{vacia ? 'Firme con el dedo dentro del recuadro' : 'Firma capturada'}</span>
        <Boton
          variante="fantasma"
          type="button"
          onClick={() => {
            const c = ref.current!
            const g = c.getContext('2d')!
            g.fillStyle = '#fff'
            g.fillRect(0, 0, c.width, c.height)
            setVacia(true)
            onCambio('')
          }}
        >
          Borrar
        </Boton>
      </div>
    </div>
  )
}
