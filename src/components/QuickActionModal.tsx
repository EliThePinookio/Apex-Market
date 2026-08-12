import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Receipt,
  PiggyBank,
  PackagePlus,
  CheckCircle2,
} from 'lucide-react';
import { Product, BusinessProfile } from '../types';
import {
  recordSale,
  recordExpense,
  recordCapital,
  recordStockRefill,
} from '../services/dbService';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  profile: BusinessProfile;
  onSuccess: (msg: string) => void;
}

type Mode = 'sale' | 'expense' | 'capital' | 'refill';

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  products,
  profile,
  onSuccess,
}) => {
  const [mode, setMode] = useState<Mode>('sale');

  // Quick Sale State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleQty, setSaleQty] = useState(1);
  const [salePaymentMethod, setSalePaymentMethod] = useState('cash');

  // Expense State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Rent & Utilities');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Capital State
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalDesc, setCapitalDesc] = useState('Owner Capital Injection');

  // Refill State
  const [refillProductId, setRefillProductId] = useState('');
  const [refillQty, setRefillQty] = useState(10);
  const [refillCost, setRefillCost] = useState('');

  if (!isOpen) return null;

  const cur = profile.currencySymbol;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'sale') {
      const targetId = selectedProductId || products[0]?.id;
      const prod = products.find((p) => p.id === targetId);
      if (!prod) {
        alert('Please select a valid product for sale');
        return;
      }
      if (saleQty > prod.stockQuantity && !profile.allowNegativeStock) {
        alert(`Insufficient stock! Available: ${prod.stockQuantity} ${prod.unit}`);
        return;
      }

      await recordSale({
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            quantity: Number(saleQty),
            unitBuyPrice: prod.buyPrice,
            unitSellPrice: prod.sellPrice,
            totalSellPrice: prod.sellPrice * Number(saleQty),
            totalBuyPrice: prod.buyPrice * Number(saleQty),
          },
        ],
        paymentMethod: salePaymentMethod,
      });
      onSuccess(`Sale recorded: ${saleQty}x ${prod.name}`);
      setSaleQty(1);
    } else if (mode === 'expense') {
      if (!expenseAmount || Number(expenseAmount) <= 0) {
        alert('Please enter a valid expense amount');
        return;
      }
      await recordExpense({
        amount: Number(expenseAmount),
        category: expenseCategory,
        description: expenseDesc || 'Quick Expense Entry',
      });
      onSuccess(`Expense recorded: ${cur}${expenseAmount}`);
      setExpenseAmount('');
      setExpenseDesc('');
    } else if (mode === 'capital') {
      if (!capitalAmount || Number(capitalAmount) <= 0) {
        alert('Please enter a valid capital / funds amount');
        return;
      }
      await recordCapital({
        amount: Number(capitalAmount),
        description: capitalDesc || 'Owner Capital Injection',
      });
      onSuccess(`Capital / Funds recorded: ${cur}${capitalAmount}`);
      setCapitalAmount('');
    } else if (mode === 'refill') {
      const targetId = refillProductId || products[0]?.id;
      const prod = products.find((p) => p.id === targetId);
      if (!prod) {
        alert('Please select a product to refill');
        return;
      }
      await recordStockRefill({
        productId: prod.id,
        quantityToAdd: Number(refillQty),
        costPerUnit: refillCost ? Number(refillCost) : prod.buyPrice,
      });
      onSuccess(`Stock refilled: +${refillQty} ${prod.unit} for ${prod.name}`);
      setRefillCost('');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-modal border border-cyan-500/30 rounded-3xl w-full max-w-md p-5 shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-base font-black text-slate-100 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span>Quick Business Entry</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-4 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('sale')}
            className={`flex flex-col items-center py-2 rounded-xl font-bold transition-all active:scale-95 ${
              mode === 'sale'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-0.5" />
            Sale
          </button>
          <button
            type="button"
            onClick={() => setMode('expense')}
            className={`flex flex-col items-center py-2 rounded-xl font-bold transition-all active:scale-95 ${
              mode === 'expense'
                ? 'bg-rose-500 text-slate-950 font-black shadow-[0_0_12px_rgba(244,63,94,0.4)] scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            Expense
          </button>
          <button
            type="button"
            onClick={() => setMode('capital')}
            className={`flex flex-col items-center py-2 rounded-xl font-bold transition-all active:scale-95 ${
              mode === 'capital'
                ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PiggyBank className="w-4 h-4 mb-0.5" />
            Capital
          </button>
          <button
            type="button"
            onClick={() => setMode('refill')}
            className={`flex flex-col items-center py-2 rounded-xl font-bold transition-all active:scale-95 ${
              mode === 'refill'
                ? 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PackagePlus className="w-4 h-4 mb-0.5" />
            Refill
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* SALE FORM */}
          {mode === 'sale' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Choose Item --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({cur}{p.sellPrice.toFixed(2)} | Stock: {p.stockQuantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={saleQty}
                    onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={salePaymentMethod}
                    onChange={(e) => setSalePaymentMethod(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
              </div>

              {selectedProductId && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center text-sm">
                  <span className="text-slate-400">Total Revenue:</span>
                  <span className="font-black text-emerald-400 text-base">
                    {cur}
                    {(
                      (products.find((p) => p.id === selectedProductId)?.sellPrice || 0) *
                      saleQty
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </>
          )}

          {/* EXPENSE FORM */}
          {mode === 'expense' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expense Amount ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-rose-500 focus:outline-none"
                >
                  <option value="Rent & Space">Rent & Space</option>
                  <option value="Utilities & Internet">Utilities & Internet</option>
                  <option value="Salaries & Wages">Salaries & Wages</option>
                  <option value="Marketing & Ads">Marketing & Ads</option>
                  <option value="Packaging & Transport">Packaging & Transport</option>
                  <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                  <option value="General Expenses">General Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electric bill for August"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* CAPITAL FORM */}
          {mode === 'capital' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capital Amount ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note / Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Owner Investment / Bank Loan"
                  value={capitalDesc}
                  onChange={(e) => setCapitalDesc(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* REFILL FORM */}
          {mode === 'refill' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Product to Refill
                </label>
                <select
                  value={refillProductId}
                  onChange={(e) => setRefillProductId(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">-- Choose Item --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.stockQuantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Add Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={refillQty}
                    onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Cost Price ({cur})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional new cost"
                    value={refillCost}
                    onChange={(e) => setRefillCost(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700/80 text-slate-300 text-xs font-bold hover:bg-slate-800/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
