import type { FinancialSummary, Product, Transaction } from "@/types";
import type { TrustedBusinessContext } from "@/lib/apex/advisor";

export function buildTrustedContext(params: {
  businessName: string;
  currency: string;
  periodLabel: string;
  summary: FinancialSummary;
  products: Product[];
  transactions: Transaction[];
}): TrustedBusinessContext {
  const { businessName, currency, periodLabel, summary, products, transactions } = params;

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
  };
}
