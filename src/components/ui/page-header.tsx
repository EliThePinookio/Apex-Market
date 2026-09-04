import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && <p className="brand-tagline">{kicker}</p>}
        <h1 className="text-[2rem] md:text-[2.125rem] font-semibold tracking-tight leading-[1.12] mt-1">
          {title}
        </h1>
        {subtitle && <p className="text-[15px] text-fg-muted mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
