export function money(value: number, symbol = "$"): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function moneyCompact(value: number, symbol = "$"): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${value < 0 ? "-" : ""}${symbol}${(abs / 1_000).toFixed(1)}k`;
  return money(value, symbol);
}

export function pct(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid}`;
}

const ESCAPE_MAP: Record<string, string> = {
  "&": "&" + "amp;",
  "<": "&" + "lt;",
  ">": "&" + "gt;",
  '"': "&" + "quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] || ch);
}

export function startOfDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function periodBounds(
  preset: "today" | "week" | "month" | "all",
): { start: Date; end: Date } | null {
  const now = new Date();
  const end = new Date(now.getTime() + 1);
  if (preset === "all") return null;
  if (preset === "today") return { start: startOfDay(now), end };
  if (preset === "week") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
}
