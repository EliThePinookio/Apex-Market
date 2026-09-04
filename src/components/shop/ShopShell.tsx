import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { useState } from "react";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { bagCount, useBag } from "@/lib/beannel/cart";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { kindFromUser } from "@/lib/beannel/account";
import { Toaster } from "sonner";

export function ShopShell() {
  useBag();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile } = useBeannelAuth();
  const count = bagCount();
  const [q, setQ] = useState("");
  const staff = kindFromUser(user) === "staff" && Boolean(user);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/", search: { q: q.trim() || undefined, cat: undefined } });
  };

  return (
    <div className="shop-shell">
      <header className="shop-top">
        <Link to="/" className="shop-brand" aria-label="BEANNEL shop">
          <BrandMark size="sm" />
          <span className="min-w-0 hidden sm:block">
            <Wordmark size="sm" />
          </span>
        </Link>
        <form onSubmit={submitSearch} className="shop-search">
          <Search className="size-4 text-fg-subtle shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands and categories"
            aria-label="Search the shop"
          />
          <button type="submit">Search</button>
        </form>
        <div className="shop-top-actions">
          {user ? (
            <Link to="/account" className="shop-icon-btn" aria-label="Account">
              <UserRound className="size-[18px]" />
              <span className="shop-icon-label">{profile?.fullName?.split(" ")[0] || "Account"}</span>
            </Link>
          ) : (
            <Link to="/login" search={{ as: "customer" }} className="shop-icon-btn" aria-label="Sign in">
              <UserRound className="size-[18px]" />
              <span className="shop-icon-label">Sign in</span>
            </Link>
          )}
          {pathname !== "/checkout" && (
            <Link to="/cart" className="shop-bag-btn" aria-label="Cart">
              <ShoppingBag className="size-[18px]" />
              {count > 0 && <span className="shop-bag-count">{count > 9 ? "9+" : count}</span>}
            </Link>
          )}
        </div>
      </header>
      {staff && (
        <Link to="/manage" className="shop-office-bar">
          Signed in as staff — open the office to restock, track sales and profit
        </Link>
      )}
      <main className="shop-main">
        <Outlet />
      </main>
      <footer className="shop-foot">
        <p className="shop-foot-mark">
          <Wordmark size="sm" />
        </p>
        <p className="text-[12px] text-fg-subtle">Clothes · Jewelry · Watches · Fashion</p>
        <div className="flex justify-center gap-4">
          {user ? (
            <Link to="/account" className="shop-staff">
              Your account
            </Link>
          ) : (
            <Link to="/login" search={{ as: "customer" }} className="shop-staff">
              Create a shopper account
            </Link>
          )}
          {staff ? (
            <Link to="/manage" className="shop-staff">
              Staff office
            </Link>
          ) : (
            <Link to="/login" search={{ as: "staff" }} className="shop-staff">
              Staff office
            </Link>
          )}
        </div>
      </footer>
      <Toaster position="top-center" toastOptions={{ className: "font-sans !rounded-[16px]" }} />
    </div>
  );
}
