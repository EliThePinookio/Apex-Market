import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { paymentLabel, STATUS_LABEL, type ShopOrder } from "@/lib/beannel/commerce";
import { fetchShopOrder, fetchShopStorefront, type ShopStorefront } from "@/lib/beannel/shop";
import { OrderTimeline } from "@/components/shop/OrderTimeline";

export function ShopOrderDetail() {
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const { user } = useBeannelAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([fetchShopOrder(orderId), fetchShopStorefront()])
      .then(([found, info]) => {
        if (!live) return;
        if (found && found.customerId && found.customerId !== user.id) {
          setOrder(null);
        } else {
          setOrder(found);
        }
        setStore(info);
      })
      .catch(() => {
        if (live) setOrder(null);
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [user, orderId]);

  if (!user) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <h1 className="display-title text-[1.75rem] mb-2">Sign in to see this order</h1>
        <p className="text-[15px] text-fg-muted mb-5">Orders are saved to your account.</p>
        <Button className="w-full" onClick={() => void navigate({ to: "/login", search: { next: `/account/order/${orderId}` } })}>
          Sign in
        </Button>
      </div>
    );
  }
  if (!ready) return <div className="shop-body py-20 text-center text-fg-muted">Opening your order…</div>;
  if (!order) {
    return (
      <div className="shop-body py-20 text-center space-y-4">
        <p className="display-title text-[1.75rem]">Order not found</p>
        <Button variant="secondary" onClick={() => void navigate({ to: "/account" })}>
          Back to account
        </Button>
      </div>
    );
  }

  const cur = store?.currency || "GH₵";

  return (
    <div className="shop-body shop-checkout-wrap">
      <p className="shop-kicker">Order {order.id.slice(-6).toUpperCase()}</p>
      <h1 className="display-title text-[2rem] mt-1">{STATUS_LABEL[order.status] || "Order"}</h1>
      <p className="text-[14px] text-fg-muted mt-1">{new Date(order.date).toLocaleString()}</p>
      <div className="mt-5">
        <OrderTimeline status={order.status} />
      </div>
      <div className="space-y-2 mt-5">
        {order.items.map((item, i) => (
          <div key={`${item.productId}-${i}`} className="shop-line">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.productName}</p>
              <p className="text-[13px] text-fg-subtle">× {item.quantity}</p>
            </div>
            <p className="tabular font-semibold">{money(item.totalSellPrice, cur)}</p>
          </div>
        ))}
      </div>
      <div className="shop-total">
        <span>{paymentLabel(order.payment)}</span>
        <span className="tabular font-semibold">{money(order.amount, cur)}</span>
      </div>
      {order.address ? <p className="text-[14px] text-fg-muted mt-3">Deliver: {order.address}</p> : null}
      <Link to="/account" className="block text-center text-[15px] text-fg-muted min-h-11 grid place-items-center mt-4">
        All orders
      </Link>
    </div>
  );
}
