import { Building2, CalendarClock, ClipboardList, LayoutDashboard, LogOut, PlusCircle, Users, UserSquare2 } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { reiniciarDemo } from '../lib/demo'
import { esDemo, useSesion } from '../lib/sesion'
import { AvisoInstalar } from './AvisoInstalar'
import { EstadoSync } from './EstadoSync'
import { Avatar } from './ui'

const ROL = { administrador: 'Administrador', encargado: 'Encargado', tecnico: 'Técnico' }

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src="/icon.svg" alt="" className={`${className} rounded-xl shadow-sm`} />
}

export function Layout() {
  const { sesion, salir } = useSesion()
  if (!sesion) return null
  const rol = sesion.usuario.rol
  const links =
    rol === 'tecnico'
      ? [{ a: '/', t: 'Mis órdenes', i: ClipboardList }]
      : [
          { a: '/', t: 'Tablero', i: LayoutDashboard },
          { a: '/ordenes/nueva', t: 'Nueva orden', i: PlusCircle },
          { a: '/clientes', t: 'Clientes', i: UserSquare2 },
          { a: '/horas', t: 'Horas', i: CalendarClock },
          ...(rol === 'administrador' ? [{ a: '/usuarios', t: 'Usuarios', i: Users }, { a: '/empresa', t: 'Empresa', i: Building2 }] : []),
        ]
  return (
    <div className={`min-h-full ${rol === 'tecnico' ? 'pb-8' : 'pb-24 sm:pb-10'}`}>
      <header className="sticky top-0 z-30 bg-gradient-to-br from-campo-800 via-campo-700 to-campo-600 text-white shadow-alta">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="min-w-0 leading-tight">
              <div className="font-extrabold tracking-tight">CampoListo</div>
              <div className="truncate text-xs text-campo-100/80">{sesion.empresa.nombre}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EstadoSync />
            <div className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 sm:flex">
              <Avatar nombre={sesion.usuario.nombre} tam="sm" />
              <span className="text-xs font-medium">{ROL[rol]}</span>
            </div>
            <button onClick={salir} title="Salir" aria-label="Salir" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {rol !== 'tecnico' && (
          <nav className="mx-auto hidden max-w-6xl gap-1 px-3 pb-3 sm:flex">
            {links.map((l) => (
              <NavLink key={l.a} to={l.a} end
                className={({ isActive }) => `flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white text-campo-900 shadow-sm' : 'text-campo-50/90 hover:bg-white/10'}`}>
                <l.i className="h-4 w-4" />{l.t}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      {esDemo && (
        <div className="border-b border-sol-400/30 bg-sol-100/70 px-4 py-1.5 text-center text-xs text-campo-900">
          <b>Modo demo</b> · datos de ejemplo guardados solo en este dispositivo ·{' '}
          <button className="font-semibold underline" onClick={() => confirm('¿Borrar todo y volver a los datos de ejemplo?') && reiniciarDemo()}>Reiniciar demo</button>
        </div>
      )}
      <AvisoInstalar />
      <main className="aparecer mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      {rol !== 'tecnico' && (
        <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-3xl bg-campo-900/95 p-1.5 shadow-alta backdrop-blur sm:hidden" aria-label="Navegación">
          {links.map((l) => (
            <NavLink key={l.a} to={l.a} end aria-label={l.t}
              className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold transition ${isActive ? 'bg-white text-campo-900' : 'text-campo-100/80'}`}>
              <l.i className="h-5 w-5" />{l.t.replace('Nueva orden', 'Nueva')}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
