import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { addToBag } from "@/lib/beannel/cart";
import { fetchShopStorefront, type ShopStorefront } from "@/lib/beannel/shop";
import { removeSaved, useSaved } from "@/lib/beannel/wishlist";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ShopSaved() {
  const items = useSaved();
  const navigate = useNavigate();
  const [store, setStore] = useState<ShopStorefront | null>(null);

  useEffect(() => {
    void fetchShopStorefront().then(setStore).catch(() => undefined);
  }, []);

  const cur = store?.currency || "GH₵";

  if (items.length === 0) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <Heart className="size-8 mx-auto text-fg-subtle mb-3" />
        <p className="display-title text-[1.75rem] mb-1">Nothing saved</p>
        <p className="text-[15px] text-fg-muted mb-5">Tap the heart on a piece to keep it here.</p>
        <Button className="w-full" onClick={() => void navigate({ to: "/" })}>Browse the shop</Button>
      </div>
    );
  }

  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[2rem] mb-5">Saved</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.listingId} className="shop-line">
            <Link to="/shop/$productId" params={{ productId: item.slug }} className="shrink-0">
              <img src={item.image} alt="" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/shop/$productId" params={{ productId: item.slug }} className="font-medium truncate block">
                {item.name}
              </Link>
              <p className="text-[13px] text-fg-subtle">
                {item.size ? `${item.size} · ` : ""}
                {money(item.price, cur)}
              </p>
              <button
                type="button"
                className="text-[13px] font-semibold text-accent mt-1"
                onClick={() => {
                  addToBag({
                    productId: item.productId,
                    listingId: item.listingId,
                    name: item.name,
                    sku: item.sku,
                    size: item.size,
                    price: item.price,
                    image: item.image,
                    category: item.category,
                  });
                  toast.success("Added to cart");
                }}
              >
                Add to cart
              </button>
            </div>
            <button type="button" className="toolbar-btn" aria-label="Remove" onClick={() => removeSaved(item.listingId)}>
              <Heart className="size-4" fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
