import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-scrim" onClick={onClose} role="presentation">
      <div
        className={cn("sheet-panel", wide && "sm:max-w-lg")}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "sheet-title" : undefined}
      >
        <div className="sheet-handle" />
        {title && (
          <div className="mb-4">
            <h3 id="sheet-title" className="text-[1.375rem] font-semibold tracking-tight">
              {title}
            </h3>
            {subtitle && <p className="text-[15px] text-fg-muted mt-1 leading-relaxed">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
