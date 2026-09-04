import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="group-label">{children}</p>;
}

export function Group({
  children,
  footer,
  indent,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  indent?: "icon" | "avatar";
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="group-list" data-indent={indent}>
        {children}
      </div>
      {footer ? <p className="group-footer">{footer}</p> : null}
    </div>
  );
}

export function GroupRow({
  children,
  className,
  destructive,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  destructive?: boolean;
}) {
  const interactive = Boolean(props.onClick) || props.type === "button" || props.type === "submit";
  if (interactive) {
    return (
      <button
        type="button"
        className={cn("group-row", destructive && "text-danger", className)}
        {...props}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cn("group-row", destructive && "text-danger", className)}>{children}</div>
  );
}
