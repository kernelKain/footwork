import { useEffect, useState } from "react";

const TITLES: Record<string, string> = {
  "/": "Footwork",
  "/studio": "Soundprint · Footwork",
  "/about": "How it works · Footwork",
  "/system": "Design system · Footwork",
};

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function settlePath(pathname: string): string {
  const path = normalizePath(pathname);
  if (path === "/about") {
    window.history.replaceState(null, "", "/#how-it-works");
    return "/";
  }
  return path;
}

export function useRoute(): {
  path: string;
  navigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
} {
  const [path, setPath] = useState(() => settlePath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setPath(settlePath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.title = TITLES[path] ?? "Footwork";
  }, [path]);

  const navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => {
    event.preventDefault();
    const next = normalizePath(new URL(event.currentTarget.href).pathname);
    if (next !== window.location.pathname) {
      window.history.pushState(null, "", next);
    }
    setPath(next);
  };

  return { path, navigate };
}
