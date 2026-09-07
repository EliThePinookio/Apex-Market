/** Horizontal layer turns. Transform only — no blur, no canvas. */

export function prefersStill(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function withLayer(update: () => void | Promise<void>): void {
  if (typeof document === "undefined") {
    void update();
    return;
  }
  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<unknown> };
  };
  if (!prefersStill() && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(update);
    return;
  }
  void update();
}
