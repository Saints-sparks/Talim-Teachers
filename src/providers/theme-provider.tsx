"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
  isDark: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    primary: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    borderLight: string;
    success: string;
    warning: string;
    error: string;
  };
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
  isDark: false,
  colors: {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F6FA",
    primary: "#003366",
    text: "#030E18",
    textSecondary: "#475467",
    textTertiary: "#98A2B3",
    border: "#E4E7EC",
    borderLight: "#F0F2F5",
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#EF4444",
  },
});

const themeColors: Record<"light" | "dark", ThemeContextValue["colors"]> = {
  light: {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F6FA",
    primary: "#003366",
    text: "#030E18",
    textSecondary: "#475467",
    textTertiary: "#98A2B3",
    border: "#E4E7EC",
    borderLight: "#F0F2F5",
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  dark: {
    bg: "#020617",
    surface: "#0F172A",
    surfaceAlt: "#132238",
    primary: "#3B82F6",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textTertiary: "#64748B",
    border: "#1E293B",
    borderLight: "#162238",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#F87171",
  },
};

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): "light" | "dark" {
  const resolved = theme === "system" ? getSystemPreference() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("talim_teacher_theme") as Theme) || "system";
    setThemeState(stored);
    const resolved = applyTheme(stored);
    setResolvedTheme(resolved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = applyTheme("system");
      setResolvedTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem("talim_teacher_theme", newTheme);
    setThemeState(newTheme);
    const resolved = applyTheme(newTheme);
    setResolvedTheme(resolved);
  }, []);

  if (!mounted) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        isDark: resolvedTheme === "dark",
        colors: themeColors[resolvedTheme],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
