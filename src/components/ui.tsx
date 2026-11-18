import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ETIQUETA_ESTADO } from '../lib/reglas'
import type { EstadoOrden } from '../lib/types'

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'sol'

const VAR: Record<Variante, string> = {
  primario: 'bg-campo-700 text-white shadow-suave hover:bg-campo-800 disabled:bg-campo-200 disabled:text-campo-700/60 disabled:shadow-none',
  secundario: 'bg-white text-campo-900 ring-1 ring-campo-100 shadow-suave hover:ring-campo-300 hover:bg-campo-50',
  peligro: 'bg-red-600 text-white shadow-suave hover:bg-red-700',
  fantasma: 'text-campo-700 hover:bg-campo-100/70',
  sol: 'bg-sol-400 text-campo-900 shadow-suave hover:bg-sol-500 disabled:bg-sol-100 disabled:text-campo-900/40 disabled:shadow-none',
}

export function Boton({ variante = 'primario', grande, icono: Icono, className = '', children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean; icono?: LucideIcon }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${grande ? 'min-h-14 px-6 text-lg' : 'min-h-10 px-4 text-sm'} ${VAR[variante]} ${className}`}
    >
      {Icono && <Icono className={grande ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white p-5 shadow-suave ring-1 ring-campo-100/80 ${className}`}>{children}</div>
}

export function Seccion({ icono: Icono, titulo, accion, children, className = '' }: { icono?: LucideIcon; titulo: string; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Tarjeta className={className}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-campo-900">
          {Icono && <span className="grid h-8 w-8 place-items-center rounded-xl bg-campo-50 text-campo-700"><Icono className="h-4 w-4" /></span>}
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </Tarjeta>
  )
}

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-campo-900">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-neutral-500">{ayuda}</span>}
    </label>
  )
}

export const entrada =
  'w-full rounded-2xl border-0 bg-campo-50/70 px-4 py-3 ring-1 ring-campo-100 outline-none transition placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-campo-500'

export const COLOR_ESTADO: Record<EstadoOrden, { chip: string; punto: string; barra: string }> = {
  pendiente: { chip: 'bg-neutral-100 text-neutral-700', punto: 'bg-neutral-400', barra: 'bg-neutral-300' },
  asignada: { chip: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100', punto: 'bg-sky-500', barra: 'bg-sky-400' },
  en_sitio: { chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100', punto: 'bg-amber-500', barra: 'bg-amber-400' },
  con_avance: { chip: 'bg-orange-50 text-orange-800 ring-1 ring-orange-100', punto: 'bg-orange-500', barra: 'bg-orange-400' },
  terminada: { chip: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100', punto: 'bg-emerald-500', barra: 'bg-emerald-500' },
  cerrada: { chip: 'bg-campo-700 text-white', punto: 'bg-campo-700', barra: 'bg-campo-700' },
  cancelada: { chip: 'bg-red-50 text-red-700 ring-1 ring-red-100', punto: 'bg-red-400', barra: 'bg-red-300' },
}

export function Estado({ estado }: { estado: EstadoOrden }) {
  const c = COLOR_ESTADO[estado]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${estado === 'cerrada' ? 'bg-sol-400' : c.punto}`} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}

const TONOS = ['bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-800', 'bg-rose-100 text-rose-800', 'bg-teal-100 text-teal-800']

export function Avatar({ nombre, tam = 'md' }: { nombre: string; tam?: 'sm' | 'md' | 'lg' }) {
  const iniciales = nombre.replace(/[–-].*/, '').replace(/\(.*?\)/g, '').replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  const tono = TONOS[[...nombre].reduce((s, c) => s + c.charCodeAt(0), 0) % TONOS.length]
  const t = tam === 'sm' ? 'h-6 w-6 text-[10px]' : tam === 'lg' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs'
  return <span title={nombre} className={`inline-grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-white ${t} ${tono}`}>{iniciales}</span>
}

export function Titulo({ children, sub, accion }: { children: ReactNode; sub?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-campo-900 sm:text-3xl">{children}</h1>
        {sub && <p className="mt-1 text-sm text-neutral-500">{sub}</p>}
      </div>
      {accion}
    </div>
  )
}

export function Vacio({ icono: Icono, children }: { icono?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-campo-100 bg-white/50 p-8 text-center text-neutral-500">
      {Icono && <Icono className="h-8 w-8 text-campo-300" />}
      {children}
    </div>
  )
}

export function Kpi({ icono: Icono, valor, etiqueta, tono = 'campo' }: { icono: LucideIcon; valor: ReactNode; etiqueta: string; tono?: 'campo' | 'sol' | 'ambar' | 'azul' }) {
  const t = { campo: 'bg-campo-50 text-campo-700', sol: 'bg-sol-100 text-sol-600', ambar: 'bg-amber-50 text-amber-700', azul: 'bg-sky-50 text-sky-700' }[tono]
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-suave ring-1 ring-campo-100/80">
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${t}`}><Icono className="h-5 w-5" /></span>
      <div>
        <div className="text-2xl font-extrabold leading-none text-campo-900">{valor}</div>
        <div className="mt-1 text-xs font-medium text-neutral-500">{etiqueta}</div>
      </div>
    </div>
  )
}

export function fechaCorta(dia: string) {
  return new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function horaCorta(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function hoy() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
