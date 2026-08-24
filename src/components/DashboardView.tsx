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
  Flame,
  Sparkles,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Product, Transaction, BusinessProfile, FinancialSummary, Customer } from '../types';
import { recordStockRefill } from '../services/dbService';
import { GeminiProfitAdvisor } from './GeminiProfitAdvisor';

interface DashboardViewProps {
  summary: FinancialSummary;
  profile: BusinessProfile;
  products: Product[];
  transactions: Transaction[];
  customers?: Customer[];
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
  customers = [],
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToTransactions,
  onNavigateToAnalytics,
  onOpenQuickAction,
}) => {
  const cur = profile.currencySymbol || '$';
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Refill Modal State (Inline on Dashboard)
  const [refillProduct, setRefillProduct] = useState<Product | null>(null);
  const [refillQty, setRefillQty] = useState<number>(10);
  const [refillCost, setRefillCost] = useState<string>('0');

  // Filter transactions according to selected timeframe
  const filteredTransactions = transactions.filter((tx) => {
    if (timeframe === 'all') return true;
    const txDate = new Date(tx.date);
    const now = new Date();
    if (timeframe === 'today') {
      return (
        txDate.getDate() === now.getDate() &&
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }
    if (timeframe === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return txDate >= oneWeekAgo;
    }
    if (timeframe === 'month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const periodRevenue = filteredTransactions
    .filter((tx) => tx.type === 'sale')
    .reduce((acc, tx) => acc + (tx.amount || 0), 0);

  const periodSalesCount = filteredTransactions.filter((tx) => tx.type === 'sale').length;
  const avgBasket = periodSalesCount > 0 ? periodRevenue / periodSalesCount : 0;

  // Margin calculation
  const profitMarginPercent =
    summary.totalRevenue > 0
      ? Math.round((summary.netProfit / summary.totalRevenue) * 100)
      : 0;

  // Target calculations (e.g. daily target $1,000 or custom)
  const dailyTarget = 1000;
  const targetProgress = Math.min(100, Math.round((periodRevenue / dailyTarget) * 100));

  // Top Selling Products Calculation
  const productSalesMap = new Map<string, { name: string; qty: number; total: number }>();
  transactions
    .filter((t) => t.type === 'sale' && t.items)
    .forEach((t) => {
      t.items?.forEach((item) => {
        const existing = productSalesMap.get(item.productId) || {
          name: item.productName,
          qty: 0,
          total: 0,
        };
        existing.qty += item.quantity;
        existing.total += item.totalSellPrice || (item.unitSellPrice * item.quantity);
        productSalesMap.set(item.productId, existing);
      });
    });

  const topSellingList = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Ranked Low Stock Products
  const rankedLowStockProducts = products
    .filter((p) => p.stockQuantity <= p.minStockThreshold)
    .sort((a, b) => {
      const aRatio = a.stockQuantity / (a.minStockThreshold || 1);
      const bRatio = b.stockQuantity / (b.minStockThreshold || 1);
      return aRatio - bRatio;
    });

  const outOfStockCount = rankedLowStockProducts.filter((p) => p.stockQuantity <= 0).length;
  const criticalWarningCount = rankedLowStockProducts.length - outOfStockCount;

  // Sparkline data for recent revenue velocity
  const sparklineData = transactions
    .filter((t) => t.type === 'sale')
    .slice(0, 10)
    .reverse()
    .map((t, idx) => ({
      name: idx.toString(),
      amount: t.amount,
    }));

  const openRefillModal = (prod: Product) => {
    setRefillProduct(prod);
    setRefillQty(10);
    setRefillCost(prod.buyPrice.toString());
  };

  const handleConfirmDashboardRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct) return;

    await recordStockRefill({
      productId: refillProduct.id,
      quantityToAdd: Number(refillQty),
      costPerUnit: parseFloat(refillCost) || refillProduct.buyPrice,
    });

    setRefillProduct(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. LOW STOCK REPLENISHMENT ALERT */}
      {rankedLowStockProducts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/[0.10] dark:bg-amber-500/[0.14] border border-amber-500/25 backdrop-blur-xl text-slate-900 dark:text-slate-100 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/15 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Inventory Replenishment Alert
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 shadow-2xs">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-semibold">
                  {outOfStockCount > 0 && `${outOfStockCount} Out of Stock • `}
                  {criticalWarningCount > 0 && `${criticalWarningCount} Low Stock • `}
                  Ranked by shortage severity
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToInventory(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-[0.97] text-white font-bold text-xs flex items-center space-x-1.5 shrink-0 cursor-pointer self-start sm:self-auto transition shadow-xs"
            >
              <span>View All ({rankedLowStockProducts.length}) Low Stock</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {rankedLowStockProducts.slice(0, 3).map((prod) => {
              const isOut = prod.stockQuantity <= 0;
              const ratio = prod.stockQuantity / (prod.minStockThreshold || 1);
              const pct = Math.min(100, Math.round(ratio * 100));

              return (
                <div
                  key={prod.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-[#151D2A]/80 border border-white/80 dark:border-white/[0.08] shadow-xs backdrop-blur-md flex flex-col justify-between space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                        {prod.category}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[170px]">
                        {prod.name}
                      </h3>
                    </div>

                    {isOut ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                        <Flame className="w-3 h-3" />
                        <span>Out of Stock</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shadow-2xs">
                        {pct}% Stock Left
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs tabular-nums text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Current Stock:</span>
                      <span className={isOut ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-900 dark:text-white font-extrabold'}>
                        {prod.stockQuantity} / {prod.minStockThreshold} {prod.unit}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isOut ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => openRefillModal(prod)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition shadow-xs"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>Quick Refill Stock</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. MAIN OVERVIEW HERO CARD (Messenger Glass / Vision OS aesthetic) */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#161F33] to-[#0A0F1D] text-white p-6 sm:p-7 border border-white/[0.12] shadow-2xl shadow-blue-950/30 space-y-6 relative overflow-hidden backdrop-blur-2xl">
        {/* Soft background ambient light blooms */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl pointer-events-none -mb-20" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.1]">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-blue-400 text-xs font-black uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Executive Business Monitor</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {profile.businessName} Overview
            </h1>
          </div>

          {/* Segmented Control with rounded glass pills */}
          <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/[0.1] text-xs font-bold self-start sm:self-auto backdrop-blur-md shadow-inner">
            {(['today', 'week', 'month', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTimeframe(tab)}
                className={`px-3.5 py-1.5 rounded-xl transition-all capitalize cursor-pointer active:scale-[0.95] ${
                  timeframe === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All Time' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-2">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Period Revenue
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tabular-nums tracking-tight">
              {cur}{periodRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center space-x-3 text-xs pt-1 text-slate-300">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-extrabold border border-blue-500/30 shadow-2xs">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                {periodSalesCount} Sales Logged
              </span>
              <span className="font-semibold text-slate-400">
                Avg Basket: <strong className="text-white tabular-nums font-black">{cur}{avgBasket.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] space-y-2.5 backdrop-blur-md">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-bold">
                <Target className="w-4 h-4 text-blue-400" />
                <span>Daily Revenue Target</span>
              </div>
              <div className="text-base font-extrabold text-white tabular-nums">
                {cur}{periodRevenue.toFixed(0)} / {cur}{dailyTarget}
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.1] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, targetProgress)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold">
                {targetProgress >= 100 ? 'Goal Achieved!' : `${targetProgress}% of target reached`}
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 h-28 bg-white/[0.05] p-3.5 rounded-2xl border border-white/[0.08] flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
              <span>Sales Velocity</span>
              <span className="text-[10px] text-slate-400 font-semibold">Recent 10 Sales</span>
            </div>
            {sparklineData.length > 0 ? (
              <div className="w-full h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#151D2A] border border-white/[0.15] text-white px-2 py-1 rounded-xl text-[10px] tabular-nums font-bold shadow-lg">
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
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fill="#38bdf8"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-3 text-xs text-slate-500 font-semibold">No sales logged yet</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. METRICS GRID (Messenger Floating Glass Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Total Revenue */}
        <div
          onClick={onNavigateToAnalytics}
          className="ios-card ios-card-interactive p-4 sm:p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {cur}{summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums font-semibold">
            <span>Goods Cost: {cur}{summary.totalCOGS.toFixed(0)}</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">Profit: {cur}{summary.grossProfit.toFixed(0)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div
          onClick={onNavigateToAnalytics}
          className="ios-card ios-card-interactive p-4 sm:p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Net Profit</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${summary.netProfit >= 0 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25'}`}>
              {profitMarginPercent}% Margin
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {cur}{summary.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>Profit Margin</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{profitMarginPercent}% Net</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div
          onClick={onNavigateToTransactions}
          className="ios-card ios-card-interactive p-4 sm:p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
            {cur}{summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>Expense Logs</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{transactions.filter(t => t.type === 'expense').length} items</span>
          </div>
        </div>

        {/* Owner Capital */}
        <div
          onClick={onNavigateToTransactions}
          className="ios-card ios-card-interactive p-4 sm:p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Owner Capital</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white flex items-center justify-center shadow-xs">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-violet-700 dark:text-violet-400 tabular-nums tracking-tight">
            {cur}{summary.totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span>Capital Reserve</span>
            <span className="font-extrabold text-violet-700 dark:text-violet-400">Active</span>
          </div>
        </div>
      </div>

      {/* 4. INVENTORY VALUATION & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory Stock Valuation Card */}
        <div
          onClick={() => onNavigateToInventory()}
          className="lg:col-span-2 ios-card ios-card-interactive p-5 sm:p-6 flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Inventory Asset Valuation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{products.length} Active Catalog SKUs</p>
              </div>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/20">
              <span>Manage Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
            <div className="ios-subcard p-3.5">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider mb-0.5">Asset Cost Value</span>
              <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                {cur}{summary.totalInventoryValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="ios-subcard p-3.5">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider mb-0.5">Potential Revenue</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {cur}{summary.totalPotentialRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="ios-subcard p-3.5 col-span-2 sm:col-span-1">
              <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider mb-0.5">Stock Status</span>
              <span className={`text-base font-black ${rankedLowStockProducts.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {rankedLowStockProducts.length > 0 ? `${rankedLowStockProducts.length} Low Stock` : 'Healthy Stock'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Launch Actions (Messenger Bubble Style) */}
        <div className="ios-card p-5 sm:p-6 flex flex-col justify-between space-y-3.5">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onNavigateToPOS}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/20 text-blue-900 dark:text-blue-200 transition-all active:scale-[0.96] cursor-pointer shadow-2xs backdrop-blur-md"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs mb-1.5">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">POS Terminal</span>
            </button>

            <button
              onClick={() => onNavigateToInventory()}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 hover:from-teal-500/20 hover:to-emerald-500/20 border border-teal-500/20 text-teal-900 dark:text-teal-200 transition-all active:scale-[0.96] cursor-pointer shadow-2xs backdrop-blur-md"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs mb-1.5">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Inventory</span>
            </button>

            <button
              onClick={onOpenQuickAction}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 border border-violet-500/20 text-violet-900 dark:text-violet-200 transition-all active:scale-[0.96] cursor-pointer shadow-2xs backdrop-blur-md"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-xs mb-1.5">
                <PlusCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Quick Entry</span>
            </button>

            <button
              onClick={onNavigateToAnalytics}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 text-amber-900 dark:text-amber-200 transition-all active:scale-[0.96] cursor-pointer shadow-2xs backdrop-blur-md"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs mb-1.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Advisor</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. GEMINI AI PROFIT ADVISOR */}
      <GeminiProfitAdvisor summary={summary} profile={profile} products={products} />

      {/* 6. BOTTOM ROW: TOP PERFORMING PRODUCTS & RECENT LEDGER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Products */}
        <div className="ios-card p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Top Catalog Performers
            </h3>
            <span className="text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Volume Ranked</span>
          </div>

          {topSellingList.length > 0 ? (
            <div className="space-y-2">
              {topSellingList.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl ios-subcard text-xs hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums text-xs sm:text-sm">{cur}{item.total.toFixed(2)}</span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{item.qty} units sold</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-8 text-center flex flex-col items-center justify-center space-y-1.5">
              <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
              <span className="font-semibold">No sales logged yet. Complete a checkout in POS!</span>
            </div>
          )}
        </div>

        {/* Recent Activity Log */}
        <div className="ios-card p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Recent Transactions
            </h3>
            <button
              onClick={onNavigateToTransactions}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
            >
              View Full Ledger ({transactions.length}) &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-2xl ios-subcard text-xs hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 shadow-2xs ${
                      tx.type === 'sale'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                        : tx.type === 'expense'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                    }`}
                  >
                    {tx.type}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right font-black tabular-nums text-xs sm:text-sm shrink-0">
                  <span
                    className={
                      tx.type === 'sale'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'expense'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {tx.type === 'expense' ? '-' : '+'}{cur}{tx.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REFILL MODAL */}
      {refillProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-[#0F172A]/90 border border-white/80 dark:border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
              <div>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                  {refillProduct.category}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Refill Stock: {refillProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setRefillProduct(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDashboardRefill} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex justify-between items-center text-amber-900 dark:text-amber-200">
                <span className="font-bold">Current Stock:</span>
                <span className="font-black text-sm tabular-nums">
                  {refillProduct.stockQuantity} / {refillProduct.minStockThreshold} {refillProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Units to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={refillQty}
                  onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-3 text-slate-900 dark:text-white font-extrabold focus:outline-none focus:border-blue-500 text-sm shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Cost Price Per Unit ({cur}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refillCost}
                  onChange={(e) => setRefillCost(e.target.value)}
                  className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs font-bold tabular-nums shadow-xs"
                />
              </div>

              <div className="p-3.5 rounded-2xl ios-subcard flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">New Total Stock:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {refillProduct.stockQuantity + Number(refillQty)} {refillProduct.unit}
                </span>
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setRefillProduct(null)}
                  className="px-4 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 font-bold bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] active:scale-[0.97] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.97] text-white font-bold cursor-pointer shadow-md shadow-blue-500/25"
                >
                  Confirm Refill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
