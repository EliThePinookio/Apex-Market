import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryChip } from "@/components/ui/category-tile";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { CATALOG, shortFor } from "@/lib/beannel/catalog";
import {
  fetchShopListings,
  fetchShopStorefront,
  groupListings,
  listingsFromProducts,
  publishListing,
  whatsappHref,
  type ShopGroup,
  type ShopStorefront,
} from "@/lib/beannel/shop";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { kindFromUser } from "@/lib/beannel/account";
import { addToBag } from "@/lib/beannel/cart";
import { toast } from "sonner";

export function ShopHome() {
  const search = useSearch({ strict: false }) as { q?: string; cat?: string };
  const navigate = useNavigate();
  const { user, businessId } = useBeannelAuth();
  const { products, ready: stockReady } = useApex();
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [groups, setGroups] = useState<ShopGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const cat = search.cat || "All";
  const q = (search.q || "").trim().toLowerCase();
  const staff = kindFromUser(user) === "staff" && Boolean(user);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (staff && businessId && products.length) {
          await Promise.all(
            products
              .filter((p) => p.listed !== false && p.sellPrice > 0)
              .map((p) => publishListing(businessId, p).catch(() => undefined)),
          );
        }
        const [info, listings] = await Promise.all([fetchShopStorefront(), fetchShopListings()]);
        if (!live) return;
        setStore(info);
        let next = listings;
        if (next.length === 0 && products.length) next = listingsFromProducts(products);
        setGroups(groupListings(next));
      } catch (err) {
        if (!live) return;
        if (products.length) {
          setGroups(groupListings(listingsFromProducts(products)));
        } else {
          setError(err instanceof Error ? err.message : "Could not open the shop.");
        }
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [user, businessId, products, stockReady, staff]);

  const cats = useMemo(() => CATALOG.map((c) => c.name), []);

  const shown = useMemo(() => {
    return groups.filter((g) => {
      if (cat !== "All" && g.category !== cat) return false;
      if (!q) return true;
      const hay = `${g.name} ${g.category} ${g.garmentType} ${g.variants.map((v) => v.sku).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groups, cat, q]);

  const cur = store?.currency || "GH₵";
  const wa = store?.whatsapp || "";
  const landing = cat === "All" && !q;

  const setCat = (name: string) => {
    void navigate({ to: "/", search: { q: search.q, cat: name === "All" ? undefined : name } });
  };

  return (
    <div>
      <section className="shop-hero">
        <img src="/brand/lifestyle.jpg" alt="" />
        <div className="shop-hero-banner">
          <p className="shop-kicker">Official store</p>
          <p className="shop-banner-title">BEANNEL</p>
          <p className="shop-hero-line">Clothes, jewellery, watches — shop like the big markets.</p>
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
                  <img src={item.cover} alt="" />
                  <span>{shortFor(item.name)}</span>
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

        <div className="mall-section">
          <h2>{landing ? "For you" : cat === "All" ? "Results" : cat}</h2>
          {shown.length > 0 && (
            <span className="text-[12px] text-fg-subtle tabular">
              {shown.length} item{shown.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {!ready ? (
          <div className="mall-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="mall-card shop-card-skel" />
            ))}
          </div>
        ) : error ? (
          <p className="text-[15px] text-fg-muted py-16 text-center">{error}</p>
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
        ) : (
          <div className="mall-grid">
            {shown.map((g) => {
              const v = g.variants.find((x) => x.stock > 0) || g.variants[0];
              return (
                <article key={g.slug} className="mall-card">
                  <Link to="/shop/$productId" params={{ productId: g.slug }} className="mall-photo">
                    <img src={g.image} alt="" />
                    {g.stock <= 0 && <span className="shop-sold">Out of stock</span>}
                  </Link>
                  <div className="mall-body">
                    <p className="mall-cat">{g.category}</p>
                    <Link to="/shop/$productId" params={{ productId: g.slug }} className="mall-name">
                      {g.name}
                    </Link>
                    <p className="mall-price">
                      {g.variants.length > 1 ? "From " : ""}
                      {money(g.priceFrom, cur)}
                    </p>
                    <button
                      type="button"
                      className="mall-add"
                      disabled={!v || v.stock <= 0}
                      onClick={() => {
                        if (!v || v.stock <= 0) return;
                        addToBag({
                          productId: v.productId,
                          listingId: v.listingId,
                          name: v.name,
                          sku: v.sku,
                          size: v.size,
                          price: v.price,
                          image: v.image,
                          category: v.category,
                        });
                        toast.success("Added to cart");
                      }}
                    >
                      Add to cart
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
