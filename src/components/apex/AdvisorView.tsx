import { Link } from "@tanstack/react-router";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Group, GroupLabel } from "@/components/ui/group";
import { askApexAdvisor } from "@/lib/apex/advisor";
import { buildTrustedContext } from "@/lib/apex/ai-context";
import { generateForecast } from "@/lib/apex/forecasting-engine";
import { simulateWhatIf } from "@/lib/apex/financial-engine";
import { money, pct } from "@/lib/apex/money";
import { buildMoneyDesk } from "@/lib/apex/money-desk";
import { computeSummary, previousPeriod } from "@/lib/apex/summary";
import { useApex, type PeriodPreset } from "@/lib/apex/store";
import { readOpenRouterKey } from "@/lib/beannel/keys";
import { cn } from "@/lib/cn";
import type { WhatIfSimulationParams } from "@/types";

type Tab = "overview" | "mix" | "ask" | "simulate";

const PERIODS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
];

export function AdvisorView() {
  const {
    products,
    transactions,
    customers,
    profile,
    period,
    setPeriod,
    periodSummary,
    periodTransactions,
    pendingShopCount,
  } = useApex();
  const cur = profile.currencySymbol;
  const [tab, setTab] = useState<Tab>("overview");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<WhatIfSimulationParams>({
    priceChangePercent: 0,
    volumeChangePercent: 0,
    cogsChangePercent: 0,
    expenseChangePercent: 0,
    additionalCapital: 0,
  });

  const prevBounds = previousPeriod(period);
  const prevSummary = useMemo(() => {
    if (!prevBounds) return null;
    const prevTx = transactions.filter((t) => {
      const time = new Date(t.date).getTime();
      return time >= prevBounds.start.getTime() && time < prevBounds.end.getTime();
    });
    return computeSummary(prevTx, products);
  }, [transactions, products, prevBounds]);

  const desk = useMemo(
    () =>
      buildMoneyDesk({
        products,
        periodTx: periodTransactions,
        customers,
        periodSummary,
        prevSummary,
        pendingOrders: pendingShopCount,
      }),
    [products, periodTransactions, customers, periodSummary, prevSummary, pendingShopCount],
  );

  const forecast = useMemo(
    () => generateForecast(transactions, products, periodSummary),
    [transactions, products, periodSummary],
  );
  const sim = useMemo(() => simulateWhatIf(periodSummary, params), [periodSummary, params]);

  const ask = async (prompt: string) => {
    setLoading(true);
    try {
      const ctx = buildTrustedContext({
        businessName: profile.businessName,
        currency: cur,
        periodLabel: period,
        summary: periodSummary,
        products,
        transactions: periodTransactions,
      });
      const res = await askApexAdvisor({
        data: { prompt, context: ctx, mode: "ask_advisor", openrouterKey: readOpenRouterKey() },
      });
      setAnswer(res.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Advisor unavailable");
    } finally {
      setLoading(false);
    }
  };

  const tooltipStyle = {
    background: "var(--color-bg-elevated)",
    border: "none",
    borderRadius: 16,
    boxShadow: "var(--shadow-3)",
    fontSize: 13,
  };

  return (
    <div className="office-page">
      <div className="office-home-head">
        <div>
          <h1>Analytics</h1>
          <p>{desk.headline}</p>
        </div>
        <p className="text-[13px] text-fg-muted max-w-sm">{desk.subhead}</p>
      </div>

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

      <div className="tag-row">
        {(
          [
            ["overview", "Money"],
            ["mix", "Mix"],
            ["simulate", "What if"],
            ["ask", "Ask"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className="tag-chip" data-active={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="office-kpi">
            <Kpi
              label="Total sales"
              value={money(desk.sales, cur)}
              delta={desk.salesDelta}
              hint={`${desk.orders} order${desk.orders === 1 ? "" : "s"}`}
            />
            <Kpi label="Average order" value={money(desk.aov, cur)} hint={`${desk.units} units`} />
            <Kpi
              label="Gross margin"
              value={`${desk.margin.toFixed(1)}%`}
              hint={money(desk.gross, cur)}
            />
            <Kpi
              label="Net profit"
              value={money(desk.net, cur)}
              delta={desk.netDelta}
              down={desk.net < 0}
            />
          </div>

          <section className="office-card">
            <h2 className="office-card-title">Do this to make more money</h2>
            {desk.actions.length === 0 ? (
              <p className="px-4 pb-4 text-[14px] text-fg-muted">
                No leaks in this window. Keep winners in stock and ring the next sale.
              </p>
            ) : (
              <div className="office-todo">
                {desk.actions.map((action) => (
                  <Link key={action.id} to={action.href}>
                    <span>
                      <strong>{action.title}</strong>
                      <span>{action.why}</span>
                    </span>
                    <span className="money-action-meta">
                      {action.impact > 0 && (
                        <span className={cn("tabular font-semibold", action.tone === "down" && "text-danger")}>
                          {money(action.impact, cur)}
                        </span>
                      )}
                      <ArrowRight className="size-4" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="office-card p-4">
            <h2 className="text-[13px] font-semibold mb-1">Sales over time</h2>
            <p className="text-[12px] text-fg-muted mb-3">
              Reliability {forecast.accuracy.reliabilityScore}/100 · {forecast.summaryStats.trendDirection.toLowerCase()}
            </p>
            <div className="h-52 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={desk.series}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="sales" type="monotone" name="Sales" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.16} />
                  <Area dataKey="profit" type="monotone" name="Gross" stroke="var(--color-fg)" fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      {tab === "mix" && (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="office-card">
            <h2 className="office-card-title">Winners</h2>
            {desk.winners.length === 0 ? (
              <p className="px-4 pb-4 text-[14px] text-fg-muted">No product sales in this window.</p>
            ) : (
              <ul className="money-table">
                {desk.winners.map((p) => (
                  <li key={p.id}>
                    <span className="min-w-0">
                      <strong className="truncate">{p.name}</strong>
                      <span>
                        {p.units} sold · {p.margin.toFixed(0)}% margin
                        {p.daysLeft != null ? ` · ${p.daysLeft}d cover` : ""}
                      </span>
                    </span>
                    <span className="tabular font-semibold">{money(p.profit, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="office-card">
            <h2 className="office-card-title">Cash sitting still</h2>
            {desk.traps.length === 0 ? (
              <p className="px-4 pb-4 text-[14px] text-fg-muted">No idle stock this window.</p>
            ) : (
              <ul className="money-table">
                {desk.traps.map((p) => {
                  const cash = p.stock * (products.find((x) => x.id === p.id)?.buyPrice || 0);
                  return (
                    <li key={p.id}>
                      <span className="min-w-0">
                        <strong className="truncate">{p.name}</strong>
                        <span>
                          {p.stock} on hand · {p.category}
                        </span>
                      </span>
                      <span className="tabular font-semibold">{money(cash, cur)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="office-card md:col-span-2">
            <h2 className="office-card-title">Sales by department</h2>
            {desk.categories.length === 0 ? (
              <p className="px-4 pb-4 text-[14px] text-fg-muted">Departments populate after the first sale.</p>
            ) : (
              <ul className="money-bars">
                {desk.categories.map((c) => (
                  <li key={c.name}>
                    <div className="flex justify-between gap-3 text-[13px] mb-1">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="tabular text-fg-muted">
                        {c.share.toFixed(0)}% · {money(c.revenue, cur)}
                      </span>
                    </div>
                    <div className="money-bar">
                      <span style={{ width: `${Math.max(4, Math.min(100, c.share))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-4 pb-4 text-[12px] text-fg-muted">
              Inventory at cost {money(desk.inventoryCash, cur)} · shop value {money(desk.retailOnHand, cur)}
              {desk.debt > 0 ? ` · unpaid ${money(desk.debt, cur)}` : ""}
            </p>
          </section>
        </div>
      )}

      {tab === "ask" && (
        <section className="office-card p-5 space-y-4">
          <p className="text-[15px] text-fg-muted leading-relaxed">
            Answers stay on this period’s ledger. The model cannot invent totals.
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="What should I restock to take more money this week?"
            className="field h-auto py-3 min-h-[6.5rem]"
          />
          <div className="flex flex-wrap gap-2">
            {["What is leaking profit?", "Which pieces should I restock?", "How do I free cash from idle stock?"].map(
              (q) => (
                <button key={q} type="button" className="tag-chip" onClick={() => setQuestion(q)}>
                  {q}
                </button>
              ),
            )}
          </div>
          <Button disabled={loading || !question.trim()} onClick={() => ask(question.trim())}>
            {loading ? "Working…" : "Ask the books"}
          </Button>
          {answer && <div className="text-[15px] whitespace-pre-wrap border-t border-border pt-3 leading-relaxed">{answer}</div>}
        </section>
      )}

      {tab === "simulate" && (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="office-card p-5 space-y-6">
            <p className="text-[14px] text-fg-muted">Move a lever. See profit before you touch the floor.</p>
            <Slider label="Price" value={params.priceChangePercent} min={-30} max={50} onChange={(v) => setParams({ ...params, priceChangePercent: v })} />
            <Slider label="Volume" value={params.volumeChangePercent} min={-50} max={100} onChange={(v) => setParams({ ...params, volumeChangePercent: v })} />
            <Slider label="Unit cost" value={params.cogsChangePercent} min={-30} max={50} onChange={(v) => setParams({ ...params, cogsChangePercent: v })} />
            <Slider label="Overhead" value={params.expenseChangePercent} min={-50} max={50} onChange={(v) => setParams({ ...params, expenseChangePercent: v })} />
          </section>
          <section>
            <GroupLabel>Projected books</GroupLabel>
            <Group>
              <Row label="Revenue" value={money(sim.projectedRevenue, cur)} />
              <Row label="Net profit" value={money(sim.projectedNetProfit, cur)} />
              <Row label="Profit change" value={money(sim.netProfitDelta, cur)} />
              <Row label="Break-even" value={money(sim.projectedBreakEvenRevenue, cur)} />
              <Row label="Margin of safety" value={`${sim.marginOfSafetyPercent.toFixed(1)}%`} />
            </Group>
          </section>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  delta,
  down,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  down?: boolean;
}) {
  return (
    <div className="office-kpi-card">
      <p className="office-kpi-label">{label}</p>
      <p className={cn("office-kpi-value", down && "is-down")}>{value}</p>
      {typeof delta === "number" && Number.isFinite(delta) ? (
        <p className={cn("office-kpi-delta", delta >= 0 ? "is-up" : "is-down")}>
          {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {pct(delta)} vs prior
        </p>
      ) : hint ? (
        <p className="office-kpi-hint">{hint}</p>
      ) : null}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-[15px]">
      <span className="flex justify-between">
        <span className="text-fg-muted">{label}</span>
        <span className="tabular font-semibold">{value}%</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-3" />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="group-row">
      <span className="text-fg-muted text-[15px]">{label}</span>
      <span className="tabular font-medium ml-auto text-[15px]">{value}</span>
    </div>
  );
}
