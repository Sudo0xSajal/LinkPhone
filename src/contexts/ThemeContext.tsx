// "use client";

// import { createContext, useContext, useEffect, useState, useCallback } from "react";

// type Theme = "dark" | "light";

// interface ThemeContextValue {
//   theme: Theme;
//   toggleTheme: () => void;
//   isDark: boolean;
// }

// const ThemeContext = createContext<ThemeContextValue>({
//   theme: "dark",
//   toggleTheme: () => {},
//   isDark: true,
// });

// function applyTheme(t: Theme) {
//   if (typeof document === "undefined") return;
//   if (t === "dark") {
//     document.documentElement.classList.add("dark");
//   } else {
//     document.documentElement.classList.remove("dark");
//   }
// }

// function getInitialTheme(): Theme {
//   if (typeof window === "undefined") return "dark";
//   const stored = localStorage.getItem("lp-theme") as Theme | null;
//   return stored ?? "dark";
// }

// export function ThemeProvider({ children }: { children: React.ReactNode }) {
//   const [theme, setTheme] = useState<Theme>("dark");
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     const initialTheme = getInitialTheme();
//     setTheme(initialTheme);
//     applyTheme(initialTheme);
//     setMounted(true);
//   }, []);

//   const toggleTheme = useCallback(() => {
//     setTheme((prev) => {
//       const next: Theme = prev === "dark" ? "light" : "dark";
//       localStorage.setItem("lp-theme", next);
//       applyTheme(next);
//       return next;
//     });
//   }, []);

//   return (
//     <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// }

// export const useTheme = () => useContext(ThemeContext);


"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  if (t === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("lp-theme") as Theme | null;
  return stored ?? "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // FIX: `mounted` state was tracked but never used to gate rendering — it was
  // dead code. The inline script in layout.tsx already prevents the flash of
  // wrong theme before hydration. Removed to keep the component clean.
  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("lp-theme", next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);