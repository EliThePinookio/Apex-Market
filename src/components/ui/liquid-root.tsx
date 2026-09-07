import { type ReactNode } from "react";

/** Feel stays on CSS springs. No canvas / RAF field — that made taps lag. */
export function LiquidRoot({ children }: { children: ReactNode }) {
  return <div className="liquid-root">{children}</div>;
}
