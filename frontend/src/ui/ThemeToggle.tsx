import { useEffect, useState } from "react";

const STORAGE_KEY = "footwork-theme";
const LIGHT = "#F4F1E8";
const DARK = "#080C18";

type ThemeName = "light" | "dark";

function systemTheme(): ThemeName {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function storedTheme(): ThemeName | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

function paintThemeColor(theme: ThemeName) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? LIGHT : DARK);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    const apply = () => {
      const next = storedTheme() ?? systemTheme();
      document.documentElement.setAttribute("data-theme", next);
      setTheme(next);
      paintThemeColor(next);
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const choose = () => {
    const next: ThemeName = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
    paintThemeColor(next);
  };

  const label = theme === "dark" ? "Light theme" : "Dark theme";

  return (
    <button type="button" className="ui-button ui-button-secondary" onClick={choose}>
      {label}
    </button>
  );
}
