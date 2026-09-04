import type { PaymentMethod, TransactionItem } from "@/types";

/** Authoritative shop order lifecycle. Invalid jumps are rejected. */
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_FLOW: OrderStatus[] = [
  "placed",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const STATUS_HINT: Record<OrderStatus, string> = {
  placed: "Waiting for the store to confirm and take stock",
  confirmed: "Paid into the books. The store is preparing it",
  processing: "The store is putting the order together",
  packed: "Packed and ready to leave",
  shipped: "On the way",
  delivered: "Received",
  cancelled: "This order was cancelled",
  refunded: "Refunded",
};

export interface ShopOrder {
  id: string;
  businessId: string;
  customerId: string;
  name: string;
  phone: string;
  address: string;
  payment: PaymentMethod;
  items: TransactionItem[];
  amount: number;
  date: string;
  status: OrderStatus;
  claimed: boolean;
  saleId?: string;
  updatedAt: string;
}

export interface OrderEnvelope {
  businessId: string;
  name: string;
  phone: string;
  payment: PaymentMethod;
  address: string;
  userId: string;
  status: OrderStatus;
  saleId?: string;
  updatedAt: string;
}

const PAYMENTS: PaymentMethod[] = ["cash", "card", "transfer", "mobile_money", "other"];

export function isOrderStatus(value: string): value is OrderStatus {
  return value in STATUS_LABEL;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

export function isOpenStatus(status: OrderStatus): boolean {
  return status === "placed" || status === "confirmed" || status === "processing" || status === "packed" || status === "shipped";
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled" || status === "refunded";
}

export function paymentLabel(method: PaymentMethod): string {
  if (method === "mobile_money") return "Paystack · MoMo";
  if (method === "cash") return "Cash on delivery";
  if (method === "card") return "Card";
  if (method === "transfer") return "Transfer";
  return "WhatsApp";
}

export function writeOrderEnvelope(meta: OrderEnvelope): string {
  return [
    "SHOP",
    meta.businessId,
    meta.name.replace(/\|/g, " "),
    meta.phone.replace(/\|/g, " "),
    meta.payment,
    (meta.address || "").replace(/\|/g, " "),
    meta.userId ? `uid:${meta.userId}` : "",
    `st:${meta.status}`,
    meta.saleId ? `sale:${meta.saleId}` : "",
    `at:${meta.updatedAt}`,
  ].join("|");
}

export function parseOrderEnvelope(description: string): OrderEnvelope | null {
  if (!description.startsWith("SHOP|")) return null;
  const parts = description.split("|");
  if (parts.length < 5) return null;
  const rawPay = parts[4] || "other";
  const payment: PaymentMethod = PAYMENTS.includes(rawPay as PaymentMethod) ? (rawPay as PaymentMethod) : "other";
  let userId = "";
  let status: OrderStatus = "placed";
  let saleId: string | undefined;
  let updatedAt = "";
  let address = (parts[5] || "").replace(/^uid:.*$/, "");
  for (const part of parts.slice(5)) {
    if (part.startsWith("uid:")) userId = part.slice(4);
    else if (part.startsWith("st:")) {
      const token = part.slice(3);
      if (isOrderStatus(token)) status = token;
    } else if (part.startsWith("sale:")) saleId = part.slice(5);
    else if (part.startsWith("at:")) updatedAt = part.slice(3);
  }
  return {
    businessId: parts[1] || "",
    name: parts[2] || "Customer",
    phone: parts[3] || "",
    payment,
    address,
    userId,
    status,
    saleId,
    updatedAt,
  };
}

export function patchOrderEnvelope(description: string, patch: Partial<OrderEnvelope>): string {
  const current = parseOrderEnvelope(description);
  if (!current) throw new Error("Not a shop order.");
  return writeOrderEnvelope({
    ...current,
    ...patch,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  });
}

export function flowIndex(status: OrderStatus): number {
  const idx = ORDER_FLOW.indexOf(status);
  return idx < 0 ? -1 : idx;
}
