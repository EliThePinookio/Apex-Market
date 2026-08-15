import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Receipt,
  PiggyBank,
  PackagePlus,
  CheckCircle2,
  Loader2,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Sale State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleQty, setSaleQty] = useState(1);
  const [salePaymentMethod, setSalePaymentMethod] = useState('cash');

  // Expense State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Rent & Space');
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
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
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
    } catch (err: any) {
      console.error('Failed to submit entry:', err);
      alert('An error occurred while saving. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2 tracking-tight">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Quick Business Entry</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-4 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('sale')}
            className={`flex flex-col items-center py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'sale'
                ? 'bg-white dark:bg-[#2C2C2E] text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-0.5" />
            Sale
          </button>
          <button
            type="button"
            onClick={() => setMode('expense')}
            className={`flex flex-col items-center py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'expense'
                ? 'bg-white dark:bg-[#2C2C2E] text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            Expense
          </button>
          <button
            type="button"
            onClick={() => setMode('capital')}
            className={`flex flex-col items-center py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'capital'
                ? 'bg-white dark:bg-[#2C2C2E] text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PiggyBank className="w-4 h-4 mb-0.5" />
            Capital
          </button>
          <button
            type="button"
            onClick={() => setMode('refill')}
            className={`flex flex-col items-center py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'refill'
                ? 'bg-white dark:bg-[#2C2C2E] text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={saleQty}
                    onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={salePaymentMethod}
                    onChange={(e) => setSalePaymentMethod(e.target.value)}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
              </div>

              {selectedProductId && (
                <div className="p-3 rounded-2xl ios-subcard flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Total Revenue:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base font-mono">
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Amount ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-rose-500 font-medium"
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electric bill for August"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>
            </>
          )}

          {/* CAPITAL FORM */}
          {mode === 'capital' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Capital Amount ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note / Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Owner Investment / Bank Loan"
                  value={capitalDesc}
                  onChange={(e) => setCapitalDesc(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </>
          )}

          {/* REFILL FORM */}
          {mode === 'refill' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product to Refill
                </label>
                <select
                  value={refillProductId}
                  onChange={(e) => setRefillProductId(e.target.value)}
                  required
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Add Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={refillQty}
                    onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Cost Price ({cur})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional new cost"
                    value={refillCost}
                    onChange={(e) => setRefillCost(e.target.value)}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
