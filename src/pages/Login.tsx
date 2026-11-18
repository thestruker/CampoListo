import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, FileCheck2, PenLine, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '../components/Layout'
import { Avatar, Boton, Campo, entrada } from '../components/ui'
import { db } from '../lib/db'
import { esDemo, useSesion } from '../lib/sesion'

const ROL: Record<string, string> = { administrador: 'Administrador', encargado: 'Encargado', tecnico: 'Técnico en campo' }

// CU-01 Iniciar sesión.
export function Login() {
  const { entrar, entrarDemo } = useSesion()
  const usuarios = useLiveQuery(() => db.usuarios.toArray(), [], [])
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  return (
    <div className="min-h-full bg-gradient-to-br from-campo-900 via-campo-700 to-campo-600 lg:grid lg:grid-cols-2">
      <div className="relative flex flex-col justify-center overflow-hidden px-6 pt-12 pb-8 text-white lg:px-16">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sol-400/20 blur-3xl" />
        <Logo className="h-14 w-14" />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">CampoListo</h1>
        <p className="mt-3 max-w-md text-lg text-campo-100">Cada servicio, registrado y firmado. <span className="text-sol-400">Aunque no haya señal.</span></p>
        <ul className="mt-8 hidden space-y-3 text-campo-100 lg:block">
          {[
            [WifiOff, 'Funciona sin internet y sube todo solo al volver la señal'],
            [PenLine, 'Evidencia, piezas y firma del cliente en cada servicio'],
            [FileCheck2, 'Hoja de servicio en PDF y horas por técnico'],
          ].map(([I, t]) => {
            const Icono = I as typeof WifiOff
            return (
              <li key={t as string} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Icono className="h-4 w-4" /></span>
                {t as string}
              </li>
            )
          })}
        </ul>
      </div>
      <div className="flex items-start justify-center px-4 pb-12 lg:items-center lg:px-10">
        <div className="aparecer w-full max-w-md rounded-[2rem] bg-white p-6 shadow-alta sm:p-8">
          {esDemo ? (
            <>
              <h2 className="text-xl font-extrabold text-campo-900">Entra a la demo</h2>
              <p className="mb-4 text-sm text-neutral-500">Elige con qué usuario probar la app.</p>
              <div className="space-y-2">
                {usuarios.map((u) => (
                  <button key={u.id} onClick={() => entrarDemo(u.id)}
                    className="group flex w-full items-center gap-3 rounded-2xl bg-campo-50/70 px-3 py-3 text-left ring-1 ring-campo-100 transition hover:bg-white hover:ring-campo-300 active:scale-[0.99]">
                    <Avatar nombre={u.nombre} tam="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-campo-900">{u.nombre}</span>
                      <span className="text-xs text-neutral-500">{ROL[u.rol]}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-campo-300 transition group-hover:translate-x-0.5 group-hover:text-campo-700" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault()
              setCargando(true)
              setError(await entrar(correo.trim(), contrasena))
              setCargando(false)
            }}>
              <h2 className="text-xl font-extrabold text-campo-900">Inicia sesión</h2>
              <Campo etiqueta="Correo"><input className={entrada} type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></Campo>
              <Campo etiqueta="Contraseña"><input className={entrada} type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} /></Campo>
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <Boton className="w-full" grande disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</Boton>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
