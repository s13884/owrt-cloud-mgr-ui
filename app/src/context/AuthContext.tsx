import React, { createContext, useContext, useState, useEffect } from "react";
import { loginApi, LoginRequest } from "../api/auth";

type Auth = {
  isLoggedIn: boolean;
  user: any | null;
  token?: string | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<Auth>({
  isLoggedIn: false,
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(() => {
    try { return JSON.parse(localStorage.getItem("ow_user") || "null"); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("ow_token"));

  useEffect(() => {
    if (user) localStorage.setItem("ow_user", JSON.stringify(user));
    else localStorage.removeItem("ow_user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("ow_token", token);
    else localStorage.removeItem("ow_token");
  }, [token]);

  async function login(payload: LoginRequest) {
    // Calls backend and sets user/token based on response
    const res: any = await loginApi(payload);
    // backend may return token or set cookie — handle both
    if (res?.token) setToken(res.token);
    if (res?.user) setUser(res.user);
    // If backend returns minimal, we can set user.login as the login name
    if (!res?.user && payload.login) setUser({ login: payload.login });
  }

  function logout() {
    setUser(null);
    setToken(null);
    // optional: call backend logout endpoint if exists
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
