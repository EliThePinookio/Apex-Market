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
    <nav className="fixed bottom-0 left-0 right-0 z-40 ios-glass border-t border-white/60 dark:border-white/[0.08] px-2 py-2 safe-area-bottom md:hidden transition-colors duration-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_32px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 min-w-[48px] active:scale-[0.90] cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/15 font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-extrabold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

