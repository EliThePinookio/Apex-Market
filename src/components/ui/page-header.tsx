import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
  compact,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between gap-3", compact ? "sm:items-center" : "sm:items-end")}>
      <div className="min-w-0">
        {kicker && !compact && <p className="brand-tagline">{kicker}</p>}
        <h1
          className={cn(
            "font-semibold tracking-tight leading-[1.12]",
            compact ? "text-[1.5rem]" : "text-[2rem] md:text-[2.125rem] mt-1",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={cn("text-fg-muted leading-relaxed", compact ? "text-[13px] mt-1" : "text-[15px] mt-1.5")}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
