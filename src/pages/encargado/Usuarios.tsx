import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Avatar, Boton, Campo, entrada, Tarjeta, Titulo } from '../../components/ui'
import { actualizarUsuario, crearUsuario } from '../../lib/acciones'
import { db } from '../../lib/db'
import { esDemo, useSesion } from '../../lib/sesion'
import type { Rol } from '../../lib/types'

const ROLES: { v: Rol; t: string }[] = [
  { v: 'tecnico', t: 'Técnico' },
  { v: 'encargado', t: 'Encargado' },
  { v: 'administrador', t: 'Administrador' },
]

// CU-02 Gestionar usuarios y roles (solo administrador).
export function Usuarios() {
  const { sesion } = useSesion()
  const usuarios = useLiveQuery(() => db.usuarios.where('empresa_id').equals(sesion!.empresa.id).sortBy('nombre'), [sesion!.empresa.id], [])
  const [f, setF] = useState({ nombre: '', correo: '', telefono: '', rol: 'tecnico' as Rol })
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="space-y-4">
      <Titulo>Usuarios</Titulo>
      <Tarjeta>
        <h2 className="mb-3 font-bold">Invitar usuario</h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const err = await crearUsuario(sesion!.empresa.id, f)
            setMsg(err ?? (esDemo ? 'Usuario agregado.' : `Invitación enviada a ${f.correo}.`))
            if (!err) setF({ nombre: '', correo: '', telefono: '', rol: 'tecnico' })
          }}
        >
          <Campo etiqueta="Nombre"><input required className={entrada} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Correo"><input required type="email" className={entrada} value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} /></Campo>
          <Campo etiqueta="Teléfono"><input className={entrada} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
          <Campo etiqueta="Rol">
            <select className={entrada} value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })}>{ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}</select>
          </Campo>
          <div className="sm:col-span-2 flex items-center gap-3"><Boton>Agregar</Boton>{msg && <span className="text-sm text-campo-700">{msg}</span>}</div>
        </form>
      </Tarjeta>
      <Tarjeta>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-neutral-500"><th className="py-1">Nombre</th><th>Rol</th><th>Activo</th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-campo-100">
                <td className="py-3"><div className="flex items-center gap-3"><Avatar nombre={u.nombre} /><div>{u.nombre}<div className="text-xs text-neutral-500">{u.correo}</div></div></div></td>
                <td>
                  <select className="rounded-xl bg-campo-50 px-2 py-1.5 ring-1 ring-campo-100" value={u.rol} disabled={u.id === sesion!.usuario.id}
                    onChange={(e) => actualizarUsuario({ ...u, rol: e.target.value as Rol })}>
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.t}</option>)}
                  </select>
                </td>
                <td>
                  <input type="checkbox" className="h-4 w-4 accent-campo-700" checked={u.activo} disabled={u.id === sesion!.usuario.id}
                    onChange={(e) => actualizarUsuario({ ...u, activo: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
    </div>
  )
}
