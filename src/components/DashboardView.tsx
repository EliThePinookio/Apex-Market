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
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="w-16 h-16 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Sales Revenue</span>
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-100 tracking-tight">
              {cur}{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>COGS: {cur}{summary.totalCOGS.toFixed(0)}</span>
            <span className="text-emerald-400 font-semibold">Gross: {cur}{summary.grossProfit.toFixed(0)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`p-4 rounded-2xl bg-slate-900 border ${summary.netProfit >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'} shadow-xl flex flex-col justify-between relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <DollarSign className="w-16 h-16 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Net Profit</span>
              <span className={`p-1 rounded-md text-xs font-bold ${summary.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {profitMarginPercent}%
              </span>
            </div>
            <div className={`text-xl font-extrabold tracking-tight ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cur}{summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Margin Rate</span>
            <span className="text-slate-200 font-bold">{profitMarginPercent}% Margin</span>
          </div>
        </div>
      </div>

      {/* Expenses & Capital Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Expenses */}
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
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
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/90 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Inventory Valuation</h3>
              <p className="text-[11px] text-slate-400">{products.length} Total Registered Products</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToInventory()}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            Manage Stock &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Cost Value</span>
            <span className="text-sm font-bold text-slate-200">
              {cur}{summary.totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Potential Sales</span>
            <span className="text-sm font-bold text-emerald-400">
              {cur}{summary.totalPotentialRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onNavigateToPOS}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-all active:scale-95 shadow-lg"
        >
          <ShoppingBag className="w-5 h-5 mb-1 text-blue-400" />
          <span className="text-[11px] font-bold">POS Register</span>
        </button>

        <button
          onClick={() => onNavigateToInventory()}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 transition-all active:scale-95 shadow-lg"
        >
          <Package className="w-5 h-5 mb-1 text-purple-400" />
          <span className="text-[11px] font-bold">Stock List</span>
        </button>

        <button
          onClick={onOpenQuickAction}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 transition-all active:scale-95 shadow-lg"
        >
          <PlusCircle className="w-5 h-5 mb-1 text-emerald-400" />
          <span className="text-[11px] font-bold">Quick Entry</span>
        </button>

        <button
          onClick={onNavigateToAnalytics}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 transition-all active:scale-95 shadow-lg"
        >
          <Percent className="w-5 h-5 mb-1 text-amber-400" />
          <span className="text-[11px] font-bold">Profit P&L</span>
        </button>
      </div>

      {/* Top Selling Products */}
      {topSellingList.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Top Performing Products</span>
            <span className="text-slate-500 text-[10px] font-normal">By Units Sold</span>
          </h3>

          <div className="space-y-2.5">
            {topSellingList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-200 truncate max-w-[150px] xs:max-w-[200px]">
                    {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400">{cur}{item.total.toFixed(2)}</span>
                  <span className="block text-[10px] text-slate-400">{item.qty} sold</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Log */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Recent Transactions
          </h3>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            View All ({transactions.length}) &rarr;
          </button>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs"
            >
              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                    tx.type === 'sale'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : tx.type === 'expense'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {tx.type}
                </span>
                <div className="truncate max-w-[140px] xs:max-w-[190px]">
                  <p className="font-semibold text-slate-200 truncate">{tx.description}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="text-right font-bold">
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
