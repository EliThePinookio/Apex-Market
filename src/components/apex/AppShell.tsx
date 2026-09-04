import { Link, Navigate, Outlet, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import {
  Bell,
  BarChart3,
  Command,
  LayoutDashboard,
  Lock,
  LogOut,
  MoreHorizontal,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Unlock,
  Users,
  Wifi,
  WifiOff,
  Moon,
  Store,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/apex/CommandPalette";
import { PinModal } from "@/components/apex/PinModal";
import { QuickAction } from "@/components/apex/QuickAction";
import { ShopShell } from "@/components/shop/ShopShell";
import { afterLoginPath, kindFromUser } from "@/lib/beannel/account";
import { useApex } from "@/lib/apex/store";
import { useBeannelAuth } from "@/lib/beannel/auth";
import type { NavId } from "@/types";

const NAV: Array<{ id: NavId; to: string; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", to: "/manage", label: "Home", icon: LayoutDashboard },
  { id: "pos", to: "/pos", label: "Register", icon: ShoppingCart },
  { id: "inventory", to: "/inventory", label: "Stock", icon: Package },
  { id: "ledger", to: "/ledger", label: "Ledger", icon: Receipt },
  { id: "customers", to: "/customers", label: "Customers", icon: Users },
  { id: "advisor", to: "/advisor", label: "Advisor", icon: BarChart3 },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings },
];

function pathToNav(pathname: string): NavId {
  if (pathname.startsWith("/pos")) return "pos";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/ledger")) return "ledger";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/advisor")) return "advisor";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

function ConnectingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-dvh grid place-items-center bg-bg text-fg">
      <div className="text-center space-y-5">
        <div className="inline-block animate-[mark-pulse_1.6s_ease-in-out_infinite]">
          <BrandMark size="lg" />
        </div>
        <div>
          <p className="text-[2.5rem] leading-none">
            <Wordmark />
          </p>
          <p className="text-[15px] text-fg-muted mt-2">{label}</p>
        </div>
        <div className="flex justify-center gap-1.5 pt-1">
          <span className="skeleton h-1.5 w-8" />
          <span className="skeleton h-1.5 w-5" />
          <span className="skeleton h-1.5 w-10" />
        </div>
      </div>
    </div>
  );
}

function isManagePath(pathname: string): boolean {
  return (
    pathname === "/manage" ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/ledger") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/advisor") ||
    pathname.startsWith("/settings")
  );
}

function isShopPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname.startsWith("/shop/") ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname === "/account"
  );
}

export function AppShell() {
  const auth = useBeannelAuth();
  const store = useApex();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { as?: "staff" | "customer"; next?: string };
  const [layoutQa, setLayoutQa] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV && sessionStorage.getItem("beannel_layout_qa") === "1") {
      setLayoutQa(true);
    }
  }, []);

  if (pathname === "/login") {
    if (auth.user && !auth.isLoading) {
      return <Navigate to={afterLoginPath(kindFromUser(auth.user), search.next)} />;
    }
    return <Outlet />;
  }

  const customer = kindFromUser(auth.user) === "customer";

  if (isShopPath(pathname)) {
    if (auth.isLoading && !auth.user) return <ConnectingScreen label="Opening the shop" />;
    return <ShopShell />;
  }

  if (customer) {
    return <Navigate to="/" />;
  }

  if (!auth.isConfigured) {
    return (
      <div className="min-h-dvh grid place-items-center bg-bg text-fg p-6">
        <div className="panel max-w-md p-8 space-y-3 text-center">
          <BrandMark size="lg" />
          <h1 className="text-[1.375rem] font-semibold tracking-tight">Cannot reach the workspace</h1>
          <p className="text-[15px] text-fg-muted leading-relaxed">
            {auth.configError || "The business database is not configured."}
          </p>
        </div>
      </div>
    );
  }
  if (auth.isLoading && !auth.user && !layoutQa) return <ConnectingScreen label="Checking your account" />;
  if (!auth.user && !layoutQa) {
    return <Navigate to="/login" search={{ as: "staff", next: isManagePath(pathname) ? pathname : "/manage" }} />;
  }
  if (!store.ready && !layoutQa) return <ConnectingScreen label="Loading your workspace" />;
  if (store.loadError && !layoutQa) {
    return (
      <div className="min-h-dvh grid place-items-center bg-bg text-fg p-6">
        <div className="panel max-w-md p-8 space-y-4 text-center">
          <BrandMark size="lg" />
          <h1 className="text-[1.375rem] font-semibold tracking-tight">Workspace failed to load</h1>
          <p className="text-[15px] text-fg-muted leading-relaxed">{store.loadError}</p>
          <Button onClick={() => void store.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  return <SignedInShell />;
}

function SignedInShell() {
  const { profile, summary, customers, isOwnerUnlocked, setOwnerUnlocked } = useApex();
  const { user, signOut } = useBeannelAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathToNav(pathname);
  const [online, setOnline] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("beannel_theme");
    const preferDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(preferDark);
    document.documentElement.classList.toggle("dark", preferDark);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [accountOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("beannel_theme", next ? "dark" : "light");
  };

  const dock = useMemo(
    () => NAV.filter((n) => ["dashboard", "pos", "inventory", "ledger"].includes(n.id)),
    [],
  );
  const openDebt = customers.reduce((s, c) => s + c.debtBalance, 0);
  const alertCount = summary.lowStockCount + summary.outOfStockCount + (openDebt > 0 ? 1 : 0);
  const accountName = profile.ownerName || user?.email || "BEANNEL";

  const guardSensitive = (id: NavId, e: { preventDefault: () => void }) => {
    if ((id === "advisor" || id === "settings") && profile.isPinLocked && !isOwnerUnlocked) {
      e.preventDefault();
      setPinOpen(true);
      return true;
    }
    return false;
  };

  return (
    <div className="app-canvas h-dvh overflow-hidden text-fg">
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="px-5 pt-7 pb-5 flex items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="leading-none truncate">
                <Wordmark size="sm" />
              </p>
              <p className="brand-tagline mt-1.5 truncate">Style that defines you</p>
            </div>
          </div>
          <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  data-active={isActive}
                  onClick={(e) => guardSensitive(item.id, e)}
                  className="nav-item"
                >
                  <Icon className="size-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.label}
                  {item.id === "inventory" && summary.lowStockCount > 0 && (
                    <span className="ml-auto text-[11px] tabular bg-warning/12 text-warning px-1.5 py-0.5 rounded-full font-medium">
                      {summary.lowStockCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 pb-5">
            <Button variant="secondary" className="w-full justify-start" onClick={() => setQuickOpen(true)}>
              <Plus className="size-4" />
              New entry
            </Button>
            <Link to="/" className="nav-item mt-1">
              <Store className="size-[18px]" />
              Customer shop
            </Link>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-header">
            <div className="md:hidden shrink-0">
              <BrandMark size="sm" />
            </div>
            <div className="header-identity">
              <p className="text-[15px] font-semibold tracking-tight truncate leading-tight">
                {profile.businessName || "BEANNEL"}
              </p>
              <p className="text-[11px] text-fg-subtle truncate mt-0.5">{user?.email || "Workspace"}</p>
            </div>
            <button type="button" className="header-search" onClick={() => setPaletteOpen(true)}>
              <Command className="size-3.5" />
              Search
              <kbd className="ml-auto text-[11px] tracking-wide text-fg-subtle">⌘K</kbd>
            </button>
            <div className="header-tools" ref={accountRef}>
              <button
                type="button"
                className="toolbar-btn search-toggle"
                aria-label="Search"
                onClick={() => setPaletteOpen(true)}
              >
                <Command className="size-4" />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                aria-label="Alerts"
                onClick={() => {
                  if (summary.lowStockCount + summary.outOfStockCount > 0) {
                    void navigate({ to: "/inventory" });
                  } else if (openDebt > 0) {
                    void navigate({ to: "/customers" });
                  } else {
                    toast("No alerts right now");
                  }
                }}
              >
                <Bell className="size-4" />
                {alertCount > 0 && <span className="alert-dot">{alertCount > 9 ? "9+" : alertCount}</span>}
              </button>
              <button
                type="button"
                className="toolbar-btn"
                aria-label="Account"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                <Avatar name={accountName} className="size-8" />
              </button>
              {accountOpen && (
                <div className="account-pop" role="menu">
                  <p className="account-email">{user?.email || profile.ownerName}</p>
                  <p className="account-status">
                    {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
                    {online ? "Connected" : "Offline"}
                  </p>
                  <button type="button" role="menuitem" onClick={toggleTheme}>
                    {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {dark ? "Light look" : "Dark look"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      if (isOwnerUnlocked) {
                        setOwnerUnlocked(false);
                        toast("Owner mode locked");
                      } else {
                        setPinOpen(true);
                      }
                    }}
                  >
                    {isOwnerUnlocked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                    {isOwnerUnlocked ? "Lock owner mode" : "Unlock owner mode"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      void navigate({ to: "/" });
                    }}
                  >
                    <Store className="size-4" />
                    Customer shop
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pb-24 md:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="dock" aria-label="Primary">
        {dock.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link key={item.id} to={item.to} data-active={isActive}>
              <Icon className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.7} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          data-active={["customers", "advisor", "settings"].includes(active)}
          onClick={() => setMoreOpen(true)}
        >
          <MoreHorizontal className="size-[22px]" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="sheet-scrim md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="text-[1.375rem] font-semibold tracking-tight mb-3">More</p>
            <div className="group-list" data-indent="icon">
              {NAV.filter((n) => ["customers", "advisor", "settings"].includes(n.id)).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={(e) => {
                      if (guardSensitive(item.id, e)) {
                        setMoreOpen(false);
                        return;
                      }
                      setMoreOpen(false);
                    }}
                    className="group-row"
                  >
                    <span className="size-8 rounded-[10px] bg-bg-subtle grid place-items-center">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[17px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => {
                setMoreOpen(false);
                setQuickOpen(true);
              }}
            >
              <Plus className="size-4" /> New entry
            </Button>
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onQuick={() => setQuickOpen(true)}
        onLockToggle={() => {
          if (isOwnerUnlocked) setOwnerUnlocked(false);
          else setPinOpen(true);
        }}
      />
      <QuickAction open={quickOpen} onClose={() => setQuickOpen(false)} />
      <PinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={() => {
          setOwnerUnlocked(true);
          toast("Owner mode unlocked");
        }}
      />
      <Toaster
        position="top-center"
        theme={dark ? "dark" : "light"}
        toastOptions={{
          className: "font-sans !rounded-[16px] !shadow-[var(--shadow-3)]",
        }}
      />
    </div>
  );
}
