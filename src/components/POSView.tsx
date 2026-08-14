import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  Tag,
  Loader2,
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
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (cartItemsList.length === 0 || isProcessing) return;

    setIsProcessing(true);
    try {
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
    } catch (err: any) {
      console.error('POS checkout error:', err);
      alert('An error occurred while processing checkout.');
    } finally {
      setIsProcessing(false);
    }
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
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, SKU, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
            }`}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                selectedCategory === cat.name
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left = Products, Right = Sticky Cart (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Mobile Cart Bar (Visible on mobile only) */}
          {cartItemsList.length > 0 && (
            <div className="lg:hidden p-3.5 rounded-2xl bg-emerald-900 text-white border border-emerald-700 flex items-center justify-between shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="relative p-2.5 rounded-xl bg-white text-emerald-900 font-bold shadow-xs">
                  <ShoppingCart className="w-5 h-5 text-emerald-700" />
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                    {totalItemsCount}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-100">
                    {cartItemsList.length} item(s) selected
                  </p>
                  <p className="text-sm font-bold font-sans tabular-nums text-white">
                    Total: {cur}{subtotalSell.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                id="pos-proceed-checkout-btn-mobile"
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 font-semibold text-xs shadow-md active:scale-95 transition-all"
              >
                Checkout ({cur}{subtotalSell.toFixed(2)})
              </button>
            </div>
          )}

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const inCartQty = cart[p.id]?.quantity || 0;
              const isLowStock = p.stockQuantity <= p.minStockThreshold;
              const isOutOfStock = p.stockQuantity <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer relative flex flex-col justify-between active:scale-[0.98] ${
                    isOutOfStock
                      ? 'bg-slate-100/60 border border-slate-200/60 opacity-50'
                      : inCartQty > 0
                      ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-white border border-slate-200/80 hover:border-emerald-300 shadow-2xs'
                  }`}
                >
                  {inCartQty > 0 && (
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                      {inCartQty}x
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="truncate max-w-[80px] font-medium">{p.category}</span>
                      <span
                        className={`font-medium px-1.5 py-0.2 rounded-md ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.stockQuantity} {p.unit}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 mb-2 leading-snug">
                      {p.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                    <span className="text-sm font-bold text-emerald-700 font-sans tabular-nums tracking-[-0.02em]">
                      {cur}{p.sellPrice.toFixed(2)}
                    </span>
                    <button
                      disabled={isOutOfStock}
                      className={`p-1.5 rounded-xl text-xs font-medium transition-all ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 text-emerald-700 hover:text-white active:scale-95 shadow-2xs'
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
            <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
              <Tag className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p className="text-xs font-normal text-slate-600">No matching catalog items found.</p>
            </div>
          )}
        </div>

        {/* Right: Desktop Built-in Cart Panel */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 flex items-center space-x-2 tracking-[-0.02em]">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Current Cart Panel</span>
            </h3>
            {cartItemsList.length > 0 && (
              <button
                onClick={() => setCart({})}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold hover:underline cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          {cartItemsList.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cartItemsList.map((item) => (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-slate-900 truncate">{item.productName}</p>
                      <p className="text-slate-500 text-[10px] font-sans tabular-nums">
                        {cur}{item.unitSellPrice.toFixed(2)} ea
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          onClick={() => updateCartQuantity(item.productId, -1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-semibold text-slate-900 font-sans tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-semibold text-emerald-700 w-16 text-right font-sans tabular-nums">
                        {cur}{item.totalSellPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between font-normal text-slate-500">
                  <span>Subtotal:</span>
                  <span className="text-slate-800 font-sans tabular-nums">{cur}{subtotalSell.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 text-sm">
                  <span>Order Total:</span>
                  <span className="text-emerald-700 font-bold font-sans tabular-nums text-base tracking-[-0.02em]">{cur}{subtotalSell.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  id="pos-proceed-checkout-btn-desktop"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Proceed to Payment ({cur}{subtotalSell.toFixed(2)})</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingCart className="w-8 h-8 mx-auto opacity-30 text-emerald-600" />
              <p className="text-xs font-normal text-slate-600">Cart is currently empty.</p>
              <p className="text-[10px] text-slate-400">Click on catalog items to add to cart</p>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Drawer / Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
            {!completedTx ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-display text-base font-semibold text-slate-900 flex items-center space-x-2 tracking-[-0.02em]">
                    <ShoppingCart className="w-5 h-5 text-emerald-600" />
                    <span>Complete Order Checkout</span>
                  </h3>
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items List in Cart */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cartItemsList.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <p className="text-slate-500 text-[10px] font-sans tabular-nums">
                          {cur}{item.unitSellPrice.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            onClick={() => updateCartQuantity(item.productId, -1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-semibold text-slate-900 font-sans tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.productId, 1)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-semibold text-emerald-700 w-16 text-right font-sans tabular-nums">
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
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John / Walk-in"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Discount ({cur})
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
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
                          className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                            paymentMethod === m.id
                              ? 'bg-emerald-600 border-emerald-600 text-white font-semibold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {m.icon}
                          <span className="mt-1">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 font-medium">Cash Tendered</label>
                        <input
                          type="number"
                          placeholder={finalTotal.toFixed(2)}
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-emerald-800 text-sm focus:outline-none font-sans tabular-nums"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-slate-500 font-medium">Change Due:</span>
                        <span className="text-sm font-bold text-amber-700 font-sans tabular-nums">
                          {cur}{changeDue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total & Action Buttons */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-700">Final Order Total:</span>
                    <span className="text-lg font-bold text-emerald-700 font-sans tabular-nums tracking-[-0.02em]">
                      {cur}{finalTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    id="pos-confirm-payment-btn"
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing Sale...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Sale & Collect {cur}{finalTotal.toFixed(2)}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Success Screen */
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 tracking-[-0.02em]">
                    Payment Successful!
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Receipt #{completedTx.id} recorded in persistent cloud storage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="text-slate-500 font-medium">Amount Paid:</p>
                  <p className="text-2xl font-bold text-emerald-700 font-sans tabular-nums tracking-tight">
                    {cur}{completedTx.amount.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => printReceipt(completedTx, profile)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={resetPosState}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
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

