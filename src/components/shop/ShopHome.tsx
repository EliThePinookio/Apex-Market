import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { CategoryChip } from "@/components/ui/category-tile";
import { ShopCard } from "@/components/shop/ShopCard";
import { CATALOG, shortFor } from "@/lib/beannel/catalog";
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

type SortKey = "new" | "price" | "price-desc" | "name";

export function ShopHome() {
  const search = useSearch({ strict: false }) as { q?: string; cat?: string; sort?: string; stock?: string };
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
  const q = (search.q || "").trim().toLowerCase();
  const sort = (search.sort as SortKey) || "new";
  const inStockOnly = search.stock === "in";
  const staff = canAccessOffice(profile);

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
    const unsub = subscribeShopListings(() => {
      void load();
    });
    return () => {
      live = false;
      unsub();
    };
  }, []);

  const cats = useMemo(() => CATALOG.map((c) => c.name), []);

  const shown = useMemo(() => {
    const filtered = groups.filter((g) => {
      if (cat !== "All" && g.category !== cat) return false;
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
  }, [groups, cat, q, sort, inStockOnly]);

  const featured = useMemo(
    () => [...groups].filter((g) => g.stock > 0).sort((a, b) => b.stock - a.stock).slice(0, 8),
    [groups],
  );
  const arrivals = useMemo(
    () => [...groups].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 8),
    [groups],
  );

  const cur = store?.currency || "GH₵";
  const wa = store?.whatsapp || "";
  const landing = cat === "All" && !q;

  const setCat = (name: string) => {
    void navigate({
      to: "/",
      search: { q: search.q, cat: name === "All" ? undefined : name, sort: search.sort, stock: search.stock },
    });
  };

  const setSort = (key: SortKey) => {
    void navigate({
      to: "/",
      search: { q: search.q, cat: search.cat, sort: key === "new" ? undefined : key, stock: search.stock },
    });
  };

  return (
    <div>
      <section className="shop-hero">
        <div className="shop-hero-banner">
          <p className="shop-kicker">Accra · Official store</p>
          <p className="shop-banner-title">BEANNEL</p>
          <p className="shop-hero-line">{store?.tagline || "Clothes, jewellery, watches — cloth from Ghana."}</p>
        </div>
      </section>

      <div className="shop-body">
        <div className="tag-row tag-row-scroll no-scrollbar pb-1">
          <CategoryChip name="All" plain active={cat === "All"} onClick={() => setCat("All")} />
          {cats.map((name) => (
            <CategoryChip key={name} name={name} active={cat === name} onClick={() => setCat(name)} />
          ))}
        </div>

        {landing && (
          <>
            <div className="mall-section">
              <h2>Shop by department</h2>
            </div>
            <div className="dept-grid">
              {CATALOG.map((item) => (
                <button key={item.id} type="button" className="dept-tile" onClick={() => setCat(item.name)}>
                  <span className="dept-photo">
                    <img src={item.cover} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="dept-label">{shortFor(item.name)}</span>
                </button>
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
                <button key={id} type="button" className="tag-chip" data-active={sort === id} onClick={() => setSort(id)}>
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="tag-chip"
                data-active={inStockOnly}
                onClick={() =>
                  void navigate({
                    to: "/",
                    search: { q: search.q, cat: search.cat, sort: search.sort, stock: inStockOnly ? undefined : "in" },
                  })
                }
              >
                In stock
              </button>
            </div>
          </div>
        )}

        {landing && featured.length > 0 && (
          <>
            <div className="mall-section">
              <h2>Featured</h2>
              <span className="text-[12px] text-fg-subtle tabular">{groups.length} listed</span>
            </div>
            <div className="mall-grid">
              {featured.map((g) => (
                <ShopCard key={`f-${g.slug}`} group={g} currency={cur} saved={savedIds.has(g.variants[0]?.listingId)} />
              ))}
            </div>
            {arrivals.length > 0 && (
              <>
                <div className="mall-section">
                  <h2>New arrivals</h2>
                </div>
                <div className="mall-grid">
                  {arrivals.map((g) => (
                    <ShopCard key={`n-${g.slug}`} group={g} currency={cur} saved={savedIds.has(g.variants[0]?.listingId)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {!landing && (
          <div className="mall-section">
            <h2>{cat === "All" ? "Results" : cat}</h2>
            {shown.length > 0 && (
              <span className="text-[12px] text-fg-subtle tabular">
                {shown.length} item{shown.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        {!ready ? (
          <div className="mall-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="mall-card shop-card-skel" />
            ))}
          </div>
        ) : failed ? (
          <div className="shop-empty">
            <p className="display-title text-[1.75rem]">Could not load the shop</p>
            <p className="text-[15px] text-fg-muted mt-2 max-w-sm mx-auto">{error || "Check your connection and try again."}</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="shop-empty">
            <p className="display-title text-[1.75rem]">{q ? "No matching pieces" : cat !== "All" ? `No ${cat} listed yet` : "New stock lands here"}</p>
            <p className="text-[15px] text-fg-muted mt-2 max-w-sm mx-auto">
              {q
                ? "Try another name or department."
                : staff
                  ? "Open Stock, add a piece with a selling price, and mark it On the shop. It publishes here for customers."
                  : "Browse departments now. Items appear the moment the store lists them."}
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
        ) : landing && featured.length > 0 ? null : (
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
