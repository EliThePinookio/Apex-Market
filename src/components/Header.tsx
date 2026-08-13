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
} from 'lucide-react';
import { BusinessProfile } from '../types';

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
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm transition-all safe-area-top">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-[240px] tracking-tight">
              {profile.businessName}
            </h1>
            {!isOnline ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <WifiOff className="w-2.5 h-2.5 mr-1 text-amber-600" /> Offline
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <Wifi className="w-2.5 h-2.5 mr-1 text-emerald-600" /> Synced
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {profile.ownerName ? profile.ownerName : 'Owner Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {/* Command Palette Search Trigger Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            id="header-command-palette-btn"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-all text-xs font-semibold active:scale-95"
            title="Open Command Search Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline text-[10px] font-mono font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              ⌘K
            </span>
          </button>
        )}

        {/* Low Stock Badge Button */}
        {lowStockCount > 0 && (
          <button
            onClick={onNavigateToLowStock}
            id="header-low-stock-alert"
            className="relative flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 transition-all text-xs font-bold active:scale-95"
            title={`${lowStockCount} items low in stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-600" />
            <span className="hidden xs:inline">Alerts</span>
            <span className="ml-1 bg-amber-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Owner Lock Toggle */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            id="header-owner-lock-toggle"
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isOwnerUnlocked
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80 shadow-2xs'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80 shadow-2xs'
            }`}
            title={isOwnerUnlocked ? 'Owner Mode Unlocked' : 'Locked - Tap to enter Owner PIN'}
          >
            {isOwnerUnlocked ? (
              <Unlock className="w-4 h-4 text-emerald-600" />
            ) : (
              <Lock className="w-4 h-4 text-rose-600" />
            )}
          </button>
        )}

        {/* Fast Quick Action Button */}
        <button
          onClick={onOpenQuickAction}
          id="header-quick-action-btn"
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden xs:inline">Quick Entry</span>
        </button>
      </div>
    </header>
  );
};


