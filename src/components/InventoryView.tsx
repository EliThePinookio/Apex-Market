import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit2,
  Trash2,
  Download,
  PackagePlus,
  X,
  CheckCircle2,
  Percent,
} from 'lucide-react';
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

  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [refillProduct, setRefillProduct] = useState<Product | null>(null);
  const [refillQty, setRefillQty] = useState(10);
  const [refillCostPrice, setRefillCostPrice] = useState('');

  const cur = profile.currencySymbol;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
    if (!editingProduct) return;

    await saveProduct(editingProduct);
    onNotification(
      editingProduct.id ? 'Product updated successfully' : 'New product registered'
    );
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete product "${name}"?`)) {
      await deleteProduct(id);
      onNotification(`Product "${name}" deleted`);
    }
  };

  const openRefillModal = (p: Product) => {
    setRefillProduct(p);
    setRefillQty(10);
    setRefillCostPrice(p.buyPrice.toString());
    setIsRefillModalOpen(true);
  };

  const handleConfirmRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct) return;

    await recordStockRefill({
      productId: refillProduct.id,
      quantityToAdd: Number(refillQty),
      costPerUnit: Number(refillCostPrice) || refillProduct.buyPrice,
    });

    onNotification(`Refilled +${refillQty} ${refillProduct.unit} for ${refillProduct.name}`);
    setIsRefillModalOpen(false);
    setRefillProduct(null);
  };

  // Profit margin calculation helper
  const buyP = Number(editingProduct?.buyPrice) || 0;
  const sellP = Number(editingProduct?.sellPrice) || 0;
  const profitPerUnit = sellP - buyP;
  const marginPercent = sellP > 0 ? ((profitPerUnit / sellP) * 100).toFixed(1) : '0.0';

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto space-y-4">
      {/* Top Header & Export Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span>Inventory Stock Manager</span>
          </h2>
          <p className="text-xs text-slate-400">
            {products.length} Products registered
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportInventoryToCSV(products, cur)}
            title="Export CSV for Excel"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            id="add-new-product-btn"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search stock by name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 glass-panel rounded-2xl border border-slate-800/80 text-xs">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`py-1.5 rounded-xl font-bold transition-all active:scale-95 ${
              stockStatusFilter === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`py-1.5 rounded-xl font-bold transition-all active:scale-95 ${
              stockStatusFilter === 'low'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)] font-black'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            Low ({products.filter((p) => p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0).length})
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`py-1.5 rounded-xl font-bold transition-all active:scale-95 ${
              stockStatusFilter === 'out'
                ? 'bg-rose-500 text-slate-950 shadow-[0_0_12px_rgba(244,63,94,0.3)] font-black'
                : 'text-rose-400/80 hover:text-rose-300'
            }`}
          >
            Out ({products.filter((p) => p.stockQuantity <= 0).length})
          </button>
        </div>
      </div>

      {/* Product List Cards */}
      <div className="space-y-2.5">
        {filteredProducts.map((p) => {
          const isLow = p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0;
          const isOut = p.stockQuantity <= 0;
          const unitProfit = p.sellPrice - p.buyPrice;
          const margin = p.sellPrice > 0 ? ((unitProfit / p.sellPrice) * 100).toFixed(0) : '0';

          return (
            <div
              key={p.id}
              className="p-3.5 rounded-2xl glass-panel-interactive border border-slate-800/80 shadow-md flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-cyan-300 text-[10px] font-bold border border-cyan-500/20">
                      {p.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {p.sku}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{p.name}</h3>
                </div>

                {/* Stock Status Badge */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                      isOut
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        : isLow
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    }`}
                  >
                    {isOut ? 'Out of Stock' : `${p.stockQuantity} ${p.unit}`}
                  </span>
                  {isLow && (
                    <span className="block text-[10px] text-amber-400 mt-0.5 font-semibold">
                      Low threshold ({p.minStockThreshold})
                    </span>
                  )}
                </div>
              </div>

              {/* Price Details Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Cost</span>
                  <span className="font-bold text-slate-300">{cur}{p.buyPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Sell</span>
                  <span className="font-bold text-emerald-400">{cur}{p.sellPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Margin</span>
                  <span className="font-bold text-cyan-400">+{margin}%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-800/60">
                <button
                  onClick={() => openRefillModal(p)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-bold active:scale-95 transition-all"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Refill Stock</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                    title="Edit Product"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                    className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"
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
        <div className="py-12 text-center text-slate-500 space-y-2">
          <Package className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-xs">No matching inventory items.</p>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal border border-cyan-500/30 w-full max-w-md rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.15)] max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-100 flex items-center space-x-2">
                <Package className="w-5 h-5 text-cyan-400" />
                <span>{editingProduct.id ? 'Edit Product' : 'Register New Product'}</span>
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Headphones"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Buy / Cost Price ({cur}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={editingProduct.buyPrice === 0 ? '' : editingProduct.buyPrice ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, buyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Sell Price ({cur}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={editingProduct.sellPrice === 0 ? '' : editingProduct.sellPrice ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Instant Profit Preview */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center text-slate-300">
                <span>Calculated Profit:</span>
                <span className="font-extrabold text-emerald-400">
                  {cur}{profitPerUnit.toFixed(2)} ({marginPercent}% margin)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.stockQuantity ?? 10}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Min Alert Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduct.minStockThreshold ?? 5}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStockThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="pcs, kg"
                    value={editingProduct.unit || 'pcs'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REFILL STOCK MODAL */}
      {isRefillModalOpen && refillProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal border border-cyan-500/30 w-full max-w-sm rounded-3xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-100">
                Refill Stock: {refillProduct.name}
              </h3>
              <button
                onClick={() => setIsRefillModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRefill} className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Current Stock:</span>
                <span className="font-extrabold text-slate-200">
                  {refillProduct.stockQuantity} {refillProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={refillQty}
                  onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cost Price Per Unit ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refillCostPrice}
                  onChange={(e) => setRefillCostPrice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRefillModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
                >
                  Confirm Refill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
