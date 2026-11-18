// CU-02: el administrador invita a un usuario. Se crea en Auth (le llega un correo para poner su contraseña)
// y se da de alta en la tabla usuarios con su empresa y rol.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { admin } from '../_shared/push.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const jwt = req.headers.get('Authorization') ?? ''
  const comoUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: jwt } } })
  const { data: yo } = await comoUsuario.auth.getUser()
  if (!yo.user) return new Response('no autorizado', { status: 401, headers: cors })
  const { data: perfil } = await admin.from('usuarios').select('empresa_id, rol').eq('id', yo.user.id).single()
  if (perfil?.rol !== 'administrador') return new Response('solo el administrador', { status: 403, headers: cors })

  const { nombre, correo, telefono, rol } = await req.json()
  const { data: invitado, error } = await admin.auth.admin.inviteUserByEmail(correo, { data: { nombre } })
  if (error || !invitado.user) return new Response(error?.message ?? 'error', { status: 400, headers: cors })
  const usuario = { id: invitado.user.id, empresa_id: perfil.empresa_id, nombre, correo, telefono: telefono ?? '', rol, activo: true }
  const { error: e2 } = await admin.from('usuarios').upsert(usuario)
  if (e2) return new Response(e2.message, { status: 400, headers: cors })
  return Response.json({ usuario }, { headers: cors })
})
