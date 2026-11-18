import { useEffect, useState } from 'react'
import { urlAdjunto } from '../lib/sync'
import type { Adjunto } from '../lib/types'

const MOMENTO: Record<Adjunto['momento'], string> = { reporte: 'Reporte de falla', antes: 'Antes', despues: 'Después', evidencia: 'Evidencia' }

function Vista({ a }: { a: Adjunto }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let u: string | null = null
    if (a.tipo !== 'texto') urlAdjunto(a).then((x) => setUrl((u = x)))
    return () => {
      if (u?.startsWith('blob:')) URL.revokeObjectURL(u)
    }
  }, [a.id, a.storage_path])
  return (
    <div className="aparecer overflow-hidden rounded-2xl bg-campo-50/70 ring-1 ring-campo-100">
      {a.tipo === 'foto' && (url ? <img src={url} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] grid place-items-center text-xs text-neutral-400">Foto en el servidor</div>)}
      {a.tipo === 'audio' && (url ? <audio controls src={url} className="w-full p-2" /> : <div className="p-3 text-xs">Audio</div>)}
      {a.tipo === 'texto' && <p className="whitespace-pre-wrap p-3 text-sm">{a.texto}</p>}
      <div className="flex flex-wrap justify-between gap-x-2 px-3 pb-2 text-[11px] text-neutral-500">
        <span>{MOMENTO[a.momento]}</span>
        <span>{new Date(a.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
    </div>
  )
}

export function ListaAdjuntos({ adjuntos }: { adjuntos: Adjunto[] }) {
  if (!adjuntos.length) return <p className="text-sm text-neutral-500">Sin evidencias todavía.</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {adjuntos.map((a) => (
        <Vista key={a.id} a={a} />
      ))}
    </div>
  )
}
