import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  PieChart,
  Users,
  Settings,
} from 'lucide-react';

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
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'pos',
      label: 'POS',
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: <Package className="w-5 h-5" />,
      badge: lowStockCount,
    },
    {
      id: 'transactions',
      label: 'Ledger',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <PieChart className="w-5 h-5" />,
    },
    {
      id: 'customers',
      label: 'CRM',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-2 shadow-lg shadow-slate-900/5 dark:shadow-slate-950/40 safe-area-bottom md:hidden transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 min-w-[50px] active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 font-semibold shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-amber-600 text-white font-bold text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

