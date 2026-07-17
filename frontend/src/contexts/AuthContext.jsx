import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

function getStoredUser() {
  const saved = localStorage.getItem("lapalmera-user");
  return saved ? JSON.parse(saved) : null;
}

function getStoredToken() {
  return localStorage.getItem("lapalmera-token") || sessionStorage.getItem("lapalmera-token") || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(false);

  const storeSession = useCallback((userData, tokenStr, remember) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("lapalmera-token", tokenStr);
    storage.setItem("lapalmera-user", JSON.stringify(userData));
    if (remember) {
      sessionStorage.removeItem("lapalmera-token");
      sessionStorage.removeItem("lapalmera-user");
    }
    setUser(userData);
    setToken(tokenStr);
  }, []);

  const login = useCallback(async (usuario, password, remember = false) => {
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { usuario, password });
      storeSession(data.usuario, data.token, remember);
      return data;
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
