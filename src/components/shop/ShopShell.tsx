import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { bagCount, useBag } from "@/lib/beannel/cart";
import { Toaster } from "sonner";

export function ShopShell() {
  useBag();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = bagCount();
  const hideBag = pathname === "/checkout";

  return (
    <div className="shop-shell">
      <header className="shop-top">
        <Link to="/shop" className="shop-brand" aria-label="BEANNEL shop">
          <BrandMark size="sm" />
          <span className="min-w-0">
            <Wordmark size="sm" />
            <span className="shop-brand-kicker">The house</span>
          </span>
        </Link>
        {!hideBag && (
          <Link to="/cart" className="shop-bag-btn" aria-label="Bag">
            <ShoppingBag className="size-[18px]" />
            {count > 0 && <span className="shop-bag-count">{count > 9 ? "9+" : count}</span>}
          </Link>
        )}
      </header>
      <main className="shop-main">
        <Outlet />
      </main>
      <footer className="shop-foot">
        <p className="shop-foot-mark">
          <Wordmark size="sm" />
        </p>
        <p className="text-[12px] text-fg-subtle">Clothes · Jewelry · Watches · Fashion</p>
        <Link to="/login" className="shop-staff">
          Staff sign in
        </Link>
      </footer>
      <Toaster position="top-center" toastOptions={{ className: "font-sans !rounded-[16px]" }} />
    </div>
  );
}
