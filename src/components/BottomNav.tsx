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
    <nav className="fixed bottom-0 left-0 right-0 z-40 ios-glass border-t px-2 py-1.5 safe-area-bottom md:hidden transition-colors duration-200 shadow-[0_-1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 min-w-[46px] active:scale-[0.92] cursor-pointer ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white font-bold text-[9px] min-w-[15px] h-3.5 px-0.5 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

