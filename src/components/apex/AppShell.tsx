import { Link, Navigate, Outlet, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import {
  Bell,
  BarChart3,
  ChevronDown,
  ClipboardList,
  Command,
  Home,
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
  ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { ClothGround } from "@/components/ui/cloth-ground";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/apex/CommandPalette";
import { OfficeChat } from "@/components/apex/OfficeChat";
import { PinModal } from "@/components/apex/PinModal";
import { QuickAction } from "@/components/apex/QuickAction";
import { ShopShell } from "@/components/shop/ShopShell";
import { afterLoginPath, canAccessOffice, isOfficePath, kindFromProfile } from "@/lib/beannel/account";
import { applyDark, readDark } from "@/lib/beannel/theme";
import { useApex } from "@/lib/apex/store";
import { useBeannelAuth } from "@/lib/beannel/auth";
import type { NavId } from "@/types";

const NAV: Array<{ id: NavId; to: string; label: string; icon: typeof Home; group: string }> = [
  { id: "dashboard", to: "/manage", label: "Home", icon: Home, group: "Overview" },
  { id: "orders", to: "/orders", label: "Orders", icon: ClipboardList, group: "Sales" },
  { id: "pos", to: "/pos", label: "Point of sale", icon: ShoppingCart, group: "Sales" },
  { id: "inventory", to: "/inventory", label: "Products", icon: Package, group: "Catalog" },
  { id: "customers", to: "/customers", label: "Customers", icon: Users, group: "Customers" },
  { id: "ledger", to: "/ledger", label: "Finance", icon: Receipt, group: "Finance" },
  { id: "advisor", to: "/advisor", label: "Analytics", icon: BarChart3, group: "Finance" },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings, group: "Settings" },
];

function pathToNav(pathname: string): NavId {
  if (pathname.startsWith("/orders")) return "orders";
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
  return isOfficePath(pathname);
}

function isShopPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/shop" ||
    pathname.startsWith("/shop/") ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname === "/saved" ||
    pathname === "/track" ||
    pathname.startsWith("/track/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/")
  );
}

export function AppShell() {
  const auth = useBeannelAuth();
  const store = useApex();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { as?: "staff" | "customer"; next?: string };
  const [layoutQa, setLayoutQa] = useState(() => {
    if (typeof window === "undefined") return false;
    return import.meta.env.DEV && sessionStorage.getItem("beannel_layout_qa") === "1";
  });

  useEffect(() => {
    if (import.meta.env.DEV && sessionStorage.getItem("beannel_layout_qa") === "1") {
      setLayoutQa(true);
    }
  }, []);

  if (pathname === "/login") {
    if (auth.user && !auth.isLoading) {
      return <Navigate to={afterLoginPath(kindFromProfile(auth.profile, auth.user?.email), search.next)} />;
    }
    return <Outlet />;
  }

  if (isShopPath(pathname)) {
    if (auth.isLoading && !auth.user) return <ConnectingScreen label="Opening the shop" />;
    return <ShopShell />;
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
    return <Navigate to="/login" search={{ next: isManagePath(pathname) ? pathname : "/manage" }} />;
  }
  if (auth.isLoading && !layoutQa) return <ConnectingScreen label="Checking your account" />;
  if (!canAccessOffice(auth.profile, auth.user?.email) && !layoutQa) {
    return <Navigate to="/" />;
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
  const { profile, summary, customers, isOwnerUnlocked, setOwnerUnlocked, pendingShopCount } = useApex();
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
  const [dark, setDark] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preferDark = readDark();
    setDark(preferDark);
    applyDark(preferDark);
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
    applyDark(next);
  };

  const dock = useMemo(
    () => NAV.filter((n) => ["dashboard", "orders", "pos", "inventory"].includes(n.id)),
    [],
  );
  const openDebt = customers.reduce((s, c) => s + c.debtBalance, 0);
  const alertCount = summary.lowStockCount + summary.outOfStockCount + (openDebt > 0 ? 1 : 0) + pendingShopCount;
  const accountName = profile.ownerName || user?.email || "BEANNEL";
  const navGroups = useMemo(() => {
    const groups: Array<{ label: string; items: typeof NAV }> = [];
    for (const item of NAV.filter((n) => n.id !== "settings")) {
      const last = groups[groups.length - 1];
      if (!last || last.label !== item.group) groups.push({ label: item.group, items: [item] });
      else last.items.push(item);
    }
    return groups;
  }, []);

  const guardSensitive = (id: NavId, e: { preventDefault: () => void }) => {
    if ((id === "advisor" || id === "settings") && profile.isPinLocked && !isOwnerUnlocked) {
      e.preventDefault();
      setPinOpen(true);
      return true;
    }
    return false;
  };

  return (
    <div className="office-frame h-dvh overflow-hidden">
      <ClothGround />
      <header className="office-topbar">
        <div className="office-store">
          <BrandMark size="sm" />
          <div className="min-w-0">
            <p className="office-store-name">{profile.businessName || "BEANNEL"}</p>
            <p className="office-store-meta">{user?.email || "Admin"}</p>
          </div>
          <ChevronDown className="size-3.5 opacity-70 shrink-0 hidden sm:block" />
        </div>
        <button type="button" className="office-search" onClick={() => setPaletteOpen(true)}>
          <Command className="size-3.5" />
          Search
          <kbd>⌘K</kbd>
        </button>
        <div className="office-top-actions" ref={accountRef}>
          <button
            type="button"
            className="office-icon-btn md:hidden"
            aria-label="Search"
            onClick={() => setPaletteOpen(true)}
          >
            <Command className="size-4" />
          </button>
          <ThemeToggle className="office-icon-btn" />
          <button
            type="button"
            className="office-icon-btn"
            aria-label="Alerts"
            onClick={() => {
              if (pendingShopCount > 0) void navigate({ to: "/orders" });
              else if (summary.lowStockCount + summary.outOfStockCount > 0) void navigate({ to: "/inventory" });
              else if (openDebt > 0) void navigate({ to: "/customers" });
              else toast("You're all caught up");
            }}
          >
            <Bell className="size-4" />
            {alertCount > 0 && <span className="office-badge">{alertCount > 9 ? "9+" : alertCount}</span>}
          </button>
          <button
            type="button"
            className="office-avatar-btn"
            aria-label="Account"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((v) => !v)}
          >
            <Avatar name={accountName} className="size-7" />
          </button>
          {accountOpen && (
            <div className="account-pop office-pop" role="menu">
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
                View online store
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
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="office-body">
        <aside className="office-nav">
          <nav className="office-nav-scroll">
            {navGroups.map((group) => (
              <div key={group.label} className="office-nav-group">
                <p className="office-nav-label">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      data-active={isActive}
                      onClick={(e) => guardSensitive(item.id, e)}
                      className="office-nav-item"
                    >
                      <Icon className="size-4" strokeWidth={isActive ? 2.2 : 1.8} />
                      {item.label}
                      {item.id === "inventory" && summary.lowStockCount > 0 && (
                        <span className="office-count">{summary.lowStockCount}</span>
                      )}
                      {item.id === "orders" && pendingShopCount > 0 && (
                        <span className="office-count is-accent">{pendingShopCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="office-nav-foot">
            <Link to="/" className="office-nav-item">
              <ExternalLink className="size-4" />
              Online store
            </Link>
            <Link
              to="/settings"
              data-active={active === "settings"}
              onClick={(e) => guardSensitive("settings", e)}
              className="office-nav-item"
            >
              <Settings className="size-4" />
              Settings
            </Link>
            <button type="button" className="office-nav-item" onClick={() => setQuickOpen(true)}>
              <Plus className="size-4" />
              Add
            </button>
          </div>
        </aside>

        <main className="office-main">
          <Outlet />
        </main>
      </div>

      <nav className="office-dock" aria-label="Admin">
        {dock.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link key={item.id} to={item.to} data-active={isActive}>
              <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.7} />
              {item.id === "inventory" ? "Products" : item.id === "pos" ? "POS" : item.label}
            </Link>
          );
        })}
        <button
          type="button"
          data-active={["ledger", "customers", "advisor", "settings"].includes(active)}
          onClick={() => setMoreOpen(true)}
        >
          <MoreHorizontal className="size-5" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="sheet-scrim md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="text-[1.25rem] font-semibold tracking-tight mb-3">More</p>
            <div className="group-list" data-indent="icon">
              {NAV.filter((n) => ["customers", "ledger", "advisor", "settings"].includes(n.id)).map((item) => {
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
              <Link to="/" onClick={() => setMoreOpen(false)} className="group-row">
                <span className="size-8 rounded-[10px] bg-bg-subtle grid place-items-center">
                  <Store className="size-4" />
                </span>
                <span className="text-[17px] font-medium">Online store</span>
              </Link>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => {
                setMoreOpen(false);
                setQuickOpen(true);
              }}
            >
              <Plus className="size-4" /> Add
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
      <OfficeChat
        locked={profile.isPinLocked && !isOwnerUnlocked}
        onUnlock={() => setPinOpen(true)}
      />
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
          className: "font-sans !rounded-[12px] !shadow-[var(--shadow-3)]",
        }}
      />
    </div>
  );
}
