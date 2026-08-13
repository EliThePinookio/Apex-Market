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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-emerald-600 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search items (e.g. POS, Inventory, Milk)..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none font-medium"
          />
          <div className="flex items-center space-x-2 ml-2">
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Options List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Actions
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickAction();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 border border-transparent hover:border-emerald-200 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                      Quick Business Entry
                    </span>
                    <p className="text-[10px] text-slate-500">Record sale, expense, capital or stock refill</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  Action
                </span>
              </button>

              {profile.isPinLocked && (
                <button
                  onClick={() => {
                    onClose();
                    onToggleOwnerLock();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-violet-50 border border-transparent hover:border-violet-200 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
                      {isOwnerUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-violet-800">
                        {isOwnerUnlocked ? 'Lock Owner Mode' : 'Unlock Owner Security Mode'}
                      </span>
                      <p className="text-[10px] text-slate-500">Toggle PIN security protection</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md border border-violet-200">
                    Security
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Navigations */}
          {navItems.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 border border-transparent text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:text-emerald-700 group-hover:bg-emerald-100">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">Jump</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Items Filtered */}
          {filteredProducts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 border border-transparent text-left transition-all group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                        {prod.name}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {prod.category} • Stock: {prod.stockQuantity}
                      </p>
                    </div>
                    <div className="text-xs font-bold text-emerald-700 font-mono">
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
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Command className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">Quick Search Palette</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">Ctrl+K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
