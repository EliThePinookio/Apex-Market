import React from 'react';
import {
  Store,
  WifiOff,
  Wifi,
  Lock,
  Unlock,
  AlertTriangle,
  Plus,
  Search,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  profile: BusinessProfile;
  isOnline: boolean;
  lowStockCount: number;
  isOwnerUnlocked: boolean;
  onToggleOwnerLock: () => void;
  onOpenQuickAction: () => void;
  onNavigateToLowStock: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  isOnline,
  lowStockCount,
  isOwnerUnlocked,
  onToggleOwnerLock,
  onOpenQuickAction,
  onNavigateToLowStock,
  onOpenCommandPalette,
}) => {
  const { mode, isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 ios-glass border-b px-4 md:px-6 py-2.5 flex items-center justify-between transition-colors duration-200 safe-area-top shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20 shrink-0">
          <Store className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[260px] tracking-tight">
              {profile.businessName}
            </h1>
            {!isOnline ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <WifiOff className="w-2.5 h-2.5 mr-1" /> Offline
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Wifi className="w-2.5 h-2.5 mr-1" /> Synced
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
            {profile.ownerName ? profile.ownerName : 'Owner Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          id="header-theme-toggle-btn"
          className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.06] transition-all active:scale-[0.94] cursor-pointer"
          title={`Theme Mode: ${mode === 'system' ? 'System Sync (' + (isDark ? 'Dark' : 'Light') + ')' : isDark ? 'Dark Mode' : 'Light Mode'} • Click to toggle`}
        >
          {mode === 'system' ? (
            <div className="relative flex items-center justify-center">
              <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
          ) : isDark ? (
            <Moon className="w-4 h-4 text-emerald-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {/* Command Palette Search Trigger Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            id="header-command-palette-btn"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 border border-black/[0.04] dark:border-white/[0.06] transition-all text-xs font-semibold active:scale-[0.96] cursor-pointer"
            title="Open Command Search Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-black/50 px-1.5 py-0.5 rounded-md border border-black/[0.06] dark:border-white/[0.08] shadow-2xs">
              ⌘K
            </span>
          </button>
        )}

        {/* Low Stock Badge Button */}
        {lowStockCount > 0 && (
          <button
            onClick={onNavigateToLowStock}
            id="header-low-stock-alert"
            className="relative flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-all text-xs font-semibold active:scale-[0.96] cursor-pointer"
            title={`${lowStockCount} items low in stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden xs:inline">Alerts</span>
            <span className="bg-amber-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Owner Lock Toggle */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            id="header-owner-lock-toggle"
            className={`p-2 rounded-xl border transition-all active:scale-[0.94] cursor-pointer ${
              isOwnerUnlocked
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
            }`}
            title={isOwnerUnlocked ? 'Owner Mode Unlocked' : 'Locked - Tap to enter Owner PIN'}
          >
            {isOwnerUnlocked ? (
              <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
          </button>
        )}

        {/* Fast Quick Action Button */}
        <button
          onClick={onOpenQuickAction}
          id="header-quick-action-btn"
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.96] text-white font-semibold text-xs shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden xs:inline font-medium">Quick Entry</span>
        </button>
      </div>
    </header>
  );
};



