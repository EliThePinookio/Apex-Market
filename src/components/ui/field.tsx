import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[13px] font-medium text-fg-muted space-y-1.5">
      {label}
      {children}
    </label>
  );
}
