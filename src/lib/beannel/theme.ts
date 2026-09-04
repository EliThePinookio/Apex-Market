const KEY = "beannel_theme";

export function readDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function applyDark(next: boolean): void {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(KEY, next ? "dark" : "light");
  } catch {
    /* ignore */
  }
}
