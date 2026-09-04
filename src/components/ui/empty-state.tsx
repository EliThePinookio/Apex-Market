import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-4 size-16 rounded-full bg-accent/12 text-accent grid place-items-center">
        <Icon className="size-7" strokeWidth={1.6} />
      </div>
      <h2 className="display-title text-[1.75rem] leading-tight">{title}</h2>
      <p className="mt-1.5 text-[15px] text-fg-muted max-w-sm mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
