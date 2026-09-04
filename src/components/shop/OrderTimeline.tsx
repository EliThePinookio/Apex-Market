import { Check } from "lucide-react";
import {
  ORDER_FLOW,
  STATUS_HINT,
  STATUS_LABEL,
  flowIndex,
  type OrderStatus,
} from "@/lib/beannel/commerce";
import { cn } from "@/lib/cn";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const current = flowIndex(status);
  const failed = status === "cancelled" || status === "refunded";

  return (
    <ol className="order-track">
      {failed ? (
        <li className="order-track-step is-failed">
          <span className="order-track-dot" />
          <div>
            <p>{STATUS_LABEL[status]}</p>
            <p>{STATUS_HINT[status]}</p>
          </div>
        </li>
      ) : (
        ORDER_FLOW.map((step, i) => {
          const done = current >= i;
          const active = current === i;
          return (
            <li key={step} className={cn("order-track-step", done && "is-done", active && "is-active")}>
              <span className="order-track-dot">{done ? <Check className="size-3" strokeWidth={3} /> : null}</span>
              <div>
                <p>{STATUS_LABEL[step]}</p>
                {active ? <p>{STATUS_HINT[step]}</p> : null}
              </div>
            </li>
          );
        })
      )}
    </ol>
  );
}
