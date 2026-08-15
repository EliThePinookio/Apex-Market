import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Download,
  Trash2,
  Eye,
  Printer,
  X,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Coins,
} from 'lucide-react';
import { Transaction, Product, BusinessProfile, FinancialSummary } from '../types';
import { deleteTransaction } from '../services/dbService';
import {
  exportSalesToCSV,
  exportFullBusinessReportCSV,
  printReceipt,
} from '../services/exportService';

interface TransactionsViewProps {
  transactions: Transaction[];
  products: Product[];
  profile: BusinessProfile;
  summary: FinancialSummary;
  onNotification: (msg: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  products,
  profile,
  summary,
  onNotification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'expense' | 'capital' | 'stock_refill'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_month'>('all');
  
  // Selected transaction detail modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const cur = profile?.currencySymbol || '$';

  // Safe formatting helpers
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString();
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Date filtering logic + Newest First sorting
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const list = Array.isArray(transactions) ? transactions : [];

    return list
      .filter((t) => {
        if (!t) return false;
        const desc = (t.description || '').toLowerCase();
        const idStr = String(t.id || '').toLowerCase();
        const custName = (t.customerName || '').toLowerCase();
        const query = searchTerm.trim().toLowerCase();

        const matchesSearch = !query || desc.includes(query) || idStr.includes(query) || custName.includes(query);
        const matchesType = typeFilter === 'all' || t.type === typeFilter;

        const txTime = t.date ? new Date(t.date).getTime() : 0;
        let matchesDate = true;

        if (datePreset === 'today') {
          matchesDate = txTime >= todayStart;
        } else if (datePreset === 'yesterday') {
          matchesDate = txTime >= yesterdayStart && txTime < todayStart;
        } else if (datePreset === 'this_month') {
          matchesDate = txTime >= monthStart;
        }

        return matchesSearch && matchesType && matchesDate;
      })
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      });
  }, [transactions, searchTerm, typeFilter, datePreset]);

  // Quick stats computed from current filtered ledger view
  const ledgerStats = useMemo(() => {
    let salesTotal = 0;
    let expensesTotal = 0;
    let profitTotal = 0;

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'sale') {
        salesTotal += amt;
        profitTotal += Number(tx.grossProfit) || 0;
      } else if (tx.type === 'expense') {
        expensesTotal += amt;
      }
    });

    return { salesTotal, expensesTotal, profitTotal };
  }, [filteredTransactions]);

  const handleDelete = async (txId: string) => {
    if (window.confirm('Delete this transaction permanently from the ledger?')) {
      await deleteTransaction(txId);
      onNotification('Transaction deleted from ledger');
      if (selectedTx?.id === txId) setSelectedTx(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header & CSV Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-[-0.02em] flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Transaction Ledger & History</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            {filteredTransactions.length} Logged records in verified financial database
          </p>
        </div>

        {/* CSV Export Dropdown / Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportSalesToCSV(transactions, cur)}
            title="Export Sales CSV"
            className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Sales</span>
          </button>

          <button
            onClick={() => exportFullBusinessReportCSV(transactions, products, profile, summary)}
            title="Export Full Master Excel Report"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Master Excel Report</span>
          </button>
        </div>
      </div>

      {/* Ledger Quick Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Filtered Inflow (Sales)</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              +{cur}{ledgerStats.salesTotal.toFixed(2)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Filtered Outflow (Expenses)</p>
            <p className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">
              -{cur}{ledgerStats.expensesTotal.toFixed(2)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Filtered Gross Profit</p>
            <p className="text-base font-bold text-teal-700 dark:text-teal-400 tabular-nums">
              +{cur}{ledgerStats.profitTotal.toFixed(2)}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Coins className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Preset Filters */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by note, ID, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs font-normal"
          />
        </div>

        {/* Type Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1 shrink-0">
          {[
            { id: 'all', label: 'All Logs' },
            { id: 'sale', label: 'Sales' },
            { id: 'expense', label: 'Expenses' },
            { id: 'capital', label: 'Capital' },
            { id: 'stock_refill', label: 'Refills' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTypeFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                typeFilter === item.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 font-medium'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center space-x-1 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-center shrink-0 shadow-2xs">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_month', label: 'This Month' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDatePreset(d.id as any)}
              className={`px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                datePreset === d.id
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP DATA TABLE (md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-400 tracking-[0.04em] border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Date / Ref ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Customer / Payment</th>
                <th className="py-3 px-4 text-right">Net Amount</th>
                <th className="py-3 px-4 text-right">Profit</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransactions.map((tx) => {
                const isSale = tx.type === 'sale';
                const isExpense = tx.type === 'expense';
                const amt = Number(tx.amount || 0);
                const profit = Number(tx.grossProfit || 0);

                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-xs font-medium">
                      <div className="font-semibold text-slate-900 dark:text-white">{formatDate(tx.date)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {formatTime(tx.date)} &bull; #{String(tx.id || '').slice(0, 8)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.04em] ${
                          isSale
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : isExpense
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {tx.type || 'entry'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors max-w-xs truncate">
                        {tx.description || 'Transaction record'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">{tx.customerName || 'Walk-in'}</div>
                      <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">{tx.paymentMethod || 'cash'}</span>
                    </td>

                    <td className="py-3 px-4 text-right tabular-nums font-bold text-xs">
                      <span
                        className={
                          isSale
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : isExpense
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }
                      >
                        {isExpense ? '-' : '+'}{cur}{amt.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-emerald-800 dark:text-emerald-400 text-xs">
                      {isSale && tx.grossProfit !== undefined ? `+${cur}${profit.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARD LIST (md:hidden) */}
      <div className="space-y-2 md:hidden">
        {filteredTransactions.map((tx) => {
          const isSale = tx.type === 'sale';
          const isExpense = tx.type === 'expense';
          const amt = Number(tx.amount || 0);
          const profit = Number(tx.grossProfit || 0);

          return (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-600 transition-all cursor-pointer flex items-center justify-between active:scale-[0.99]"
            >
              <div className="flex items-start space-x-3">
                <span
                  className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.04em] ${
                    isSale
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : isExpense
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {tx.type || 'entry'}
                </span>

                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {tx.description || 'Transaction record'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                    {formatDate(tx.date)} &bull; {formatTime(tx.date)}
                    {tx.customerName && ` &bull; ${tx.customerName}`}
                  </p>
                </div>
              </div>

              <div className="text-right tabular-nums">
                <p
                  className={`text-xs font-bold ${
                    isSale
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : isExpense
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {isExpense ? '-' : '+'}{cur}{amt.toFixed(2)}
                </p>
                {isSale && tx.grossProfit !== undefined && (
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-medium">
                    Profit: +{cur}{profit.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Receipt className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">No transactions match your search filter.</p>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-[0.04em]">
                  Transaction Details
                </span>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white tracking-[-0.02em]">#{selectedTx.id}</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Type:</span>
                <span className="font-semibold uppercase text-slate-800 dark:text-white tracking-wide text-[11px]">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-normal">Date & Time:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(selectedTx.date)} {formatTime(selectedTx.date)}
                </span>
              </div>
              {selectedTx.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Customer:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedTx.customerName}</span>
                </div>
              )}
              {selectedTx.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Payment Method:</span>
                  <span className="font-semibold uppercase text-slate-800 dark:text-slate-200 text-[11px] tracking-wide">
                    {selectedTx.paymentMethod}
                  </span>
                </div>
              )}
            </div>

            {/* Items Breakdown if Sale */}
            {selectedTx.items && selectedTx.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Items Sold</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedTx.items.map((i, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{i.productName}</p>
                        <p className="text-[10px] text-slate-400 font-normal">
                          {i.quantity} x {cur}{Number(i.unitSellPrice || 0).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {cur}{Number(i.totalSellPrice || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-800 dark:text-white">
                <span className="font-normal text-slate-600 dark:text-slate-400">Total Amount:</span>
                <span className="text-emerald-700 dark:text-emerald-400 tabular-nums font-bold text-sm">
                  {cur}{Number(selectedTx.amount || 0).toFixed(2)}
                </span>
              </div>

              {selectedTx.cogs !== undefined && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400 tabular-nums font-normal">
                  <span>COGS (Cost):</span>
                  <span>{cur}{Number(selectedTx.cogs || 0).toFixed(2)}</span>
                </div>
              )}

              {selectedTx.grossProfit !== undefined && (
                <div className="flex justify-between text-emerald-800 dark:text-emerald-400 font-semibold pt-1 border-t border-slate-200 dark:border-slate-700 tabular-nums">
                  <span>Net Gross Profit:</span>
                  <span>+{cur}{Number(selectedTx.grossProfit || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedTx.id)}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>

              <div className="flex items-center space-x-2">
                {selectedTx.type === 'sale' && (
                  <button
                    onClick={() => printReceipt(selectedTx, profile)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


