import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Inventario from "../pages/Inventario/Inventario";
import Productos from "../pages/Productos/Productos";
import Categorias from "../pages/Categorias/Categorias";
import Ventas from "../pages/Ventas/Ventas";
import Compras from "../pages/Compras/Compras";
import Clientes from "../pages/Clientes/Clientes";
import Proveedores from "../pages/Proveedores/Proveedores";
import Usuarios from "../pages/Usuarios/Usuarios";
import Reportes from "../pages/Reportes/Reportes";
import Configuracion from "../pages/Configuracion/Configuracion";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
