import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center bg-bg text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={1.75} />
      </span>
      <h1 className="text-[1.375rem] font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-[15px] break-words text-fg-muted leading-relaxed">
        {error.message || "An unexpected error occurred. Try reloading the page."}
      </p>
    </main>
  );
}
