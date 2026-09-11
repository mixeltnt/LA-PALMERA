import React, { createContext, useContext, useState, useEffect } from "react";
import { adminApi, getAuthToken, setAuthToken, getSavedUser, setSavedUser } from "../services/api";

export interface User {
  id?: number | string;
  username: string;
  nombre?: string;
  rol?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getSavedUser());
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await adminApi.getProfile();
        if (res?.usuario) {
          setUser(res.usuario);
          setSavedUser(res.usuario);
        }
      } catch {
        // Token expired or invalid
        logout();
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (u: string, p: string) => {
    const res = await adminApi.login(u, p);
    if (res.token) {
      setToken(res.token);
      setAuthToken(res.token);
      setUser(res.usuario);
      setSavedUser(res.usuario);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    setSavedUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
