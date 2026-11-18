import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Boton, fechaCorta, Tarjeta, Titulo, Vacio } from '../../components/ui'
import { aCsv, descargar } from '../../lib/csv'
import { db } from '../../lib/db'
import { formatoHoras, horasPorDia, horasPorSemana } from '../../lib/horas'
import { useSesion } from '../../lib/sesion'

// CU-15 Horas trabajadas por técnico (por día y por semana) y exportación a CSV / Excel.
export function Horas() {
  const { sesion } = useSesion()
  const [vista, setVista] = useState<'dia' | 'semana'>('semana')
  const usuarios = useLiveQuery(() => db.usuarios.where('empresa_id').equals(sesion!.empresa.id).toArray(), [sesion!.empresa.id], [])
  const registros = useLiveQuery(() => db.registros_tiempo.filter((r) => r.empresa_id === sesion!.empresa.id).toArray(), [sesion!.empresa.id], [])
  const filas = vista === 'dia' ? horasPorDia(registros) : horasPorSemana(registros)
  const nombre = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? id
  const total = filas.reduce((s, f) => s + f.minutos, 0)

  function exportar() {
    const csv = aCsv([
      [vista === 'dia' ? 'Día' : 'Semana (lunes)', 'Técnico', 'Servicios', 'Minutos', 'Horas'],
      ...filas.map((f) => [f.dia, nombre(f.tecnico_id), f.servicios, Math.round(f.minutos), (f.minutos / 60).toFixed(2)]),
    ])
    descargar(`horas-por-${vista}.csv`, csv)
  }

  return (
    <div>
      <Titulo accion={<Boton onClick={exportar} disabled={!filas.length}>⬇ Exportar a Excel (CSV)</Boton>}>Horas por técnico</Titulo>
      <p className="mb-3 text-sm text-neutral-600">Calculadas con las llegadas y salidas registradas en cada orden. Sirven para el registro de jornada que pide la reforma laboral.</p>
      <div className="mb-3 flex gap-2">
        <Boton variante={vista === 'semana' ? 'primario' : 'secundario'} onClick={() => setVista('semana')}>Por semana</Boton>
        <Boton variante={vista === 'dia' ? 'primario' : 'secundario'} onClick={() => setVista('dia')}>Por día</Boton>
      </div>
      {!filas.length ? <Vacio>Todavía no hay llegadas y salidas registradas.</Vacio> : (
        <Tarjeta>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="py-1">{vista === 'dia' ? 'Día' : 'Semana del'}</th><th>Técnico</th><th className="text-right">Servicios</th><th className="text-right">Horas</th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.dia + f.tecnico_id} className="border-t border-campo-100">
                  <td className="py-2">{fechaCorta(f.dia)}</td><td>{nombre(f.tecnico_id)}</td>
                  <td className="text-right">{f.servicios}</td><td className="text-right font-semibold">{formatoHoras(f.minutos)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-campo-200 font-bold"><td className="py-2" colSpan={3}>Total</td><td className="text-right">{formatoHoras(total)}</td></tr>
            </tbody>
          </table>
        </Tarjeta>
      )}
    </div>
  )
}
