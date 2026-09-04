import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, Home, Search, ShoppingBag, UserRound } from "lucide-react";
import { useState } from "react";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { ClothGround } from "@/components/ui/cloth-ground";
import { bagCount, useBag } from "@/lib/beannel/cart";
import { useSaved } from "@/lib/beannel/wishlist";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { Toaster } from "sonner";

export function ShopShell() {
  useBag();
  const saved = useSaved();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile } = useBeannelAuth();
  const count = bagCount();
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/", search: { q: q.trim() || undefined, cat: undefined } });
  };

  return (
    <div className="shop-shell">
      <ClothGround />
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
          <Link to="/saved" className="shop-icon-btn shop-desktop-only" aria-label="Saved">
            <Heart className="size-[18px]" />
            <span className="shop-icon-label">Saved</span>
          </Link>
          {user ? (
            <Link to="/account" className="shop-icon-btn shop-desktop-only" aria-label="Account">
              <UserRound className="size-[18px]" />
              <span className="shop-icon-label">{profile?.fullName?.split(" ")[0] || "Account"}</span>
            </Link>
          ) : (
            <Link to="/account" className="shop-icon-btn shop-desktop-only" aria-label="Account">
              <UserRound className="size-[18px]" />
              <span className="shop-icon-label">Account</span>
            </Link>
          )}
          {pathname !== "/checkout" && (
            <Link to="/cart" className="shop-bag-btn shop-desktop-only" aria-label="Cart">
              <ShoppingBag className="size-[18px]" />
              {count > 0 && <span className="shop-bag-count">{count > 9 ? "9+" : count}</span>}
            </Link>
          )}
        </div>
      </header>
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
            <Link to="/login" className="shop-staff">
              Create a shopper account
            </Link>
          )}
        </div>
      </footer>
      <nav className="shop-dock" aria-label="Shop">
        <Link to="/" data-active={pathname === "/" || pathname.startsWith("/shop")}>
          <Home className="size-[22px]" strokeWidth={pathname === "/" ? 2.2 : 1.7} />
          Home
        </Link>
        <Link to="/saved" data-active={pathname === "/saved"}>
          <Heart className="size-[22px]" strokeWidth={pathname === "/saved" ? 2.2 : 1.7} />
          Saved
          {saved.length > 0 && <span className="shop-dock-dot">{saved.length > 9 ? "9+" : saved.length}</span>}
        </Link>
        <Link to="/cart" data-active={pathname === "/cart" || pathname === "/checkout"}>
          <ShoppingBag className="size-[22px]" strokeWidth={pathname === "/cart" ? 2.2 : 1.7} />
          Cart
          {count > 0 && <span className="shop-dock-dot">{count > 9 ? "9+" : count}</span>}
        </Link>
        <Link to="/account" data-active={pathname.startsWith("/account") || pathname === "/login"}>
            <UserRound className="size-[22px]" strokeWidth={pathname.startsWith("/account") || pathname === "/login" ? 2.2 : 1.7} />
            Account
          </Link>
      </nav>
      <Toaster position="top-center" toastOptions={{ className: "font-sans !rounded-[16px]" }} />
    </div>
  );
}
