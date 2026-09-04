import { cn } from "@/lib/cn";

export type NumericValue = number | "";

export function NumericInput({
  value,
  onChange,
  className,
  min,
  step,
  placeholder = "",
}: {
  value: NumericValue | undefined;
  onChange: (v: NumericValue) => void;
  className?: string;
  min?: number;
  step?: string | number;
  placeholder?: string;
}) {
  const shown = value === undefined || value === "" || Number.isNaN(value as number) ? "" : value;
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      placeholder={placeholder}
      value={shown}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") onChange("");
        else onChange(Number(raw));
      }}
      onFocus={(e) => e.currentTarget.select()}
      className={cn("field", className)}
    />
  );
}

export function toNumber(value: NumericValue | undefined, fallback = 0): number {
  if (value === "" || value === undefined || Number.isNaN(Number(value))) return fallback;
  return Number(value);
}
