/** Soft/light haptic ticks. No-ops where the browser won't vibrate. */

type Tick = "soft" | "light" | "medium" | "success";

export function tick(kind: Tick = "light") {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof navigator.vibrate !== "function") return;
    if (kind === "soft") navigator.vibrate(6);
    else if (kind === "light") navigator.vibrate(10);
    else if (kind === "medium") navigator.vibrate([8, 18, 10]);
    else navigator.vibrate([10, 22, 8, 18, 12]);
  } catch {
    /* ignore */
  }
}

const PRESSABLE =
  "button, a, [role='button'], [role='tab'], .mall-card, .dept-tile, .tag-chip, .shop-line, .shop-dock a, .office-dock a, .office-dock > button, .office-nav-item, .office-icon-btn, .shop-icon-btn, .office-chat-bubble, .office-chat-suggest button, .mall-add, .mall-heart, .switch";

export function bindFeel(root: HTMLElement | Document = document) {
  let last = 0;
  const gated = (kind: Tick) => {
    const now = performance.now();
    if (now - last < 40) return;
    last = now;
    tick(kind);
  };
  const onDown = (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".shop-search")) {
      gated("light");
      return;
    }
    const dock = t.closest(".shop-dock a, .office-dock a, .office-dock > button");
    if (dock) {
      gated("soft");
      return;
    }
    const hit = t.closest(PRESSABLE);
    if (!hit) return;
    if (hit instanceof HTMLElement && hit.closest("[disabled], [aria-disabled='true']")) return;
    if (hit.closest(".office-chat-composer")) {
      gated("light");
      return;
    }
    if (hit instanceof HTMLButtonElement && hit.type === "submit") {
      gated("medium");
      return;
    }
    gated("light");
  };
  const onFocus = (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".shop-search")) gated("light");
  };
  root.addEventListener("pointerdown", onDown, { passive: true });
  root.addEventListener("focusin", onFocus);
  return () => {
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("focusin", onFocus);
  };
}
