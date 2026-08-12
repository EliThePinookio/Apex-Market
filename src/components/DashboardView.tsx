import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  ShoppingBag,
  PiggyBank,
  Boxes,
  Percent,
} from 'lucide-react';
import { Product, Transaction, BusinessProfile, FinancialSummary } from '../types';
import { GeminiProfitAdvisor } from './GeminiProfitAdvisor';

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

  // Filter low stock products
  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  );

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

  return (
    <div className="space-y-5 pb-24 px-4 pt-4 max-w-lg mx-auto">
      {/* Low Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">
                Low Stock Warning ({lowStockProducts.length} Items)
              </p>
              <p className="text-[11px] text-amber-200/70 truncate max-w-[180px] xs:max-w-[240px]">
                {lowStockProducts.map((p) => p.name).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToInventory(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs whitespace-nowrap"
          >
            Refill
          </button>
        </div>
      )}

      {/* Main Revenue & Net Profit Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Revenue */}
        <div className="p-4 rounded-2xl glass-panel-interactive border border-cyan-500/20 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-15 text-cyan-400 transition-transform group-hover:scale-110">
            <TrendingUp className="w-16 h-16" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Sales Revenue</span>
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-100 tracking-tight">
              {cur}{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>COGS: {cur}{summary.totalCOGS.toFixed(0)}</span>
            <span className="text-emerald-400 font-bold">Gross: {cur}{summary.grossProfit.toFixed(0)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`p-4 rounded-2xl glass-panel-interactive border ${summary.netProfit >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'} shadow-xl flex flex-col justify-between relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-3 opacity-15 transition-transform group-hover:scale-110">
            <DollarSign className={`w-16 h-16 ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Net Profit</span>
              <span className={`p-1 rounded-md text-xs font-bold ${summary.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                {profitMarginPercent}%
              </span>
            </div>
            <div className={`text-xl font-extrabold tracking-tight ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cur}{summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Margin Rate</span>
            <span className="text-slate-200 font-bold">{profitMarginPercent}% Margin</span>
          </div>
        </div>
      </div>

      {/* Expenses & Capital Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Expenses */}
        <div className="p-3.5 rounded-2xl glass-panel-interactive border border-rose-500/20 shadow-md flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Total Expenses</p>
            <p className="text-base font-bold text-rose-400">
              {cur}{summary.totalExpenses.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Capital */}
        <div className="p-3.5 rounded-2xl glass-panel-interactive border border-amber-500/20 shadow-md flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Owner Capital</p>
            <p className="text-base font-bold text-amber-400">
              {cur}{summary.totalCapital.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Stock Value Card */}
      <div className="p-4 rounded-2xl glass-panel border border-violet-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">Inventory Valuation</h3>
              <p className="text-[11px] text-slate-400">{products.length} Total Registered Products</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToInventory()}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
          >
            Manage Stock &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/70">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Cost Value</span>
            <span className="text-sm font-bold text-slate-200">
              {cur}{summary.totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/70">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Potential Sales</span>
            <span className="text-sm font-bold text-emerald-400">
              {cur}{summary.totalPotentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Gemini AI Profit Advisor Section */}
      <GeminiProfitAdvisor summary={summary} profile={profile} products={products} />

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onNavigateToPOS}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all active:scale-95 hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
        >
          <ShoppingBag className="w-5 h-5 mb-1 text-cyan-400" />
          <span className="text-[11px] font-bold">POS Register</span>
        </button>

        <button
          onClick={() => onNavigateToInventory()}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all active:scale-95 hover:scale-105 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
        >
          <Package className="w-5 h-5 mb-1 text-violet-400" />
          <span className="text-[11px] font-bold">Stock List</span>
        </button>

        <button
          onClick={onOpenQuickAction}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all active:scale-95 hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        >
          <PlusCircle className="w-5 h-5 mb-1 text-emerald-400" />
          <span className="text-[11px] font-bold">Quick Entry</span>
        </button>

        <button
          onClick={onNavigateToAnalytics}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all active:scale-95 hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
        >
          <Percent className="w-5 h-5 mb-1 text-amber-400" />
          <span className="text-[11px] font-bold">Profit P&L</span>
        </button>
      </div>

      {/* Top Selling Products */}
      {topSellingList.length > 0 && (
        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/15 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Top Performing Products</span>
            <span className="text-slate-400 text-[10px] font-semibold">By Units Sold</span>
          </h3>

          <div className="space-y-2.5">
            {topSellingList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs transition-all hover:border-cyan-500/30"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-extrabold text-cyan-400">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-200 truncate max-w-[150px] xs:max-w-[200px]">
                    {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-400">{cur}{item.total.toFixed(2)}</span>
                  <span className="block text-[10px] text-slate-400 font-medium">{item.qty} sold</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Log */}
      <div className="p-4 rounded-2xl glass-panel border border-violet-500/15 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Recent Transactions
          </h3>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-extrabold hover:underline"
          >
            View All ({transactions.length}) &rarr;
          </button>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/70 text-xs hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                    tx.type === 'sale'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : tx.type === 'expense'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {tx.type}
                </span>
                <div className="truncate max-w-[140px] xs:max-w-[190px]">
                  <p className="font-semibold text-slate-200 truncate">{tx.description}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="text-right font-extrabold">
                <span
                  className={
                    tx.type === 'sale'
                      ? 'text-emerald-400'
                      : tx.type === 'expense'
                      ? 'text-rose-400'
                      : 'text-amber-400'
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
  );
};
