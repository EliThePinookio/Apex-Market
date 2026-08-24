import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  TrendingUp,
  Users,
  Settings,
  Plus,
  Sparkles,
  Lock,
  Unlock,
  X,
  Command,
} from 'lucide-react';
import { Product, BusinessProfile } from '../types';
import { NavTab } from './BottomNav';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  profile: BusinessProfile;
  isOwnerUnlocked: boolean;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAction: () => void;
  onToggleOwnerLock: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  products,
  profile,
  isOwnerUnlocked,
  onSelectTab,
  onOpenQuickAction,
  onToggleOwnerLock,
}) => {
  const [query, setQuery] = useState('');

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const navItems = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, tab: 'dashboard' as NavTab },
    { id: 'pos', label: 'Open POS Register', icon: ShoppingCart, tab: 'pos' as NavTab },
    { id: 'inventory', label: 'Manage Inventory', icon: Package, tab: 'inventory' as NavTab },
    { id: 'transactions', label: 'View Transactions', icon: Receipt, tab: 'transactions' as NavTab },
    { id: 'analytics', label: 'Financial Analytics', icon: TrendingUp, tab: 'analytics' as NavTab },
    { id: 'customers', label: 'Customer Directory & CRM', icon: Users, tab: 'customers' as NavTab },
    { id: 'settings', label: 'Business Settings', icon: Settings, tab: 'settings' as NavTab },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-2xl border border-white/80 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search items (e.g. POS, Inventory, Milk)..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none font-semibold"
          />
          <div className="flex items-center space-x-2 ml-2">
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[10px] font-extrabold text-slate-500 dark:text-slate-400 border border-black/[0.04] dark:border-white/[0.06]">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Options List */}
        <div className="max-h-[360px] overflow-y-auto p-2.5 space-y-3">
          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick Actions
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickAction();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-blue-500/10 dark:hover:bg-blue-500/15 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Quick Business Entry
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Record sale, expense, capital or stock refill</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20 shadow-xs">
                  Action
                </span>
              </button>

              {profile.isPinLocked && (
                <button
                  onClick={() => {
                    onClose();
                    onToggleOwnerLock();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-purple-500/10 dark:hover:bg-purple-500/15 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                      {isOwnerUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {isOwnerUnlocked ? 'Lock Owner Mode' : 'Unlock Owner Security Mode'}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Toggle PIN security protection</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 shadow-xs">
                    Security
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Navigations */}
          {navItems.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </div>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onClose();
                        onSelectTab(item.tab);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Jump</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Items Filtered */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Matching Catalog Items
              </div>
              <div className="space-y-1">
                {filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      onClose();
                      onSelectTab('pos');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-blue-500/10 dark:hover:bg-blue-500/15 text-left transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {prod.name}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        {prod.category} • Stock: {prod.stockQuantity}
                      </p>
                    </div>
                    <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                      {profile.currencySymbol}
                      {prod.sellPrice.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Command className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold">Quick Search Palette</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-mono">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-mono">Ctrl+K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
