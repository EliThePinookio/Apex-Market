const WEAK_PINS = new Set(["1234", "0000", "1111", "2222", "1212", "2580", "4321", "9999"]);

export function sanitizeText(value: string, max = 200): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\|/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 120);
}

export function passwordIssue(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  if (/^\s|\s$/.test(password)) return "Password cannot start or end with a space.";
  if (/^(password|12345678|qwerty123|beannel)$/i.test(password)) return "Choose a stronger password.";
  return null;
}

export function pinIssue(pin: string): string | null {
  if (!/^\d{4,8}$/.test(pin)) return "PIN must be 4 to 8 digits.";
  if (WEAK_PINS.has(pin)) return "That PIN is too easy. Pick another.";
  return null;
}

const buckets = new Map<string, { n: number; start: number; lockUntil: number }>();

export function rateLimit(key: string, max: number, windowMs: number, lockMs = windowMs): boolean {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now - cur.start > windowMs) {
    buckets.set(key, { n: 1, start: now, lockUntil: 0 });
    return true;
  }
  if (cur.lockUntil && now < cur.lockUntil) return false;
  cur.n += 1;
  if (cur.n > max) {
    cur.lockUntil = now + lockMs;
    return false;
  }
  return true;
}

export function rateLimitedFor(key: string): number {
  const cur = buckets.get(key);
  if (!cur?.lockUntil) return 0;
  return Math.max(0, cur.lockUntil - Date.now());
}
