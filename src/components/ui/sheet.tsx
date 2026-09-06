import { useEffect, useState, type ReactNode, type TransitionEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const CLOSE_MS = 480;

export function useSheetPresence(open: boolean) {
  const [present, setPresent] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setShown(false);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    if (open || !present) return;
    const t = window.setTimeout(() => setPresent(false), CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open, present]);

  const onPanelTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (open) return;
    if (e.propertyName !== "transform") return;
    setPresent(false);
  };

  return { present, shown, onPanelTransitionEnd };
}

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
  const { present, shown, onPanelTransitionEnd } = useSheetPresence(open);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, onClose]);

  if (!present || typeof document === "undefined") return null;
  return createPortal(
    <div className={cn("sheet-scrim sheet-motion", shown && "is-open")} onClick={onClose} role="presentation">
      <div
        className={cn("sheet-panel", wide && "sm:max-w-lg")}
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={onPanelTransitionEnd}
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
