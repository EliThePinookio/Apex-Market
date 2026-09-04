import { cn } from "@/lib/cn";

const TONES = [
  "bg-accent/12 text-accent",
  "bg-success/12 text-success",
  "bg-info/12 text-info",
  "bg-warning/14 text-warning",
] as const;

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 2147483647;
  return h;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tone = TONES[hashName(name) % TONES.length];
  return <span className={cn("avatar", tone, className)}>{initials || "?"}</span>;
}
