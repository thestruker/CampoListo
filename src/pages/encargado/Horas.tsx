import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CalendarClock, Download } from 'lucide-react'
import { Avatar, Boton, fechaCorta, Tarjeta, Titulo, Vacio } from '../../components/ui'
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
  const maximo = Math.max(1, ...filas.map((f) => f.minutos))

  function exportar() {
    const csv = aCsv([
      [vista === 'dia' ? 'Día' : 'Semana (lunes)', 'Técnico', 'Servicios', 'Minutos', 'Horas'],
      ...filas.map((f) => [f.dia, nombre(f.tecnico_id), f.servicios, Math.round(f.minutos), (f.minutos / 60).toFixed(2)]),
    ])
    descargar(`horas-por-${vista}.csv`, csv)
  }

  return (
    <div>
      <Titulo sub="Calculadas con las llegadas y salidas de cada orden. Listas para el registro de jornada de la reforma laboral." accion={<Boton icono={Download} onClick={exportar} disabled={!filas.length}>Exportar a Excel (CSV)</Boton>}>Horas por técnico</Titulo>
      <div className="mb-4 inline-flex rounded-2xl bg-white p-1 shadow-suave ring-1 ring-campo-100">
        {(['semana', 'dia'] as const).map((v) => (
          <button key={v} onClick={() => setVista(v)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${vista === v ? 'bg-campo-700 text-white' : 'text-neutral-500'}`}>{v === 'semana' ? 'Por semana' : 'Por día'}</button>
        ))}
      </div>
      {!filas.length ? <Vacio icono={CalendarClock}>Todavía no hay llegadas y salidas registradas.</Vacio> : (
        <Tarjeta>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-neutral-500"><th className="py-1">{vista === 'dia' ? 'Día' : 'Semana del'}</th><th>Técnico</th><th className="text-right">Servicios</th><th className="text-right">Horas</th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.dia + f.tecnico_id} className="border-t border-campo-100">
                  <td className="py-3">{fechaCorta(f.dia)}</td>
                  <td><span className="flex items-center gap-2"><Avatar nombre={nombre(f.tecnico_id)} tam="sm" />{nombre(f.tecnico_id)}</span></td>
                  <td className="text-right">{f.servicios}</td>
                  <td className="w-48 text-right">
                    <div className="font-bold text-campo-900">{formatoHoras(f.minutos)}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-campo-50"><div className="ml-auto h-1.5 rounded-full bg-gradient-to-r from-campo-500 to-sol-400" style={{ width: `${Math.min(100, (f.minutos / maximo) * 100)}%` }} /></div>
                  </td>
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
