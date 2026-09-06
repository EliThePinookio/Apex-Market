import { useEffect, type ReactNode } from "react";
import { bindFeel } from "@/lib/feel";

export function FeelRoot({ children }: { children: ReactNode }) {
  useEffect(() => bindFeel(document), []);
  return children;
}
