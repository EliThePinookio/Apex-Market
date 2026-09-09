/**
 * Per-surface liquid glass. Idle = no RAF.
 * Pointer frames write CSS variables only — no React.
 *
 * Tunable CSS on the node:
 *   --lg-blur --lg-fill --lg-sat --lg-highlight --lg-edge --lg-radius
 */
import { glassTier } from "./capability";

export type GlassStrength = "primary" | "secondary" | "tertiary";

const K = 180;
const DAMP = 28;
const PRESS_K = 220;
const PRESS_D = 30;
const IDLE = 0.0006;
const MAX_DT = 0.032;

type Sim = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  press: number;
  tpress: number;
  pv: number;
};

function spring(pos: number, vel: number, target: number, k: number, d: number, dt: number) {
  const a = (target - pos) * k - vel * d;
  const nv = vel + a * dt;
  const np = pos + nv * dt;
  return { p: np, v: nv };
}

function localPoint(el: HTMLElement, cx: number, cy: number) {
  const r = el.getBoundingClientRect();
  const w = Math.max(1, r.width);
  const h = Math.max(1, r.height);
  return {
    x: Math.min(1, Math.max(0, (cx - r.left) / w)),
    y: Math.min(1, Math.max(0, (cy - r.top) / h)),
  };
}

export function bindLiquidGlass(
  el: HTMLElement | null,
  opts: { strength?: GlassStrength; interactive?: boolean } = {},
) {
  if (!el || opts.interactive === false) return () => undefined;
  const tier = glassTier();
  el.dataset.lgTier = tier;
  if (opts.strength) el.dataset.lgStrength = opts.strength;
  if (tier === "low") return () => undefined;

  const sim: Sim = {
    x: 0.5,
    y: 0.38,
    tx: 0.5,
    ty: 0.38,
    vx: 0,
    vy: 0,
    press: 0,
    tpress: 0,
    pv: 0,
  };

  let raf = 0;
  let last = 0;
  let hovering = false;
  let down = false;
  let downX = 0;
  let downY = 0;
  let scrolling = false;

  const paint = () => {
    el.style.setProperty("--lg-mx", `${(sim.x * 100).toFixed(2)}%`);
    el.style.setProperty("--lg-my", `${(sim.y * 100).toFixed(2)}%`);
    el.style.setProperty("--lg-press", sim.press.toFixed(4));
    const active = sim.press > 0.02 || hovering;
    el.dataset.lgActive = active ? "1" : "0";
    if (active) el.style.willChange = "transform";
    else el.style.willChange = "";
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    sim.x = 0.5;
    sim.y = 0.38;
    sim.tx = 0.5;
    sim.ty = 0.38;
    sim.vx = 0;
    sim.vy = 0;
    sim.press = 0;
    sim.tpress = 0;
    sim.pv = 0;
    paint();
  };

  const tick = (now: number) => {
    const dt = Math.min(MAX_DT, last ? (now - last) / 1000 : 0.016);
    last = now;
    const x = spring(sim.x, sim.vx, sim.tx, K, DAMP, dt);
    const y = spring(sim.y, sim.vy, sim.ty, K, DAMP, dt);
    const p = spring(sim.press, sim.pv, sim.tpress, PRESS_K, PRESS_D, dt);
    sim.x = x.p;
    sim.vx = x.v;
    sim.y = y.p;
    sim.vy = y.v;
    sim.press = p.p;
    sim.pv = p.v;
    paint();
    const energy =
      Math.abs(sim.vx) + Math.abs(sim.vy) + Math.abs(sim.pv) + Math.abs(sim.press - sim.tpress) + Math.abs(sim.x - sim.tx) + Math.abs(sim.y - sim.ty);
    if (energy < IDLE && !down && !hovering) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const kick = () => {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  const onEnter = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    hovering = true;
    const pt = localPoint(el, e.clientX, e.clientY);
    sim.tx = pt.x;
    sim.ty = pt.y;
    if (!down) sim.tpress = 0.08;
    kick();
  };

  const onMove = (e: PointerEvent) => {
    if (scrolling) return;
    if (down && Math.hypot(e.clientX - downX, e.clientY - downY) > 18 && e.pointerType === "touch") {
      scrolling = true;
      down = false;
      sim.tpress = 0;
      kick();
      return;
    }
    if (!down && !hovering) return;
    const pt = localPoint(el, e.clientX, e.clientY);
    sim.tx = pt.x;
    sim.ty = pt.y;
    kick();
  };

  const onDown = (e: PointerEvent) => {
    if (e.button != null && e.button !== 0) return;
    scrolling = false;
    down = true;
    downX = e.clientX;
    downY = e.clientY;
    const pt = localPoint(el, e.clientX, e.clientY);
    sim.tx = pt.x;
    sim.ty = pt.y;
    sim.tpress = 1;
    kick();
  };

  const onUp = () => {
    down = false;
    scrolling = false;
    sim.tpress = hovering ? 0.08 : 0;
    kick();
  };

  const onLeave = () => {
    hovering = false;
    if (!down) {
      sim.tpress = 0;
      kick();
    }
  };

  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerdown", onDown, { passive: true });
  el.addEventListener("pointerup", onUp, { passive: true });
  el.addEventListener("pointercancel", onUp, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  paint();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    el.removeEventListener("pointerleave", onLeave);
    el.style.willChange = "";
    el.dataset.lgActive = "0";
  };
}
