import React from 'react';
import {
  Store,
  WifiOff,
  Wifi,
  Lock,
  Unlock,
  AlertTriangle,
  Plus,
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
    <header className="sticky top-0 z-30 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-cyan-500/15 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-extrabold text-slate-100 truncate max-w-[150px] sm:max-w-[220px] tracking-tight">
              {profile.businessName}
            </h1>
            {!isOnline && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <WifiOff className="w-2.5 h-2.5 mr-1" /> Offline
              </span>
            )}
            {isOnline && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Wifi className="w-2.5 h-2.5 mr-1" /> Synced
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
            className="relative flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400/60 transition-all text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95"
            title={`${lowStockCount} items low in stock`}
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="hidden xs:inline">Alerts</span>
            <span className="ml-1 bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
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
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:via-blue-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 hover:scale-[1.03] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Entry</span>
        </button>
      </div>
    </header>
  );
};

