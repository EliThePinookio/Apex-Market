import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Package, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Group, GroupLabel } from "@/components/ui/group";
import { askApexAdvisor } from "@/lib/apex/advisor";
import { buildTrustedContext } from "@/lib/apex/ai-context";
import { money, pct } from "@/lib/apex/money";
import { explainDelta, previousPeriod, computeSummary } from "@/lib/apex/summary";
import { useApex, type PeriodPreset } from "@/lib/apex/store";
import { readOpenRouterKey } from "@/lib/beannel/keys";
import { cn } from "@/lib/cn";

const PERIODS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
];

export function DashboardView() {
  const {
    products,
    transactions,
    customers,
    profile,
    period,
    setPeriod,
    periodTransactions,
    periodSummary,
    summary,
    shopOrders,
    pendingShopCount,
  } = useApex();
  const navigate = useNavigate();
  const cur = profile.currencySymbol;
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const prevBounds = previousPeriod(period);
  const prevTx = useMemo(() => {
    if (!prevBounds) return [];
    return transactions.filter((t) => {
      const time = new Date(t.date).getTime();
      return time >= prevBounds.start.getTime() && time < prevBounds.end.getTime();
    });
  }, [transactions, prevBounds]);
  const prevSummary = useMemo(
    () => (prevBounds ? computeSummary(prevTx, products) : null),
    [prevBounds, prevTx, products],
  );

  const explanation = useMemo(
    () =>
      explainDelta({
        current: periodSummary,
        previous: prevSummary,
        transactions: periodTransactions,
        products,
      }),
    [periodSummary, prevSummary, periodTransactions, products],
  );

  const spark = useMemo(() => {
    const days = 14;
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map.set(key, 0);
    }
    for (const t of transactions) {
      if (t.type !== "sale") continue;
      const d = new Date(t.date);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (map.has(key)) map.set(key, (map.get(key) || 0) + t.amount);
    }
    return [...map.entries()].map(([name, amount]) => ({ name, amount }));
  }, [transactions]);

  const salesMap = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const t of periodTransactions) {
      if (t.type !== "sale" || !t.items) continue;
      for (const item of t.items) {
        const curItem = m.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
        curItem.qty += item.quantity;
        curItem.revenue += item.totalSellPrice;
        m.set(item.productId, curItem);
      }
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue);
  }, [periodTransactions]);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [transactions],
  );

  const lowStock = products
    .filter((p) => p.stockQuantity <= p.minStockThreshold)
    .sort((a, b) => a.stockQuantity / (a.minStockThreshold || 1) - b.stockQuantity / (b.minStockThreshold || 1));

  const debt = customers.reduce((s, c) => s + c.debtBalance, 0);
  const margin =
    periodSummary.totalRevenue > 0
      ? (periodSummary.netProfit / periodSummary.totalRevenue) * 100
      : 0;
  const revDelta =
    prevSummary && prevSummary.totalRevenue
      ? ((periodSummary.totalRevenue - prevSummary.totalRevenue) / prevSummary.totalRevenue) * 100
      : null;

  const saleCount = periodTransactions.filter((t) => t.type === "sale").length;
  const itemsSold = periodTransactions.reduce((s, t) => {
    if (t.type !== "sale" || !t.items) return s;
    return s + t.items.reduce((n, i) => n + i.quantity, 0);
  }, 0);
  const avgTicket = saleCount ? periodSummary.totalRevenue / saleCount : 0;

  const alerts = [
    lowStock.length
      ? {
          tone: "warning" as const,
          title: `${lowStock.length} stock alert${lowStock.length === 1 ? "" : "s"}`,
          body: lowStock
            .slice(0, 2)
            .map((p) => p.name)
            .join(", "),
          to: "/inventory",
        }
      : null,
    debt > 0
      ? {
          tone: "danger" as const,
          title: `${money(debt, cur)} outstanding`,
          body: "Customer debt still open",
          to: "/customers",
        }
      : null,
    periodSummary.totalRevenue === 0
      ? {
          tone: "info" as const,
          title: "No sales in this window",
          body: "Open the register to record the next ticket",
          to: "/pos",
        }
      : null,
  ].filter(Boolean);

  const runBriefing = async () => {
    setBriefLoading(true);
    try {
      const ctx = buildTrustedContext({
        businessName: profile.businessName,
        currency: cur,
        periodLabel: PERIODS.find((p) => p.id === period)?.label || period,
        summary: periodSummary,
        products,
        transactions: periodTransactions,
      });
      const res = await askApexAdvisor({
        data: {
          prompt: "Give a short business briefing for this period using only the trusted figures.",
          context: ctx,
          mode: "dashboard_briefing",
          openrouterKey: readOpenRouterKey(),
        },
      });
      setBrief(res.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Advisor unavailable");
    } finally {
      setBriefLoading(false);
    }
  };

  const empty = products.length === 0 && transactions.length === 0;
  const periodLabel = PERIODS.find((p) => p.id === period)?.label || "This window";
  const onlineToday = shopOrders.filter((t) => t.date.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const rawName = (profile.ownerName || "").trim();
  const firstName = rawName && !/^store owner$/i.test(rawName) ? rawName.split(" ")[0] : "";

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="office-page">
      <div className="office-home-head">
        <h1>{firstName ? `${hello}, ${firstName}` : hello}</h1>
        <p>{dateLabel}</p>
      </div>

      {(pendingShopCount > 0 || lowStock.length > 0 || empty) && (
        <section className="office-card">
          <h2 className="office-card-title">To do</h2>
          <div className="office-todo">
            {empty && (
              <button type="button" onClick={() => void navigate({ to: "/inventory" })}>
                <span>
                  <strong>Add your first product</strong>
                  <span>Stock, sizes, and prices feed the shop and the till.</span>
                </span>
                <ChevronRight className="size-4" />
              </button>
            )}
            {pendingShopCount > 0 && (
              <button type="button" onClick={() => void navigate({ to: "/orders" })}>
                <span>
                  <strong>
                    {pendingShopCount} order{pendingShopCount === 1 ? "" : "s"} to fulfill
                  </strong>
                  <span>Confirm to take stock, then pack and ship.</span>
                </span>
                <ChevronRight className="size-4" />
              </button>
            )}
            {lowStock.length > 0 && (
              <button type="button" onClick={() => void navigate({ to: "/inventory" })}>
                <span>
                  <strong>
                    {lowStock.length} product{lowStock.length === 1 ? "" : "s"} low on stock
                  </strong>
                  <span>{lowStock.slice(0, 2).map((p) => p.name).join(", ")}</span>
                </span>
                <ChevronRight className="size-4" />
              </button>
            )}
            {onlineToday.length > 0 && pendingShopCount === 0 && (
              <button type="button" onClick={() => void navigate({ to: "/orders" })}>
                <span>
                  <strong>
                    {onlineToday.length} shop order{onlineToday.length === 1 ? "" : "s"} today
                  </strong>
                  <span>From the customer store.</span>
                </span>
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </section>
      )}

      <div className="office-period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="office-period-btn"
            data-active={period === p.id}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="office-kpi">
        <div className="office-kpi-card">
          <p className="office-kpi-label">Total sales</p>
          <p className="office-kpi-value">{money(periodSummary.totalRevenue, cur)}</p>
          {typeof revDelta === "number" && Number.isFinite(revDelta) ? (
            <p className={cn("office-kpi-delta", revDelta >= 0 ? "is-up" : "is-down")}>
              {revDelta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {pct(revDelta)} vs prior
            </p>
          ) : (
            <p className="office-kpi-hint">{periodLabel}</p>
          )}
          <div className="office-kpi-spark">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark}>
                <Area type="monotone" dataKey="amount" stroke="var(--color-fg)" fill="var(--color-bg-subtle)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="office-kpi-card">
          <p className="office-kpi-label">Orders</p>
          <p className="office-kpi-value">{saleCount}</p>
          <p className="office-kpi-hint">
            {itemsSold} item{itemsSold === 1 ? "" : "s"} · avg {money(avgTicket, cur)}
          </p>
        </div>
        <div className="office-kpi-card">
          <p className="office-kpi-label">Net profit</p>
          <p className={cn("office-kpi-value", periodSummary.netProfit < 0 && "is-down")}>
            {money(periodSummary.netProfit, cur)}
          </p>
          <p className="office-kpi-hint">{margin.toFixed(1)}% margin</p>
        </div>
        <div className="office-kpi-card">
          <p className="office-kpi-label">Inventory</p>
          <p className="office-kpi-value">{money(summary.totalInventoryValuation, cur)}</p>
          <p className={cn("office-kpi-hint", summary.lowStockCount + summary.outOfStockCount ? "is-warn" : undefined)}>
            {summary.lowStockCount + summary.outOfStockCount
              ? `${summary.lowStockCount + summary.outOfStockCount} need restock`
              : "At cost"}
          </p>
        </div>
      </div>

      {empty && (
        <div className="office-card">
          <EmptyState
            icon={Package}
            title="This workspace is empty"
            body="Add your first product, then ring a sale. Figures here come only from live records."
            action={<Button onClick={() => void navigate({ to: "/inventory" })}>Add product</Button>}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-3">
        <section className="lg:col-span-3 office-card p-5 md:p-6 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold tracking-tight">Revenue</h2>
            <span className="text-[13px] text-fg-subtle">Last 14 days</span>
          </div>
          <div className="h-48 min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-bg-elevated)",
                    border: "none",
                    borderRadius: 16,
                    boxShadow: "var(--shadow-3)",
                    fontSize: 13,
                  }}
                  formatter={(v: number) => money(v, cur)}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-accent)"
                  fill="url(#rev)"
                  strokeWidth={2.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-2 office-card p-5 md:p-6 space-y-4">
          <h2 className="text-[15px] font-semibold tracking-tight">Why it’s moving</h2>
          {explanation ? (
            <div className="space-y-2 text-[15px] leading-relaxed">
              <p>{explanation.what}</p>
              <p className="text-fg-muted">{explanation.why}</p>
              <p className="text-fg-muted">{explanation.implication}</p>
              <p className="font-medium">{explanation.action}</p>
            </div>
          ) : (
            <p className="text-[15px] text-fg-muted leading-relaxed">
              Not enough prior-period activity to explain a change. Record a few more days of trade.
            </p>
          )}
          <Button variant="secondary" size="sm" onClick={runBriefing} disabled={briefLoading}>
            <Sparkles className="size-3.5" />
            {briefLoading ? "Reading the books…" : "Ask Beannel"}
          </Button>
          {brief && (
            <div className="text-[15px] text-fg-muted whitespace-pre-wrap border-t border-border pt-3 leading-relaxed">
              {brief}
            </div>
          )}
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <GroupLabel>Needs action</GroupLabel>
          <Group indent="icon">
            {alerts.length === 0 && (
              <div className="group-row text-fg-muted text-[15px]">No urgent flags in this window.</div>
            )}
            {alerts.map((a) =>
              a ? (
                <Link key={a.title} to={a.to} className="group-row">
                  <span className="size-8 rounded-[10px] bg-bg-subtle grid place-items-center shrink-0">
                    <AlertTriangle
                      className={cn(
                        "size-4",
                        a.tone === "warning" && "text-warning",
                        a.tone === "danger" && "text-danger",
                        a.tone === "info" && "text-info",
                      )}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug">{a.title}</p>
                    <p className="text-[13px] text-fg-muted truncate">{a.body}</p>
                  </div>
                  <ChevronRight className="size-4 text-fg-subtle" />
                </Link>
              ) : null,
            )}
          </Group>
        </section>

        <section>
          <div className="flex items-end justify-between px-1 mb-2">
            <GroupLabel>Recent activity</GroupLabel>
            <button
              type="button"
              className="text-[15px] text-accent font-medium mb-2 min-h-11 px-2"
              onClick={() => void navigate({ to: "/ledger" })}
            >
              Ledger
            </button>
          </div>
          <Group>
            {recent.map((t) => (
              <div key={t.id} className="group-row">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate capitalize">{t.type.replace("_", " ")}</p>
                  <p className="text-[13px] text-fg-muted truncate">{t.description}</p>
                </div>
                <span
                  className={cn(
                    "tabular text-[15px] font-medium",
                    t.type === "sale" && "text-success",
                    t.type === "expense" && "text-danger",
                  )}
                >
                  {t.type === "expense" ? "−" : ""}
                  {money(t.amount, cur)}
                </span>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="group-row text-fg-muted text-[15px]">No movements recorded yet.</div>
            )}
          </Group>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <div className="flex items-end justify-between px-1 mb-2">
            <GroupLabel>Top movers</GroupLabel>
            <button
              type="button"
              className="text-[15px] text-accent font-medium mb-2 min-h-11 px-2"
              onClick={() => void navigate({ to: "/pos" })}
            >
              Open register
            </button>
          </div>
          <Group>
            {salesMap.slice(0, 5).map((p) => (
              <div key={p.name} className="group-row">
                <span className="truncate pr-3 text-[15px]">{p.name}</span>
                <span className="tabular text-[15px] text-fg-subtle ml-auto">
                  {p.qty} · {money(p.revenue, cur)}
                </span>
              </div>
            ))}
            {salesMap.length === 0 && (
              <div className="group-row text-fg-muted text-[15px]">No product sales in this period.</div>
            )}
          </Group>
        </section>

        {lowStock.length > 0 && (
          <section>
            <GroupLabel>Stock pressure</GroupLabel>
            <div className="grid gap-2">
              {lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="surface-1 p-4">
                  <p className="text-[15px] font-medium truncate">{p.name}</p>
                  <p className="text-[13px] text-fg-muted mt-1">
                    {p.stockQuantity} {p.unit} left · min {p.minStockThreshold}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
