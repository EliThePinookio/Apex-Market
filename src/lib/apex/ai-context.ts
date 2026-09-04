import type { Customer, FinancialSummary, Product, Transaction } from "@/types";
import type { TrustedBusinessContext } from "@/lib/apex/advisor";
import { buildMoneyDesk } from "@/lib/apex/money-desk";

export function buildTrustedContext(params: {
  businessName: string;
  currency: string;
  periodLabel: string;
  summary: FinancialSummary;
  products: Product[];
  transactions: Transaction[];
  customers?: Customer[];
  prevSummary?: FinancialSummary | null;
  pendingOrders?: number;
}): TrustedBusinessContext {
  const { businessName, currency, periodLabel, summary, products, transactions } = params;
  const desk = buildMoneyDesk({
    products,
    periodTx: transactions,
    customers: params.customers || [],
    periodSummary: summary,
    prevSummary: params.prevSummary ?? null,
    pendingOrders: params.pendingOrders || 0,
  });

  const salesMap = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
  const expenseCategories = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "sale" && t.items) {
      for (const item of t.items) {
        const cur = salesMap.get(item.productId) || {
          name: item.productName,
          qty: 0,
          revenue: 0,
          profit: 0,
        };
        cur.qty += item.quantity;
        cur.revenue += item.totalSellPrice;
        cur.profit += item.totalSellPrice - item.totalBuyPrice;
        salesMap.set(item.productId, cur);
      }
    }
    if (t.type === "expense") {
      const key = t.category || "Operating";
      expenseCategories.set(key, (expenseCategories.get(key) || 0) + t.amount);
    }
  }

  const topProducts = [...salesMap.values()]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 6);

  const slowProducts = products
    .filter((p) => p.stockQuantity > 0 && !salesMap.get(p.id))
    .map((p) => ({
      name: p.name,
      stock: p.stockQuantity,
      trapped: p.stockQuantity * p.buyPrice,
    }))
    .sort((a, b) => b.trapped - a.trapped)
    .slice(0, 6);

  const lowStock = products
    .filter((p) => p.stockQuantity <= p.minStockThreshold)
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, 8)
    .map((p) => ({ name: p.name, stock: p.stockQuantity, min: p.minStockThreshold }));

  return {
    businessName,
    currency,
    periodLabel,
    revenue: summary.totalRevenue,
    cogs: summary.totalCOGS,
    grossProfit: summary.grossProfit,
    expenses: summary.totalExpenses,
    netProfit: summary.netProfit,
    capital: summary.totalCapital,
    inventoryValue: summary.totalInventoryValuation,
    lowStock,
    topProducts,
    slowProducts,
    expenseCategories: [...expenseCategories.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    txCount: transactions.length,
    aov: desk.aov,
    orders: desk.orders,
    units: desk.units,
    margin: desk.margin,
    debt: desk.debt,
    pendingOrders: params.pendingOrders || 0,
    salesDelta: desk.salesDelta,
    netDelta: desk.netDelta,
    headline: desk.headline,
    subhead: desk.subhead,
    trend: desk.series.length > 2 ? `${desk.series[desk.series.length - 1].sales >= desk.series[0].sales ? "up" : "down"} over the window` : "flat",
    actions: desk.actions.map((a) => ({ title: a.title, why: a.why, impact: a.impact })),
  };
}
