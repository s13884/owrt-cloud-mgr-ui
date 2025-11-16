import React, { createContext, useContext, useState } from "react";

type Auth = {
  isLoggedIn: boolean;
  token: string | null;
  user: any | null;
  login: (token: string, user: any) => void;
  logout: () => void;
};

const AuthContext = createContext<Auth>({
  isLoggedIn: false,
  token: null,
  user: null,
  login: () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  function login(t: string, u: any) {
    setToken(t);
    setUser(u);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!token, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
