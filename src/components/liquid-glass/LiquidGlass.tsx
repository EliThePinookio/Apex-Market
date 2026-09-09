import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import "./LiquidGlass.css";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const HOST_RE =
  /\b(shop-dock|office-dock|shop-search|sheet-panel|pos-ticket|office-chat-composer|mall-card|dept-tile|cat-chip|cat-tile|tag-chip|theme-toggle|office-icon-btn|shop-icon-btn)\b/;

export type LiquidGlassProps = {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  host?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  blur?: number;
  opacity?: number;
  saturation?: number;
  distortionStrength?: number;
  interactionRadius?: number;
  highlightStrength?: number;
  edgeStrength?: number;
  springStiffness?: number;
  springDamping?: number;
  borderRadius?: number;
  onClick?: (event: unknown) => void;
  style?: CSSProperties;
};

export const LiquidGlass = forwardRef<HTMLElement, LiquidGlassProps & Record<string, unknown>>(function LiquidGlass(
  raw,
  forwardedRef,
) {
  const {
    as,
    children,
    className = "",
    host,
    disabled = false,
    interactive = true,
    blur = 24,
    opacity = 0.16,
    saturation = 145,
    distortionStrength = 1,
    interactionRadius = 150,
    highlightStrength = 0.32,
    edgeStrength = 0.28,
    springStiffness = 190,
    springDamping = 26,
    borderRadius = 26,
    onClick,
    style: styleProp,
    strength: _strength,
    ...rest
  } = raw as LiquidGlassProps & Record<string, unknown>;

  const Tag = ((as as ElementType | undefined) || "div") as ElementType;
  const cls = String(className || "");
  const radius = Number(interactionRadius) || 150;
  const distort = Number(distortionStrength) || 1;
  const kSpring = Number(springStiffness) || 190;
  const kDamp = Number(springDamping) || 26;
  const hi = Number(highlightStrength) || 0.32;
  const rootRef = useRef<HTMLElement | null>(null);
  const pointer = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    pressed: false,
  });
  const physics = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    scale: 1,
    running: false,
    frame: null as number | null,
    lastTime: undefined as number | undefined,
  });
  const bounds = useRef<DOMRect | null>(null);
  const isHost = Boolean(host) || HOST_RE.test(cls);
  const motionOff = Boolean(disabled) || interactive === false;

  useImperativeHandle(forwardedRef, () => rootRef.current as HTMLElement);

  const updateBounds = () => {
    if (!rootRef.current) return;
    bounds.current = rootRef.current.getBoundingClientRect();
  };

  const stopAnimation = () => {
    if (physics.current.frame !== null) {
      cancelAnimationFrame(physics.current.frame);
      physics.current.frame = null;
    }
    physics.current.running = false;
    if (rootRef.current) rootRef.current.style.willChange = "auto";
  };

  const isSettled = () => {
    const p = physics.current;
    return (
      Math.abs(p.x) < 0.01 &&
      Math.abs(p.y) < 0.01 &&
      Math.abs(p.vx) < 0.01 &&
      Math.abs(p.vy) < 0.01 &&
      Math.abs(p.scale - 1) < 0.0005
    );
  };

  const render = () => {
    const element = rootRef.current;
    if (!element) return;
    const p = physics.current;
    const ptr = pointer.current;
    const x = clamp(p.x, -radius, radius);
    const y = clamp(p.y, -radius, radius);
    const normalizedX = radius === 0 ? 0 : x / radius;
    const normalizedY = radius === 0 ? 0 : y / radius;
    const distance = Math.sqrt(x * x + y * y);
    const influence = clamp(1 - distance / radius, 0, 1);

    element.style.setProperty("--lg-pointer-x", `${ptr.x}px`);
    element.style.setProperty("--lg-pointer-y", `${ptr.y}px`);
    element.style.setProperty("--lg-x", `${x * 0.035 * distort}px`);
    element.style.setProperty("--lg-y", `${y * 0.035 * distort}px`);
    element.style.setProperty("--lg-rx", `${normalizedY * -2.2 * influence}deg`);
    element.style.setProperty("--lg-ry", `${normalizedX * 2.2 * influence}deg`);
    element.style.setProperty("--lg-scale", p.scale.toFixed(4));
    element.style.setProperty("--lg-influence", influence.toFixed(3));
    element.style.setProperty("--lg-highlight-strength", `${hi * (0.65 + influence * 0.8)}`);
  };

  const animate = (time: number) => {
    const p = physics.current;
    const ptr = pointer.current;
    const previousTime = p.lastTime ?? time;
    let dt = (time - previousTime) / 1000;
    p.lastTime = time;
    dt = clamp(dt, 0, 0.032);

    const targetX = ptr.active ? ptr.targetX : 0;
    const targetY = ptr.active ? ptr.targetY : 0;
    p.vx += ((targetX - p.x) * kSpring - p.vx * kDamp) * dt;
    p.vy += ((targetY - p.y) * kSpring - p.vy * kDamp) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.scale += ((ptr.pressed ? 0.985 : 1) - p.scale) * 220 * dt;

    render();

    if (!ptr.active && !ptr.pressed && isSettled()) {
      p.x = 0;
      p.y = 0;
      p.vx = 0;
      p.vy = 0;
      p.scale = 1;
      render();
      stopAnimation();
      return;
    }

    p.frame = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (motionOff) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (physics.current.running) return;
    physics.current.running = true;
    physics.current.lastTime = undefined;
    if (rootRef.current) rootRef.current.style.willChange = "transform";
    physics.current.frame = requestAnimationFrame(animate);
  };

  const updatePointer = (event: { clientX: number; clientY: number }) => {
    if (motionOff) return;
    updateBounds();
    const rect = bounds.current;
    if (!rect) return;
    pointer.current.x = event.clientX - rect.left;
    pointer.current.y = event.clientY - rect.top;
    pointer.current.targetX = clamp(pointer.current.x - rect.width / 2, -radius, radius);
    pointer.current.targetY = clamp(pointer.current.y - rect.height / 2, -radius, radius);
    startAnimation();
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (motionOff) return;
    if (event.pointerType === "touch") return;
    pointer.current.active = true;
    updatePointer(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (motionOff) return;
    updatePointer(event);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (motionOff) return;
    pointer.current.active = true;
    pointer.current.pressed = true;
    updatePointer(event);
    if (!isHost) {
      try {
        rootRef.current?.setPointerCapture(event.pointerId);
      } catch {
        /* optional */
      }
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    pointer.current.pressed = false;
    try {
      rootRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    startAnimation();
  };

  const handlePointerLeave = () => {
    pointer.current.active = false;
    pointer.current.pressed = false;
    pointer.current.targetX = 0;
    pointer.current.targetY = 0;
    startAnimation();
  };

  useEffect(() => {
    updateBounds();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateBounds) : null;
    if (resizeObserver && rootRef.current) resizeObserver.observe(rootRef.current);
    window.addEventListener("resize", updateBounds, { passive: true });
    return () => {
      stopAnimation();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, []);

  const style = {
    ...(styleProp as CSSProperties | undefined),
    "--lg-blur": `${Number(blur) || 24}px`,
    "--lg-opacity": Number(opacity) || 0.16,
    "--lg-saturation": `${Number(saturation) || 145}%`,
    "--lg-radius": `${Number(borderRadius) || 26}px`,
    "--lg-edge-strength": Number(edgeStrength) || 0.28,
  } as CSSProperties;

  return createElement(
    Tag,
    {
      ...rest,
      ref: rootRef,
      className: ["liquid-glass", isHost ? "liquid-glass--host" : "liquid-glass--pane", cls].filter(Boolean).join(" "),
      style,
      onPointerEnter: handlePointerEnter,
      onPointerMove: handlePointerMove,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
      onPointerCancel: handlePointerLeave,
      onClick,
    },
    createElement("span", { className: "liquid-glass__surface", "aria-hidden": true }),
    createElement("span", { className: "liquid-glass__specular", "aria-hidden": true }),
    createElement("span", { className: "liquid-glass__edge", "aria-hidden": true }),
    createElement("span", { className: "liquid-glass__content" }, children as ReactNode),
  );
});

LiquidGlass.displayName = "LiquidGlass";
export default LiquidGlass;
