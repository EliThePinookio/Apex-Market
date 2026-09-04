import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { canAccessOffice } from "@/lib/beannel/account";
import { STATUS_LABEL, isOrderStatus, type ShopOrder } from "@/lib/beannel/commerce";
import { fetchMyShopOrders, fetchShopStorefront, subscribeShopOrders, type ShopStorefront } from "@/lib/beannel/shop";
import { cn } from "@/lib/cn";

export function ShopAccount() {
  const { user, profile, signOut, isLoading } = useBeannelAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [store, setStore] = useState<ShopStorefront | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    const load = () => {
      void fetchShopStorefront()
        .then((info) => {
          if (live) setStore(info);
        })
        .catch(() => undefined);
      void fetchMyShopOrders(user.id)
        .then((rows) => {
          if (live) setOrders(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (live) setOrders([]);
        });
    };
    try {
      load();
      return subscribeShopOrders(load);
    } catch {
      return () => {
        live = false;
      };
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <p className="text-[15px] text-fg-muted">Opening your account…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <h1 className="display-title text-[2rem] mb-1">Your account</h1>
        <p className="text-[15px] text-fg-muted mb-5 leading-relaxed">
          Sign in to track orders, save pieces, and check out.
        </p>
        <div className="shop-account-actions">
          <Button className="w-full" onClick={() => void navigate({ to: "/login", search: { next: "/account" } })}>
            Sign in
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void navigate({ to: "/login", search: { next: "/account", mode: "signup" } })}
          >
            Create account
          </Button>
        </div>
      </div>
    );
  }

  const cur = store?.currency || "GH₵";
  const office = canAccessOffice(profile, user.email);

  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[2rem] mb-1">Your account</h1>
      <p className="text-[15px] text-fg-muted mb-5">{user.email}</p>
      <div className="mb-5">
        <p className="font-semibold">{profile?.fullName || "Shopper"}</p>
        <p className="text-[13px] text-fg-subtle mt-1">{office ? "Store owner" : "Customer account"}</p>
      </div>
      {office && (
        <Button className="w-full mb-4" onClick={() => void navigate({ to: "/manage" })}>
          Open the office
        </Button>
      )}
      <div className="flex items-baseline justify-between mb-3 text-left">
        <h2 className="text-[15px] font-semibold">Orders</h2>
        <Link to="/track" className="text-[13px] text-accent font-medium">
          Track all
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-[15px] text-fg-muted mb-6 leading-relaxed">
          No orders yet. After checkout they appear under Orders so you can follow packing and delivery.
        </p>
      ) : (
        <div className="shop-account-orders space-y-3 mb-6">
          {orders.slice(0, 3).map((o) => {
            const items = Array.isArray(o.items) ? o.items : [];
            const status = isOrderStatus(String(o.status || "")) ? o.status : "placed";
            return (
              <Link key={o.id} to="/track/$orderId" params={{ orderId: o.id }} className="shop-line">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{money(o.amount, cur)}</p>
                  <p className="text-[13px] text-fg-subtle">
                    {items.map((i) => `${i.productName} × ${i.quantity}`).join(", ") || "Order"}
                  </p>
                </div>
                <span className={cn("order-pill", `is-${status}`)}>{STATUS_LABEL[status]}</span>
              </Link>
            );
          })}
        </div>
      )}
      <div className="shop-account-actions">
        <Link to="/" className="text-center text-[15px] text-accent min-h-11 grid place-items-center">
          Continue shopping
        </Link>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            void signOut();
            void navigate({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
