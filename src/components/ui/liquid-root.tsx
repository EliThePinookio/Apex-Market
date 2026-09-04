import { useEffect, useRef, type ReactNode } from "react";
import { LiquidWorld, prefersStill } from "@/lib/liquid/physics";

export function LiquidRoot({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    if (prefersStill()) return;
    const world = new LiquidWorld();
    world.attach(root, canvas);
    return () => world.detach();
  }, []);

  return (
    <div className="liquid-root" ref={rootRef}>
      {children}
      <canvas ref={canvasRef} className="liquid-caustic" aria-hidden />
    </div>
  );
}
