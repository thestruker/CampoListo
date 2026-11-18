import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Boton, Campo, entrada, Tarjeta } from '../components/ui'
import { db } from '../lib/db'
import { esDemo, useSesion } from '../lib/sesion'

const ROL: Record<string, string> = { administrador: 'Administrador', encargado: 'Encargado', tecnico: 'Técnico' }

// CU-01 Iniciar sesión.
export function Login() {
  const { entrar, entrarDemo } = useSesion()
  const usuarios = useLiveQuery(() => db.usuarios.toArray(), [], [])
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-campo-700 px-4 py-10">
      <img src="/icon.svg" alt="" className="mb-3 h-16 w-16" />
      <h1 className="text-3xl font-bold text-white">CampoListo</h1>
      <p className="mb-6 text-center text-campo-100">Cada servicio, registrado y firmado. Aunque no haya señal.</p>
      <Tarjeta className="w-full max-w-sm">
        {esDemo ? (
          <div className="space-y-2">
            <p className="mb-2 text-sm text-neutral-600">Modo demo: elige con qué usuario entrar.</p>
            {usuarios.map((u) => (
              <button
                key={u.id}
                onClick={() => entrarDemo(u.id)}
                className="flex w-full items-center justify-between rounded-xl border border-campo-100 px-4 py-3 text-left hover:bg-campo-50"
              >
                <span className="font-medium">{u.nombre}</span>
                <span className="text-xs text-neutral-500">{ROL[u.rol]}</span>
              </button>
            ))}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setCargando(true)
              setError(await entrar(correo.trim(), contrasena))
              setCargando(false)
            }}
          >
            <Campo etiqueta="Correo">
              <input className={entrada} type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </Campo>
            <Campo etiqueta="Contraseña">
              <input className={entrada} type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
            </Campo>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Boton className="w-full" grande disabled={cargando}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </Boton>
          </form>
        )}
      </Tarjeta>
    </div>
  )
}
