import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import SplashScreen from "./components/SplashScreen/SplashScreen";

const SPLASH_MS = 3400;

function BootGate() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!booted) {
    return <SplashScreen onFinish={() => setBooted(true)} />;
  }

  if (isAuthenticated && location.pathname === "/") {
    const destino = user?.rol === "vendedor" ? "/ventas" : "/dashboard";
    return <Navigate to={destino} replace />;
  }

  return <AppRoutes />;
}

function App() {
  return (
    <AuthProvider>
      <BootGate />
    </AuthProvider>
  );
}

export default App;