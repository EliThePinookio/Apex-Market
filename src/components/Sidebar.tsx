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
      className={`hidden md:flex flex-col justify-between h-full shrink-0 z-30 overflow-y-auto bg-white/65 dark:bg-[#0F172A]/70 backdrop-blur-2xl border-r border-white/60 dark:border-white/[0.08] transition-all duration-300 custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_32px_rgba(0,0,0,0.4)] ${
        isCollapsed ? 'w-20 px-2.5 py-4' : 'w-64 px-4 py-4'
      }`}
    >
      {/* Top Header & Branding */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.05] dark:border-white/[0.06]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/25">
              <Store className="w-4.5 h-4.5 drop-shadow-sm" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-xs font-extrabold text-slate-900 dark:text-white truncate tracking-tight">
                  {profile.businessName}
                </h1>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500 shadow-2xs shadow-emerald-500/50' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {isOnline ? 'Cloud Synced' : 'Offline Mode'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Command Search Bar Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/70 dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/[0.09] border border-black/[0.04] dark:border-white/[0.07] text-slate-600 dark:text-slate-300 transition-all text-xs active:scale-[0.97] cursor-pointer shadow-xs backdrop-blur-md ${
            isCollapsed ? 'justify-center px-0' : 'px-3.5'
          }`}
          title="Search actions (⌘K)"
        >
          <div className="flex items-center space-x-2.5">
            <Command className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            {!isCollapsed && <span className="font-bold text-slate-700 dark:text-slate-200">Quick Search</span>}
          </div>
          {!isCollapsed && (
            <kbd className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-black/[0.04] dark:bg-white/[0.08] px-1.5 py-0.5 rounded-md border border-black/[0.05] dark:border-white/[0.08]">
              ⌘K
            </kbd>
          )}
        </button>

        {/* Quick Action Entry Button with Messenger Gradient */}
        <button
          onClick={onOpenQuickAction}
          className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 active:scale-[0.96] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer border border-white/20 ${
            isCollapsed ? 'px-0' : 'px-3.5'
          }`}
          title="Quick Record Entry"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {!isCollapsed && <span className="font-bold">Quick Entry</span>}
        </button>

        {/* Navigation Items (Messenger Pill Style) */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between py-2.5 rounded-2xl text-xs transition-all active:scale-[0.97] cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : 'px-3.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-violet-600/15 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-500/25 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] font-semibold'
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>
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
                    className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs"
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
      <div className="space-y-2.5 pt-3.5 border-t border-black/[0.05] dark:border-white/[0.06]">
        {lowStockCount > 0 && !isCollapsed && (
          <button
            onClick={onNavigateToLowStock}
            className="w-full p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Low Stock Alerts</span>
            </div>
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-xs">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Security Pin Lock Button */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isCollapsed ? 'justify-center px-0' : 'px-3.5'
            } ${
              isOwnerUnlocked
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 border-rose-500/25 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25'
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
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.07] backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userProfile?.fullName || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-semibold">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Sign Out of Supabase"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {user && isCollapsed && (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Sign Out of Supabase"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
