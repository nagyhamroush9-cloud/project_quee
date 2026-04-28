import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeCtx = createContext(null);

function apply(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("hqms_theme") || "light");

  useEffect(() => {
    apply(theme);
    localStorage.setItem("hqms_theme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggle() {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
      }
    }),
    [theme]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

