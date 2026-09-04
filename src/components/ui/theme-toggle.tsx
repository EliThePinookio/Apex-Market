import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyDark, readDark } from "@/lib/beannel/theme";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readDark());
  }, []);

  return (
    <button
      type="button"
      className={cn("theme-toggle", className)}
      aria-label={dark ? "Switch to light look" : "Switch to dark look"}
      title={dark ? "Light look" : "Dark look"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        applyDark(next);
      }}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
