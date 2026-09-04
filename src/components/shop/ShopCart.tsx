import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { bagTotal, setBagQty, useBag } from "@/lib/beannel/cart";
import { fetchShopStorefront, type ShopStorefront } from "@/lib/beannel/shop";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { useEffect, useState } from "react";

export function ShopCart() {
  const items = useBag();
  const navigate = useNavigate();
  const { user } = useBeannelAuth();
  const [store, setStore] = useState<ShopStorefront | null>(null);

  useEffect(() => {
    void fetchShopStorefront().then(setStore).catch(() => undefined);
  }, []);

  const cur = store?.currency || "GH₵";
  const total = bagTotal();

  if (items.length === 0) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <p className="display-title text-[1.75rem] mb-1">Your cart is empty</p>
        <p className="text-[15px] text-fg-muted mb-5">Find a piece and add it to cart.</p>
        <Button className="w-full" onClick={() => void navigate({ to: "/" })}>Continue shopping</Button>
      </div>
    );
  }

  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[2rem] mb-5">Cart</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.listingId} className="shop-line">
            <img src={item.image} alt="" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-[13px] text-fg-subtle">
                {item.size ? `${item.size} · ` : ""}
                {money(item.price, cur)}
              </p>
              <div className="shop-stepper mt-2">
                <button type="button" aria-label="Less" onClick={() => setBagQty(item.listingId, item.qty - 1)}>
                  <Minus className="size-4" />
                </button>
                <span className="tabular">{item.qty}</span>
                <button type="button" aria-label="More" onClick={() => setBagQty(item.listingId, item.qty + 1)}>
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <button type="button" className="toolbar-btn" aria-label="Remove" onClick={() => setBagQty(item.listingId, 0)}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="shop-total">
        <span>Total</span>
        <span className="tabular font-semibold">{money(total, cur)}</span>
      </div>
      <Button
        size="lg"
        className="w-full mt-4"
        onClick={() => {
          if (!user) {
            void navigate({ to: "/login", search: { as: "customer", next: "/checkout" } });
            return;
          }
          void navigate({ to: "/checkout" });
        }}
      >
        {user ? "Checkout" : "Sign in to checkout"}
      </Button>
      <Link to="/" className="block text-center text-[15px] text-fg-muted min-h-11 grid place-items-center">
        Continue shopping
      </Link>
    </div>
  );
}
