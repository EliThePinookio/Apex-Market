import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Heart, MessageCircle, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShopCard } from "@/components/shop/ShopCard";
import { money } from "@/lib/apex/money";
import { addToBag } from "@/lib/beannel/cart";
import {
  fetchShopListings,
  fetchShopStorefront,
  groupListings,
  subscribeShopListings,
  whatsappHref,
  type ShopGroup,
  type ShopStorefront,
} from "@/lib/beannel/shop";
import { slugProduct } from "@/lib/beannel/shop-meta";
import { isSaved, toggleSaved, useSaved } from "@/lib/beannel/wishlist";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { cn } from "@/lib/cn";

export function ShopProduct() {
  useSaved();
  const { productId } = useParams({ strict: false }) as { productId: string };
  const navigate = useNavigate();
  const { user } = useBeannelAuth();
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [group, setGroup] = useState<ShopGroup | null>(null);
  const [related, setRelated] = useState<ShopGroup[]>([]);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [info, listings] = await Promise.all([fetchShopStorefront(), fetchShopListings()]);
        if (!live) return;
        setStore(info);
        const groups = groupListings(listings);
        const found = groups.find((g) => g.slug === productId);
        setGroup(found || null);
        const first = found?.variants.find((v) => v.stock > 0) || found?.variants[0];
        setSize((prev) => prev || first?.size || "");
        setRelated(groups.filter((g) => g.slug !== productId && g.category === found?.category).slice(0, 4));
      } finally {
        if (live) setReady(true);
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
  }, [productId]);

  const variant = useMemo(() => {
    if (!group) return null;
    if (!size) return group.variants[0] || null;
    return group.variants.find((v) => v.size === size) || group.variants[0] || null;
  }, [group, size]);

  const gallery = useMemo(() => {
    if (!group || !variant) return [];
    const fromGroup = group.images && group.images.length ? group.images : [];
    const fromVariant = variant.images && variant.images.length ? variant.images : [variant.image];
    const list = (fromGroup.length ? fromGroup : fromVariant).filter(Boolean);
    return [...new Set(list)];
  }, [group, variant]);

  useEffect(() => {
    if (gallery[0]) setPhoto(gallery[0]);
    else if (variant?.image) setPhoto(variant.image);
  }, [gallery, variant?.image]);

  if (!ready) return <div className="shop-body py-20 text-center text-fg-muted">Opening the piece…</div>;
  if (!group || !variant) {
    return (
      <div className="shop-body py-20 text-center space-y-4">
        <p className="display-title text-[1.75rem]">This item is no longer listed</p>
        <Button variant="secondary" onClick={() => void navigate({ to: "/" })}>
          Continue shopping
        </Button>
      </div>
    );
  }

  const cur = store?.currency || "GH₵";
  const max = Math.max(1, variant.stock);
  const out = variant.stock <= 0;
  const sizes = group.variants.filter((v) => v.size);
  const saved = isSaved(variant.listingId);
  const slug = group.slug || slugProduct(group.name, group.category);
  const compareAt = variant.compareAt || group.compareAt;
  const description = variant.description || group.description || "";

  const bagPayload = {
    productId: variant.productId,
    listingId: variant.listingId,
    name: variant.name,
    sku: variant.sku,
    size: variant.size,
    price: variant.price,
    image: variant.image,
    category: variant.category,
  };

  const add = () => {
    if (out) return;
    addToBag(bagPayload, qty);
    toast.success("Added to cart");
  };

  const buyNow = () => {
    if (out) return;
    addToBag(bagPayload, qty);
    if (!user) {
      void navigate({ to: "/login", search: { as: "customer", next: "/checkout" } });
      return;
    }
    void navigate({ to: "/checkout" });
  };

  const waText = `Hello BEANNEL, I want ${group.name}${variant.size ? ` in ${variant.size}` : ""} (${variant.sku}).`;

  return (
    <div>
      <div className="shop-product">
        <div className="shop-product-photo">
          <img src={photo || variant.image} alt="" />
          {gallery.length > 1 && (
            <div className="shop-thumbs">
              {gallery.map((src) => (
                <button
                  key={src.slice(-24)}
                  type="button"
                  className={cn("shop-thumb", src === photo && "is-on")}
                  onClick={() => setPhoto(src)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="shop-product-copy">
          <p className="shop-card-cat">{group.category}</p>
          <h1 className="display-title text-[2rem] leading-tight mt-1">{group.name}</h1>
          {group.garmentType ? <p className="text-[15px] text-fg-muted mt-1">{group.garmentType}</p> : null}
          <p className="tabular text-[1.375rem] font-semibold mt-4">
            {compareAt && compareAt > variant.price ? (
              <>
                <s className="text-fg-subtle font-medium mr-2 text-[1.05rem]">{money(compareAt, cur)}</s>
                {money(variant.price, cur)}
              </>
            ) : (
              money(variant.price, cur)
            )}
          </p>
          <p className="text-[13px] text-fg-subtle mt-1">{out ? "Currently unavailable" : `${variant.stock} in stock`}</p>

          {sizes.length > 0 && (
            <div className="mt-5">
              <p className="text-[13px] font-medium text-fg-muted mb-2">Size</p>
              <div className="tag-row">
                {sizes.map((v) => (
                  <button
                    key={v.listingId}
                    type="button"
                    className="tag-chip"
                    data-active={v.size === variant.size}
                    disabled={v.stock <= 0}
                    onClick={() => {
                      setSize(v.size);
                      setQty(1);
                    }}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="shop-stepper">
              <button type="button" aria-label="Less" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                <Minus className="size-4" />
              </button>
              <span className="tabular">{qty}</span>
              <button type="button" aria-label="More" onClick={() => setQty((n) => Math.min(max, n + 1))}>
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              className={cn("mall-heart is-inline", saved && "is-on")}
              aria-label={saved ? "Remove from saved" : "Save"}
              onClick={() => {
                const on = toggleSaved({
                  productId: variant.productId,
                  listingId: variant.listingId,
                  slug,
                  name: variant.name,
                  sku: variant.sku,
                  size: variant.size,
                  price: variant.price,
                  image: variant.image,
                  category: variant.category,
                });
                toast.success(on ? "Saved" : "Removed from saved");
              }}
            >
              <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" className="w-full" disabled={out} onClick={buyNow}>
              {out ? "Out of stock" : "Buy now"}
            </Button>
            <Button size="lg" variant="secondary" className="w-full" disabled={out} onClick={add}>
              Add to cart
            </Button>
            {store?.whatsapp ? (
              <a className="shop-wa" href={whatsappHref(store.whatsapp, waText)}>
                <MessageCircle className="size-4" />
                Ask on WhatsApp
              </a>
            ) : null}
          </div>

          {description ? <div className="shop-desc">{description}</div> : null}
        </div>
      </div>
      {related.length > 0 && (
        <section className="shop-body py-8">
          <h2 className="text-[1.05rem] font-semibold mb-4">You may also like</h2>
          <div className="mall-grid">
            {related.map((g) => (
              <ShopCard key={g.slug} group={g} currency={cur} saved={isSaved(g.variants[0]?.listingId || g.slug)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
