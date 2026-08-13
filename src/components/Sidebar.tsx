import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  PieChart,
  Users,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  Plus,
  Command,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { NavTab } from './BottomNav';
import { BusinessProfile } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  profile: BusinessProfile;
  isOnline: boolean;
  lowStockCount: number;
  isOwnerUnlocked: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenQuickAction: () => void;
  onOpenCommandPalette: () => void;
  onToggleOwnerLock: () => void;
  onNavigateToLowStock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  profile,
  isOnline,
  lowStockCount,
  isOwnerUnlocked,
  isCollapsed,
  onToggleCollapse,
  onOpenQuickAction,
  onOpenCommandPalette,
  onToggleOwnerLock,
  onNavigateToLowStock,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'pos',
      label: 'POS Register',
      icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'inventory',
      label: 'Stock Inventory',
      icon: <Package className="w-4 h-4 shrink-0" />,
      badge: lowStockCount,
    },
    {
      id: 'transactions',
      label: 'Transaction Ledger',
      icon: <Receipt className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'analytics',
      label: 'Profit & Analytics',
      icon: <PieChart className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'customers',
      label: 'Customers & CRM',
      icon: <Users className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Owner Settings',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between sticky top-0 h-screen z-30 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-sm transition-all duration-300 ${
        isCollapsed ? 'w-18 px-2.5 py-4' : 'w-64 px-4 py-4'
      }`}
    >
      {/* Top Header & Branding */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20">
              <Store className="w-4.5 h-4.5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-extrabold text-slate-900 truncate tracking-tight">
                  {profile.businessName}
                </h1>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[10px] font-semibold text-slate-500">
                    {isOnline ? 'Online Synced' : 'Offline Mode'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Command Search Bar Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 transition-all text-xs active:scale-[0.98] ${
            isCollapsed ? 'justify-center px-0' : 'px-3'
          }`}
          title="Search actions (⌘K)"
        >
          <div className="flex items-center space-x-2.5">
            <Command className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {!isCollapsed && <span className="font-medium text-slate-700">Command Search</span>}
          </div>
          {!isCollapsed && (
            <kbd className="text-[10px] font-mono font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              ⌘K
            </kbd>
          )}
        </button>

        {/* Quick Action Entry Button */}
        <button
          onClick={onOpenQuickAction}
          className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all ${
            isCollapsed ? 'px-0' : 'px-3'
          }`}
          title="Quick Record Entry"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {!isCollapsed && <span>Quick Entry</span>}
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={isActive ? 'text-emerald-600' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && item.badge > 0 ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToLowStock();
                    }}
                    className="bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="space-y-2 pt-3 border-t border-slate-200/80">
        {lowStockCount > 0 && !isCollapsed && (
          <button
            onClick={onNavigateToLowStock}
            className="w-full p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-[11px] font-bold flex items-center justify-between transition-all"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Low Stock Alerts</span>
            </div>
            <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Security Pin Lock Button */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all ${
              isCollapsed ? 'justify-center px-0' : 'px-3'
            } ${
              isOwnerUnlocked
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
            }`}
            title={isOwnerUnlocked ? 'Owner Mode Unlocked' : 'Owner Mode Locked'}
          >
            <div className="flex items-center space-x-2.5">
              {isOwnerUnlocked ? <Unlock className="w-4 h-4 shrink-0 text-emerald-600" /> : <Lock className="w-4 h-4 shrink-0 text-rose-600" />}
              {!isCollapsed && (
                <span>{isOwnerUnlocked ? 'Owner Unlocked' : 'Locked Mode'}</span>
              )}
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

