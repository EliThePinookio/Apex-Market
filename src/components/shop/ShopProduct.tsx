import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { addToBag } from "@/lib/beannel/cart";
import {
  fetchShopListings,
  fetchShopStorefront,
  groupListings,
  whatsappHref,
  type ShopGroup,
  type ShopStorefront,
} from "@/lib/beannel/shop";

export function ShopProduct() {
  const { productId } = useParams({ strict: false }) as { productId: string };
  const navigate = useNavigate();
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [group, setGroup] = useState<ShopGroup | null>(null);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchShopStorefront(), fetchShopListings()])
      .then(([info, listings]) => {
        if (!live) return;
        setStore(info);
        const found = groupListings(listings).find((g) => g.slug === productId);
        setGroup(found || null);
        const first = found?.variants.find((v) => v.stock > 0) || found?.variants[0];
        setSize(first?.size || "");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [productId]);

  const variant = useMemo(() => {
    if (!group) return null;
    if (!size) return group.variants[0] || null;
    return group.variants.find((v) => v.size === size) || group.variants[0] || null;
  }, [group, size]);

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

  const add = () => {
    if (out) return;
    addToBag(
      {
        productId: variant.productId,
        listingId: variant.listingId,
        name: variant.name,
        sku: variant.sku,
        size: variant.size,
        price: variant.price,
        image: variant.image,
        category: variant.category,
      },
      qty,
    );
    toast.success("Added to cart");
  };

  const waText = `Hello BEANNEL, I want ${group.name}${variant.size ? ` in ${variant.size}` : ""} (${variant.sku}).`;

  return (
    <div className="shop-product">
      <div className="shop-product-photo">
        <img src={variant.image} alt="" />
      </div>
      <div className="shop-product-copy">
        <p className="shop-card-cat">{group.category}</p>
        <h1 className="display-title text-[2rem] leading-tight mt-1">{group.name}</h1>
        {group.garmentType ? <p className="text-[15px] text-fg-muted mt-1">{group.garmentType}</p> : null}
        <p className="tabular text-[1.375rem] font-semibold mt-4">{money(variant.price, cur)}</p>

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
          <p className="text-[13px] text-fg-subtle tabular">{out ? "Out of stock" : `${variant.stock} in stock`}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" className="w-full" disabled={out} onClick={add}>
            {out ? "Out of stock" : "Add to cart"}
          </Button>
          {store?.whatsapp ? (
            <a className="shop-wa" href={whatsappHref(store.whatsapp, waText)}>
              <MessageCircle className="size-4" />
              Ask on WhatsApp
            </a>
          ) : null}
          <Link to="/" className="text-center text-[15px] text-fg-muted min-h-11 grid place-items-center">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
