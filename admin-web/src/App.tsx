import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginView } from "./views/LoginView";
import { DashboardView } from "./views/DashboardView";
import { VentasView } from "./views/VentasView";
import { ProductosView } from "./views/ProductosView";
import { ClientesView } from "./views/ClientesView";
import { CajaView } from "./views/CajaView";
import { ReportesView } from "./views/ReportesView";
import { ConfiguracionView } from "./views/ConfiguracionView";

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedVentaId, setSelectedVentaId] = useState<string | number | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-main)",
        }}
      >
        <div className="pulse-dot online" style={{ width: "16px", height: "16px" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleViewVenta = (id: string | number) => {
    setSelectedVentaId(id);
    setActiveTab("ventas");
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return { title: "Dashboard Administrativo", subtitle: "Métricas y resumen en vivo desde Neon Cloud" };
      case "ventas":
        return { title: "Ventas & Boletas", subtitle: "Historial completo de transacciones electrónicas" };
      case "productos":
        return { title: "Productos & Catálogo", subtitle: "Control de precios, costos, márgenes y stock" };
      case "clientes":
        return { title: "Clientes & Cuentas Corrientes", subtitle: "Gestión de fiados, límites y abonos" };
      case "caja":
        return { title: "Caja & Turnos", subtitle: "Control de aperturas, cierres y arqueos" };
      case "reportes":
        return { title: "Reportes & Analítica", subtitle: "Rendimiento comercial y rankings de productos" };
      case "configuracion":
        return { title: "Configuración & Cloud", subtitle: "Parámetros de conexión y estado de Neon" };
      default:
        return { title: "Panel Administrativo", subtitle: "" };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-main)" }}>
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <div key={refreshKey} style={{ flex: 1 }}>
          {activeTab === "dashboard" && (
            <DashboardView
              onViewVenta={handleViewVenta}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === "ventas" && (
            <VentasView
              initialVentaId={selectedVentaId}
              onClearInitialVentaId={() => setSelectedVentaId(null)}
            />
          )}
          {activeTab === "productos" && <ProductosView />}
          {activeTab === "clientes" && <ClientesView />}
          {activeTab === "caja" && <CajaView />}
          {activeTab === "reportes" && <ReportesView />}
          {activeTab === "configuracion" && <ConfiguracionView />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
