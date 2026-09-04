import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Group, GroupLabel } from "@/components/ui/group";
import { PageHeader } from "@/components/ui/page-header";
import { askApexAdvisor } from "@/lib/apex/advisor";
import { buildTrustedContext } from "@/lib/apex/ai-context";
import { generateForecast } from "@/lib/apex/forecasting-engine";
import { simulateWhatIf } from "@/lib/apex/financial-engine";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import type { WhatIfSimulationParams } from "@/types";
import { readOpenRouterKey } from "@/lib/beannel/keys";

type Tab = "overview" | "trends" | "ask" | "simulate";

export function AdvisorView() {
  const { products, transactions, profile, periodSummary, period, periodTransactions } = useApex();
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

  const forecast = useMemo(
    () => generateForecast(transactions, products, periodSummary),
    [transactions, products, periodSummary],
  );
  const sim = useMemo(() => simulateWhatIf(periodSummary, params), [periodSummary, params]);

  const chart = forecast.timeSeries.map((p) => ({
    date: p.date,
    actual: p.isProjected ? undefined : p.actualSales,
    forecast: p.forecastSales,
  }));

  const slow = forecast.productForecasts.filter((p) => p.stockoutRisk === "OVERSTOCKED").slice(0, 5);
  const risk = forecast.productForecasts.filter((p) => p.stockoutRisk === "CRITICAL").slice(0, 5);

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
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
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
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title="Advisor"
        subtitle={`Forecasts only run on recorded sales. Reliability ${forecast.accuracy.reliabilityScore}/100 · n=${forecast.accuracy.sampleSize} days`}
      />

      <div className="tag-row">
        {(
          [
            ["overview", "Overview"],
            ["trends", "Trends"],
            ["ask", "Ask"],
            ["simulate", "What if"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className="tag-chip" data-active={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <GroupLabel>Stock at risk</GroupLabel>
            <Group>
              {risk.length === 0 && (
                <div className="group-row text-fg-muted text-[15px]">No critical stockout risk from recent velocity.</div>
              )}
              {risk.map((p) => (
                <div key={p.productId} className="group-row">
                  <span className="truncate text-[15px]">{p.productName}</span>
                  <span className="text-warning tabular text-[15px] ml-auto">{p.daysOfInventoryRemaining}d left</span>
                </div>
              ))}
            </Group>
          </section>
          <section>
            <GroupLabel>Slow stock</GroupLabel>
            <Group>
              {slow.length === 0 && <div className="group-row text-fg-muted text-[15px]">No overstock flags.</div>}
              {slow.map((p) => (
                <div key={p.productId} className="group-row">
                  <span className="truncate text-[15px]">{p.productName}</span>
                  <span className="text-fg-muted tabular text-[15px] ml-auto">{p.currentStock} on hand</span>
                </div>
              ))}
            </Group>
          </section>
          <section className="md:col-span-2 panel p-5 md:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight mb-1">Trend</h2>
            <p className="text-[13px] text-fg-subtle mb-4">
              Direction {forecast.summaryStats.trendDirection}. MAPE {forecast.accuracy.mape}%.
            </p>
            <div className="h-52 min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="actual" type="monotone" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.12} />
                  <Area dataKey="forecast" type="monotone" stroke="var(--color-fg-subtle)" fill="none" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {tab === "trends" && (
        <div className="panel p-5 md:p-6">
          <div className="h-72 min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-fg-subtle)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="actual" type="monotone" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.12} name="Actual sales" />
                <Area dataKey="forecast" type="monotone" stroke="var(--color-fg-muted)" fill="none" strokeDasharray="5 5" name="Model" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "ask" && (
        <section className="panel p-5 md:p-6 space-y-4">
          <p className="text-[15px] text-fg-muted leading-relaxed">
            Answers are grounded in the current period’s ledger. The model cannot invent totals.
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="Why did profit move? What should I restock?"
            className="field h-auto py-3 min-h-[6.5rem]"
          />
          <Button disabled={loading || !question.trim()} onClick={() => ask(question.trim())}>
            {loading ? "Working…" : "Ask Beannel"}
          </Button>
          {answer && <div className="text-[15px] whitespace-pre-wrap border-t border-border pt-3 leading-relaxed">{answer}</div>}
        </section>
      )}

      {tab === "simulate" && (
        <div className="grid md:grid-cols-2 gap-4">
          <section className="panel p-5 md:p-6 space-y-6">
            <Slider label="Price" value={params.priceChangePercent} min={-30} max={50} onChange={(v) => setParams({ ...params, priceChangePercent: v })} />
            <Slider label="Volume" value={params.volumeChangePercent} min={-50} max={100} onChange={(v) => setParams({ ...params, volumeChangePercent: v })} />
            <Slider label="Unit cost" value={params.cogsChangePercent} min={-30} max={50} onChange={(v) => setParams({ ...params, cogsChangePercent: v })} />
            <Slider label="Overhead" value={params.expenseChangePercent} min={-50} max={50} onChange={(v) => setParams({ ...params, expenseChangePercent: v })} />
          </section>
          <section>
            <GroupLabel>Projection</GroupLabel>
            <Group>
              <Row label="Projected revenue" value={money(sim.projectedRevenue, cur)} />
              <Row label="Projected net profit" value={money(sim.projectedNetProfit, cur)} />
              <Row label="Net delta" value={money(sim.netProfitDelta, cur)} />
              <Row label="Break-even" value={money(sim.projectedBreakEvenRevenue, cur)} />
              <Row label="Margin of safety" value={`${sim.marginOfSafetyPercent.toFixed(1)}%`} />
            </Group>
          </section>
        </div>
      )}
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
