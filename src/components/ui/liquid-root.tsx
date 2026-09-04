import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { LiquidWorld, prefersStill } from "@/lib/liquid/physics";

export function LiquidRoot({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<LiquidWorld | null>(null);
  const firstPath = useRef(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    if (prefersStill()) return;
    const world = new LiquidWorld();
    world.attach(root, canvas);
    worldRef.current = world;
    return () => {
      world.detach();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    worldRef.current?.pulse("navigate");
  }, [pathname]);

  return (
    <div className="liquid-root" ref={rootRef}>
      {children}
      <canvas ref={canvasRef} className="liquid-caustic" aria-hidden />
    </div>
  );
}
