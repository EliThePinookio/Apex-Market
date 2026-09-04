import { Link, useNavigate } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/apex/money";
import { useBeannelAuth } from "@/lib/beannel/auth";
import {
  STATUS_HINT,
  STATUS_LABEL,
  isOpenStatus,
  isOrderStatus,
  type ShopOrder,
} from "@/lib/beannel/commerce";
import { fetchMyShopOrders, fetchShopStorefront, subscribeShopOrders, type ShopStorefront } from "@/lib/beannel/shop";
import { cn } from "@/lib/cn";

type Tab = "open" | "done" | "all";

export function ShopOrders() {
  const { user, isLoading } = useBeannelAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setReady(!isLoading);
      return;
    }
    let live = true;
    const load = () => {
      void fetchShopStorefront()
        .then((info) => {
          if (live) setStore(info);
        })
        .catch(() => undefined);
      void fetchMyShopOrders(user.id)
        .then((rows) => {
          if (!live) return;
          setOrders(Array.isArray(rows) ? rows : []);
          setReady(true);
        })
        .catch(() => {
          if (live) {
            setOrders([]);
            setReady(true);
          }
        });
    };
    load();
    return subscribeShopOrders(load);
  }, [user, isLoading]);

  const shown = useMemo(() => {
    return orders.filter((o) => {
      if (tab === "all") return true;
      if (tab === "open") return isOpenStatus(o.status) || o.status === "placed";
      return o.status === "delivered" || o.status === "cancelled" || o.status === "refunded";
    });
  }, [orders, tab]);

  if (isLoading || (user && !ready)) {
    return (
      <div className="shop-body shop-orders-wrap">
        <p className="text-[15px] text-fg-muted">Opening your orders…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shop-body shop-orders-wrap">
        <p className="shop-kicker">Tracking</p>
        <h1 className="display-title text-[2rem] mt-1">Your orders</h1>
        <p className="text-[15px] text-fg-muted mt-2 mb-5 leading-relaxed">
          Sign in to see every ticket, from placed to delivered.
        </p>
        <Button className="w-full" onClick={() => void navigate({ to: "/login", search: { next: "/track" } })}>
          Sign in to track orders
        </Button>
      </div>
    );
  }

  const cur = store?.currency || "GH₵";
  const openCount = orders.filter((o) => isOpenStatus(o.status) || o.status === "placed").length;

  return (
    <div className="shop-body shop-orders-wrap">
      <p className="shop-kicker">Tracking</p>
      <h1 className="display-title text-[2rem] mt-1">Your orders</h1>
      <p className="text-[15px] text-fg-muted mt-2 mb-4">
        {openCount
          ? `${openCount} on the way. Tap a ticket to follow it.`
          : "When you check out, the ticket lives here until it reaches you."}
      </p>

      <div className="shop-order-tabs" role="tablist">
        {(
          [
            ["open", openCount ? `On the way (${openCount})` : "On the way"],
            ["done", "Delivered"],
            ["all", `All (${orders.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" data-active={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="shop-orders-empty">
          <Package className="size-8 text-accent" strokeWidth={1.5} />
          <p className="font-semibold mt-3">{orders.length === 0 ? "No orders yet" : "Nothing in this view"}</p>
          <p className="text-[14px] text-fg-muted mt-1">
            {orders.length === 0 ? "Browse the floor and check out. Tracking starts the moment the store has the ticket." : "Try All to see every ticket."}
          </p>
          {orders.length === 0 ? (
            <Button className="mt-4" onClick={() => void navigate({ to: "/" })}>
              Browse the shop
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="shop-order-list">
          {shown.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const status = isOrderStatus(String(order.status || "")) ? order.status : "placed";
            return (
              <Link key={order.id} to="/track/$orderId" params={{ orderId: order.id }} className="shop-order-card">
                <div className="shop-order-card-top">
                  <p className="shop-kicker">#{order.id.slice(-6).toUpperCase()}</p>
                  <span className={cn("order-pill", `is-${status}`)}>{STATUS_LABEL[status]}</span>
                </div>
                <p className="font-semibold mt-2">
                  {items.map((i) => `${i.productName} × ${i.quantity}`).join(", ") || "Order"}
                </p>
                <p className="text-[13px] text-fg-muted mt-1">{STATUS_HINT[status]}</p>
                <div className="shop-order-card-foot">
                  <span>{order.date ? new Date(order.date).toLocaleString() : ""}</span>
                  <span className="tabular font-semibold">{money(order.amount, cur)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function useOpenOrderCount() {
  const { user } = useBeannelAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    const load = () => {
      void fetchMyShopOrders(user.id)
        .then((rows) => {
          setCount(
            rows.filter((o) => isOpenStatus(o.status) || o.status === "placed").length,
          );
        })
        .catch(() => setCount(0));
    };
    load();
    return subscribeShopOrders(load);
  }, [user]);

  return count;
}
