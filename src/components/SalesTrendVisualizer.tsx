import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Calendar,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Zap,
  Tag,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Transaction, Product, BusinessProfile, Category } from '../types';

interface SalesTrendVisualizerProps {
  transactions: Transaction[];
  products: Product[];
  categories?: Category[];
  profile: BusinessProfile;
  onNavigateToPOS?: () => void;
  onNavigateToInventory?: (filterLowStock?: boolean) => void;
  onAskAdvisorAboutTrend?: (question: string) => void;
}

type TimeRange = '7d' | '14d' | '30d' | 'all';
type PieMetric = 'revenue' | 'units';

// Modern, luxury palette for charts
const PIE_COLORS = [
  '#3B82F6', // Vibrant Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#94A3B8', // Slate / Others
];

export const SalesTrendVisualizer: React.FC<SalesTrendVisualizerProps> = ({
  transactions,
  products,
  categories = [],
  profile,
  onNavigateToPOS,
  onNavigateToInventory,
  onAskAdvisorAboutTrend,
}) => {
  const cur = profile.currencySymbol || '$';
  const [timeRange, setTimeRange] = useState<TimeRange>('14d');
  const [pieMetric, setPieMetric] = useState<PieMetric>('revenue');
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'leaderboard'>('overview');

  // Filter sales transactions by selected time range
  const { filteredSales, daysCount, rangeLabel } = useMemo(() => {
    const now = Date.now();
    let days = 14;
    let label = 'Last 14 Days';

    if (timeRange === '7d') {
      days = 7;
      label = 'Last 7 Days';
    } else if (timeRange === '14d') {
      days = 14;
      label = 'Last 14 Days';
    } else if (timeRange === '30d') {
      days = 30;
      label = 'Last 30 Days';
    } else {
      days = 90;
      label = 'All Recorded History';
    }

    const cutoff = timeRange === 'all' ? 0 : now - days * 86400000;

    const sales = transactions.filter(
      (t) => t.type === 'sale' && new Date(t.date || t.createdAt).getTime() >= cutoff
    );

    return { filteredSales: sales, daysCount: days, rangeLabel: label };
  }, [transactions, timeRange]);

  // Aggregate daily sales & profit trend
  const dailyTrendData = useMemo(() => {
    const map = new Map<string, { dateStr: string; displayDate: string; revenue: number; profit: number; orders: number; units: number }>();
    const now = new Date();

    // Pre-populate empty days so the line chart is smooth and continuous
    const daysToGenerate = timeRange === 'all' ? Math.min(30, daysCount) : daysCount;
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const isoDate = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      map.set(isoDate, {
        dateStr: isoDate,
        displayDate,
        revenue: 0,
        profit: 0,
        orders: 0,
        units: 0,
      });
    }

    // Accumulate transaction data
    filteredSales.forEach((t) => {
      const tDate = new Date(t.date || t.createdAt);
      const isoDate = tDate.toISOString().split('T')[0];
      const displayDate = tDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const entry = map.get(isoDate) || {
        dateStr: isoDate,
        displayDate,
        revenue: 0,
        profit: 0,
        orders: 0,
        units: 0,
      };

      entry.revenue += t.amount || 0;
      entry.profit += t.netProfit !== undefined ? t.netProfit : t.grossProfit !== undefined ? t.grossProfit : (t.amount || 0) * 0.4;
      entry.orders += 1;

      if (t.items && t.items.length > 0) {
        t.items.forEach((item) => {
          entry.units += item.quantity || 1;
        });
      } else {
        entry.units += 1;
      }

      map.set(isoDate, entry);
    });

    return Array.from(map.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredSales, daysCount, timeRange]);

  // Total summary statistics for the trend period
  const trendSummary = useMemo(() => {
    let totalRev = 0;
    let totalProf = 0;
    let totalOrders = filteredSales.length;
    let totalUnits = 0;
    let peakDay = { displayDate: 'N/A', revenue: 0 };

    dailyTrendData.forEach((d) => {
      totalRev += d.revenue;
      totalProf += d.profit;
      totalUnits += d.units;
      if (d.revenue > peakDay.revenue) {
        peakDay = { displayDate: d.displayDate, revenue: d.revenue };
      }
    });

    const avgDailyRev = dailyTrendData.length > 0 ? totalRev / dailyTrendData.length : 0;
    const profitMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;

    return {
      totalRevenue: totalRev,
      totalProfit: totalProf,
      totalOrders,
      totalUnits,
      avgDailyRevenue: avgDailyRev,
      profitMargin,
      peakDay,
    };
  }, [dailyTrendData, filteredSales]);

  // Product sales breakdown (Units, Revenue, Profit)
  const productPerformanceMap = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        category: string;
        unitsSold: number;
        revenue: number;
        profit: number;
        currentStock: number;
        buyPrice: number;
        sellPrice: number;
      }
    >();

    // Seed map with all known products so even 0-sales products are tracked
    products.forEach((p) => {
      map.set(p.id, {
        productId: p.id,
        name: p.name,
        category: p.category || 'Apparels',
        unitsSold: 0,
        revenue: 0,
        profit: 0,
        currentStock: p.stockQuantity || 0,
        buyPrice: p.buyPrice || 0,
        sellPrice: p.sellPrice || 0,
      });
    });

    // Populate actual sales from transactions
    filteredSales.forEach((t) => {
      if (t.items && t.items.length > 0) {
        t.items.forEach((item) => {
          const p = map.get(item.productId);
          const itemRev = item.totalSellPrice || (item.unitSellPrice || 0) * (item.quantity || 1);
          const itemCogs = item.totalBuyPrice || (item.unitBuyPrice || 0) * (item.quantity || 1);
          const itemProfit = itemRev - itemCogs;

          if (p) {
            p.unitsSold += item.quantity || 1;
            p.revenue += itemRev;
            p.profit += itemProfit;
          } else {
            map.set(item.productId, {
              productId: item.productId,
              name: item.productName || 'Custom Item',
              category: 'Apparels',
              unitsSold: item.quantity || 1,
              revenue: itemRev,
              profit: itemProfit,
              currentStock: 0,
              buyPrice: item.unitBuyPrice || 0,
              sellPrice: item.unitSellPrice || 0,
            });
          }
        });
      }
    });

    return Array.from(map.values());
  }, [products, filteredSales]);

  // Top Selling Products (Pie Chart Data & Best Performers)
  const { pieChartData, bestPerformers, worstPerformers, categoryBreakdown } = useMemo(() => {
    // Sort for best performers
    const sortedBySales = [...productPerformanceMap].sort((a, b) =>
      pieMetric === 'revenue' ? b.revenue - a.revenue : b.unitsSold - a.unitsSold
    );

    // Pie chart slices (Top 5 + Others)
    const activeProducts = sortedBySales.filter((p) => (pieMetric === 'revenue' ? p.revenue > 0 : p.unitsSold > 0));
    const top5 = activeProducts.slice(0, 5);
    const rest = activeProducts.slice(5);

    const pieSlices = top5.map((p, idx) => ({
      name: p.name,
      value: pieMetric === 'revenue' ? Math.round(p.revenue * 100) / 100 : p.unitsSold,
      color: PIE_COLORS[idx % PIE_COLORS.length],
      category: p.category,
      units: p.unitsSold,
      revenue: p.revenue,
    }));

    if (rest.length > 0) {
      const restValue = rest.reduce(
        (sum, p) => sum + (pieMetric === 'revenue' ? p.revenue : p.unitsSold),
        0
      );
      const restUnits = rest.reduce((sum, p) => sum + p.unitsSold, 0);
      const restRev = rest.reduce((sum, p) => sum + p.revenue, 0);
      pieSlices.push({
        name: `Others (${rest.length} products)`,
        value: pieMetric === 'revenue' ? Math.round(restValue * 100) / 100 : restUnits,
        color: PIE_COLORS[PIE_COLORS.length - 1],
        category: 'Mixed',
        units: restUnits,
        revenue: restRev,
      });
    }

    // If no sales at all, show empty fallback slice
    if (pieSlices.length === 0) {
      pieSlices.push({
        name: 'No Sales Yet',
        value: 1,
        color: '#E2E8F0',
        category: 'None',
        units: 0,
        revenue: 0,
      });
    }

    // Best performers list (Top 4 with sales)
    const best = sortedBySales.filter((p) => p.revenue > 0).slice(0, 4);

    // Worst performers list (Zero sales or lowest sales with positive stock, holding cash)
    const worst = [...productPerformanceMap]
      .filter((p) => p.currentStock > 0) // Focus on items physically on shelves
      .sort((a, b) => {
        if (a.unitsSold !== b.unitsSold) {
          return a.unitsSold - b.unitsSold; // Lowest units sold first
        }
        // If tied, prioritize highest trapped money
        const moneyA = a.currentStock * a.buyPrice;
        const moneyB = b.currentStock * b.buyPrice;
        return moneyB - moneyA;
      })
      .slice(0, 4);

    // Category Sales Breakdown
    const catMap = new Map<string, { name: string; revenue: number; units: number; count: number }>();
    productPerformanceMap.forEach((p) => {
      const catName = p.category || 'Apparels';
      const cur = catMap.get(catName) || { name: catName, revenue: 0, units: 0, count: 0 };
      cur.revenue += p.revenue;
      cur.units += p.unitsSold;
      cur.count += 1;
      catMap.set(catName, cur);
    });

    const cats = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      pieChartData: pieSlices,
      bestPerformers: best,
      worstPerformers: worst,
      categoryBreakdown: cats,
    };
  }, [productPerformanceMap, pieMetric]);

  return (
    <div id="sales-trend-visualizer-root" className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xl shadow-black/[0.02]">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                Sales Trends & Intelligence
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-500/20">
                Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Live performance metrics, product distribution, and velocity tracking
            </p>
          </div>
        </div>

        {/* Time Range Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] self-start md:self-auto">
          {(['7d', '14d', '30d', 'all'] as TimeRange[]).map((r) => {
            const labels: Record<TimeRange, string> = {
              '7d': '7 Days',
              '14d': '14 Days',
              '30d': '30 Days',
              all: 'All Time',
            };
            const isSelected = timeRange === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#1E293B] text-blue-600 dark:text-blue-400 shadow-md shadow-black/5 dark:shadow-black/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Sales */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {cur}{trendSummary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center">
            <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">{trendSummary.totalOrders}</span> orders placed
          </p>
        </div>

        {/* Total Gross Profit */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Period Profit
            </span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-display tracking-tight">
              {cur}{trendSummary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-semibold">
            {trendSummary.profitMargin.toFixed(1)}% profit margin
          </p>
        </div>

        {/* Daily Average */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Daily Average
            </span>
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {cur}{trendSummary.avgDailyRevenue.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">/day</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            Across {daysCount} day window
          </p>
        </div>

        {/* Peak Sales Day */}
        <div className="p-4 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Peak Day
            </span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              {trendSummary.peakDay.revenue > 0 ? `${cur}${trendSummary.peakDay.revenue.toFixed(0)}` : '—'}
            </span>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-semibold">
            {trendSummary.peakDay.displayDate}
          </p>
        </div>
      </div>

      {/* Main Charts Section (2 Columns: Daily Area Chart + Product Share Pie Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Sales & Profit Performance Over Time (By Day) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xl shadow-black/[0.02] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight font-display flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                  Daily Sales & Profit Performance
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Performance curve by day ({rangeLabel})
                </p>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center space-x-3 text-xs font-bold">
                <span className="flex items-center text-blue-600 dark:text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5 shadow-xs shadow-blue-500/50" />
                  Revenue
                </span>
                <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 shadow-xs shadow-emerald-500/50" />
                  Profit
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-[280px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="profitTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-black/[0.04] dark:text-white/[0.05]" />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(val) => `${cur}${val}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const rev = payload.find((p) => p.dataKey === 'revenue')?.value || 0;
                        const prof = payload.find((p) => p.dataKey === 'profit')?.value || 0;
                        const orders = payload[0]?.payload?.orders || 0;
                        const units = payload[0]?.payload?.units || 0;

                        return (
                          <div className="p-3.5 rounded-2xl bg-[#0F172A] text-white shadow-2xl border border-white/10 backdrop-blur-xl text-xs space-y-1.5 min-w-[170px]">
                            <p className="font-bold text-slate-300 text-[11px] pb-1 border-b border-white/10">
                              {label}
                            </p>
                            <div className="flex justify-between items-center text-blue-400 font-bold">
                              <span>Revenue:</span>
                              <span className="text-white">{cur}{Number(rev).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>Gross Profit:</span>
                              <span className="text-white">{cur}{Number(prof).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/10">
                              <span>Volume:</span>
                              <span className="text-white">{units} units ({orders} tx)</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesTrendGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#profitTrendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center font-medium">
              <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Peak sales velocity observed on {trendSummary.peakDay.displayDate}
            </span>
            {onAskAdvisorAboutTrend && (
              <button
                type="button"
                onClick={() =>
                  onAskAdvisorAboutTrend(
                    `Can you analyze my sales trend of ${cur}${trendSummary.totalRevenue.toFixed(0)} over the ${rangeLabel} and tell me how to increase daily volume?`
                  )
                }
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center cursor-pointer"
              >
                Ask Advisor Strategy
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right (5 cols): Pie Chart Showing Products Selling Most */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xl shadow-black/[0.02] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight font-display flex items-center">
                  <PieIcon className="w-4 h-4 mr-2 text-indigo-500" />
                  Top Selling Products Share
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Product contribution to sales ({rangeLabel})
                </p>
              </div>

              {/* Metric Toggle: Revenue vs Units */}
              <div className="flex items-center p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPieMetric('revenue')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    pieMetric === 'revenue'
                      ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  By Value ({cur})
                </button>
                <button
                  type="button"
                  onClick={() => setPieMetric('units')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    pieMetric === 'units'
                      ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  By Units
                </button>
              </div>
            </div>

            {/* Recharts Pie Chart with Center Donut */}
            <div className="h-[210px] w-full relative flex items-center justify-center my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const totalVal = pieMetric === 'revenue' ? trendSummary.totalRevenue : trendSummary.totalUnits;
                        const pct = totalVal > 0 ? ((data.value / totalVal) * 100).toFixed(1) : '0';

                        return (
                          <div className="p-3 rounded-2xl bg-[#0F172A] text-white shadow-2xl border border-white/10 backdrop-blur-xl text-xs space-y-1">
                            <p className="font-bold text-white text-[11px] truncate max-w-[180px]">{data.name}</p>
                            <p className="text-slate-400 text-[10px] uppercase font-semibold">{data.category}</p>
                            <div className="flex justify-between items-center pt-1 border-t border-white/10 font-bold">
                              <span className="text-slate-300">
                                {pieMetric === 'revenue' ? `${cur}${data.value.toFixed(2)}` : `${data.value} units`}
                              </span>
                              <span className="text-blue-400 ml-2">({pct}%)</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {pieMetric === 'revenue' ? 'Total' : 'Units'}
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white font-display">
                  {pieMetric === 'revenue' ? `${cur}${trendSummary.totalRevenue.toFixed(0)}` : trendSummary.totalUnits}
                </span>
              </div>
            </div>

            {/* Custom Pie Legend Strip */}
            <div className="space-y-1.5 mt-2 max-h-[110px] overflow-y-auto pr-1">
              {pieChartData.map((item, idx) => {
                const totalVal = pieMetric === 'revenue' ? trendSummary.totalRevenue : trendSummary.totalUnits;
                const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px] max-w-[140px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 font-bold text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">
                        {pieMetric === 'revenue' ? `${cur}${item.value.toFixed(0)}` : `${item.value} pcs`}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 text-[10px] w-7 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Best vs Worst Performing Products: Two Clear High-Impact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 🌟 Best Performing Products (Top Performers) */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/[0.04] via-blue-500/[0.02] to-transparent dark:from-emerald-500/[0.08] dark:to-transparent backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/20 shadow-xl shadow-emerald-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight font-display flex items-center">
                  Best Performing Products
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                    Top Earners
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Driving the highest volume and profit margins
                </p>
              </div>
            </div>
            {onNavigateToPOS && (
              <button
                type="button"
                onClick={onNavigateToPOS}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center cursor-pointer"
              >
                Sell More
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>

          {bestPerformers.length > 0 ? (
            <div className="space-y-2.5">
              {bestPerformers.map((p, rank) => {
                const marginPct = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(0) : '0';
                return (
                  <div
                    key={p.productId}
                    className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#131B2E] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between shadow-xs hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          rank === 0
                            ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30'
                            : rank === 1
                            ? 'bg-slate-300 text-slate-900'
                            : rank === 2
                            ? 'bg-amber-700/80 text-amber-100'
                            : 'bg-black/[0.06] dark:bg-white/[0.08] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        #{rank + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {p.name}
                          </p>
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-semibold shrink-0">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{p.unitsSold} units</span> sold • {cur}{p.sellPrice.toFixed(2)} ea
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white font-display">
                        {cur}{p.revenue.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-end">
                        +{cur}{p.profit.toFixed(1)} ({marginPct}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/[0.08] dark:border-white/[0.08]">
              <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No recorded sales in this time window
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Complete transactions in POS to build your sales leaderboards.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: ⚠️ Worst / Slowest Performing Products */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-500/[0.04] via-amber-500/[0.02] to-transparent dark:from-rose-500/[0.08] dark:to-transparent backdrop-blur-xl border border-rose-500/20 dark:border-rose-500/20 shadow-xl shadow-rose-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight font-display flex items-center">
                  Slow-Moving / Low Performers
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-300 text-[10px] font-black uppercase">
                    Attention
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Sitting inventory trapping working capital on shelves
                </p>
              </div>
            </div>
            {onNavigateToInventory && (
              <button
                type="button"
                onClick={() => onNavigateToInventory(false)}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center cursor-pointer"
              >
                Manage Stock
                <ArrowDownRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}
          </div>

          {worstPerformers.length > 0 ? (
            <div className="space-y-2.5">
              {worstPerformers.map((p) => {
                const trappedMoney = p.currentStock * p.buyPrice;
                return (
                  <div
                    key={p.productId}
                    className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#131B2E] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between shadow-xs hover:border-rose-500/30 transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <TrendingDown className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {p.name}
                          </p>
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px] font-semibold shrink-0">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">{p.unitsSold} sold</span> in period • {p.currentStock} units in stock
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-rose-600 dark:text-rose-400 font-display">
                        {cur}{trappedMoney.toFixed(0)} trapped
                      </p>
                      <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {cur}{p.buyPrice.toFixed(2)} cost ea
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-black/[0.08] dark:border-white/[0.08]">
              <Package className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                All catalog items are rotating well!
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                No stagnant deadstock identified on your shelves.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category Performance Breakdown Strip */}
      <div className="p-6 rounded-3xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xl shadow-black/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight font-display">
                Sales by Fashion Category
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Revenue distribution across your active category catalog
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {categoryBreakdown.length} active categories
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categoryBreakdown.map((cat, idx) => {
            const pct = trendSummary.totalRevenue > 0 ? (cat.revenue / trendSummary.totalRevenue) * 100 : 0;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.06]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-black/[0.06] dark:bg-white/[0.08] h-1.5 rounded-full overflow-hidden mt-2 mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                  <span>{cat.units} pcs sold</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cur}{cat.revenue.toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
