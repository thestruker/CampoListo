import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useSesion } from './lib/sesion'
import { Login } from './pages/Login'
import { ClienteDetalle, Clientes } from './pages/encargado/Clientes'
import { Empresa } from './pages/encargado/Empresa'
import { Horas } from './pages/encargado/Horas'
import { NuevaOrden } from './pages/encargado/NuevaOrden'
import { OrdenDetalle } from './pages/encargado/OrdenDetalle'
import { Tablero } from './pages/encargado/Tablero'
import { Usuarios } from './pages/encargado/Usuarios'
import { MisOrdenes } from './pages/tecnico/MisOrdenes'
import { OrdenTecnico } from './pages/tecnico/OrdenTecnico'

export function App() {
  const { sesion, cargando } = useSesion()
  if (cargando) return <div className="grid h-full place-items-center text-campo-700">Cargando…</div>
  if (!sesion) return <Login />
  const rol = sesion.usuario.rol
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {rol === 'tecnico' ? (
            <>
              <Route path="/" element={<MisOrdenes />} />
              <Route path="/orden/:id" element={<OrdenTecnico />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Tablero />} />
              <Route path="/ordenes/nueva" element={<NuevaOrden />} />
              <Route path="/ordenes/:id" element={<OrdenDetalle />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/clientes/:id" element={<ClienteDetalle />} />
              <Route path="/horas" element={<Horas />} />
              {rol === 'administrador' && (
                <>
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/empresa" element={<Empresa />} />
                </>
              )}
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
