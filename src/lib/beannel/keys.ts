export const OPENROUTER_KEY_STORAGE = "beannel_openrouter_key";

export function readOpenRouterKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(OPENROUTER_KEY_STORAGE) || "").trim();
  } catch {
    return "";
  }
}

export function writeOpenRouterKey(value: string): void {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (!trimmed) localStorage.removeItem(OPENROUTER_KEY_STORAGE);
  else localStorage.setItem(OPENROUTER_KEY_STORAGE, trimmed);
}
