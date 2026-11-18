import { useState } from 'react'
import { Boton, Campo, entrada, Tarjeta, Titulo } from '../../components/ui'
import { guardarEmpresa } from '../../lib/acciones'
import { blobADataUrl, comprimirFoto } from '../../lib/imagen'
import { useSesion } from '../../lib/sesion'

// Datos de la empresa para la hoja de servicio membretada (tarea 7.6).
export function Empresa() {
  const { sesion, refrescar } = useSesion()
  const [e, setE] = useState(sesion!.empresa)
  const [ok, setOk] = useState(false)
  const set = (k: keyof typeof e) => (ev: React.ChangeEvent<HTMLInputElement>) => setE({ ...e, [k]: ev.target.value })
  return (
    <div className="max-w-xl">
      <Titulo>Datos de la empresa</Titulo>
      <p className="mb-3 text-sm text-neutral-600">Aparecen en el membrete de cada hoja de servicio en PDF.</p>
      <Tarjeta>
        <form className="space-y-3" onSubmit={async (ev) => { ev.preventDefault(); await guardarEmpresa(e); await refrescar(); setOk(true) }}>
          <div className="flex items-center gap-4">
            {e.logo_data_url ? <img src={e.logo_data_url} alt="Logo" className="h-20 w-20 rounded-xl border border-campo-100 object-contain" /> : <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-campo-200 text-xs text-neutral-400">Sin logo</div>}
            <label className="cursor-pointer rounded-xl border border-campo-200 px-4 py-2 text-sm font-semibold">
              Subir logo
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={async (ev) => {
                const f = ev.target.files?.[0]
                if (f) setE({ ...e, logo_data_url: await blobADataUrl(await comprimirFoto(f, 400, 0.9)) })
              }} />
            </label>
          </div>
          <Campo etiqueta="Nombre comercial"><input required className={entrada} value={e.nombre} onChange={set('nombre')} /></Campo>
          <Campo etiqueta="Razón social"><input className={entrada} value={e.razon_social} onChange={set('razon_social')} /></Campo>
          <Campo etiqueta="Dirección"><input className={entrada} value={e.direccion} onChange={set('direccion')} /></Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Teléfono"><input className={entrada} value={e.telefono} onChange={set('telefono')} /></Campo>
            <Campo etiqueta="Correo"><input type="email" className={entrada} value={e.correo} onChange={set('correo')} /></Campo>
          </div>
          <div className="flex items-center gap-3"><Boton>Guardar</Boton>{ok && <span className="text-sm text-campo-700">Guardado ✓</span>}</div>
        </form>
      </Tarjeta>
    </div>
  )
}
