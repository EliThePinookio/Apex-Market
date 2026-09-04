import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { kindFromUser } from "@/lib/beannel/account";
import { fetchMyShopOrders, fetchShopStorefront, type ShopInboxOrder, type ShopStorefront } from "@/lib/beannel/shop";

export function ShopAccount() {
  const { user, profile, signOut } = useBeannelAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShopInboxOrder[]>([]);
  const [store, setStore] = useState<ShopStorefront | null>(null);

  useEffect(() => {
    if (!user) {
      void navigate({ to: "/login", search: { as: "customer", next: "/account" } });
      return;
    }
    void fetchShopStorefront().then(setStore).catch(() => undefined);
    void fetchMyShopOrders(user.id).then(setOrders).catch(() => undefined);
  }, [user, navigate]);

  if (!user) return null;
  const cur = store?.currency || "GH₵";
  const staff = kindFromUser(user) === "staff";

  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[2rem] mb-1">Your account</h1>
      <p className="text-[15px] text-fg-muted mb-5">{user.email}</p>
      <div className="cushion p-4 mb-5">
        <p className="font-semibold">{profile?.fullName || "Shopper"}</p>
        <p className="text-[13px] text-fg-subtle mt-1">{staff ? "Staff account" : "Customer account"}</p>
      </div>
      {staff && (
        <Button className="w-full mb-3" onClick={() => void navigate({ to: "/manage" })}>
          Open the office
        </Button>
      )}
      <h2 className="text-[15px] font-semibold mb-3">Orders</h2>
      {orders.length === 0 ? (
        <p className="text-[15px] text-fg-muted mb-6">No orders yet. Browse the shop and check out when you are ready.</p>
      ) : (
        <div className="space-y-3 mb-6">
          {orders.map((o) => (
            <div key={o.id} className="shop-line">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{money(o.amount, cur)}</p>
                <p className="text-[13px] text-fg-subtle">
                  {o.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}
                </p>
                <p className="text-[12px] text-fg-subtle mt-1">{new Date(o.date).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Link to="/" className="text-center text-[15px] text-accent min-h-11 grid place-items-center">
          Continue shopping
        </Link>
        <Button
          variant="secondary"
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
