import type {
  Customer,
  FinancialSummary,
  Product,
  Transaction,
} from "@/types";
import { periodBounds } from "@/lib/apex/money";

/**
 * Protected financial summary. Same meaning as the original App.tsx memo:
 * revenue = sum of sale amounts, COGS = sum of sale cogs,
 * gross = revenue - COGS, net = gross - operating expenses,
 * capital = sum of capital contributions (drawings not subtracted here —
 * they were never included in the original calculator).
 */
export function computeSummary(
  transactions: Transaction[],
  products: Product[],
): FinancialSummary {
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;
  let totalCapital = 0;

  for (const tx of transactions) {
    if (tx.type === "sale") {
      totalRevenue += tx.amount || 0;
      totalCOGS += tx.cogs || 0;
    } else if (tx.type === "expense") {
      totalExpenses += tx.amount || 0;
    } else if (tx.type === "capital") {
      totalCapital += tx.amount || 0;
    }
  }

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const totalInventoryValuation = products.reduce(
    (acc, p) => acc + p.buyPrice * p.stockQuantity,
    0,
  );
  const totalPotentialRevenue = products.reduce(
    (acc, p) => acc + p.sellPrice * p.stockQuantity,
    0,
  );
  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold,
  ).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

  return {
    totalRevenue,
    totalCOGS,
    grossProfit,
    totalExpenses,
    netProfit,
    totalCapital,
    totalInventoryValuation,
    totalPotentialRevenue,
    lowStockCount,
    outOfStockCount,
    transactionCount: transactions.length,
  };
}

export function filterTransactions(
  transactions: Transaction[],
  preset: "today" | "week" | "month" | "all",
): Transaction[] {
  const bounds = periodBounds(preset);
  if (!bounds) return transactions;
  return transactions.filter((tx) => {
    const t = new Date(tx.date).getTime();
    return t >= bounds.start.getTime() && t < bounds.end.getTime();
  });
}

export function previousPeriod(
  preset: "today" | "week" | "month" | "all",
): { start: Date; end: Date } | null {
  const now = new Date();
  if (preset === "all") return null;
  if (preset === "today") {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end.getTime() - 86400000);
    return { start, end };
  }
  if (preset === "week") {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const start = new Date(end.getTime() - 7 * 86400000);
    return { start, end };
  }
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start, end };
}

export function explainDelta(params: {
  current: FinancialSummary;
  previous: FinancialSummary | null;
  transactions: Transaction[];
  products: Product[];
}): {
  what: string;
  why: string;
  implication: string;
  action: string;
} | null {
  const { current, previous, transactions, products } = params;
  if (!previous) return null;
  if (previous.totalRevenue === 0 && current.totalRevenue === 0) return null;

  const profitDelta = current.netProfit - previous.netProfit;
  const profitPct =
    previous.netProfit !== 0
      ? (profitDelta / Math.abs(previous.netProfit)) * 100
      : current.netProfit > 0
        ? 100
        : 0;
  const revDelta = current.totalRevenue - previous.totalRevenue;
  const expDelta = current.totalExpenses - previous.totalExpenses;

  const expenseCats = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === "expense") {
      const key = tx.category || "Operating";
      expenseCats.set(key, (expenseCats.get(key) || 0) + tx.amount);
    }
  }
  const topExpense = [...expenseCats.entries()].sort((a, b) => b[1] - a[1])[0];

  const low = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold,
  ).length;

  const direction = profitDelta < -0.5 ? "decreased" : profitDelta > 0.5 ? "increased" : "held";
  const what = `Net profit ${direction} ${Math.abs(profitPct).toFixed(0)}% versus the prior period (${moneyDelta(profitDelta)}).`;

  const drivers: string[] = [];
  if (Math.abs(revDelta) >= Math.abs(expDelta) && Math.abs(revDelta) > 0.5) {
    drivers.push(
      `sales revenue ${revDelta >= 0 ? "rose" : "fell"} by ${moneyDelta(revDelta)}`,
    );
  }
  if (Math.abs(expDelta) > 0.5) {
    drivers.push(
      `operating expenses ${expDelta >= 0 ? "rose" : "fell"} by ${moneyDelta(expDelta)}${topExpense ? `, led by ${topExpense[0]}` : ""}`,
    );
  }
  const why =
    drivers.length > 0
      ? `Primarily associated with ${drivers.join(" and ")}.`
      : "Movement is within the noise of this period’s volume.";

  const implication =
    current.netProfit < 0
      ? "The store is currently operating below break-even for this window."
      : current.totalRevenue > 0 && current.netProfit / current.totalRevenue < 0.1
        ? "Margin is thin — small cost shocks will erase profit."
        : "The period remains profitable.";

  const action =
    low > 0
      ? `Restock ${low} item${low === 1 ? "" : "s"} at or below threshold before the next rush.`
      : expDelta > 0 && profitDelta < 0
        ? "Review the largest expense category before the next period closes."
        : "Keep the current mix and watch basket size at the register.";

  return { what, why, implication, action };
}

function moneyDelta(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  return `${n < 0 ? "-" : "+"}$${abs}`;
}

export function customerTier(totalSpent: number): Customer["tier"] {
  if (totalSpent >= 3000) return "VIP";
  if (totalSpent >= 1000) return "Gold";
  if (totalSpent >= 300) return "Silver";
  return "Bronze";
}

export function loyaltyFromSale(netRevenue: number): number {
  return Math.floor(netRevenue / 10);
}
