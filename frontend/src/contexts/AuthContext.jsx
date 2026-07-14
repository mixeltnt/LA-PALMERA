import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = window.localStorage.getItem("lapalmera-user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData) => {
    setUser(userData);
    window.localStorage.setItem("lapalmera-user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem("lapalmera-user");
  };

  useEffect(() => {
    if (!user) {
      window.localStorage.removeItem("lapalmera-user");
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
