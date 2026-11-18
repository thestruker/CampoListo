import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, getMeta, setMeta } from './db'
import { MODO_DEMO, supabase } from './supabase'
import { iniciarSincronizacion, sincronizar } from './sync'
import type { Empresa, Usuario } from './types'

// CU-01 Iniciar sesión. La sesión se guarda en el celular para seguir trabajando sin conexión.

interface Sesion {
  usuario: Usuario
  empresa: Empresa
}

interface Ctx {
  sesion: Sesion | null
  cargando: boolean
  entrarDemo: (usuarioId: string) => Promise<void>
  entrar: (correo: string, contrasena: string) => Promise<string | null>
  salir: () => Promise<void>
  refrescar: () => Promise<void>
}

const SesionCtx = createContext<Ctx | null>(null)

export function useSesion() {
  const c = useContext(SesionCtx)
  if (!c) throw new Error('useSesion fuera de SesionProvider')
  return c
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(true)

  async function cargar(usuarioId: string) {
    const usuario = await db.usuarios.get(usuarioId)
    const empresa = usuario ? await db.empresas.get(usuario.empresa_id) : undefined
    if (usuario && empresa && usuario.activo) {
      setSesion({ usuario, empresa })
      return true
    }
    return false
  }

  useEffect(() => {
    ;(async () => {
      const id = await getMeta<string>('usuario_actual')
      if (id) await cargar(id)
      setCargando(false)
    })()
  }, [])

  useEffect(() => {
    if (!sesion) return
    return iniciarSincronizacion(sesion.empresa.id)
  }, [sesion?.empresa.id])

  async function entrarDemo(usuarioId: string) {
    await setMeta('usuario_actual', usuarioId)
    await cargar(usuarioId)
  }

  async function entrar(correo: string, contrasena: string): Promise<string | null> {
    if (!supabase) return 'La app está en modo demo.'
    const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
    if (error || !data.user) return 'Correo o contraseña incorrectos.'
    const { data: perfil, error: e2 } = await supabase.from('usuarios').select('*').eq('id', data.user.id).single()
    if (e2 || !perfil) return 'Tu usuario no está dado de alta en ninguna empresa.'
    if (!perfil.activo) return 'Tu usuario está desactivado.'
    const { data: empresa } = await supabase.from('empresas').select('*').eq('id', perfil.empresa_id).single()
    if (empresa) await db.empresas.put(empresa)
    await db.usuarios.put(perfil)
    await setMeta('usuario_actual', perfil.id)
    await sincronizar(perfil.empresa_id)
    await cargar(perfil.id)
    return null
  }

  async function salir() {
    if (supabase) await supabase.auth.signOut()
    await setMeta('usuario_actual', null)
    setSesion(null)
  }

  async function refrescar() {
    if (sesion) await cargar(sesion.usuario.id)
  }

  return (
    <SesionCtx.Provider value={{ sesion, cargando, entrarDemo, entrar, salir, refrescar }}>{children}</SesionCtx.Provider>
  )
}

export const esDemo = MODO_DEMO
