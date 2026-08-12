import React from 'react';
import {
  Store,
  WifiOff,
  Wifi,
  Lock,
  Unlock,
  AlertTriangle,
  Plus,
  Shield,
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
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  isOnline,
  lowStockCount,
  isOwnerUnlocked,
  onToggleOwnerLock,
  onOpenQuickAction,
  onNavigateToLowStock,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shadow-inner">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-100 truncate max-w-[150px] sm:max-w-[220px]">
              {profile.businessName}
            </h1>
            {!isOnline && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <WifiOff className="w-2.5 h-2.5 mr-0.5" /> Offline
              </span>
            )}
            {isOnline && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Wifi className="w-2.5 h-2.5 mr-0.5" /> Synced
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {profile.ownerName ? profile.ownerName : 'Owner Mode'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Low Stock Badge Button */}
        {lowStockCount > 0 && (
          <button
            onClick={onNavigateToLowStock}
            id="header-low-stock-alert"
            className="relative flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors text-xs font-semibold"
            title={`${lowStockCount} items low in stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="hidden xs:inline">Alerts</span>
            <span className="ml-1 bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* Owner Lock Toggle */}
        {profile.isPinLocked && (
          <button
            onClick={onToggleOwnerLock}
            id="header-owner-lock-toggle"
            className={`p-2 rounded-lg border transition-all ${
              isOwnerUnlocked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
            title={isOwnerUnlocked ? 'Owner Mode Unlocked' : 'Locked - Tap to enter Owner PIN'}
          >
            {isOwnerUnlocked ? (
              <Unlock className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Fast Quick Action Button */}
        <button
          onClick={onOpenQuickAction}
          id="header-quick-action-btn"
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-900/30 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Entry</span>
        </button>
      </div>
    </header>
  );
};
