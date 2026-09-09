import { Link, Outlet, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { Heart, Home, Package, Search, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { ClothGround } from "@/components/ui/cloth-ground";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { bagCount, useBag } from "@/lib/beannel/cart";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { useOpenOrderCount } from "@/components/shop/ShopOrders";
import { Toaster } from "sonner";
import { tick } from "@/lib/feel";
import { forgetBrowserPaystackSecret } from "@/lib/beannel/keys";

export function ShopShell() {
  useBag();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as {
    q?: string;
    cat?: string;
    who?: string;
    sort?: string;
    stock?: string;
  };
  const { user, profile } = useBeannelAuth();
  const count = bagCount();
  const openOrders = useOpenOrderCount();
  const [q, setQ] = useState(search.q || "");

  useEffect(() => {
    forgetBrowserPaystackSecret();
  }, []);

  useEffect(() => {
    setQ(search.q || "");
  }, [search.q]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    tick("light");
    void navigate({
      to: "/shop",
      search: {
        q: q.trim() || undefined,
        cat: search.cat,
        who: search.who,
        sort: search.sort,
        stock: search.stock,
      },
    });
  };

  const homeOn = pathname === "/" || pathname.startsWith("/shop");
  const ordersOn = pathname.startsWith("/track");
  const cartOn = pathname === "/cart" || pathname === "/checkout";
  const accountOn = pathname.startsWith("/account") || pathname === "/login";

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
        <LiquidGlass as="form" className="shop-search" strength="secondary" onSubmit={submitSearch}>
          <Search className="size-4 text-fg-subtle shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search BEANNEL"
            aria-label="Search the shop"
          />
          <button type="submit" aria-label="Search">
            <span className="shop-search-go">Search</span>
          </button>
        </LiquidGlass>
        <div className="shop-top-actions">
          <ThemeToggle className="shop-icon-btn" />
          <Link to="/track" className="shop-icon-btn shop-desktop-only" aria-label="Orders">
            <Package className="size-[18px]" />
            <span className="shop-icon-label">Orders</span>
            {openOrders > 0 && <span className="shop-bag-count">{openOrders > 9 ? "9+" : openOrders}</span>}
          </Link>
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
      <LiquidGlass as="nav" className="shop-dock" strength="primary" aria-label="Shop">
        <Link to="/" data-active={homeOn} aria-current={homeOn ? "page" : undefined}>
          <Home className="size-[22px]" strokeWidth={homeOn ? 2.35 : 1.7} />
          Home
        </Link>
        <Link to="/track" data-active={ordersOn} aria-current={ordersOn ? "page" : undefined}>
          <Package className="size-[22px]" strokeWidth={ordersOn ? 2.35 : 1.7} />
          Orders
          {openOrders > 0 && <span className="shop-dock-dot">{openOrders > 9 ? "9+" : openOrders}</span>}
        </Link>
        <Link to="/cart" data-active={cartOn} aria-current={cartOn ? "page" : undefined}>
          <ShoppingBag className="size-[22px]" strokeWidth={cartOn ? 2.35 : 1.7} />
          Cart
          {count > 0 && <span className="shop-dock-dot">{count > 9 ? "9+" : count}</span>}
        </Link>
        <Link to="/account" data-active={accountOn} aria-current={accountOn ? "page" : undefined}>
          <UserRound className="size-[22px]" strokeWidth={accountOn ? 2.35 : 1.7} />
          Account
        </Link>
      </LiquidGlass>
      <Toaster position="top-center" toastOptions={{ className: "font-sans !rounded-[16px]" }} />
    </div>
  );
}
