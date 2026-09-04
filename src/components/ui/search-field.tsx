import { Search } from "lucide-react";
import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/cn";

export function SearchField({
  className,
  inputRef,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputRef?: Ref<HTMLInputElement> }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle pointer-events-none" />
      <input ref={inputRef} className="search-field" {...props} />
    </div>
  );
}
