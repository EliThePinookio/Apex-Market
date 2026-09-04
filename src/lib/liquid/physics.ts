/** Event-driven liquid field. Still at rest; physics only when the user acts. */

export const LIQUID = {
  cols: 64,
  rows: 36,
  waveSpeed: 0.18,
  waveDamp: 0.055,
  waveVisc: 0.18,
  spring: 0.22,
  bodyDamp: 0.72,
  viscosity: 0.88,
  elasticity: 0.2,
  surfaceTension: 0.018,
  maxShift: 5.5,
  maxScale: 1.045,
  idle: 0.00035,
  intensity: {
    rest: 0.015,
    proximity: 0.08,
    contact: 0.28,
    press: 0.42,
    drag: 0.5,
    release: 0.22,
    toggle: 0.3,
    navigate: 0.2,
  },
} as const;

type Phase = "rest" | "proximity" | "contact" | "press" | "drag" | "release";

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
  "button:not(:disabled)",
  ".switch",
].join(",");

type Body = {
  el: HTMLElement;
  mass: number;
  magnify: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  vs: number;
  cx: number;
  cy: number;
};

function massFor(el: HTMLElement): number {
  if (el.matches("h1, .display-title")) return 2.8;
  if (el.matches(".mall-card, .dept-tile, .shop-order-card")) return 1.6;
  if (el.matches(".office-kpi-card")) return 1.4;
  if (el.matches(".tag-chip, .switch")) return 0.7;
  return 1;
}

function magnifyFor(el: HTMLElement): number {
  if (el.matches("h1, .display-title, .mall-name, .office-kpi-value")) return 1;
  return 0.4;
}

export class LiquidWorld {
  private height = new Float32Array(LIQUID.cols * LIQUID.rows);
  private vel = new Float32Array(LIQUID.cols * LIQUID.rows);
  private scratch = new Float32Array(LIQUID.cols * LIQUID.rows);
  private bodies: Body[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private grid: HTMLCanvasElement | null = null;
  private gridCtx: CanvasRenderingContext2D | null = null;
  private pixels: ImageData | null = null;
  private root: HTMLElement | null = null;
  private raf = 0;
  private last = 0;
  private lastScan = 0;
  private px = -1;
  private py = -1;
  private pvx = 0;
  private pvy = 0;
  private down = false;
  private downAt = 0;
  private downX = 0;
  private downY = 0;
  private phase: Phase = "rest";
  private focus: Body | null = null;
  private intensity: number = LIQUID.intensity.rest;

  attach(root: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = root;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.sizeCanvas();
    this.scan();
    this.bind();
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.unbind();
    for (const b of this.bodies) {
      b.el.style.transform = "";
      b.el.style.filter = "";
      b.el.removeAttribute("data-liquid");
      b.el.removeAttribute("data-liquid-phase");
    }
    this.bodies = [];
    this.root = null;
    this.canvas = null;
  }

  private kick() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
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
    const speed = Math.hypot(this.pvx, this.pvy);
    const over = this.bodyAt(x, y);

    if (e.type === "pointerdown") {
      this.down = true;
      this.downAt = performance.now();
      this.downX = x;
      this.downY = y;
      this.focus = over;
      this.phase = "contact";
      this.intensity = LIQUID.intensity.contact;
      this.impulse(x, y, 0.055, 0.72);
      this.kick();
      return;
    }

    if (e.type === "pointerup" || e.type === "pointercancel") {
      const wasToggle = this.focus?.el.matches(".switch, [role='switch'], .theme-toggle");
      this.down = false;
      this.phase = "release";
      this.intensity = wasToggle ? LIQUID.intensity.toggle : LIQUID.intensity.release;
      this.impulse(x, y, 0.05, wasToggle ? 0.55 : 0.28);
      this.focus = null;
      this.kick();
      return;
    }

    if (this.down) {
      const travel = Math.hypot(x - this.downX, y - this.downY);
      const held = performance.now() - this.downAt;
      if (travel > 10) {
        this.phase = "drag";
        const v = Math.min(1, speed / 28);
        this.intensity = LIQUID.intensity.contact + (LIQUID.intensity.drag - LIQUID.intensity.contact) * v;
        this.impulse(x, y, 0.04 + v * 0.04, 0.22 + v * 0.55);
        this.kick();
      } else if (held > 140) {
        this.phase = "press";
        this.intensity = LIQUID.intensity.press;
        this.kick();
      }
      return;
    }

    if (over) {
      this.focus = over;
      this.phase = "proximity";
      this.intensity = LIQUID.intensity.proximity;
      this.kick();
    } else if (this.phase === "proximity") {
      this.focus = null;
      this.phase = "release";
      this.intensity = LIQUID.intensity.rest;
      this.kick();
    }
  };

  private onLeave = () => {
    this.down = false;
    this.focus = null;
    this.px = -1;
    this.py = -1;
    this.phase = "release";
    this.kick();
  };

  private onResize = () => {
    this.sizeCanvas();
    this.lastScan = 0;
  };

  private onScroll = () => {
    this.lastScan = 0;
  };

  pulse(kind: "navigate" | "toggle" = "navigate") {
    this.phase = "release";
    this.intensity = LIQUID.intensity[kind];
    this.impulse(window.innerWidth * 0.5, window.innerHeight * 0.32, kind === "navigate" ? 0.14 : 0.06, kind === "navigate" ? 0.38 : 0.5);
    this.kick();
  }

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
      this.grid.width = LIQUID.cols;
      this.grid.height = LIQUID.rows;
      this.gridCtx = this.grid.getContext("2d");
    }
    this.pixels = this.gridCtx?.createImageData(LIQUID.cols, LIQUID.rows) ?? null;
  }

  private bodyAt(x: number, y: number): Body | null {
    let best: Body | null = null;
    let bestD = 90;
    for (const b of this.bodies) {
      const d = Math.hypot(b.cx - x, b.cy - y);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  scan() {
    if (!this.root) return;
    const nodes = [...this.root.querySelectorAll<HTMLElement>(SELECTOR)];
    const seen = new Set(nodes);
    this.bodies = this.bodies.filter((b) => {
      if (seen.has(b.el) && b.el.isConnected) return true;
      b.el.style.transform = "";
      b.el.style.filter = "";
      b.el.removeAttribute("data-liquid");
      b.el.removeAttribute("data-liquid-phase");
      return false;
    });
    const have = new Set(this.bodies.map((b) => b.el));
    for (const el of nodes) {
      if (have.has(el) || el.closest("[data-liquid-ignore]")) continue;
      el.setAttribute("data-liquid", "");
      const rec = el.getBoundingClientRect();
      this.bodies.push({
        el,
        mass: massFor(el),
        magnify: magnifyFor(el),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        vs: 0,
        cx: rec.left + rec.width / 2,
        cy: rec.top + rec.height / 2,
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
    const { cols: w, rows: h } = LIQUID;
    const cx = (clientX / window.innerWidth) * (w - 1);
    const cy = (clientY / window.innerHeight) * (h - 1);
    const r = radius * w;
    const r2 = r * r;
    const dirX = this.pvx / 40;
    const dirY = this.pvy / 40;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = (y - cy) * (w / h);
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const fall = Math.exp(-d2 / (r2 * 0.42));
        const i = y * w + x;
        this.vel[i] += force * fall;
        this.height[i] += force * 0.25 * fall;
        this.vel[i] += (dirX * dx + dirY * dy) * 0.015 * fall;
      }
    }
  }

  private sample(nx: number, ny: number) {
    const w = LIQUID.cols;
    const h = LIQUID.rows;
    const fx = Math.max(0, Math.min(w - 1.001, nx * (w - 1)));
    const fy = Math.max(0, Math.min(h - 1.001, ny * (h - 1)));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const i = y0 * w + x0;
    const a = this.height[i];
    const b = this.height[i + 1] ?? a;
    const c = this.height[i + w] ?? a;
    const d = this.height[i + w + 1] ?? a;
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  }

  private stepWave() {
    const w = LIQUID.cols;
    const h = LIQUID.rows;
    const u = this.height;
    const v = this.vel;
    const next = this.scratch;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = u[i - 1] + u[i + 1] + u[i - w] + u[i + w] - 4 * u[i];
        const vlap = v[i - 1] + v[i + 1] + v[i - w] + v[i + w] - 4 * v[i];
        v[i] = (v[i] + LIQUID.waveSpeed * lap + LIQUID.waveVisc * vlap) * (1 - LIQUID.waveDamp);
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
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const I = this.intensity;
    const cap = LIQUID.maxShift * I * 2.2;

    for (const b of this.bodies) {
      if (!b.el.isConnected) continue;
      const h = this.sample(b.cx / vw, b.cy / vh);
      const isFocus = this.focus === b;
      let targetScale = 1;
      let fx = 0;
      let fy = h * 4 * I;

      if (isFocus && this.phase === "proximity") {
        targetScale = 1 + 0.018 * b.magnify;
        fy -= 1.2;
      } else if (isFocus && this.phase === "contact") {
        targetScale = 0.985 - 0.01 * (1 - 1 / b.mass);
      } else if (isFocus && this.phase === "press") {
        targetScale = 0.97;
        fy += 1.6;
      } else if (isFocus && this.phase === "drag") {
        targetScale = 0.99;
      } else {
        targetScale = 1 + Math.max(-0.015, Math.min(0.02, h * 0.05 * I));
      }

      fx += -LIQUID.spring * b.x * b.mass * LIQUID.elasticity * 8;
      fy += -LIQUID.spring * b.y * b.mass * LIQUID.elasticity * 8;
      b.vx = (b.vx + fx / b.mass) * LIQUID.bodyDamp * LIQUID.viscosity;
      b.vy = (b.vy + fy / b.mass) * LIQUID.bodyDamp * LIQUID.viscosity;
      b.vs = b.vs * 0.7 + (targetScale - b.scale) * 0.22;
      b.x += b.vx;
      b.y += b.vy;
      b.scale += b.vs;
      b.x = Math.max(-cap, Math.min(cap, b.x));
      b.y = Math.max(-cap, Math.min(cap, b.y));
      b.scale = Math.max(0.96, Math.min(LIQUID.maxScale, b.scale));
    }

    const n = this.bodies.length;
    for (let i = 0; i < n; i++) {
      const a = this.bodies[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.bodies[j];
        const dx = a.cx - b.cx;
        const dy = a.cy - b.cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 130 || dist < 1) continue;
        const fall = (1 - dist / 130) * LIQUID.surfaceTension * I;
        const mx = (a.x - b.x) * fall;
        const my = (a.y - b.y) * fall;
        a.vx -= mx / a.mass;
        a.vy -= my / a.mass;
        b.vx += mx / b.mass;
        b.vy += my / b.mass;
      }
    }

    for (const b of this.bodies) {
      const settled = Math.abs(b.x) < 0.04 && Math.abs(b.y) < 0.04 && Math.abs(b.scale - 1) < 0.002;
      if (settled && this.phase === "rest") {
        b.el.style.transform = "";
        b.el.style.filter = "";
        b.el.removeAttribute("data-liquid-phase");
        continue;
      }
      b.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) scale(${b.scale.toFixed(4)})`;
      if (this.focus === b) b.el.setAttribute("data-liquid-phase", this.phase);
      else b.el.removeAttribute("data-liquid-phase");
    }
  }

  private paint() {
    if (!this.ctx || !this.canvas || !this.pixels || !this.grid || !this.gridCtx) return;
    const data = this.pixels.data;
    const u = this.height;
    const amp = 70 * Math.max(this.intensity, 0.04);
    for (let i = 0; i < u.length; i++) {
      const crest = Math.max(0, u[i]);
      const o = i * 4;
      data[o] = 255;
      data[o + 1] = 248;
      data[o + 2] = 226;
      data[o + 3] = Math.min(90, crest * amp);
    }
    this.gridCtx.putImageData(this.pixels, 0, 0);
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.drawImage(this.grid, 0, 0, window.innerWidth, window.innerHeight);
    this.ctx.globalCompositeOperation = "source-over";
  }

  private energy() {
    let e = 0;
    for (let i = 0; i < this.vel.length; i++) e += this.vel[i] * this.vel[i] + this.height[i] * this.height[i];
    for (const b of this.bodies) {
      e += b.vx * b.vx + b.vy * b.vy + (b.scale - 1) * (b.scale - 1) * 8;
    }
    return e / (this.vel.length + this.bodies.length * 4 + 1);
  }

  private loop = (now: number) => {
    const dt = Math.min(32, now - this.last);
    this.last = now;
    if (now - this.lastScan > 1200) this.scan();
    const steps = dt > 24 ? 2 : 1;
    for (let s = 0; s < steps; s++) this.stepWave();
    this.stepBodies();
    this.paint();

    const e = this.energy();
    if (!this.down && this.phase !== "proximity" && e < LIQUID.idle) {
      this.phase = "rest";
      this.intensity = LIQUID.intensity.rest;
      this.px = this.phase === "rest" ? this.px : this.px;
      if (e < LIQUID.idle * 0.4) {
        this.ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
        for (const b of this.bodies) {
          b.x = b.y = b.vx = b.vy = b.vs = 0;
          b.scale = 1;
          b.el.style.transform = "";
          b.el.style.filter = "";
          b.el.removeAttribute("data-liquid-phase");
        }
        this.raf = 0;
        return;
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

export function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
