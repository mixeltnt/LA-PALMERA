import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

function getStoredUser() {
  if (typeof window === "undefined") return null;
  // Limpiar cualquier residuo de localStorage para exigir contraseña siempre
  localStorage.removeItem("lapalmera-user");
  const saved = sessionStorage.getItem("lapalmera-user");
  return saved ? JSON.parse(saved) : null;
}

function getStoredToken() {
  if (typeof window === "undefined") return null;
  localStorage.removeItem("lapalmera-token");
  return sessionStorage.getItem("lapalmera-token") || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(false);

  const storeSession = useCallback((userData, tokenStr) => {
    // Usar exclusivamente sessionStorage: al cerrar la app se cierra la sesión
    sessionStorage.setItem("lapalmera-token", tokenStr);
    sessionStorage.setItem("lapalmera-user", JSON.stringify(userData));
    localStorage.removeItem("lapalmera-token");
    localStorage.removeItem("lapalmera-user");
    setUser(userData);
    setToken(tokenStr);
  }, []);

  const login = useCallback(async (usuario, password) => {
    setLoading(true);
    try {
      const data = await authService.login(usuario, password);
      if (data && data.usuario && data.token) {
        storeSession(data.usuario, data.token);
        return data;
      }
      throw new Error("No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }, [storeSession]);

  const logout = useCallback(() => {
    localStorage.removeItem("lapalmera-token");
    localStorage.removeItem("lapalmera-user");
    sessionStorage.removeItem("lapalmera-token");
    sessionStorage.removeItem("lapalmera-user");
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    if (!token) {
      logout();
    }
  }, [token, logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export default AuthContext;
