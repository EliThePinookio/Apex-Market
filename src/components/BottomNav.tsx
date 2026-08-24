import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Sparkles,
  Users,
  Settings,
} from 'lucide-react';
import { motion } from 'motion/react';

export type NavTab = 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'analytics' | 'customers' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lowStockCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  lowStockCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'Register',
      icon: ShoppingCart,
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: Package,
      badge: lowStockCount,
    },
    {
      id: 'transactions',
      label: 'Ledger',
      icon: Receipt,
    },
    {
      id: 'analytics',
      label: 'Advisor',
      icon: Sparkles,
    },
    {
      id: 'customers',
      label: 'CRM',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 px-3 md:hidden pointer-events-none safe-area-bottom">
      <nav className="max-w-md mx-auto floating-dock rounded-[1.75rem] px-2 py-1.5 pointer-events-auto flex items-center justify-between transition-all duration-300">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all duration-200 min-w-[42px] cursor-pointer active:scale-[0.88] select-none ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill-bottom"
                  className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/15 rounded-2xl border border-blue-500/20 dark:border-blue-400/25"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <Icon className={`w-[18px] h-[18px] transition-transform ${isActive ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-[8px] min-w-[15px] h-3.5 px-0.5 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>

              <span className={`relative z-10 text-[9px] mt-0.5 tracking-tight transition-all ${isActive ? 'font-extrabold text-blue-600 dark:text-blue-400' : 'font-medium opacity-80'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
