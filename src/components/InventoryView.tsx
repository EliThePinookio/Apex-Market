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
import { TiltCard } from './TiltCard';

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
    <div className="max-w-7xl mx-auto space-y-5">
      {/* 1. TOP FLOATING HERO BANNER */}
      <TiltCard elevation="hero" glowColor="teal">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 text-white shadow-2xl border border-teal-800/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[11px] font-semibold uppercase tracking-[0.04em]">
              <Boxes className="w-3.5 h-3.5 text-teal-400" />
              <span>Catalog & Inventory Engine</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-white">
              Stock Inventory Hub
            </h2>
            <p className="text-xs text-teal-200/80 font-normal">
              {products.length} Registered Products • Total Asset Value: <strong className="font-sans font-semibold text-white tabular-nums">{cur}{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-2.5 relative z-10">
            <button
              onClick={() => exportInventoryToCSV(products, cur)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Export CSV</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openAddModal}
              id="add-new-product-btn"
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add New Item</span>
            </motion.button>
          </div>
        </div>
      </TiltCard>

      {/* 2. SEARCH & FILTER SURFACE */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 absolute left-4 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog by product name, SKU code, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/80 text-xs shrink-0 shadow-sm">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all active:scale-95 cursor-pointer ${
              stockStatusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Catalog ({products.length})
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all active:scale-95 cursor-pointer ${
              stockStatusFilter === 'low'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                : 'text-amber-700 hover:text-amber-800'
            }`}
          >
            Low Stock ({products.filter((p) => p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0).length})
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition-all active:scale-95 cursor-pointer ${
              stockStatusFilter === 'out'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'text-rose-700 hover:text-rose-800'
            }`}
          >
            Out of Stock ({products.filter((p) => p.stockQuantity <= 0).length})
          </button>
        </div>
      </div>

      {/* 3. DESKTOP DATA TABLE IN FLOATING CONTAINER */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/90 shadow-[0_15px_35px_-8px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-[10px] uppercase font-semibold tracking-[0.04em] text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-4 px-5">SKU / Item Name</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4 text-center">Stock Level</th>
                <th className="py-4 px-4 text-right">Cost Price</th>
                <th className="py-4 px-4 text-right">Selling Price</th>
                <th className="py-4 px-4 text-right">Profit Margin</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
                const isOut = p.stockQuantity <= 0;
                const unitProfit = p.sellPrice - p.buyPrice;
                const margin = p.sellPrice > 0 ? ((unitProfit / p.sellPrice) * 100).toFixed(0) : '0';

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {p.name}
                      </div>
                      <span className="font-sans text-[10px] text-slate-400">{p.sku}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium font-sans tabular-nums ${
                          isOut
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 font-semibold'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 font-semibold'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : `${p.stockQuantity} ${p.unit}`}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans tabular-nums font-normal text-slate-600">
                      {cur}{p.buyPrice.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans tabular-nums font-semibold text-emerald-700">
                      {cur}{p.sellPrice.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans tabular-nums font-semibold text-emerald-800">
                      +{margin}%
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openRefillModal(p)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold active:scale-95 transition-all text-[11px] cursor-pointer"
                          title="Refill Stock"
                        >
                          <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Refill</span>
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
      <div className="space-y-3 md:hidden">
        {filteredProducts.map((p) => {
          const isLow = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
          const isOut = p.stockQuantity <= 0;
          const unitProfit = p.sellPrice - p.buyPrice;
          const margin = p.sellPrice > 0 ? ((unitProfit / p.sellPrice) * 100).toFixed(0) : '0';

          return (
            <TiltCard key={p.id} elevation="normal" className="rounded-2xl">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                        {p.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        {p.sku}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-sans tabular-nums ${
                        isOut
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isLow
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isOut ? 'Out of Stock' : `${p.stockQuantity} ${p.unit}`}
                    </span>
                  </div>
                </div>

                {/* Price Details Grid */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans tabular-nums">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold font-sans">Cost</span>
                    <span className="font-medium text-slate-700">{cur}{p.buyPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold font-sans">Sell</span>
                    <span className="font-semibold text-emerald-700">{cur}{p.sellPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-semibold font-sans">Margin</span>
                    <span className="font-semibold text-emerald-800">+{margin}%</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                  <button
                    onClick={() => openRefillModal(p)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold active:scale-95 transition-all"
                  >
                    <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Refill Stock</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200">
          <Package className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
          <p className="text-xs text-slate-500 font-normal">No matching inventory items found.</p>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {isProductModalOpen && editingProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-semibold text-slate-900 flex items-center space-x-2 tracking-[-0.02em]">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>{editingProduct.id ? 'Edit Product SKU' : 'Register New Catalog Item'}</span>
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Dark Roast Coffee Beans"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Category
                    </label>
                    <select
                      value={editingProduct.category || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={editingProduct.sku || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-sans focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Cost Price ({cur}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={editingProduct.buyPrice === 0 ? '' : editingProduct.buyPrice ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, buyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-sans tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Selling Price ({cur}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={editingProduct.sellPrice === 0 ? '' : editingProduct.sellPrice ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-sans tabular-nums"
                    />
                  </div>
                </div>

                {/* Instant Margin Preview */}
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-900 font-medium">
                  <span>Margin Profit Per Unit:</span>
                  <span className="font-bold text-emerald-700 font-sans tabular-nums">
                    {cur}{profitPerUnit.toFixed(2)} (+{marginPercent}%)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Initial Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.stockQuantity ?? 10}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-sans tabular-nums focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Min Alert Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingProduct.minStockThreshold ?? 5}
                      onChange={(e) => setEditingProduct({ ...editingProduct, minStockThreshold: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-sans tabular-nums focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      placeholder="pcs, kg"
                      value={editingProduct.unit || 'pcs'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    disabled={isSavingProduct}
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
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
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display text-base font-semibold text-slate-900 tracking-[-0.02em]">
                  Refill Stock: {refillProduct.name}
                </h3>
                <button
                  onClick={() => setIsRefillModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRefill} className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between font-sans">
                  <span className="text-slate-500 font-normal">Current Stock:</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {refillProduct.stockQuantity} {refillProduct.unit}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Quantity to Add
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={refillQty}
                    onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-500 font-sans tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Cost Price Per Unit ({cur})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refillCostPrice}
                    onChange={(e) => setRefillCostPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-sans tabular-nums"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    disabled={isRefilling}
                    onClick={() => setIsRefillModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRefilling}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
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
