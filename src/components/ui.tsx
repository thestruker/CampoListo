import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ETIQUETA_ESTADO } from '../lib/reglas'
import type { EstadoOrden } from '../lib/types'

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma' | 'sol'

const VAR: Record<Variante, string> = {
  primario: 'bg-campo-700 text-white hover:bg-campo-900 disabled:bg-campo-200',
  secundario: 'bg-white text-campo-900 border border-campo-200 hover:bg-campo-100',
  peligro: 'bg-red-700 text-white hover:bg-red-800',
  fantasma: 'text-campo-700 hover:bg-campo-100',
  sol: 'bg-sol-400 text-campo-900 hover:bg-sol-600 hover:text-white',
}

export function Boton({ variante = 'primario', grande, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed ${grande ? 'min-h-14 px-5 text-lg' : 'min-h-10 px-4 text-sm'} ${VAR[variante]} ${className}`}
    />
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-campo-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-campo-900">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-neutral-500">{ayuda}</span>}
    </label>
  )
}

export const entrada = 'w-full rounded-xl border border-campo-200 bg-white px-3 py-2.5 outline-none focus:border-campo-500 focus:ring-2 focus:ring-campo-100'

const COLOR_ESTADO: Record<EstadoOrden, string> = {
  pendiente: 'bg-neutral-100 text-neutral-700',
  asignada: 'bg-sky-100 text-sky-800',
  en_sitio: 'bg-amber-100 text-amber-800',
  con_avance: 'bg-orange-100 text-orange-800',
  terminada: 'bg-emerald-100 text-emerald-800',
  cerrada: 'bg-campo-700 text-white',
  cancelada: 'bg-red-100 text-red-700 line-through',
}

export function Estado({ estado }: { estado: EstadoOrden }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
}

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-campo-900">{children}</h1>
      {accion}
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-campo-200 p-6 text-center text-neutral-500">{children}</p>
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
