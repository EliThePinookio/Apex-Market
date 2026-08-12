import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Printer,
  X,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, Product, BusinessProfile, FinancialSummary } from '../types';
import { deleteTransaction } from '../services/dbService';
import {
  exportSalesToCSV,
  exportExpensesToCSV,
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

  const cur = profile.currencySymbol;

  // Date filtering logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return transactions.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'all' || t.type === typeFilter;

      const txTime = new Date(t.date).getTime();
      let matchesDate = true;

      if (datePreset === 'today') {
        matchesDate = txTime >= todayStart;
      } else if (datePreset === 'yesterday') {
        matchesDate = txTime >= yesterdayStart && txTime < todayStart;
      } else if (datePreset === 'this_month') {
        matchesDate = txTime >= monthStart;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, datePreset]);

  const handleDelete = async (txId: string) => {
    if (confirm('Delete this transaction permanently?')) {
      await deleteTransaction(txId);
      onNotification('Transaction deleted');
      if (selectedTx?.id === txId) setSelectedTx(null);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto space-y-4">
      {/* Header & CSV Export Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span>Transaction Ledger</span>
          </h2>
          <p className="text-xs text-slate-400">
            {filteredTransactions.length} Logged records
          </p>
        </div>

        {/* CSV Export Dropdown / Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => exportSalesToCSV(transactions, cur)}
            title="Export Sales CSV"
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 font-bold text-xs flex items-center space-x-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sales</span>
          </button>

          <button
            onClick={() => exportFullBusinessReportCSV(transactions, products, profile, summary)}
            title="Export Full Master Excel Report"
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Preset Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by note, ID, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Type Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                typeFilter === item.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-black scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Date Filter Bar */}
        <div className="grid grid-cols-4 gap-1 p-1.5 glass-panel rounded-2xl border border-slate-800/80 text-[11px] font-bold text-center">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_month', label: 'This Month' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDatePreset(d.id as any)}
              className={`py-1.5 rounded-xl transition-all active:scale-95 ${
                datePreset === d.id
                  ? 'bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filteredTransactions.map((tx) => {
          const isSale = tx.type === 'sale';
          const isExpense = tx.type === 'expense';
          const isCapital = tx.type === 'capital';

          return (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="p-3.5 rounded-2xl glass-panel-interactive border border-slate-800/80 shadow-md hover:border-cyan-500/30 transition-all cursor-pointer flex items-center justify-between active:scale-[0.99]"
            >
              <div className="flex items-start space-x-3">
                <span
                  className={`mt-0.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                    isSale
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                      : isExpense
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  }`}
                >
                  {tx.type}
                </span>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                    {tx.description}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} &bull;{' '}
                    {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {tx.customerName && ` &bull; ${tx.customerName}`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-black ${
                    isSale
                      ? 'text-emerald-400'
                      : isExpense
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {isExpense ? '-' : '+'}{cur}{tx.amount.toFixed(2)}
                </p>
                {isSale && tx.grossProfit !== undefined && (
                  <p className="text-[10px] text-cyan-400/90 font-bold">
                    Profit: +{cur}{tx.grossProfit.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <Receipt className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-xs">No transactions match your search filter.</p>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Transaction Details
                </span>
                <h3 className="text-sm font-extrabold text-slate-100">#{selectedTx.id}</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold uppercase text-slate-200">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-semibold text-slate-200">
                  {new Date(selectedTx.date).toLocaleString()}
                </span>
              </div>
              {selectedTx.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-semibold text-slate-200">{selectedTx.customerName}</span>
                </div>
              )}
              {selectedTx.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Method:</span>
                  <span className="font-semibold uppercase text-slate-200">
                    {selectedTx.paymentMethod}
                  </span>
                </div>
              )}
            </div>

            {/* Items Breakdown if Sale */}
            {selectedTx.items && selectedTx.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Items Sold</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedTx.items.map((i, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs flex justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{i.productName}</p>
                        <p className="text-[10px] text-slate-400">
                          {i.quantity} x {cur}{i.unitSellPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {cur}{i.totalSellPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-slate-200">
                <span>Total Amount:</span>
                <span className="text-emerald-400 text-sm">
                  {cur}{selectedTx.amount.toFixed(2)}
                </span>
              </div>

              {selectedTx.cogs !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>COGS (Cost):</span>
                  <span>{cur}{selectedTx.cogs.toFixed(2)}</span>
                </div>
              )}

              {selectedTx.grossProfit !== undefined && (
                <div className="flex justify-between text-blue-400 font-bold pt-1 border-t border-slate-800">
                  <span>Net Gross Profit:</span>
                  <span>+{cur}{selectedTx.grossProfit.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedTx.id)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>

              <div className="flex items-center space-x-2">
                {selectedTx.type === 'sale' && (
                  <button
                    onClick={() => printReceipt(selectedTx, profile)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
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
