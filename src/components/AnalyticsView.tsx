import React, { useState, useMemo } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  DollarSign,
  Percent,
  BarChart3,
  Calendar,
} from 'lucide-react';
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
} from 'recharts';
import { Transaction, Product, BusinessProfile, FinancialSummary } from '../types';

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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  const profitMarginPercent = summary.totalRevenue > 0
    ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const grossMarginPercent = summary.totalRevenue > 0
    ? ((summary.grossProfit / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto space-y-4">
      {/* Title & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <PieIcon className="w-5 h-5 text-blue-400" />
            <span>Profit & Revenue Analysis</span>
          </h2>
          <p className="text-xs text-slate-400">
            Performance analytics & margin breakdown
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-semibold">
          <button
            onClick={() => setPeriod('7days')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              period === '7days' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod('30days')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              period === '30days' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Margin Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Gross Profit Margin</p>
          <p className="text-xl font-extrabold text-emerald-400 mt-1">{grossMarginPercent}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {cur}{summary.grossProfit.toFixed(2)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Net Profit Margin</p>
          <p className="text-xl font-extrabold text-blue-400 mt-1">{profitMarginPercent}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {cur}{summary.netProfit.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Recharts Bar Chart: Sales vs Expenses */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
          <span>Revenue vs Expenses Trend</span>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> Sales
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-1" /> Expense
            </span>
          </div>
        </div>

        <div className="h-48 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
              />
              <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Structured Profit & Loss Statement Table */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Income & Profit Loss Statement (P&L)
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 rounded-xl bg-slate-950 font-semibold text-slate-200">
            <span>Sales Revenue</span>
            <span className="text-emerald-400 font-extrabold">{cur}{summary.totalRevenue.toFixed(2)}</span>
          </div>

          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60 text-slate-400">
            <span>Less: Cost of Goods Sold (COGS)</span>
            <span>- {cur}{summary.totalCOGS.toFixed(2)}</span>
          </div>

          <div className="flex justify-between p-2 rounded-xl bg-slate-950/90 font-bold text-slate-100 border-l-2 border-emerald-500">
            <span>GROSS PROFIT</span>
            <span className="text-emerald-400">={cur}{summary.grossProfit.toFixed(2)}</span>
          </div>

          <div className="flex justify-between p-2 rounded-xl bg-slate-950/60 text-slate-400">
            <span>Less: Operating Expenses</span>
            <span className="text-rose-400">- {cur}{summary.totalExpenses.toFixed(2)}</span>
          </div>

          <div className="flex justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 font-extrabold text-sm text-slate-100">
            <span>NET BUSINESS PROFIT</span>
            <span className={summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {cur}{summary.netProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Expense Category Share Pie Chart */}
      {categoryExpenseData.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Expenses Share by Category
          </h3>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryExpenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryExpenseData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {categoryExpenseData.map((cat, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-slate-300 truncate max-w-[100px]">{cat.name}:</span>
                <span className="font-bold text-slate-100">{cur}{cat.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
