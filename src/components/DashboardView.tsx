import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  ShoppingBag,
  PiggyBank,
  Boxes,
  Zap,
  Target,
  BarChart3,
  PackagePlus,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Product, Transaction, BusinessProfile, FinancialSummary } from '../types';
import { recordStockRefill } from '../services/dbService';
import { GeminiProfitAdvisor } from './GeminiProfitAdvisor';
import { AnimatedNumber } from './AnimatedNumber';
import { TiltCard } from './TiltCard';
import { AnimatedProgressRing } from './AnimatedProgressRing';

interface DashboardViewProps {
  summary: FinancialSummary;
  profile: BusinessProfile;
  products: Product[];
  transactions: Transaction[];
  onNavigateToPOS: () => void;
  onNavigateToInventory: (filterLowStock?: boolean) => void;
  onNavigateToTransactions: () => void;
  onNavigateToAnalytics: () => void;
  onOpenQuickAction: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  profile,
  products,
  transactions,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToTransactions,
  onNavigateToAnalytics,
  onOpenQuickAction,
}) => {
  const cur = profile.currencySymbol;
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Refill Modal State (Inline on Dashboard)
  const [refillProduct, setRefillProduct] = useState<Product | null>(null);
  const [refillQty, setRefillQty] = useState<number>(10);
  const [refillCost, setRefillCost] = useState<string>('');

  // 1. INTELLIGENT LOW STOCK PRIORITIZATION LOGIC
  // Filter all items below or equal to reorder threshold
  const lowStockProductsRaw = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  );

  // Intelligently rank and categorize by severity
  const rankedLowStockProducts = [...lowStockProductsRaw].sort((a, b) => {
    // Priority 1: Out of stock (0 quantity)
    const aIsOut = a.stockQuantity <= 0;
    const bIsOut = b.stockQuantity <= 0;
    if (aIsOut && !bIsOut) return -1;
    if (!aIsOut && bIsOut) return 1;

    // Priority 2: Lowest stock percentage remaining
    const aRatio = a.stockQuantity / (a.minStockThreshold || 1);
    const bRatio = b.stockQuantity / (b.minStockThreshold || 1);
    if (aRatio !== bRatio) return aRatio - bRatio;

    // Priority 3: Highest stock deficit (minStockThreshold - stockQuantity)
    const aDeficit = a.minStockThreshold - a.stockQuantity;
    const bDeficit = b.minStockThreshold - b.stockQuantity;
    return bDeficit - aDeficit;
  });

  const outOfStockCount = rankedLowStockProducts.filter((p) => p.stockQuantity <= 0).length;
  const criticalWarningCount = rankedLowStockProducts.length - outOfStockCount;

  // Calculate timeframe filtered sales summary
  const now = new Date();
  const filteredTransactions = transactions.filter((t) => {
    if (timeframe === 'all') return true;
    const txDate = new Date(t.date);
    const diffHours = (now.getTime() - txDate.getTime()) / (1000 * 3600);
    if (timeframe === 'today') return diffHours <= 24;
    if (timeframe === 'week') return diffHours <= 24 * 7;
    if (timeframe === 'month') return diffHours <= 24 * 30;
    return true;
  });

  const periodRevenue = filteredTransactions
    .filter((t) => t.type === 'sale')
    .reduce((acc, t) => acc + t.amount, 0);

  const periodSalesCount = filteredTransactions.filter((t) => t.type === 'sale').length;
  const avgBasket = periodSalesCount > 0 ? periodRevenue / periodSalesCount : 0;

  // Daily target benchmark
  const dailyTarget = 1000;
  const targetProgress = Math.min(100, Math.round((periodRevenue / dailyTarget) * 100));

  // Top Selling products calculation
  const topProductsMap: { [id: string]: { name: string; qty: number; total: number } } = {};
  transactions
    .filter((t) => t.type === 'sale' && t.items)
    .forEach((t) => {
      t.items?.forEach((i) => {
        if (!topProductsMap[i.productId]) {
          topProductsMap[i.productId] = { name: i.productName, qty: 0, total: 0 };
        }
        topProductsMap[i.productId].qty += i.quantity;
        topProductsMap[i.productId].total += i.totalSellPrice;
      });
    });

  const topSellingList = Object.values(topProductsMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const profitMarginPercent = summary.totalRevenue > 0
    ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  // Sparkline data for hero chart
  const sparklineData = transactions
    .filter((t) => t.type === 'sale')
    .slice(-10)
    .map((t, i) => ({ index: i, amount: t.amount }));

  // Handle Quick Refill Action
  const openRefillModal = (prod: Product) => {
    const suggestedAdd = Math.max(10, prod.minStockThreshold * 2 - prod.stockQuantity);
    setRefillProduct(prod);
    setRefillQty(suggestedAdd);
    setRefillCost(prod.buyPrice.toString());
  };

  const handleConfirmDashboardRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct) return;

    await recordStockRefill({
      productId: refillProduct.id,
      quantityToAdd: Number(refillQty),
      costPerUnit: Number(refillCost) || refillProduct.buyPrice,
      reason: 'Quick Replenishment via Dashboard Alert',
    });

    setRefillProduct(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. INTELLIGENT PRIORITIZED LOW STOCK REPLENISHMENT ALERT COMMAND SURFACE */}
      {rankedLowStockProducts.length > 0 && (
        <TiltCard elevation="floating" glowColor={outOfStockCount > 0 ? 'rose' : 'amber'}>
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-950/90 via-slate-900 to-slate-950 border border-amber-500/40 text-white shadow-2xl relative overflow-hidden space-y-4">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* Alert Header & Primary Call-to-Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/30 pb-4 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/30 to-rose-500/30 border border-amber-400/40 text-amber-300 relative shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-300 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Inventory Replenishment Alert
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 font-medium mt-0.5">
                    {outOfStockCount > 0 && `${outOfStockCount} Out of Stock • `}
                    {criticalWarningCount > 0 && `${criticalWarningCount} Low Stock Thresholds `}
                    • Ranked by urgency and shortage severity
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigateToInventory(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <span>View All ({rankedLowStockProducts.length}) Low Stock</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Top Critical Items Grid (Displaying top 3-4 prioritized items) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
              {rankedLowStockProducts.slice(0, 3).map((prod) => {
                const isOut = prod.stockQuantity <= 0;
                const ratio = prod.stockQuantity / (prod.minStockThreshold || 1);
                const pct = Math.min(100, Math.round(ratio * 100));

                return (
                  <div
                    key={prod.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 transition-all flex flex-col justify-between space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400/90 block mb-0.5">
                          {prod.category}
                        </span>
                        <h3 className="text-sm font-extrabold text-white truncate max-w-[170px]">
                          {prod.name}
                        </h3>
                      </div>

                      {isOut ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white shadow-xs">
                          <Flame className="w-3 h-3" />
                          <span>Out of Stock</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          {pct}% Stock Left
                        </span>
                      )}
                    </div>

                    {/* Stock Level Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Current Qty:</span>
                        <span className={isOut ? 'text-rose-400 font-extrabold' : 'text-amber-300 font-bold'}>
                          {prod.stockQuantity} / {prod.minStockThreshold} {prod.unit}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isOut ? 'bg-rose-500' : ratio <= 0.3 ? 'bg-amber-500' : 'bg-yellow-400'
                          }`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Refill Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openRefillModal(prod)}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Quick Refill Stock</span>
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        </TiltCard>
      )}

      {/* 2. LIVING HERO AREA - Animated Primary Metric & Dynamic Dimensional Emerald System */}
      <TiltCard elevation="hero" glowColor="emerald">
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-emerald-800/40 overflow-hidden">
          {/* Soft Ambient Light Glow Blobs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

          {/* Hero Top Bar: Title & Timeframe Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-800/50 relative z-10">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wide uppercase mb-2 backdrop-blur-md">
                <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>Executive Live Business Monitor</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {profile.businessName} Overview
              </h1>
            </div>

            {/* Timeframe Tab Switcher */}
            <div className="flex items-center bg-slate-950/60 p-1.5 rounded-2xl border border-emerald-800/60 text-xs font-semibold backdrop-blur-md self-start sm:self-auto">
              {(['today', 'week', 'month', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimeframe(tab)}
                  className={`relative px-3.5 py-1.5 rounded-xl transition-all capitalize cursor-pointer z-10 ${
                    timeframe === tab ? 'text-emerald-950 font-black' : 'text-emerald-200/80 hover:text-white'
                  }`}
                >
                  {timeframe === tab && (
                    <motion.div
                      layoutId="heroTimeframe"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-mint-400 bg-emerald-400 rounded-xl shadow-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab === 'all' ? 'All Time' : tab}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hero Content Grid: Primary Animated Metric + Progress Target Ring + Sparkline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 relative z-10 items-center">
            {/* Column 1: Primary Revenue Number */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Period Revenue Velocity</span>
              </div>

              <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-mono tabular-nums flex items-baseline space-x-1">
                <span>{cur}</span>
                <AnimatedNumber value={periodRevenue} duration={800} />
              </div>

              <div className="flex items-center space-x-3 text-xs pt-1">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  {periodSalesCount} Sales Logged
                </span>
                <span className="text-emerald-200/70 font-medium">
                  Avg Basket: <strong className="text-white font-mono">{cur}{avgBasket.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* Column 2: Interactive Target Progress Ring */}
            <div className="lg:col-span-3 flex items-center justify-center lg:justify-start">
              <div className="flex items-center space-x-4 bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50 backdrop-blur-md w-full sm:w-auto">
                <AnimatedProgressRing
                  progress={targetProgress}
                  size={80}
                  strokeWidth={8}
                  gradientStart="#10b981"
                  gradientEnd="#34d399"
                  bgStroke="rgba(6, 78, 59, 0.6)"
                >
                  <span className="text-xs font-black text-emerald-300 font-mono">{targetProgress}%</span>
                </AnimatedProgressRing>

                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-200">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span>Daily Revenue Target</span>
                  </div>
                  <div className="text-sm font-extrabold text-white font-mono">
                    {cur}{periodRevenue.toFixed(0)} / {cur}{dailyTarget}
                  </div>
                  <p className="text-[10px] text-emerald-300/80">
                    {targetProgress >= 100 ? '🎉 Goal Achieved!' : `${100 - targetProgress}% to goal`}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Mini Trend Chart Visualizer */}
            <div className="lg:col-span-4 h-24 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/40 backdrop-blur-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 px-1">
                <span>Sales Velocity Curve</span>
                <span className="text-[10px] text-emerald-400 font-mono">Recent 10 Sales</span>
              </div>
              {sparklineData.length > 0 ? (
                <div className="w-full h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 border border-emerald-500/40 text-emerald-300 p-1.5 rounded-lg text-[10px] font-mono shadow-md">
                                {cur}{payload[0].value}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#34d399"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#heroGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-emerald-400/60">No sales graph yet</div>
              )}
            </div>
          </div>
        </div>
      </TiltCard>

      {/* 3. TACTILE METRICS GRID WITH 3D FLOATING OBJECTS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Total Revenue Card */}
        <TiltCard elevation="floating" onClick={onNavigateToAnalytics}>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 text-emerald-800 transition-transform group-hover:scale-110 pointer-events-none">
              <TrendingUp className="w-20 h-20" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Total Revenue</span>
                <span className="p-1 rounded-lg bg-emerald-100/80 text-emerald-700 border border-emerald-200">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
                {cur}<AnimatedNumber value={summary.totalRevenue} />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>COGS: {cur}{summary.totalCOGS.toFixed(0)}</span>
              <span className="text-emerald-700 font-bold">Gross: {cur}{summary.grossProfit.toFixed(0)}</span>
            </div>
          </div>
        </TiltCard>

        {/* Net Profit Card */}
        <TiltCard elevation="floating" onClick={onNavigateToAnalytics}>
          <div className={`p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/30 border ${summary.netProfit >= 0 ? 'border-emerald-200' : 'border-rose-200'} flex flex-col justify-between relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-3 opacity-5 transition-transform group-hover:scale-110 pointer-events-none">
              <DollarSign className={`w-20 h-20 ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Net Profit</span>
                <span className={`p-1 px-1.5 rounded-md text-[11px] font-extrabold ${summary.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                  {profitMarginPercent}%
                </span>
              </div>
              <div className={`text-xl md:text-2xl font-black tracking-tight font-mono tabular-nums ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {cur}<AnimatedNumber value={summary.netProfit} />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Margin Rate</span>
              <span className="text-slate-800 font-bold">{profitMarginPercent}% Net</span>
            </div>
          </div>
        </TiltCard>

        {/* Total Expenses Card */}
        <TiltCard elevation="floating" onClick={onNavigateToTransactions}>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-rose-50/20 border border-rose-200/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Total Expenses</span>
                <span className="p-1 rounded-lg bg-rose-100 text-rose-700 border border-rose-200">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-rose-600 tracking-tight font-mono tabular-nums">
                {cur}<AnimatedNumber value={summary.totalExpenses} />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Expense Logs</span>
              <span className="text-slate-800 font-bold">{transactions.filter(t => t.type === 'expense').length} items</span>
            </div>
          </div>
        </TiltCard>

        {/* Owner Capital Card */}
        <TiltCard elevation="floating" onClick={onNavigateToTransactions}>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-white via-slate-50/80 to-amber-50/20 border border-amber-200/90 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Owner Capital</span>
                <span className="p-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                  <PiggyBank className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xl md:text-2xl font-black text-amber-800 tracking-tight font-mono tabular-nums">
                {cur}<AnimatedNumber value={summary.totalCapital} />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Capital Reserve</span>
              <span className="text-amber-800 font-bold">Active Reserve</span>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* 4. ASYMMETRIC LAYOUT: INVENTORY VALUATION & QUICK WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory Stock Valuation Card */}
        <TiltCard elevation="elevated" className="lg:col-span-2 rounded-3xl" onClick={() => onNavigateToInventory()}>
          <div className="p-6 rounded-3xl bg-gradient-to-br from-white via-slate-50/90 to-emerald-50/30 border border-slate-200/90 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Inventory Asset Valuation</h3>
                  <p className="text-xs text-slate-500 font-medium">{products.length} Active Catalog SKUs</p>
                </div>
              </div>
              <span className="text-xs text-emerald-700 font-extrabold flex items-center space-x-1 group-hover:underline">
                <span>Manage Inventory</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Asset Cost Valuation</span>
                <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                  {cur}<AnimatedNumber value={summary.totalInventoryValuation} />
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Potential Revenue</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono tabular-nums">
                  {cur}<AnimatedNumber value={summary.totalPotentialRevenue} />
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Stock Status</span>
                <span className={`text-base font-extrabold ${rankedLowStockProducts.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {rankedLowStockProducts.length > 0 ? `${rankedLowStockProducts.length} Low Stock` : 'Healthy Stock'}
                </span>
              </div>
            </div>
          </div>
        </TiltCard>

        {/* Quick Launch Actions */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_12px_30px_-5px_rgba(15,23,42,0.06)] flex flex-col justify-between space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Quick Launch Workspace
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={onNavigateToPOS}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 transition-all shadow-2xs cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 mb-1.5 text-emerald-700" />
              <span className="text-xs font-bold">POS Terminal</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigateToInventory()}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-900 transition-all shadow-2xs cursor-pointer"
            >
              <Package className="w-5 h-5 mb-1.5 text-teal-700" />
              <span className="text-xs font-bold">Inventory SKUs</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenQuickAction}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 mb-1.5 text-emerald-600" />
              <span className="text-xs font-bold">Quick Entry</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={onNavigateToAnalytics}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 transition-all shadow-2xs cursor-pointer"
            >
              <BarChart3 className="w-5 h-5 mb-1.5 text-amber-700" />
              <span className="text-xs font-bold">P&L Report</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* 5. GEMINI AI PROFIT ADVISOR */}
      <GeminiProfitAdvisor summary={summary} profile={profile} products={products} />

      {/* 6. BOTTOM ROW: TOP PERFORMING PRODUCTS & RECENT LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Products */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_12px_30px_-5px_rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Top Catalog Performers
            </h3>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Volume Ranked</span>
          </div>

          {topSellingList.length > 0 ? (
            <div className="space-y-2.5">
              {topSellingList.map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 text-xs transition-all"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-black text-emerald-800 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-emerald-700 font-mono tabular-nums">{cur}{item.total.toFixed(2)}</span>
                    <span className="block text-[10px] text-slate-500 font-medium">{item.qty} units sold</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-8 text-center flex flex-col items-center justify-center space-y-1">
              <ShoppingBag className="w-6 h-6 text-slate-300 mb-1" />
              <span>No sales logged yet. Complete a checkout in POS!</span>
            </div>
          )}
        </div>

        {/* Recent Activity Log */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_12px_30px_-5px_rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Recent Transactions
            </h3>
            <button
              onClick={onNavigateToTransactions}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-extrabold hover:underline cursor-pointer"
            >
              View Full Ledger ({transactions.length}) &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <motion.div
                key={tx.id}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/70 text-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                      tx.type === 'sale'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : tx.type === 'expense'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {tx.type}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right font-extrabold font-mono tabular-nums shrink-0">
                  <span
                    className={
                      tx.type === 'sale'
                        ? 'text-emerald-700'
                        : tx.type === 'expense'
                        ? 'text-rose-600'
                        : 'text-amber-800'
                    }
                  >
                    {tx.type === 'expense' ? '-' : '+'}{cur}{tx.amount.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* REFILL MODAL (INLINE DIRECT REPLENISHMENT) */}
      <AnimatePresence>
        {refillProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                    {refillProduct.category}
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Refill Stock: {refillProduct.name}
                  </h3>
                </div>
                <button
                  onClick={() => setRefillProduct(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmDashboardRefill} className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex justify-between items-center text-amber-900">
                  <span>Current Inventory Stock:</span>
                  <span className="font-black text-sm font-mono">
                    {refillProduct.stockQuantity} / {refillProduct.minStockThreshold} {refillProduct.unit}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Units to Add *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={refillQty}
                    onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Cost Price Per Unit ({cur}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refillCost}
                    onChange={(e) => setRefillCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between font-mono">
                  <span className="text-slate-500">New Total Stock:</span>
                  <span className="font-black text-emerald-700">
                    {refillProduct.stockQuantity + Number(refillQty)} {refillProduct.unit}
                  </span>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setRefillProduct(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Confirm Refill
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
