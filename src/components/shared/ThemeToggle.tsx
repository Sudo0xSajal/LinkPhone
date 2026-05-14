"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className="nav-item w-full"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {isDark
        ? <Sun  className="h-4 w-4 text-yellow-400 flex-shrink-0" />
        : <Moon className="h-4 w-4 text-blue-500  flex-shrink-0" />}
      {showLabel && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
    </button>
  );
}