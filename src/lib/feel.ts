/** Light Telegram-like haptic ticks. No-ops where the browser won't vibrate. */

type Tick = "light" | "medium" | "success";

export function tick(kind: Tick = "light") {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof navigator.vibrate !== "function") return;
    if (kind === "light") navigator.vibrate(10);
    else if (kind === "medium") navigator.vibrate(16);
    else navigator.vibrate([10, 24, 14]);
  } catch {
    /* ignore */
  }
}

const PRESSABLE =
  "button, a, [role='button'], [role='tab'], .mall-card, .dept-tile, .tag-chip, .shop-line, .shop-dock a, .office-dock a, .office-dock > button, .office-nav-item, .office-icon-btn, .shop-icon-btn, .office-chat-bubble, .office-chat-suggest button, .mall-add, .mall-heart, .switch";

export function bindFeel(root: HTMLElement | Document = document) {
  let last = 0;
  const onDown = (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const hit = t.closest(PRESSABLE);
    if (!hit) return;
    if (hit instanceof HTMLElement && hit.closest("[disabled], [aria-disabled='true']")) return;
    const now = performance.now();
    if (now - last < 40) return;
    last = now;
    tick("light");
  };
  root.addEventListener("pointerdown", onDown, { passive: true });
  return () => root.removeEventListener("pointerdown", onDown);
}
