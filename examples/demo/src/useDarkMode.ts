import { useState, useEffect } from "react";
import type { Theme } from "@ohah/react-wasm-table";

export function useDarkMode(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("rp-dark") ||
        document.documentElement.classList.contains("dark")
      : false,
  );
  useEffect(() => {
    const el = document.documentElement;
    const check = () =>
      setDark(el.classList.contains("rp-dark") || el.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export const LIGHT_THEME: Partial<Theme> = {
  headerBackground: "#f9fafb",
  headerColor: "#374151",
  cellBackground: "#fff",
  cellColor: "#333",
  borderColor: "#e5e7eb",
  borderWidth: 1,
  borderStyle: "solid",
};

export const DARK_THEME: Partial<Theme> = {
  headerBackground: "#1e1e1e",
  headerColor: "#e0e0e0",
  cellBackground: "#141414",
  cellColor: "#e0e0e0",
  borderColor: "#333",
  borderWidth: 1,
  borderStyle: "solid",
  selectedBackground: "#1e3a5f",
};
