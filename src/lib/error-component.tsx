import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
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

export function ShopPageError({ error }: ErrorComponentProps) {
  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[1.75rem] mb-2">Could not open this page</h1>
      <p className="text-[15px] text-fg-muted leading-relaxed mb-5">
        {error.message || "Please sign in again, or go back to the shop."}
      </p>
      <div className="shop-account-actions">
        <Link to="/account" className="shop-wa w-full">
          Try account again
        </Link>
        <Link to="/" className="text-center text-[15px] text-accent min-h-11 grid place-items-center">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
