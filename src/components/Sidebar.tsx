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
  LogOut,
  User,
} from 'lucide-react';
import { NavTab } from './BottomNav';
import { BusinessProfile } from '../types';
import { useAuth } from '../context/AuthContext';

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
  const { user, profile: userProfile, signOut } = useAuth();

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
      className={`hidden md:flex flex-col justify-between h-full shrink-0 z-30 overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-slate-950/40 transition-all duration-300 custom-scrollbar ${
        isCollapsed ? 'w-18 px-2.5 py-4' : 'w-64 px-4 py-4'
      }`}
    >
      {/* Top Header & Branding */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-emerald-500/20">
              <Store className="w-4.5 h-4.5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate tracking-[-0.02em]">
                  {profile.businessName}
                </h1>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {isOnline ? 'Supabase Synced' : 'Offline Mode'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Command Search Bar Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 transition-all text-xs active:scale-[0.98] cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'px-3'
          }`}
          title="Search actions (⌘K)"
        >
          <div className="flex items-center space-x-2.5">
            <Command className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {!isCollapsed && <span className="font-medium text-slate-700 dark:text-slate-300">Command Search</span>}
          </div>
          {!isCollapsed && (
            <kbd className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </kbd>
          )}
        </button>

        {/* Quick Action Entry Button */}
        <button
          onClick={onOpenQuickAction}
          className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer ${
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
                className={`w-full flex items-center justify-between py-2.5 rounded-xl text-[13px] transition-all active:scale-[0.98] cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-medium'
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
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
                    className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section: Profile, Alerts, Security & Sign Out */}
      <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
        {lowStockCount > 0 && !isCollapsed && (
          <button
            onClick={onNavigateToLowStock}
            className="w-full p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
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
            className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : 'px-3'
            } ${
              isOwnerUnlocked
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
            }`}
            title={isOwnerUnlocked ? 'Owner Mode Unlocked' : 'Owner Mode Locked'}
          >
            <div className="flex items-center space-x-2.5">
              {isOwnerUnlocked ? <Unlock className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />}
              {!isCollapsed && (
                <span>{isOwnerUnlocked ? 'Owner Unlocked' : 'Locked Mode'}</span>
              )}
            </div>
          </button>
        )}

        {/* User Account / Supabase Session Widget */}
        {user && !isCollapsed && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userProfile?.fullName || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                title="Sign Out of Supabase"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {user && isCollapsed && (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            title="Sign Out of Supabase"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
