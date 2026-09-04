import type { Customer, FinancialSummary, Product, Transaction } from "@/types";

export interface ProductScore {
  id: string;
  name: string;
  category: string;
  units: number;
  revenue: number;
  profit: number;
  margin: number;
  stock: number;
  daysLeft: number | null;
  velocity: number;
  share: number;
}

export interface CategoryScore {
  name: string;
  revenue: number;
  profit: number;
  units: number;
  share: number;
}

export interface MoneyAction {
  id: string;
  title: string;
  why: string;
  impact: number;
  href: "/inventory" | "/pos" | "/customers" | "/orders";
  tone: "up" | "warn" | "down";
}

export interface DayPoint {
  key: string;
  label: string;
  sales: number;
  profit: number;
  orders: number;
}

export interface MoneyDesk {
  sales: number;
  orders: number;
  units: number;
  aov: number;
  gross: number;
  net: number;
  margin: number;
  inventoryCash: number;
  retailOnHand: number;
  debt: number;
  salesDelta: number | null;
  netDelta: number | null;
  series: DayPoint[];
  winners: ProductScore[];
  traps: ProductScore[];
  categories: CategoryScore[];
  actions: MoneyAction[];
  headline: string;
  subhead: string;
}

function daysInPeriod(tx: Transaction[]): number {
  if (tx.length === 0) return 7;
  const times = tx.map((t) => new Date(t.date).getTime()).filter((n) => Number.isFinite(n));
  if (!times.length) return 7;
  const span = (Math.max(...times) - Math.min(...times)) / 86400000;
  return Math.max(1, Math.round(span) || 7);
}

function deltaPct(now: number, prev: number | null): number | null {
  if (prev == null) return null;
  if (prev === 0 && now === 0) return null;
  if (prev === 0) return 100;
  return ((now - prev) / Math.abs(prev)) * 100;
}

export function buildMoneyDesk(args: {
  products: Product[];
  periodTx: Transaction[];
  customers: Customer[];
  periodSummary: FinancialSummary;
  prevSummary: FinancialSummary | null;
  pendingOrders: number;
}): MoneyDesk {
  const { products, periodTx, customers, periodSummary, prevSummary, pendingOrders } = args;
  const salesTx = periodTx.filter((t) => t.type === "sale");
  const days = daysInPeriod(salesTx.length ? salesTx : periodTx);
  const productById = new Map(products.map((p) => [p.id, p]));

  const byProduct = new Map<
    string,
    { name: string; category: string; units: number; revenue: number; profit: number }
  >();
  let units = 0;
  for (const t of salesTx) {
    for (const item of t.items || []) {
      units += item.quantity;
      const prod = productById.get(item.productId);
      const row = byProduct.get(item.productId) || {
        name: item.productName || prod?.name || "Item",
        category: prod?.category || "Uncategorised",
        units: 0,
        revenue: 0,
        profit: 0,
      };
      row.units += item.quantity;
      row.revenue += item.totalSellPrice || 0;
      row.profit += (item.totalSellPrice || 0) - (item.totalBuyPrice || 0);
      byProduct.set(item.productId, row);
    }
  }

  const sales = periodSummary.totalRevenue;
  const scored: ProductScore[] = [...byProduct.entries()].map(([id, row]) => {
    const prod = productById.get(id);
    const stock = prod?.stockQuantity ?? 0;
    const velocity = row.units / days;
    const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
    return {
      id,
      name: row.name,
      category: row.category,
      units: row.units,
      revenue: row.revenue,
      profit: row.profit,
      margin,
      stock,
      daysLeft: velocity > 0 ? Math.round(stock / velocity) : null,
      velocity,
      share: sales > 0 ? (row.revenue / sales) * 100 : 0,
    };
  });
  scored.sort((a, b) => b.profit - a.profit);

  const catMap = new Map<string, CategoryScore>();
  for (const p of scored) {
    const cur = catMap.get(p.category) || { name: p.category, revenue: 0, profit: 0, units: 0, share: 0 };
    cur.revenue += p.revenue;
    cur.profit += p.profit;
    cur.units += p.units;
    catMap.set(p.category, cur);
  }
  const categories = [...catMap.values()]
    .map((c) => ({ ...c, share: sales > 0 ? (c.revenue / sales) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const soldIds = new Set(scored.map((p) => p.id));
  const traps: ProductScore[] = products
    .filter((p) => p.stockQuantity > 0 && p.buyPrice > 0 && !soldIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      units: 0,
      revenue: 0,
      profit: 0,
      margin: p.sellPrice > 0 ? ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100 : 0,
      stock: p.stockQuantity,
      daysLeft: null,
      velocity: 0,
      share: 0,
    }))
    .sort((a, b) => b.stock * (productById.get(b.id)?.buyPrice || 0) - a.stock * (productById.get(a.id)?.buyPrice || 0))
    .slice(0, 6);

  const dayCount = Math.min(14, Math.max(7, days));
  const seriesMap = new Map<string, DayPoint>();
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    seriesMap.set(key, {
      key,
      label: `${months[d.getMonth()]} ${d.getDate()}`,
      sales: 0,
      profit: 0,
      orders: 0,
    });
  }
  for (const t of salesTx) {
    const stamp = new Date(t.date);
    const key = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}`;
    const row = seriesMap.get(key);
    if (!row) continue;
    row.sales += t.amount || 0;
    row.profit += t.grossProfit || t.netProfit || 0;
    row.orders += 1;
  }
  const series = [...seriesMap.values()];

  const debt = customers.reduce((s, c) => s + (c.debtBalance || 0), 0);
  const inventoryCash = periodSummary.totalInventoryValuation;
  const retailOnHand = products.reduce((s, p) => s + p.sellPrice * Math.max(0, p.stockQuantity), 0);
  const orders = salesTx.length;
  const aov = orders ? sales / orders : 0;
  const margin = sales > 0 ? (periodSummary.grossProfit / sales) * 100 : 0;

  const actions: MoneyAction[] = [];

  for (const p of scored) {
    if (p.velocity <= 0) continue;
    if (p.stock <= 0 || (p.daysLeft != null && p.daysLeft <= 5)) {
      const gap = Math.max(1, Math.ceil(p.velocity * 14) - p.stock);
      const impact = gap * (productById.get(p.id)?.sellPrice || 0);
      if (impact > 0) {
        actions.push({
          id: `restock-${p.id}`,
          title: `Restock ${p.name}`,
          why: p.stock <= 0 ? "Sold out while it is still moving." : `About ${p.daysLeft} days of cover left.`,
          impact,
          href: "/inventory",
          tone: "warn",
        });
      }
    }
  }

  const unlistable = products.filter((p) => p.listed === false && p.stockQuantity > 0 && p.sellPrice > 0);
  if (unlistable.length) {
    const impact = unlistable.reduce((s, p) => s + p.sellPrice * Math.min(p.stockQuantity, 3), 0);
    actions.push({
      id: "list-shop",
      title: `Put ${unlistable.length} piece${unlistable.length === 1 ? "" : "s"} on the shop`,
      why: "Stock is in the room but customers cannot buy it online.",
      impact,
      href: "/inventory",
      tone: "up",
    });
  }

  if (debt > 0) {
    actions.push({
      id: "collect-debt",
      title: "Collect outstanding balances",
      why: "Sales already happened. The cash has not come in.",
      impact: debt,
      href: "/customers",
      tone: "down",
    });
  }

  const trapped = traps.slice(0, 4);
  const trappedCash = trapped.reduce((s, p) => {
    const buy = productById.get(p.id)?.buyPrice || 0;
    return s + buy * p.stock;
  }, 0);
  if (trappedCash > 0) {
    actions.push({
      id: "move-dead",
      title: "Move idle stock",
      why: `${trapped.length} listed piece${trapped.length === 1 ? "" : "s"} took no money this period.`,
      impact: trappedCash,
      href: "/pos",
      tone: "warn",
    });
  }

  if (sales === 0) {
    const ready = products.filter((p) => p.stockQuantity > 0 && p.sellPrice > 0);
    if (ready.length) {
      actions.push({
        id: "ring-sale",
        title: "Sell what is already in the room",
        why: `${ready.length} piece${ready.length === 1 ? "" : "s"} can take money on the till or the shop today.`,
        impact: ready.reduce((s, p) => s + p.sellPrice * Math.min(p.stockQuantity, 2), 0),
        href: "/pos",
        tone: "up",
      });
    }
  }

  if (pendingOrders > 0) {
    actions.push({
      id: "confirm-orders",
      title: `Confirm ${pendingOrders} shop order${pendingOrders === 1 ? "" : "s"}`,
      why: "Unconfirmed orders sit outside the books until you take them.",
      impact: 0,
      href: "/orders",
      tone: "up",
    });
  }

  const thin = scored.filter((p) => p.revenue > 0 && p.margin < 18).slice(0, 3);
  if (thin.length) {
    const lift = thin.reduce((s, p) => s + p.revenue * 0.1, 0);
    actions.push({
      id: "raise-price",
      title: "Lift thin-margin pieces",
      why: `${thin.map((p) => p.name).join(", ")} ${thin.length === 1 ? "is" : "are"} under 18% gross.`,
      impact: lift,
      href: "/inventory",
      tone: "up",
    });
  }

  actions.sort((a, b) => b.impact - a.impact);
  const unique = new Map<string, MoneyAction>();
  for (const a of actions) {
    const key = a.href + a.title;
    if (!unique.has(key)) unique.set(key, a);
  }
  const ranked = [...unique.values()].slice(0, 5);

  const salesDelta = deltaPct(sales, prevSummary ? prevSummary.totalRevenue : null);
  const netDelta = deltaPct(periodSummary.netProfit, prevSummary ? prevSummary.netProfit : null);

  let headline = "No sales in this window yet.";
  let subhead = "Ring a till sale or confirm a shop order. Analytics only reads live records.";
  if (sales > 0) {
    const top = scored[0];
    if (netDelta != null && netDelta < -8) {
      headline = "Profit is slipping versus the last window.";
      subhead = top
        ? `${top.name} still leads. Protect stock on winners and clear idle pieces.`
        : "Cut idle stock and collect balances to recover cash.";
    } else if (ranked[0]?.id.startsWith("restock")) {
      headline = "Winners are about to go dark.";
      subhead = ranked[0].why;
    } else if (top) {
      headline = `${top.name} is carrying ${top.share.toFixed(0)}% of sales.`;
      subhead =
        periodSummary.netProfit >= 0
          ? "Keep that piece in stock, then push the next-best margin."
          : "Sales are in, but cost is eating them. Check unit cost and overhead.";
    }
  }

  return {
    sales,
    orders,
    units,
    aov,
    gross: periodSummary.grossProfit,
    net: periodSummary.netProfit,
    margin,
    inventoryCash,
    retailOnHand,
    debt,
    salesDelta,
    netDelta,
    series,
    winners: scored.slice(0, 6),
    traps,
    categories: categories.slice(0, 8),
    actions: ranked,
    headline,
    subhead,
  };
}
