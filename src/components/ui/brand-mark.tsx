import { cn } from "@/lib/cn";
import { Adinkra } from "@/components/ui/adinkra";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim =
    size === "lg"
      ? "size-16 rounded-[22px]"
      : size === "sm"
        ? "size-8 rounded-[10px]"
        : "size-9 rounded-[12px]";
  return (
    <div className={cn("brand-mark", dim)} aria-hidden>
      <img src="/brand/lockup.jpg" alt="" />
    </div>
  );
}

export function Wordmark({
  size = "lg",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span className={cn(size === "lg" ? "brand-wordmark" : "brand-wordmark-sm", className)}>
      Beannel
    </span>
  );
}

export function BrandRule() {
  return (
    <div className="brand-rule" aria-hidden>
      <span className="brand-rule-line" />
      <Adinkra name="adinkrahene" className="brand-rule-gem" />
      <span className="brand-rule-line" />
    </div>
  );
}
