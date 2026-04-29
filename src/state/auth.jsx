import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

function load() {
  const remember = localStorage.getItem("hqms_remember") === "1";
  const token = sessionStorage.getItem("hqms_token") || (remember ? localStorage.getItem("hqms_token") : null);
  const userRaw = sessionStorage.getItem("hqms_user") || (remember ? localStorage.getItem("hqms_user") : null);
  const user = userRaw ? JSON.parse(userRaw) : null;
  return { token, user };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => load().token);
  const [user, setUser] = useState(() => load().user);

  const updateUser = (newUser) => {
    setUser(newUser);
    const remember = localStorage.getItem("hqms_remember") === "1";
    if (remember) {
      localStorage.setItem("hqms_user", JSON.stringify(newUser));
    }
    sessionStorage.setItem("hqms_user", JSON.stringify(newUser));
  };

  useEffect(() => {
    const handler = () => {
      const v = load();
      setToken(v.token);
      setUser(v.user);
    };
    window.addEventListener("hqms:auth:changed", handler);
    return () => window.removeEventListener("hqms:auth:changed", handler);
  }, []);

  useEffect(() => {
    if (!token) return;
    // If token exists but user is missing/stale, refresh from server.
    api
      .get("/auth/me")
      .then((r) => {
        if (!r.data?.user) return;
        sessionStorage.setItem("hqms_user", JSON.stringify(r.data.user));
        setUser(r.data.user);
      })
      .catch(() => { });
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      setUser: updateUser,
      isAuthed: Boolean(token && user),
      async login(email, password, { remember = false } = {}) {
        const { data } = await api.post("/auth/login", { email, password });
        sessionStorage.setItem("hqms_token", data.token);
        sessionStorage.setItem("hqms_user", JSON.stringify(data.user));
        if (remember) {
          localStorage.setItem("hqms_remember", "1");
          localStorage.setItem("hqms_token", data.token);
          localStorage.setItem("hqms_user", JSON.stringify(data.user));
        } else {
          localStorage.removeItem("hqms_remember");
          localStorage.removeItem("hqms_token");
          localStorage.removeItem("hqms_user");
        }
        window.dispatchEvent(new Event("hqms:auth:changed"));
        return data;
      },
      async register(payload) {
        const { data } = await api.post("/auth/register", payload);
        sessionStorage.setItem("hqms_token", data.token);
        sessionStorage.setItem("hqms_user", JSON.stringify(data.user));
        localStorage.removeItem("hqms_token");
        localStorage.removeItem("hqms_user");
        window.dispatchEvent(new Event("hqms:auth:changed"));
        return data;
      },
      logout() {
        sessionStorage.removeItem("hqms_token");
        sessionStorage.removeItem("hqms_user");
        localStorage.removeItem("hqms_remember");
        localStorage.removeItem("hqms_token");
        localStorage.removeItem("hqms_user");
        window.dispatchEvent(new Event("hqms:auth:changed"));
      }
    }),
    [token, user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    console.error("useAuth must be used within AuthProvider");
    return {
      token: null,
      user: null,
      setUser: () => { },
      isAuthed: false,
      login: async () => { },
      register: async () => { },
      logout: () => { }
    };
  }
  return ctx;
}

