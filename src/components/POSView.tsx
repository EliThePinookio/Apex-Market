import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Product, TransactionItem, BusinessProfile, Category } from '../types';
import { recordSale } from '../services/dbService';
import { printReceipt } from '../services/exportService';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  profile: BusinessProfile;
  onSaleComplete: (msg: string) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  profile,
  onSaleComplete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<{ [productId: string]: TransactionItem }>({});
  
  // Checkout Modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mobile_money'>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [completedTx, setCompletedTx] = useState<any | null>(null);

  const cur = profile.currencySymbol;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchTerm));
      const matchesCat =
        selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart calculations
  const cartItemsList: TransactionItem[] = Object.values(cart) as TransactionItem[];
  const subtotalSell = cartItemsList.reduce((sum, item) => sum + item.totalSellPrice, 0);
  const totalItemsCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = Math.max(0, subtotalSell - discountAmount);

  const addToCart = (product: Product) => {
    const existing = cart[product.id];
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (
      currentQtyInCart + 1 > product.stockQuantity &&
      !profile.allowNegativeStock
    ) {
      alert(`Only ${product.stockQuantity} ${product.unit} available in stock!`);
      return;
    }

    const newQty = currentQtyInCart + 1;
    setCart({
      ...cart,
      [product.id]: {
        productId: product.id,
        productName: product.name,
        quantity: newQty,
        unitBuyPrice: product.buyPrice,
        unitSellPrice: product.sellPrice,
        totalSellPrice: product.sellPrice * newQty,
        totalBuyPrice: product.buyPrice * newQty,
      },
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const existing = cart[productId];
    if (!existing) return;

    const product = products.find((p) => p.id === productId);
    const newQty = existing.quantity + delta;

    if (newQty <= 0) {
      const updated = { ...cart };
      delete updated[productId];
      setCart(updated);
      return;
    }

    if (
      product &&
      newQty > product.stockQuantity &&
      !profile.allowNegativeStock
    ) {
      alert(`Stock limit reached! Max available: ${product.stockQuantity}`);
      return;
    }

    setCart({
      ...cart,
      [productId]: {
        ...existing,
        quantity: newQty,
        totalSellPrice: existing.unitSellPrice * newQty,
        totalBuyPrice: existing.unitBuyPrice * newQty,
      },
    });
  };

  const handleCheckout = async () => {
    if (cartItemsList.length === 0) return;

    const txId = await recordSale({
      items: cartItemsList,
      customerName,
      paymentMethod,
      discountAmount,
      description: `Sale of ${totalItemsCount} item(s)`,
    });

    const txObj = {
      id: txId,
      type: 'sale',
      amount: finalTotal,
      items: cartItemsList,
      customerName: customerName || 'Walk-in Customer',
      paymentMethod,
      date: new Date().toISOString(),
    };

    setCompletedTx(txObj);
    onSaleComplete(`Sale completed! Revenue: ${cur}${finalTotal.toFixed(2)}`);
  };

  const resetPosState = () => {
    setCart({});
    setIsCheckoutOpen(false);
    setCompletedTx(null);
    setCustomerName('');
    setCashTendered('');
    setDiscountAmount(0);
  };

  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = tenderedNum > finalTotal ? tenderedNum - finalTotal : 0;

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, SKU, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                selectedCategory === cat.name
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Summary Header / Bar */}
      {cartItemsList.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-purple-950/80 border border-cyan-500/30 flex items-center justify-between shadow-[0_8px_32px_rgba(6,182,212,0.2)] backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                {totalItemsCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                {cartItemsList.length} unique item(s) selected
              </p>
              <p className="text-sm font-extrabold text-emerald-400">
                Total: {cur}{subtotalSell.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            id="pos-proceed-checkout-btn"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 transition-all"
          >
            Checkout ({cur}{subtotalSell.toFixed(2)})
          </button>
        </div>
      )}

      {/* Product Grid / Touch list */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredProducts.map((p) => {
          const inCartQty = cart[p.id]?.quantity || 0;
          const isLowStock = p.stockQuantity <= p.minStockThreshold;
          const isOutOfStock = p.stockQuantity <= 0;

          return (
            <div
              key={p.id}
              onClick={() => !isOutOfStock && addToCart(p)}
              className={`p-3 rounded-2xl transition-all cursor-pointer relative flex flex-col justify-between active:scale-[0.98] ${
                isOutOfStock
                  ? 'bg-slate-950/40 border border-slate-800/40 opacity-50'
                  : inCartQty > 0
                  ? 'glass-panel border-cyan-400/80 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)] scale-[1.01]'
                  : 'glass-panel-interactive border-slate-800/80 hover:border-cyan-500/40'
              }`}
            >
              {inCartQty > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                  {inCartQty}x
                </span>
              )}

              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="truncate max-w-[80px] font-semibold">{p.category}</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded-md ${
                      isOutOfStock
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isLowStock
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    {p.stockQuantity} {p.unit}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-100 line-clamp-2 mb-2 leading-snug">
                  {p.name}
                </h4>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                <span className="text-sm font-black text-emerald-400">
                  {cur}{p.sellPrice.toFixed(2)}
                </span>
                <button
                  disabled={isOutOfStock}
                  className={`p-1.5 rounded-xl text-xs font-bold transition-all ${
                    isOutOfStock
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-slate-950 active:scale-95 shadow-sm'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <Tag className="w-8 h-8 mx-auto opacity-50" />
          <p className="text-xs">No matching products found.</p>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            {!completedTx ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-blue-400" />
                    <span>Complete Order Checkout</span>
                  </h3>
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items List in Cart */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItemsList.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-200">{item.productName}</p>
                        <p className="text-slate-400 text-[10px]">
                          {cur}{item.unitSellPrice.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                          <button
                            onClick={() => updateCartQuantity(item.productId, -1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-slate-100">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.productId, 1)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-emerald-400 w-16 text-right">
                          {cur}{item.totalSellPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer & Payment Method */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John / Walk-in"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Discount ({cur})
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Payment Option
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {[
                        { id: 'cash', label: 'Cash', icon: <Banknote className="w-3.5 h-3.5" /> },
                        { id: 'card', label: 'Card/POS', icon: <CreditCard className="w-3.5 h-3.5" /> },
                        { id: 'transfer', label: 'Transfer', icon: <User className="w-3.5 h-3.5" /> },
                        { id: 'mobile_money', label: 'Mobile', icon: <Smartphone className="w-3.5 h-3.5" /> },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[11px] font-semibold transition-all ${
                            paymentMethod === m.id
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {m.icon}
                          <span className="mt-1">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Cash Tendered</label>
                        <input
                          type="number"
                          placeholder={finalTotal.toFixed(2)}
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-emerald-400 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-slate-400">Change Due:</span>
                        <span className="text-sm font-extrabold text-amber-400">
                          {cur}{changeDue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total & Action Buttons */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-300">Final Order Total:</span>
                    <span className="text-lg font-extrabold text-emerald-400">
                      {cur}{finalTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    id="pos-confirm-payment-btn"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirm Sale & Collect {cur}{finalTotal.toFixed(2)}</span>
                  </button>
                </div>
              </>
            ) : (
              /* Success Screen */
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-slate-100">
                    Payment Successful!
                  </h3>
                  <p className="text-xs text-slate-400">
                    Receipt #{completedTx.id} recorded in persistent cloud storage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <p className="text-slate-400">Amount Paid:</p>
                  <p className="text-xl font-extrabold text-emerald-400">
                    {cur}{completedTx.amount.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => printReceipt(completedTx, profile)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={resetPosState}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Next Sale &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
