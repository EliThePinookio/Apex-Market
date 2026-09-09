import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { bindLiquidGlass, type GlassStrength } from "@/lib/liquid/glass-engine";

type Props = {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  strength?: GlassStrength;
  interactive?: boolean;
  [key: string]: unknown;
};

export function LiquidGlass({
  as: Tag = "div",
  children,
  className,
  strength = "primary",
  interactive = true,
  ...rest
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => bindLiquidGlass(ref.current, { strength, interactive }), [strength, interactive]);

  return (
    <Tag
      ref={ref}
      className={cn("lg", `lg-${strength}`, className)}
      data-lg=""
      data-lg-strength={strength}
      {...rest}
    >
      <span className="lg-layer lg-tint" aria-hidden="true" />
      <span className="lg-layer lg-refract" aria-hidden="true" />
      <span className="lg-layer lg-specular" aria-hidden="true" />
      <span className="lg-edge" aria-hidden="true" />
      <span className="lg-content">{children}</span>
    </Tag>
  );
}
