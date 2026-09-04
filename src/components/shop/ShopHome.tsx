import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandRule, Wordmark } from "@/components/ui/brand-mark";
import { CategoryChip } from "@/components/ui/category-tile";
import { money } from "@/lib/apex/money";
import { CATALOG } from "@/lib/beannel/catalog";
import {
  fetchShopListings,
  fetchShopStorefront,
  groupListings,
  whatsappHref,
  type ShopGroup,
  type ShopStorefront,
} from "@/lib/beannel/shop";

export function ShopHome() {
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [groups, setGroups] = useState<ShopGroup[]>([]);
  const [cat, setCat] = useState("All");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchShopStorefront(), fetchShopListings()])
      .then(([info, listings]) => {
        if (!live) return;
        setStore(info);
        setGroups(groupListings(listings));
      })
      .catch((err) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : "Could not open the shop.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const cats = useMemo(() => {
    const names = new Set(groups.map((g) => g.category));
    return CATALOG.filter((c) => names.has(c.name)).map((c) => c.name);
  }, [groups]);

  const shown = cat === "All" ? groups : groups.filter((g) => g.category === cat);
  const cur = store?.currency || "GH₵";
  const wa = store?.whatsapp || "";

  return (
    <div>
      <section className="shop-hero">
        <img src="/brand/lifestyle.jpg" alt="" />
      </section>
      <div className="shop-intro">
        <p className="shop-kicker">The house</p>
        <h1>
          <Wordmark />
        </h1>
        <p className="shop-hero-line">{store?.tagline || "Clothes · Jewelry · Watches · Fashion"}</p>
        <BrandRule />
      </div>

      <div className="shop-body">
        {cats.length > 0 && (
          <div className="tag-row tag-row-scroll no-scrollbar pb-1">
            <CategoryChip name="All" plain active={cat === "All"} onClick={() => setCat("All")} />
            {cats.map((name) => (
              <CategoryChip key={name} name={name} active={cat === name} onClick={() => setCat(name)} />
            ))}
          </div>
        )}

        {!ready ? (
          <div className="shop-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shop-card shop-card-skel" />
            ))}
          </div>
        ) : error ? (
          <p className="text-[15px] text-fg-muted py-16 text-center">{error}</p>
        ) : shown.length === 0 ? (
          <div className="shop-empty">
            <p className="display-title text-[1.75rem]">The racks are being dressed</p>
            <p className="text-[15px] text-fg-muted mt-2 max-w-sm mx-auto">
              Pieces go live here as soon as they are listed in stock. Message the house on WhatsApp in the meantime.
            </p>
            {wa ? (
              <a className="shop-wa" href={whatsappHref(wa, "Hello BEANNEL, I would like to see what is in the house.")}>
                <MessageCircle className="size-4" />
                WhatsApp the house
              </a>
            ) : null}
          </div>
        ) : (
          <div className="shop-grid">
            {shown.map((g) => (
              <Link key={g.slug} to="/shop/$productId" params={{ productId: g.slug }} className="shop-card">
                <img src={g.image} alt="" />
                <span className="shop-card-scrim" />
                <span className="shop-card-body">
                  <span className="shop-card-cat">{g.category}</span>
                  <span className="shop-card-name">{g.name}</span>
                  <span className="shop-card-price">
                    {g.variants.length > 1 ? "From " : ""}
                    {money(g.priceFrom, cur)}
                  </span>
                </span>
                {g.stock <= 0 && <span className="shop-sold">Held</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

