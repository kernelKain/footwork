import { useEffect, useState } from "react";
import { IconButton } from "./IconButton";

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

function paintedTheme(): ThemeName {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "dark";
}

function paintThemeColor(theme: ThemeName) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? LIGHT : DARK);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(paintedTheme);

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
  const icon = theme === "dark" ? "sun" : "moon";

  return (
    <IconButton label={label} onClick={choose}>
      {icon === "sun" ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      data-icon="sun"
    >
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      data-icon="moon"
    >
      <path d="M15.5 3.2a8.2 8.2 0 1 0 5.3 12.4A6.6 6.6 0 0 1 15.5 3.2Z" fill="currentColor" />
    </svg>
  );
}
