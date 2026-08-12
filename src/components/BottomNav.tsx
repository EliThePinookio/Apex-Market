import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  PieChart,
  Settings,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'pos' | 'inventory' | 'transactions' | 'analytics' | 'settings';

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
      label: 'New Sale',
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
      label: 'Profit',
      icon: <PieChart className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Owner',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/85 backdrop-blur-xl border-t border-cyan-500/15 px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-200 min-w-[54px] active:scale-95 ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.25)] scale-105'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-amber-400 text-slate-950 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-bounce">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-1 tracking-tight font-semibold">
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
