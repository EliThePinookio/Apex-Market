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
    <header className="sticky top-0 z-30 ios-glass border-b border-white/[0.12] dark:border-white/[0.08] px-4 md:px-6 py-3 flex items-center justify-between transition-colors duration-200 safe-area-top shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center space-x-3 min-w-0">
        {/* Messenger-inspired glowing circular/squircle avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25 shrink-0 transition-transform hover:scale-105">
            <Store className="w-5 h-5 drop-shadow-sm" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0B0F19] ${
              isOnline ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-500'
            }`}
            title={isOnline ? 'Real-time database connected' : 'Offline Mode'}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[260px] tracking-tight">
              {profile.businessName}
            </h1>
            {!isOnline ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25 shrink-0 shadow-2xs backdrop-blur-md">
                <WifiOff className="w-2.5 h-2.5 mr-1" /> Offline
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25 shrink-0 shadow-2xs backdrop-blur-md">
                <Wifi className="w-2.5 h-2.5 mr-1" /> Live
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-semibold">
            {profile.ownerName ? profile.ownerName : 'Owner Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          id="header-theme-toggle-btn"
          className="p-2.5 rounded-2xl bg-white/60 dark:bg-white/[0.07] hover:bg-white/80 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 border border-white/80 dark:border-white/[0.1] shadow-xs backdrop-blur-md transition-all active:scale-[0.93] cursor-pointer"
          title={`Theme Mode: ${mode === 'system' ? 'System Sync (' + (isDark ? 'Dark' : 'Light') + ')' : isDark ? 'Dark Mode' : 'Light Mode'} • Click to toggle`}
        >
          {mode === 'system' ? (
            <div className="relative flex items-center justify-center">
              <Laptop className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            </div>
          ) : isDark ? (
            <Moon className="w-4 h-4 text-blue-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {/* Command Palette Search Trigger Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            id="header-command-palette-btn"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white/60 dark:bg-white/[0.07] hover:bg-white/80 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 border border-white/80 dark:border-white/[0.1] shadow-xs backdrop-blur-md transition-all text-xs font-bold active:scale-[0.95] cursor-pointer"
            title="Open Command Search Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-black/[0.04] dark:bg-white/[0.08] px-1.5 py-0.5 rounded-lg border border-black/[0.05] dark:border-white/[0.08]">
              ⌘K
            </span>
          </button>
        )}

        {/* Low Stock Badge Button */}
        {lowStockCount > 0 && (
          <button
            onClick={onNavigateToLowStock}
            id="header-low-stock-alert"
            className="relative flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/25 transition-all text-xs font-bold active:scale-[0.95] cursor-pointer shadow-xs backdrop-blur-md"
            title={`${lowStockCount} items low in stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden xs:inline">Alerts</span>
            <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-xs">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Owner Lock Toggle */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            id="header-owner-lock-toggle"
            className={`p-2.5 rounded-2xl border backdrop-blur-md transition-all active:scale-[0.93] cursor-pointer shadow-xs ${
              isOwnerUnlocked
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 border-rose-500/25 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
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

        {/* Fast Quick Action Button with Messenger Gradient */}
        <button
          onClick={onOpenQuickAction}
          id="header-quick-action-btn"
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 active:scale-[0.95] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer border border-white/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden xs:inline font-bold">Quick Entry</span>
        </button>
      </div>
    </header>
  );
};



