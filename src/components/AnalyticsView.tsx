import React, { useState, useMemo } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  Sliders,
  Sparkles,
  ArrowUpRight,
  DollarSign,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Transaction, Product, BusinessProfile, FinancialSummary } from '../types';
import { GeminiProfitAdvisor } from './GeminiProfitAdvisor';
import { AnimatedNumber } from './AnimatedNumber';
import { TiltCard } from './TiltCard';

interface AnalyticsViewProps {
  transactions: Transaction[];
  products: Product[];
  profile: BusinessProfile;
  summary: FinancialSummary;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  products,
  profile,
  summary,
}) => {
  const [period, setPeriod] = useState<'7days' | '30days' | 'all'>('30days');
  const [salesGrowthTarget, setSalesGrowthTarget] = useState<number>(15); // % scenario simulator
  const [expenseReductionTarget, setExpenseReductionTarget] = useState<number>(10); // % scenario simulator
  const cur = profile.currencySymbol;

  // Build daily trend dataset
  const chartData = useMemo(() => {
    const daysMap: { [dateStr: string]: { date: string; sales: number; expenses: number; profit: number } } = {};
    const now = new Date();
    const limitDays = period === '7days' ? 7 : period === '30days' ? 30 : 90;

    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      daysMap[key] = { date: key, sales: 0, expenses: 0, profit: 0 };
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (daysMap[key]) {
        if (t.type === 'sale') {
          daysMap[key].sales += t.amount;
          daysMap[key].profit += t.grossProfit || 0;
        } else if (t.type === 'expense') {
          daysMap[key].expenses += t.amount;
          daysMap[key].profit -= t.amount;
        }
      }
    });

    return Object.values(daysMap);
  }, [transactions, period]);

  // Category expense share pie chart data
  const categoryExpenseData = useMemo(() => {
    const map: { [cat: string]: number } = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'General';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  const profitMarginPercent = summary.totalRevenue > 0
    ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const grossMarginPercent = summary.totalRevenue > 0
    ? ((summary.grossProfit / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  // Scenario Simulator calculations
  const projectedRevenue = summary.totalRevenue * (1 + salesGrowthTarget / 100);
  const projectedCOGS = summary.totalCOGS * (1 + salesGrowthTarget / 100);
  const projectedExpenses = summary.totalExpenses * (1 - expenseReductionTarget / 100);
  const projectedGross = projectedRevenue - projectedCOGS;
  const projectedNet = projectedGross - projectedExpenses;
  const projectedGain = projectedNet - summary.netProfit;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Deep Atmospheric Olive/Forest Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white p-6 sm:p-8 shadow-2xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wide uppercase mb-2">
              <PieIcon className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Financial Intelligence & Margin Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              P&L Performance & Profit Scenarios
            </h1>
            <p className="text-xs text-emerald-200/80 mt-1 max-w-xl font-medium">
              Real-time audit of gross margins, operating expenses, and simulated revenue forecasting.
            </p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center space-x-1 p-1.5 bg-slate-950/70 rounded-2xl border border-emerald-800/60 text-xs font-bold shrink-0 shadow-md backdrop-blur-md self-start sm:self-auto">
            {(['7days', '30days', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  period === p
                    ? 'bg-gradient-to-r from-emerald-400 to-mint-400 bg-emerald-400 text-slate-950 font-black shadow-md'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
              >
                {p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Margin Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Gross Profit Margin</p>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono tabular-nums">{grossMarginPercent}%</p>
            <p className="text-xs text-slate-600 font-bold font-mono tabular-nums mt-0.5">
              {cur}<AnimatedNumber value={summary.grossProfit} />
            </p>
          </div>
        </TiltCard>

        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Net Profit Margin</p>
            <p className="text-2xl font-black text-emerald-800 mt-1 font-mono tabular-nums">{profitMarginPercent}%</p>
            <p className="text-xs text-slate-600 font-bold font-mono tabular-nums mt-0.5">
              {cur}<AnimatedNumber value={summary.netProfit} />
            </p>
          </div>
        </TiltCard>

        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Sales Revenue</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tabular-nums">
              {cur}<AnimatedNumber value={summary.totalRevenue} />
            </p>
            <p className="text-xs text-emerald-700 font-bold mt-0.5">From completed sales</p>
          </div>
        </TiltCard>

        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Operating Expenses</p>
            <p className="text-2xl font-black text-rose-600 mt-1 font-mono tabular-nums">
              {cur}<AnimatedNumber value={summary.totalExpenses} />
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Overhead & operational</p>
          </div>
        </TiltCard>
      </div>

      {/* Gemini AI Profit Advisor Section */}
      <GeminiProfitAdvisor summary={summary} profile={profile} products={products} />

      {/* Main Grid Layout for Charts & P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recharts Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-3">
            <span className="text-sm font-black text-slate-900">Revenue vs Expenses Velocity</span>
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" /> Sales
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-1.5" /> Expense
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
                />
                <Bar dataKey="sales" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Structured P&L Statement (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
              Income & Profit Loss Statement (P&L)
            </h3>

            <div className="space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 font-semibold text-slate-800 border border-slate-200">
                <span className="font-sans">Sales Revenue</span>
                <span className="text-emerald-700 font-black">{cur}{summary.totalRevenue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100">
                <span className="font-sans">Less: COGS</span>
                <span>- {cur}{summary.totalCOGS.toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-100 font-bold text-slate-900 border-l-4 border-emerald-600">
                <span className="font-sans">GROSS PROFIT</span>
                <span className="text-emerald-700 font-black">={cur}{summary.grossProfit.toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 text-slate-500 border border-slate-100">
                <span className="font-sans">Less: Operating Expenses</span>
                <span className="text-rose-700">- {cur}{summary.totalExpenses.toFixed(2)}</span>
              </div>

              <div className="flex justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 font-black text-sm text-slate-900">
                <span className="font-sans">NET BUSINESS PROFIT</span>
                <span className={summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {cur}{summary.netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Category Share Pie Chart */}
          {categoryExpenseData.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Expenses Share Breakdown
              </h4>

              <div className="h-32 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryExpenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryExpenseData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INTERACTIVE SCENARIO FORECASTING SIMULATOR */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl border border-emerald-800/40 space-y-5">
        <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white">Profit Growth Scenario Simulator</h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">
            Interactive Forecast Model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Sales Growth % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-emerald-200">
              <span>Target Sales Growth</span>
              <span className="font-mono text-emerald-400">+{salesGrowthTarget}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={salesGrowthTarget}
              onChange={(e) => setSalesGrowthTarget(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <p className="text-[10px] text-emerald-300/70">Simulates boosting sales velocity by marketing & upsells.</p>
          </div>

          {/* Slider 2: Expense Reduction % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-emerald-200">
              <span>Expense Reduction</span>
              <span className="font-mono text-emerald-400">-{expenseReductionTarget}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={expenseReductionTarget}
              onChange={(e) => setExpenseReductionTarget(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <p className="text-[10px] text-emerald-300/70">Simulates trimming overhead & optimizing procurement.</p>
          </div>

          {/* Forecasted Outcome Box */}
          <div className="p-4 rounded-2xl bg-emerald-900/60 border border-emerald-500/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Projected Net Profit</span>
            <div className="text-2xl font-black text-white font-mono tabular-nums">
              {cur}{projectedNet.toFixed(2)}
            </div>
            <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{cur}{projectedGain.toFixed(2)} profit increase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
