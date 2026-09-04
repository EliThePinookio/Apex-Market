export const OPENROUTER_KEY_STORAGE = "beannel_openrouter_key";
export const PAYSTACK_SECRET_STORAGE = "beannel_paystack_secret";

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

export function readPaystackSecret(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(PAYSTACK_SECRET_STORAGE) || "").trim();
  } catch {
    return "";
  }
}

export function writePaystackSecret(value: string): void {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (!trimmed) localStorage.removeItem(PAYSTACK_SECRET_STORAGE);
  else localStorage.setItem(PAYSTACK_SECRET_STORAGE, trimmed);
}
