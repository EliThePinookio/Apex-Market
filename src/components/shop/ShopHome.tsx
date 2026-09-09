import { Link, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { CategoryChip } from "@/components/ui/category-tile";
import { ShopCard } from "@/components/shop/ShopCard";
import { GOLD_AUDIENCE, GOLD_DEPARTMENTS, matchesAudience, matchesCategory, shortFor } from "@/lib/beannel/catalog";
import {
  fetchShopListings,
  fetchShopStorefront,
  groupListings,
  subscribeShopListings,
  whatsappHref,
  type ShopGroup,
  type ShopStorefront,
} from "@/lib/beannel/shop";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { canAccessOffice } from "@/lib/beannel/account";
import { useSaved } from "@/lib/beannel/wishlist";
import { LiquidGlass } from "@/components/liquid-glass";

type SortKey = "new" | "price" | "price-desc" | "name";

export function ShopHome() {
  const search = useSearch({ strict: false }) as { q?: string; cat?: string; who?: string; sort?: string; stock?: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { profile } = useBeannelAuth();
  const saved = useSaved();
  const savedIds = useMemo(() => new Set(saved.map((s) => s.listingId)), [saved]);
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [groups, setGroups] = useState<ShopGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const cat = search.cat || "All";
  const who = (search.who || "all").toLowerCase();
  const q = (search.q || "").trim().toLowerCase();
  const sort = (search.sort as SortKey) || "new";
  const inStockOnly = search.stock === "in";
  const staff = canAccessOffice(profile);
  const onFloor = pathname.startsWith("/shop") || Boolean(q) || cat !== "All" || who !== "all";
  const landing = !onFloor;

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [info, listings] = await Promise.all([fetchShopStorefront(), fetchShopListings()]);
        if (!live) return;
        startTransition(() => {
          setStore(info);
          setFailed(false);
          setError(null);
          setGroups(groupListings(listings));
          setReady(true);
        });
      } catch (err) {
        if (!live) return;
        setFailed(true);
        setError(err instanceof Error ? err.message : "Could not open the shop.");
        setReady(true);
      }
    };
    void load();
    let timer: number | undefined;
    const unsub = subscribeShopListings(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 400);
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  const cats = useMemo(() => GOLD_DEPARTMENTS.map((c) => c.name), []);

  const shown = useMemo(() => {
    const filtered = groups.filter((g) => {
      if (cat !== "All" && !matchesCategory(g.category, cat)) return false;
      if (who !== "all" && !matchesAudience(g.audience, who)) return false;
      if (inStockOnly && g.stock <= 0) return false;
      if (!q) return true;
      const hay = `${g.name} ${g.category} ${g.garmentType} ${g.variants.map((v) => v.sku).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sort === "price") return a.priceFrom - b.priceFrom;
      if (sort === "price-desc") return b.priceFrom - a.priceFrom;
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    return copy;
  }, [groups, cat, who, q, sort, inStockOnly]);

  const cur = store?.currency || "GH₵";
  const wa = store?.whatsapp || "";

  const goFloor = (name: string) => {
    void navigate({
      to: "/shop",
      search: { q: search.q, cat: name === "All" ? undefined : name, who: search.who, sort: search.sort, stock: search.stock },
    });
  };

  const setSort = (key: SortKey) => {
    void navigate({
      to: "/shop",
      search: { q: search.q, cat: search.cat, who: search.who, sort: key === "new" ? undefined : key, stock: search.stock },
    });
  };

  return (
    <div className={landing ? "shop-home is-landing" : "shop-home is-floor"}>
      <section className="shop-intro-hero" aria-label="BEANNEL">
        <p className="shop-kicker">Accra · Official store</p>
        <p className="shop-banner-title">BEANNEL</p>
        <p className="shop-hero-line">{store?.tagline || "Clothes · Jewelry · Watches · Fashion"}</p>
      </section>

      <div className="shop-body">
        <div className="tag-row tag-row-scroll no-scrollbar pb-1">
          <CategoryChip
            name="All"
            plain
            active={landing || (cat === "All" && who === "all")}
            onClick={() => void navigate({ to: landing ? "/" : "/shop" })}
          />
          {GOLD_AUDIENCE.map((item) => (
            <CategoryChip
              key={item.id}
              name={item.name}
              plain
              active={who === item.audience}
              onClick={() =>
                void navigate({
                  to: "/shop",
                  search: { q: search.q, cat: search.cat, who: item.audience, sort: search.sort, stock: search.stock },
                })
              }
            />
          ))}
          {cats.map((name) => (
            <CategoryChip key={name} name={name} active={cat === name} onClick={() => goFloor(name)} />
          ))}
        </div>

        {landing && (
          <>
            <div className="mall-section">
              <h2>Shop by who</h2>
            </div>
            <div className="who-grid">
              {GOLD_AUDIENCE.map((item) => (
                <LiquidGlass key={item.id} as={Link} to="/shop" search={{ who: item.audience }} className="dept-tile" host>
                  <span className="dept-photo">
                    <img src={item.cover} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="dept-label">{item.name}</span>
                </LiquidGlass>
              ))}
            </div>
            <div className="mall-section">
              <h2>Shop by department</h2>
            </div>
            <div className="dept-grid">
              {GOLD_DEPARTMENTS.map((item) => (
                <LiquidGlass key={item.id} as={Link} to="/shop" search={{ cat: item.name }} className="dept-tile" host>
                  <span className="dept-photo">
                    <img src={item.cover} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="dept-label">{shortFor(item.name)}</span>
                </LiquidGlass>
              ))}
            </div>
          </>
        )}

        {q && (
          <p className="text-[13px] text-fg-muted mt-3">
            Results for “{search.q}”{cat !== "All" ? ` in ${cat}` : ""}
          </p>
        )}

        {!landing && (
          <div className="shop-toolbar">
            <div className="tag-row">
              {(
                [
                  ["new", "Newest"],
                  ["price", "Price ↑"],
                  ["price-desc", "Price ↓"],
                  ["name", "Name"],
                ] as const
              ).map(([id, label]) => (
                <LiquidGlass key={id} as="button" type="button" className="tag-chip" data-active={sort === id} onClick={() => setSort(id)} host>
                  {label}
                </LiquidGlass>
              ))}
              <LiquidGlass
                as="button"
                type="button"
                className="tag-chip"
                data-active={inStockOnly}
                host
                onClick={() =>
                  void navigate({
                    to: "/shop",
                    search: { q: search.q, cat: search.cat, who: search.who, sort: search.sort, stock: inStockOnly ? undefined : "in" },
                  })
                }
              >
                In stock
              </LiquidGlass>
            </div>
          </div>
        )}

        {!landing && (
          <div className="mall-section">
            <h2>{cat === "All" ? "The floor" : cat}</h2>
            {shown.length > 0 && (
              <span className="text-[12px] text-fg-subtle tabular">
                {shown.length} item{shown.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        {!ready ? (
          landing ? null : (
            <div className="mall-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="mall-card shop-card-skel" />
              ))}
            </div>
          )
        ) : failed ? (
          <div className="shop-empty">
            <p className="display-title text-[1.75rem]">Could not load the shop</p>
            <p className="text-[15px] text-fg-muted mt-2 max-w-sm mx-auto">{error || "Check your connection and try again."}</p>
          </div>
        ) : landing ? (
          groups.length === 0 ? (
            <div className="shop-empty">
              <p className="display-title text-[1.75rem]">New stock lands here</p>
              <p className="text-[15px] text-fg-muted mt-2 max-w-sm mx-auto">
                {staff
                  ? "Open Stock, add a piece with a selling price, and mark it On the shop. It publishes here for customers."
                  : "Tap a department. Pieces appear the moment the store lists them."}
              </p>
              {staff ? (
                <Link to="/inventory" className="shop-wa">
                  Open stock
                </Link>
              ) : wa ? (
                <a className="shop-wa" href={whatsappHref(wa, "Hello BEANNEL, I am browsing the shop.")}>
                  <MessageCircle className="size-4" />
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>
          ) : null
        ) : shown.length === 0 ? (
          <div className="shop-empty">
            <p className="display-title text-[1.75rem]">{q ? "No matching pieces" : `No ${cat} listed yet`}</p>
            <p className="text-[15px] text-fg-muted mt-2 max-w-sm mx-auto">
              {q ? "Try another name or department." : "Browse another department, or check back when new stock lands."}
            </p>
          </div>
        ) : (
          <div className="mall-grid">
            {shown.map((g) => (
              <ShopCard key={g.slug} group={g} currency={cur} saved={savedIds.has(g.variants[0]?.listingId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
