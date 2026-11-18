import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Grabadora } from '../../components/Grabadora'
import { Camera, ClipboardList, Plus, Users, Wrench } from 'lucide-react'
import { Avatar, Boton, Campo, entrada, hoy, Seccion, Titulo } from '../../components/ui'
import { crearOrden } from '../../lib/acciones'
import { db } from '../../lib/db'
import { useSesion } from '../../lib/sesion'

export const TIPOS = ['Servicio y mantenimiento', 'Instalación', 'Revisión de falla', 'Visita de cotización', 'Garantía']

// CU-04 Crear orden con reporte de falla (foto, audio o texto) y CU-05 Asignar técnicos.
export function NuevaOrden() {
  const { sesion } = useSesion()
  const nav = useNavigate()
  const empresaId = sesion!.empresa.id
  const clientes = useLiveQuery(() => db.clientes.where('empresa_id').equals(empresaId).sortBy('nombre'), [empresaId], [])
  const tecnicos = useLiveQuery(() => db.usuarios.where('empresa_id').equals(empresaId).filter((u) => u.rol === 'tecnico' && u.activo).toArray(), [empresaId], [])
  const [f, setF] = useState({ cliente_id: '', tipo: TIPOS[0], titulo: '', instrucciones: '', fecha_programada: hoy() })
  const [asignados, setAsignados] = useState<string[]>([])
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [guardando, setGuardando] = useState(false)

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="mx-auto max-w-2xl">
      <Titulo sub="El técnico la ve en su celular aunque no tenga señal.">Nueva orden de servicio</Titulo>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setGuardando(true)
          const o = await crearOrden(empresaId, sesion!.usuario.id, f, asignados, { texto, foto, audio })
          nav(`/ordenes/${o.id}?nueva=1`)
        }}
      >
        <Seccion icono={ClipboardList} titulo="Datos del servicio" className="space-y-4">
          <Campo etiqueta="Cliente">
            <div className="flex gap-2">
              <select required className={entrada} value={f.cliente_id} onChange={set('cliente_id')}>
                <option value="">Elige un cliente…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <Link to="/clientes?nuevo=1" className="shrink-0"><Boton type="button" variante="secundario" icono={Plus}>Cliente</Boton></Link>
            </div>
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Tipo de servicio">
              <select className={entrada} value={f.tipo} onChange={set('tipo')}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            </Campo>
            <Campo etiqueta="Fecha de visita">
              <input type="date" required className={entrada} value={f.fecha_programada} onChange={set('fecha_programada')} />
            </Campo>
          </div>
          <Campo etiqueta="Título">
            <input required className={entrada} placeholder="Ej. Revisión de inversor que marca falla" value={f.titulo} onChange={set('titulo')} />
          </Campo>
          <Campo etiqueta="Instrucciones para el técnico">
            <textarea required rows={4} className={entrada} value={f.instrucciones} onChange={set('instrucciones')} />
          </Campo>
        </Seccion>

        <Seccion icono={Wrench} titulo="Reporte de la falla (opcional)" className="space-y-3">
          <p className="text-sm text-neutral-500">Lo que mandó el cliente: texto, una foto o un audio.</p>
          <textarea rows={2} className={entrada} placeholder="Ej. El inversor marca error de aislamiento desde ayer" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold shadow-suave ring-1 ring-campo-100">
              <Camera className="h-4 w-4" /> {foto ? 'Foto lista ✓' : 'Agregar foto'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            </label>
            {audio ? <span className="text-sm font-semibold text-emerald-700">Audio listo ✓</span> : <Grabadora onListo={setAudio} />}
          </div>
        </Seccion>

        <Seccion icono={Users} titulo="Técnicos que van">
          <div className="grid gap-2 sm:grid-cols-2">
            {tecnicos.map((t) => (
              <label key={t.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition ${asignados.includes(t.id) ? 'bg-campo-50 ring-campo-500' : 'ring-campo-100 hover:bg-campo-50/50'}`}>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-campo-700"
                  checked={asignados.includes(t.id)}
                  onChange={(e) => setAsignados(e.target.checked ? [...asignados, t.id] : asignados.filter((x) => x !== t.id))}
                />
                <Avatar nombre={t.nombre} tam="sm" />
                {t.nombre}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">A cada técnico le llega un aviso al celular.</p>
        </Seccion>

        <Boton grande className="w-full" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear orden'}</Boton>
      </form>
    </div>
  )
}
