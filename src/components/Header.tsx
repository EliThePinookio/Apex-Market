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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm dark:shadow-slate-950/30 transition-colors duration-200 safe-area-top">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="font-display text-base font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[240px] tracking-[-0.02em]">
              {profile.businessName}
            </h1>
            {!isOnline ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0">
                <WifiOff className="w-2.5 h-2.5 mr-1 text-amber-600 dark:text-amber-400" /> Offline
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                <Wifi className="w-2.5 h-2.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Synced
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-normal">
            {profile.ownerName ? profile.ownerName : 'Owner Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          id="header-theme-toggle-btn"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-all text-xs font-medium active:scale-95 cursor-pointer shadow-2xs"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-all text-xs font-medium active:scale-95 cursor-pointer"
            title="Open Command Search Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              ⌘K
            </span>
          </button>
        )}

        {/* Low Stock Badge Button */}
        {lowStockCount > 0 && (
          <button
            onClick={onNavigateToLowStock}
            id="header-low-stock-alert"
            className="relative flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100/80 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 transition-all text-xs font-semibold active:scale-95 cursor-pointer"
            title={`${lowStockCount} items low in stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
            <span className="hidden xs:inline">Alerts</span>
            <span className="ml-1 bg-amber-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Owner Lock Toggle */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            id="header-owner-lock-toggle"
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              isOwnerUnlocked
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 shadow-2xs'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 shadow-2xs'
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
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden xs:inline">Quick Entry</span>
        </button>
      </div>
    </header>
  );
};



