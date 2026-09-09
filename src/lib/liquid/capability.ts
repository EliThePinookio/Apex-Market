export type GlassTier = "high" | "medium" | "low";

let cached: GlassTier | null = null;

export function glassTier(): GlassTier {
  if (cached) return cached;
  if (typeof window === "undefined") return "medium";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsBlur =
    (typeof CSS !== "undefined" &&
      (CSS.supports("backdrop-filter", "blur(8px)") || CSS.supports("-webkit-backdrop-filter", "blur(8px)"))) ||
    false;
  if (reduce || !supportsBlur) {
    cached = "low";
    return cached;
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) {
    cached = "medium";
    return cached;
  }
  const ram = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  cached = ram <= 2 || cores <= 2 ? "medium" : "high";
  return cached;
}

export function resetGlassTier() {
  cached = null;
}
