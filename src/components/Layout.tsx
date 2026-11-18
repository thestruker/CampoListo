import { NavLink, Outlet } from 'react-router-dom'
import { esDemo, useSesion } from '../lib/sesion'
import { reiniciarDemo } from '../lib/demo'
import { EstadoSync } from './EstadoSync'
import { AvisoInstalar } from './AvisoInstalar'

export function Layout() {
  const { sesion, salir } = useSesion()
  if (!sesion) return null
  const rol = sesion.usuario.rol
  const links =
    rol === 'tecnico'
      ? [{ a: '/', t: 'Mis órdenes' }]
      : [
          { a: '/', t: 'Tablero' },
          { a: '/ordenes/nueva', t: 'Nueva orden' },
          { a: '/clientes', t: 'Clientes' },
          ...(rol === 'administrador' ? [{ a: '/horas', t: 'Horas' }, { a: '/usuarios', t: 'Usuarios' }, { a: '/empresa', t: 'Empresa' }] : [{ a: '/horas', t: 'Horas' }]),
        ]
  return (
    <div className="min-h-full pb-16">
      <header className="sticky top-0 z-20 bg-campo-700 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <div className="font-bold">CampoListo</div>
              <div className="text-xs text-campo-100">{sesion.usuario.nombre}</div>
            </div>
          </div>
          <EstadoSync />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {links.map((l) => (
            <NavLink
              key={l.a}
              to={l.a}
              end
              className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-white text-campo-900' : 'text-campo-50 hover:bg-white/10'}`}
            >
              {l.t}
            </NavLink>
          ))}
          <button onClick={salir} className="ml-auto whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-campo-100 hover:bg-white/10">
            Salir
          </button>
        </nav>
      </header>
      {esDemo && (
        <div className="bg-sol-400/30 px-4 py-1.5 text-center text-xs text-campo-900">
          Modo demo: los datos son de ejemplo y se guardan solo en este dispositivo.{' '}
          <button className="underline" onClick={() => confirm('¿Borrar todo y volver a los datos de ejemplo?') && reiniciarDemo()}>
            Reiniciar demo
          </button>
        </div>
      )}
      <AvisoInstalar />
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}
