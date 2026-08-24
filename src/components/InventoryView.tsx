import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  Download,
  PackagePlus,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Boxes,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, BusinessProfile } from '../types';
import { saveProduct, deleteProduct, recordStockRefill } from '../services/dbService';
import { exportInventoryToCSV } from '../services/exportService';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  profile: BusinessProfile;
  initialFilterLowStock?: boolean;
  onNotification: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  profile,
  initialFilterLowStock = false,
  onNotification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>(
    initialFilterLowStock ? 'low' : 'all'
  );

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [refillProduct, setRefillProduct] = useState<Product | null>(null);
  const [refillQty, setRefillQty] = useState(10);
  const [refillCostPrice, setRefillCostPrice] = useState('');
  const [isRefilling, setIsRefilling] = useState(false);

  const cur = profile.currencySymbol;

  // Intelligently Filter & Rank Products
  const filteredProducts = useMemo(() => {
    const matched = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (stockStatusFilter === 'low') {
        return matchesSearch && p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
      }
      if (stockStatusFilter === 'out') {
        return matchesSearch && p.stockQuantity <= 0;
      }
      return matchesSearch;
    });

    // If filtering low or out of stock, rank by severity
    if (stockStatusFilter !== 'all') {
      return matched.sort((a, b) => {
        const aRatio = a.stockQuantity / (a.minStockThreshold || 1);
        const bRatio = b.stockQuantity / (b.minStockThreshold || 1);
        return aRatio - bRatio;
      });
    }

    return matched;
  }, [products, searchTerm, stockStatusFilter]);

  const openAddModal = () => {
    setEditingProduct({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: categories[0]?.name || 'General',
      buyPrice: 0,
      sellPrice: 0,
      stockQuantity: 10,
      minStockThreshold: 5,
      unit: 'pcs',
      barcode: '',
    });
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || isSavingProduct) return;

    setIsSavingProduct(true);
    try {
      await saveProduct(editingProduct);
      onNotification(
        editingProduct.id ? 'Product updated successfully' : 'New product registered'
      );
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      alert('Failed to save product');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete product "${name}"?`)) {
      await deleteProduct(id);
      onNotification(`Product "${name}" deleted`);
    }
  };

  const openRefillModal = (p: Product) => {
    setRefillProduct(p);
    const suggestedAdd = Math.max(10, p.minStockThreshold * 2 - p.stockQuantity);
    setRefillQty(suggestedAdd);
    setRefillCostPrice(p.buyPrice.toString());
    setIsRefillModalOpen(true);
  };

  const handleConfirmRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct || isRefilling) return;

    setIsRefilling(true);
    try {
      await recordStockRefill({
        productId: refillProduct.id,
        quantityToAdd: Number(refillQty),
        costPerUnit: Number(refillCostPrice) || refillProduct.buyPrice,
      });

      onNotification(`Refilled +${refillQty} ${refillProduct.unit} for ${refillProduct.name}`);
      setIsRefillModalOpen(false);
      setRefillProduct(null);
    } catch (err: any) {
      console.error('Error refilling stock:', err);
      alert('Failed to record stock refill');
    } finally {
      setIsRefilling(false);
    }
  };

  // Profit margin calculation helper
  const buyP = Number(editingProduct?.buyPrice) || 0;
  const sellP = Number(editingProduct?.sellPrice) || 0;
  const profitPerUnit = sellP - buyP;
  const marginPercent = sellP > 0 ? ((profitPerUnit / sellP) * 100).toFixed(1) : '0.0';

  const totalValuation = products.reduce((acc, p) => acc + p.buyPrice * p.stockQuantity, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* 1. TOP HERO BANNER */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white border border-white/[0.12] shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center space-x-2 text-blue-400 text-xs font-black uppercase tracking-wider">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5" />
            </div>
            <span>Catalog & Inventory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Stock Inventory Hub
          </h1>
          <p className="text-xs text-slate-300 font-semibold">
            {products.length} Registered Products • Total Asset Value: <strong className="font-black text-blue-300 tabular-nums">{cur}{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <button
            onClick={() => exportInventoryToCSV(products, cur)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.97] border border-white/[0.12] text-white text-xs font-bold transition-all cursor-pointer shadow-xs backdrop-blur-md"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            id="add-new-product-btn"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.97] text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-blue-500/25"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER SURFACE */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog by product name, SKU code, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/70 dark:bg-[#151D2A]/80 border border-white/80 dark:border-white/[0.1] rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs font-semibold backdrop-blur-md transition-all"
          />
        </div>

        {/* Status Filter Tabs (iOS Segmented Style) */}
        <div className="flex items-center space-x-1.5 p-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] text-xs shrink-0 backdrop-blur-md">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-[0.96] cursor-pointer ${
              stockStatusFilter === 'all'
                ? 'bg-white dark:bg-[#151D2A] text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Catalog ({products.length})
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-[0.96] cursor-pointer ${
              stockStatusFilter === 'low'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
            }`}
          >
            Low Stock ({products.filter((p) => p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0).length})
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-[0.96] cursor-pointer ${
              stockStatusFilter === 'out'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:text-rose-800'
            }`}
          >
            Out of Stock ({products.filter((p) => p.stockQuantity <= 0).length})
          </button>
        </div>
      </div>

      {/* 3. DESKTOP DATA TABLE IN FLOATING CONTAINER */}
      <div className="hidden md:block ios-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-black/[0.02] dark:bg-white/[0.02] text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 border-b border-black/[0.05] dark:border-white/[0.06]">
              <tr>
                <th className="py-4 px-6">SKU / Item Name</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4 text-center">Stock Level</th>
                <th className="py-4 px-4 text-right">Cost Price</th>
                <th className="py-4 px-4 text-right">Selling Price</th>
                <th className="py-4 px-4 text-right">Profit Margin</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {filteredProducts.map((p) => {
                const isLow = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
                const isOut = p.stockQuantity <= 0;
                const unitProfit = p.sellPrice - p.buyPrice;
                const margin = p.sellPrice > 0 ? ((unitProfit / p.sellPrice) * 100).toFixed(0) : '0';

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-500/[0.03] dark:hover:bg-blue-500/[0.05] transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{p.sku}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-800 dark:text-blue-300 text-[10px] font-bold border border-blue-500/20">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black tabular-nums ${
                          isOut
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                            : isLow
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : `${p.stockQuantity} ${p.unit}`}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-400">
                      {cur}{p.buyPrice.toFixed(2)}
                    </td>

                    <td className="py-4 px-4 text-right tabular-nums font-black text-blue-600 dark:text-blue-400">
                      {cur}{p.sellPrice.toFixed(2)}
                    </td>

                    <td className="py-4 px-4 text-right tabular-nums font-black text-violet-600 dark:text-violet-400">
                      +{margin}%
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openRefillModal(p)}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-800 dark:text-blue-300 font-bold active:scale-[0.96] transition-all text-xs cursor-pointer shadow-2xs"
                          title="Refill Stock"
                        >
                          <PackagePlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Refill</span>
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-2 rounded-xl text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MOBILE FLOATING CARDS LIST */}
      <div className="space-y-3.5 md:hidden">
        {filteredProducts.map((p) => {
          const isLow = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
          const isOut = p.stockQuantity <= 0;
          const unitProfit = p.sellPrice - p.buyPrice;
          const margin = p.sellPrice > 0 ? ((unitProfit / p.sellPrice) * 100).toFixed(0) : '0';

          return (
            <div key={p.id} className="p-4 rounded-3xl ios-card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-800 dark:text-blue-300 text-[10px] font-bold border border-blue-500/20">
                      {p.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                      {p.sku}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">{p.name}</h3>
                </div>

                {/* Stock Status Badge */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tabular-nums ${
                      isOut
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                        : isLow
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {isOut ? 'Out of Stock' : `${p.stockQuantity} ${p.unit}`}
                  </span>
                </div>
              </div>

              {/* Price Details Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl ios-subcard text-xs tabular-nums">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Cost</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{cur}{p.buyPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Sell</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{cur}{p.sellPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-black">Margin</span>
                  <span className="font-black text-violet-600 dark:text-violet-400">+{margin}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 text-xs border-t border-black/[0.05] dark:border-white/[0.06]">
                <button
                  onClick={() => openRefillModal(p)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-800 dark:text-blue-200 font-bold cursor-pointer active:scale-[0.96]"
                >
                  <PackagePlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Refill Stock</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-16 text-center text-slate-400 space-y-2 ios-card">
          <Package className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No matching inventory items found.</p>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-[#0F172A]/90 border border-white/80 dark:border-white/[0.12] w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2.5 tracking-tight">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Package className="w-4 h-4" />
                  </div>
                  <span>{editingProduct.id ? 'Edit Product SKU' : 'Register New Catalog Item'}</span>
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Dark Roast Coffee Beans"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Category
                    </label>
                    <select
                      value={editingProduct.category || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full bg-white/70 dark:bg-[#151D2A] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold shadow-xs"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name} className="bg-white dark:bg-[#151D2A] text-slate-900 dark:text-white">
                          {c.name}
                        </option>
                      ))}
                      <option value="General" className="bg-white dark:bg-[#151D2A] text-slate-900 dark:text-white">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={editingProduct.sku || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Cost Price ({cur}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={editingProduct.buyPrice === 0 ? '' : editingProduct.buyPrice ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, buyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 tabular-nums font-bold shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Selling Price ({cur}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={editingProduct.sellPrice === 0 ? '' : editingProduct.sellPrice ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 tabular-nums font-bold shadow-xs"
                    />
                  </div>
                </div>

                {/* Instant Margin Preview */}
                <div className="p-3.5 rounded-2xl ios-subcard flex justify-between items-center font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Margin Profit Per Unit:</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums">
                    {cur}{profitPerUnit.toFixed(2)} (+{marginPercent}%)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Initial Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.stockQuantity ?? 10}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                      className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3 py-2 text-slate-900 dark:text-white tabular-nums font-bold focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Min Alert Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingProduct.minStockThreshold ?? 5}
                      onChange={(e) => setEditingProduct({ ...editingProduct, minStockThreshold: Number(e.target.value) })}
                      className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3 py-2 text-slate-900 dark:text-white tabular-nums font-bold focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      placeholder="pcs, kg"
                      value={editingProduct.unit || 'pcs'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold shadow-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-2.5">
                  <button
                    type="button"
                    disabled={isSavingProduct}
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 font-bold bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.97] text-white font-bold shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {isSavingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Catalog Item</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REFILL STOCK MODAL */}
      <AnimatePresence>
        {isRefillModalOpen && refillProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 dark:bg-[#0F172A]/90 border border-white/80 dark:border-white/[0.12] w-full max-w-sm rounded-3xl p-6 shadow-2xl backdrop-blur-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Refill Stock: {refillProduct.name}
                </h3>
                <button
                  onClick={() => setIsRefillModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRefill} className="space-y-3.5 text-xs">
                <div className="p-3.5 rounded-2xl ios-subcard flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Current Stock:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 tabular-nums">
                    {refillProduct.stockQuantity} {refillProduct.unit}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Quantity to Add
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={refillQty}
                    onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white font-black text-sm focus:outline-none focus:border-blue-500 tabular-nums shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Cost Price Per Unit ({cur})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refillCostPrice}
                    onChange={(e) => setRefillCostPrice(e.target.value)}
                    className="w-full bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 tabular-nums font-bold shadow-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2.5">
                  <button
                    type="button"
                    disabled={isRefilling}
                    onClick={() => setIsRefillModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 font-bold bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRefilling}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.97] text-white font-bold shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {isRefilling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Refilling...</span>
                      </>
                    ) : (
                      <span>Confirm Refill</span>
                    )}
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
