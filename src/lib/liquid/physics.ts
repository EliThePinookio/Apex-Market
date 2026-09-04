/** Interactive liquid field: wave equation + spring bodies. */

const COLS = 72;
const ROWS = 42;
const WAVE_SPEED = 0.22;
const WAVE_DAMP = 0.028;
const WAVE_VISC = 0.14;
const SPRING = 0.085;
const BODY_DAMP = 0.82;
const PRESSURE = 18;
const BUOYANCY = 10;
const MAGNIFY = 0.09;
const MAGNIFY_MAX = 0.12;
const COUPLE = 0.012;
const COUPLE_RADIUS = 170;
const IDLE_EPS = 0.0008;

const SELECTOR = [
  ".mall-card",
  ".dept-tile",
  ".office-kpi-card",
  ".shop-order-card",
  ".tag-chip",
  ".shop-dock a",
  ".office-icon-btn",
  ".theme-toggle",
  ".display-title",
  "h1",
  ".mall-name",
  ".office-kpi-value",
  ".shop-icon-btn",
  ".shop-bag-btn",
  ".shop-order-card",
  "button:not(:disabled)",
].join(",");

export type LiquidBody = {
  el: HTMLElement;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vs: number;
  scale: number;
  cx: number;
  cy: number;
  magnify: number;
};

function massFor(el: HTMLElement): number {
  if (el.matches("h1, .display-title")) return 2.6;
  if (el.matches(".mall-card, .dept-tile, .shop-order-card")) return 1.5;
  if (el.matches(".office-kpi-card, .office-kpi-value")) return 1.35;
  if (el.matches(".tag-chip")) return 0.65;
  if (el.matches("button, .shop-dock a, .shop-icon-btn")) return 0.9;
  return 1.1;
}

function magnifyFor(el: HTMLElement): number {
  if (el.matches("h1, .display-title, .mall-name, .office-kpi-value")) return 1;
  return 0.55;
}

export class LiquidWorld {
  private height = new Float32Array(COLS * ROWS);
  private vel = new Float32Array(COLS * ROWS);
  private scratch = new Float32Array(COLS * ROWS);
  private bodies: LiquidBody[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private grid: HTMLCanvasElement | null = null;
  private gridCtx: CanvasRenderingContext2D | null = null;
  private pixels: ImageData | null = null;
  private root: HTMLElement | null = null;
  private raf = 0;
  private last = 0;
  private px = -1;
  private py = -1;
  private pvx = 0;
  private pvy = 0;
  private down = false;
  private dirty = true;
  private paused = false;
  private lastScan = 0;

  attach(root: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = root;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.sizeCanvas();
    this.scan();
    this.bind();
    this.last = performance.now();
    this.loop(this.last);
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.unbind();
    this.bodies.forEach((b) => {
      b.el.style.transform = "";
      b.el.removeAttribute("data-liquid");
    });
    this.bodies = [];
    this.root = null;
    this.canvas = null;
    this.ctx = null;
  }

  private onPointer = (e: PointerEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    if (this.px >= 0) {
      this.pvx = x - this.px;
      this.pvy = y - this.py;
    }
    this.px = x;
    this.py = y;
    if (e.type === "pointerdown") this.down = true;
    if (e.type === "pointerup" || e.type === "pointercancel") this.down = false;
    const force = e.type === "pointerdown" ? 1.15 : this.down ? 0.42 : 0.18;
    const speed = Math.hypot(this.pvx, this.pvy);
    this.impulse(x, y, 0.07 + Math.min(0.08, speed / 400), force + Math.min(0.8, speed / 80));
    this.dirty = true;
  };

  private onLeave = () => {
    this.down = false;
    this.px = -1;
    this.py = -1;
  };

  private onResize = () => {
    this.sizeCanvas();
    this.lastScan = 0;
    this.dirty = true;
  };

  private onScroll = () => {
    this.lastScan = 0;
    this.dirty = true;
  };

  private bind() {
    window.addEventListener("pointerdown", this.onPointer, { passive: true });
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    window.addEventListener("pointerup", this.onPointer, { passive: true });
    window.addEventListener("pointercancel", this.onPointer, { passive: true });
    window.addEventListener("pointerleave", this.onLeave, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
  }

  private unbind() {
    window.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("pointerup", this.onPointer);
    window.removeEventListener("pointercancel", this.onPointer);
    window.removeEventListener("pointerleave", this.onLeave);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.onScroll, true);
  }

  private sizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.grid) {
      this.grid = document.createElement("canvas");
      this.grid.width = COLS;
      this.grid.height = ROWS;
      this.gridCtx = this.grid.getContext("2d");
    }
    this.pixels = this.gridCtx?.createImageData(COLS, ROWS) ?? null;
  }

  scan() {
    if (!this.root) return;
    const nodes = [...this.root.querySelectorAll<HTMLElement>(SELECTOR)];
    const seen = new Set(nodes);
    this.bodies = this.bodies.filter((b) => {
      if (seen.has(b.el) && b.el.isConnected) return true;
      b.el.style.transform = "";
      b.el.removeAttribute("data-liquid");
      return false;
    });
    const have = new Set(this.bodies.map((b) => b.el));
    for (const el of nodes) {
      if (have.has(el)) continue;
      if (el.closest("[data-liquid-ignore]")) continue;
      el.setAttribute("data-liquid", "");
      const rec = el.getBoundingClientRect();
      this.bodies.push({
        el,
        mass: massFor(el),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        vs: 0,
        scale: 1,
        cx: rec.left + rec.width / 2,
        cy: rec.top + rec.height / 2,
        magnify: magnifyFor(el),
      });
    }
    for (const b of this.bodies) {
      const rec = b.el.getBoundingClientRect();
      b.cx = rec.left + rec.width / 2 - b.x;
      b.cy = rec.top + rec.height / 2 - b.y;
    }
    this.lastScan = performance.now();
  }

  private impulse(clientX: number, clientY: number, radius: number, force: number) {
    const nx = clientX / window.innerWidth;
    const ny = clientY / window.innerHeight;
    const r = radius * COLS;
    const r2 = r * r;
    const cx = nx * (COLS - 1);
    const cy = ny * (ROWS - 1);
    const dirX = this.pvx / 24;
    const dirY = this.pvy / 24;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const dx = x - cx;
        const dy = (y - cy) * (COLS / ROWS);
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const falloff = Math.exp(-d2 / (r2 * 0.45));
        const i = y * COLS + x;
        this.vel[i] += force * falloff;
        this.height[i] += force * 0.35 * falloff;
        this.vel[i] += (dirX * dx + dirY * dy) * 0.02 * falloff;
      }
    }
  }

  private sample(nx: number, ny: number) {
    const fx = Math.max(0, Math.min(COLS - 1.001, nx * (COLS - 1)));
    const fy = Math.max(0, Math.min(ROWS - 1.001, ny * (ROWS - 1)));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const i = y0 * COLS + x0;
    const a = this.height[i];
    const b = this.height[i + 1] ?? a;
    const c = this.height[i + COLS] ?? a;
    const d = this.height[i + COLS + 1] ?? a;
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  }

  private grad(nx: number, ny: number) {
    const e = 1 / COLS;
    return {
      x: (this.sample(nx + e, ny) - this.sample(nx - e, ny)) / (2 * e),
      y: (this.sample(nx, ny + e) - this.sample(nx, ny - e)) / (2 * e),
    };
  }

  private stepWave() {
    const u = this.height;
    const v = this.vel;
    const next = this.scratch;
    const w = COLS;
    const h = ROWS;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = u[i - 1] + u[i + 1] + u[i - w] + u[i + w] - 4 * u[i];
        const vlap = v[i - 1] + v[i + 1] + v[i - w] + v[i + w] - 4 * v[i];
        v[i] = (v[i] + WAVE_SPEED * lap + WAVE_VISC * vlap) * (1 - WAVE_DAMP);
        next[i] = u[i] + v[i];
      }
    }
    for (let x = 0; x < w; x++) {
      next[x] = next[w + x] ?? 0;
      next[(h - 1) * w + x] = next[(h - 2) * w + x] ?? 0;
    }
    for (let y = 0; y < h; y++) {
      next[y * w] = next[y * w + 1] ?? 0;
      next[y * w + w - 1] = next[y * w + w - 2] ?? 0;
    }
    this.height = next;
    this.scratch = u;
  }

  private stepBodies() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const b of this.bodies) {
      if (!b.el.isConnected) continue;
      const nx = b.cx / vw;
      const ny = b.cy / vh;
      const h = this.sample(nx, ny);
      const g = this.grad(nx, ny);
      let fx = g.x * PRESSURE;
      let fy = g.y * PRESSURE + h * BUOYANCY;
      if (this.px >= 0) {
        const dx = b.cx - this.px;
        const dy = b.cy - this.py;
        const dist = Math.hypot(dx, dy) || 1;
        const sigma = this.down ? 140 : 190;
        const gauss = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        const push = (this.down ? 28 : 14) * gauss;
        fx += (dx / dist) * push;
        fy += (dy / dist) * push * 0.7;
        const mag = MAGNIFY * b.magnify * gauss * (this.down ? 1.35 : 1);
        const targetScale = 1 + Math.min(MAGNIFY_MAX, mag) + h * 0.04;
        b.vs += (targetScale - b.scale) * 0.16;
      } else {
        b.vs += (1 - b.scale) * 0.12;
      }
      fx += -SPRING * b.x * b.mass;
      fy += -SPRING * b.y * b.mass;
      b.vx = (b.vx + fx / b.mass) * BODY_DAMP;
      b.vy = (b.vy + fy / b.mass) * BODY_DAMP;
      b.vs *= 0.78;
      b.x += b.vx;
      b.y += b.vy;
      b.scale += b.vs;
      b.x = Math.max(-22, Math.min(22, b.x));
      b.y = Math.max(-22, Math.min(22, b.y));
      b.scale = Math.max(0.94, Math.min(1.12, b.scale));
    }

    const n = this.bodies.length;
    for (let i = 0; i < n; i++) {
      const a = this.bodies[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.bodies[j];
        const dx = a.cx + a.x - (b.cx + b.x);
        const dy = a.cy + a.y - (b.cy + b.y);
        const dist = Math.hypot(dx, dy);
        if (dist > COUPLE_RADIUS || dist < 1) continue;
        const fall = 1 - dist / COUPLE_RADIUS;
        const share = COUPLE * fall * fall;
        const mx = (a.x - b.x) * share;
        const my = (a.y - b.y) * share;
        a.vx -= mx / a.mass;
        a.vy -= my / a.mass;
        b.vx += mx / b.mass;
        b.vy += my / b.mass;
      }
    }

    for (const b of this.bodies) {
      b.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) scale(${b.scale.toFixed(4)})`;
    }
  }

  private paint() {
    if (!this.ctx || !this.canvas || !this.pixels || !this.grid || !this.gridCtx) return;
    const data = this.pixels.data;
    const u = this.height;
    for (let i = 0; i < u.length; i++) {
      const crest = Math.max(0, u[i]);
      const trough = Math.max(0, -u[i]);
      const o = i * 4;
      data[o] = 255;
      data[o + 1] = 248;
      data[o + 2] = 226;
      data[o + 3] = Math.min(120, crest * 100 + trough * 28);
    }
    this.gridCtx.putImageData(this.pixels, 0, 0);
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.drawImage(this.grid, 0, 0, window.innerWidth, window.innerHeight);
    this.ctx.globalCompositeOperation = "source-over";
  }

  private energy() {
    let e = 0;
    for (let i = 0; i < this.vel.length; i++) e += this.vel[i] * this.vel[i] + this.height[i] * this.height[i];
    for (const b of this.bodies) e += b.vx * b.vx + b.vy * b.vy + (b.scale - 1) * (b.scale - 1);
    return e / (this.vel.length + this.bodies.length * 4);
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(32, now - this.last);
    this.last = now;
    if (now - this.lastScan > 900) this.scan();
    const e = this.energy();
    if (e < IDLE_EPS && !this.down && this.px < 0 && !this.dirty) {
      if (!this.paused) {
        this.paused = true;
        this.paint();
      }
      return;
    }
    this.paused = false;
    this.dirty = false;
    const steps = dt > 24 ? 2 : 1;
    for (let i = 0; i < steps; i++) this.stepWave();
    this.stepBodies();
    this.paint();
  };
}

export function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
