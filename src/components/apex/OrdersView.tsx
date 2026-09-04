import { Fragment, useMemo, useState } from "react";
import { ClipboardList, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import {
  STATUS_LABEL,
  nextStatuses,
  type OrderStatus,
} from "@/lib/beannel/commerce";
import { OrderTimeline } from "@/components/shop/OrderTimeline";
import { whatsappHref } from "@/lib/beannel/shop";
import { cn } from "@/lib/cn";

type Filter = "open" | "new" | "done" | "all";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm & take stock",
  processing: "Start processing",
  packed: "Mark packed",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function OrdersView() {
  const { shopOrders, profile, pendingShopCount, advanceShopOrder, cancelShopOrder } = useApex();
  const [filter, setFilter] = useState<Filter>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const cur = profile.currencySymbol;

  const shown = useMemo(() => {
    return shopOrders.filter((o) => {
      if (filter === "all") return true;
      if (filter === "new") return o.status === "placed";
      if (filter === "done") return o.status === "delivered" || o.status === "cancelled" || o.status === "refunded";
      return o.status !== "delivered" && o.status !== "cancelled" && o.status !== "refunded";
    });
  }, [shopOrders, filter]);

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the order");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="office-page">
      <PageHeader
        compact
        title="Orders"
        subtitle={
          pendingShopCount
            ? `${pendingShopCount} need fulfillment`
            : `${shopOrders.length} order${shopOrders.length === 1 ? "" : "s"}`
        }
      />

      <div className="office-index">
        <div className="office-index-tabs">
          {(
            [
              ["open", pendingShopCount ? `Open (${pendingShopCount})` : "Open"],
              ["new", "Unfulfilled"],
              ["done", "Closed"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" data-active={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>

      {shown.length === 0 ? (
        <div className="office-index-empty">
          <EmptyState
            icon={ClipboardList}
            title={shopOrders.length === 0 ? "No orders yet" : "Nothing in this view"}
            body="When a customer checks out on the shop, the order appears here with the same stock the register uses."
          />
        </div>
      ) : (
        <div className="office-index-table">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
          {shown.map((order) => {
            const open = openId === order.id;
            const forwards = nextStatuses(order.status).filter((s) => s !== "cancelled" && s !== "refunded");
            const canCancel = nextStatuses(order.status).includes("cancelled");
            return (
              <Fragment key={order.id}>
              <tr className={open ? "is-open" : undefined} onClick={() => setOpenId(open ? null : order.id)}>
                <td>
                  <p className="font-medium">#{order.id.slice(-6).toUpperCase()}</p>
                  <p className="office-muted">
                    Shop · {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ") || "Ticket"}
                  </p>
                </td>
                <td className="office-muted">{new Date(order.date).toLocaleString()}</td>
                <td>
                  <p className="font-medium">{order.name}</p>
                  {order.phone ? <p className="office-muted">{order.phone}</p> : null}
                </td>
                <td className="tabular font-medium">{money(order.amount, cur)}</td>
                <td>
                  <span className={cn("order-pill", `is-${order.status}`)}>{STATUS_LABEL[order.status]}</span>
                </td>
              </tr>
              {open && (
                <tr className="office-index-detail">
                  <td colSpan={5}>
                    {order.address ? (
                      <p className="text-[14px] text-fg-muted">Deliver: {order.address}</p>
                    ) : (
                      <p className="text-[14px] text-fg-muted">No delivery note. Ask the customer.</p>
                    )}
                    <ul className="text-[14px] space-y-1 mt-2">
                      {order.items.map((item, i) => (
                        <li key={`${item.productId}-${i}`} className="flex justify-between gap-3">
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="tabular">{money(item.totalSellPrice, cur)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <OrderTimeline status={order.status} />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-3">
                      {forwards.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          disabled={busy === order.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void run(
                              order.id,
                              () => advanceShopOrder(order.id, status),
                              STATUS_LABEL[status],
                            );
                          }}
                        >
                          {busy === order.id ? "Saving…" : ACTION_LABEL[status] || STATUS_LABEL[status]}
                        </Button>
                      ))}
                      {order.phone ? (
                        <a
                          className="btn-secondary-file"
                          href={whatsappHref(
                            order.phone,
                            `BEANNEL: your order ${order.id.slice(-6).toUpperCase()} is ${STATUS_LABEL[order.status].toLowerCase()}.`,
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="size-4" />
                          WhatsApp
                        </a>
                      ) : null}
                      {canCancel && (
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={busy === order.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void run(order.id, () => cancelShopOrder(order.id), "Order cancelled");
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
