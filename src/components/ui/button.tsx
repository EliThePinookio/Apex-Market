import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-[transform,background-color,box-shadow,opacity,color,filter] duration-150 ease-[cubic-bezier(0.22,1.18,0.36,1)] active:not-disabled:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent/90 text-accent-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.45),var(--shadow-1)] backdrop-blur-md hover:brightness-[1.08]",
        secondary:
          "bg-bg-elevated/70 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.5),var(--shadow-1)] backdrop-blur-md hover:shadow-[var(--shadow-2)]",
        ghost: "text-fg-muted hover:bg-bg-subtle hover:text-fg",
        danger: "bg-danger text-danger-fg shadow-[var(--shadow-1)] hover:brightness-110",
        success: "bg-success text-success-fg shadow-[var(--shadow-1)] hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3.5 text-sm rounded-[10px]",
        md: "h-11 px-4 text-sm rounded-[14px]",
        lg: "h-12 px-5 text-base rounded-[16px]",
        icon: "size-11 rounded-[14px]",
        iconSm: "size-11 rounded-[12px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
