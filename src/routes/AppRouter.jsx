import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Contratos from "../pages/Contratos";
import CargarContrato from "../pages/CargarContrato";
import DetalleContrato from "../pages/DetalleContrato";
import EditarContrato from "../pages/EditarContrato";
import Dashboard from "../pages/Dashboard";
import Pendientes from "../pages/Pendientes";
import Indices from "../pages/Indices";
import VariacionContrato from "../pages/VariacionContrato";
import Finanzas from "../pages/Finanzas";
import Propietarios from "../pages/Propietarios";
import PropietarioDetalle from "../pages/PropietarioDetalle";
import Login from "../pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../components/Layout";
import Inquilinos from "../pages/Inquilinos";
import InquilinoDetalle from "../pages/InquilinoDetalle";
import PortalInquilino from "../pages/PortalInquilino";
import PortalMes from "../pages/PortalMes";
import PortalAdmin from "../pages/PortalAdmin";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas — sin Layout ni auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/inquilino/:token" element={<PortalInquilino />} />
        <Route path="/inquilino/:token/:mes/:anio" element={<PortalMes />} />

        {/* Rutas protegidas con Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
              <Route path="/contratos" element={<ProtectedRoute element={<Contratos />} />} />
              <Route path="/cargar-contrato" element={<ProtectedRoute element={<CargarContrato />} />} />
              <Route path="/editar-contrato/:id" element={<ProtectedRoute element={<EditarContrato />} />} />
              <Route path="/detalle/:id" element={<ProtectedRoute element={<DetalleContrato />} />} />
              <Route path="/pendientes" element={<ProtectedRoute element={<Pendientes />} />} />
              <Route path="/indices" element={<ProtectedRoute element={<Indices />} />} />
              <Route path="/contratos/:id/variacion" element={<ProtectedRoute element={<VariacionContrato />} />} />
              <Route path="/finanzas" element={<ProtectedRoute element={<Finanzas />} />} />
              <Route path="/propietarios" element={<ProtectedRoute element={<Propietarios />} />} />
              <Route path="/propietarios/:nombre" element={<ProtectedRoute element={<PropietarioDetalle />} />} />
              <Route path="/inquilinos" element={<ProtectedRoute element={<Inquilinos />} />} />
              <Route path="/inquilinos/:nombre" element={<ProtectedRoute element={<InquilinoDetalle />} />} />
              <Route path="/portal-inquilinos" element={<ProtectedRoute element={<PortalAdmin />} />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}