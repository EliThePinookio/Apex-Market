import React, { useState } from 'react';
import {
  Settings,
  Store,
  Lock,
  DollarSign,
  Database,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Smartphone,
  Shield,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { saveBusinessProfile, resetDatabaseToDemo, clearAllBusinessData } from '../services/dbService';
import { PinModal } from './PinModal';

interface SettingsViewProps {
  profile: BusinessProfile;
  isOwnerUnlocked: boolean;
  onLockOwner: () => void;
  onUnlockOwnerRequest: () => void;
  canInstallPwa: boolean;
  isPwaInstalled: boolean;
  onInstallPwa: () => void;
  onNotification: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  isOwnerUnlocked,
  onLockOwner,
  onUnlockOwnerRequest,
  canInstallPwa,
  isPwaInstalled,
  onInstallPwa,
  onNotification,
}) => {
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [receiptHeaderMsg, setReceiptHeaderMsg] = useState(profile.receiptHeaderMsg || '');
  const [isPinLocked, setIsPinLocked] = useState(profile.isPinLocked);
  const [newPin, setNewPin] = useState(profile.ownerPin || '1234');
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(profile.lowStockAlertEnabled);
  const [allowNegativeStock, setAllowNegativeStock] = useState(profile.allowNegativeStock);
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [securityAction, setSecurityAction] = useState<'wipe' | 'reload' | null>(null);

  const cur = profile.currencySymbol;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPinLocked && (!newPin || newPin.length < 4)) {
      alert('PIN must be at least 4 digits!');
      return;
    }

    await saveBusinessProfile({
      businessName,
      ownerName,
      currencySymbol,
      receiptHeaderMsg,
      isPinLocked,
      ownerPin: newPin,
      lowStockAlertEnabled,
      allowNegativeStock,
    });

    onNotification('Settings updated & saved');
  };

  const handleClearAllData = () => {
    setSecurityAction('wipe');
  };

  const handleReloadSampleData = () => {
    setSecurityAction('reload');
  };

  const handleConfirmSecurityAction = async () => {
    const action = securityAction;
    setSecurityAction(null);
    setIsProcessingData(true);
    try {
      if (action === 'wipe') {
        await clearAllBusinessData();
        onNotification('Secret passcode verified! Database completely wiped and ready for fresh business entries.');
      } else if (action === 'reload') {
        await resetDatabaseToDemo();
        onNotification('Secret passcode verified! Default sample catalog reloaded.');
      }
    } catch (e) {
      console.error('Error executing reset action:', e);
      onNotification('Error completing reset action. Please try again.');
    } finally {
      setIsProcessingData(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto space-y-5">
      {/* Settings Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>Owner & App Settings</span>
          </h2>
          <p className="text-xs text-slate-400">
            Business details, PIN protection, and preferences
          </p>
        </div>

        {profile.isPinLocked && (
          <button
            onClick={isOwnerUnlocked ? onLockOwner : onUnlockOwnerRequest}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isOwnerUnlocked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isOwnerUnlocked ? 'Lock Security' : 'Unlock PIN'}
          </button>
        )}
      </div>

      {/* PWA App Install Promotion Card */}
      {canInstallPwa && !isPwaInstalled && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-blue-950/80 to-purple-950/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Install Mobile App</h4>
              <p className="text-[11px] text-cyan-200">
                Use offline, fullscreen with quick home screen launch.
              </p>
            </div>
          </div>
          <button
            onClick={onInstallPwa}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all"
          >
            Install PWA
          </button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* Business Information */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Store className="w-4 h-4 text-cyan-400" />
            <span>Business Information</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Currency Symbol
                </label>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="$">$ (USD / AUD / CAD)</option>
                  <option value="€">€ (Euro)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="₦">₦ (Naira)</option>
                  <option value="₹">₹ (Rupee)</option>
                  <option value="R">R (Rand)</option>
                  <option value="KSh">KSh (Kenyan Shilling)</option>
                  <option value="GH₵">GH₵ (Cedi)</option>
                  <option value="₱">₱ (Peso)</option>
                  <option value="¥">¥ (Yen / Yuan)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Receipt Footer / Header Note
              </label>
              <input
                type="text"
                value={receiptHeaderMsg}
                placeholder="e.g. Thank you for shopping with us!"
                onChange={(e) => setReceiptHeaderMsg(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Owner Lock */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Owner PIN Protection</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <p className="font-semibold text-slate-200">Require Owner Security PIN</p>
                <p className="text-[10px] text-slate-400">
                  Protect sensitivity analytics, settings & profit data
                </p>
              </div>
              <input
                type="checkbox"
                checked={isPinLocked}
                onChange={(e) => setIsPinLocked(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {isPinLocked && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Owner Passcode PIN (4 digits)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 font-bold tracking-widest text-base focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Inventory Rules */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Inventory Stock Rules</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <p className="font-semibold text-slate-200">Low Stock Alert Notifications</p>
                <p className="text-[10px] text-slate-400">
                  Highlight items below minimum threshold
                </p>
              </div>
              <input
                type="checkbox"
                checked={lowStockAlertEnabled}
                onChange={(e) => setLowStockAlertEnabled(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <p className="font-semibold text-slate-200">Allow Negative Stock Sales</p>
                <p className="text-[10px] text-slate-400">
                  Allow POS sales even when stock quantity is 0
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit Save Settings Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Save Profile Preferences</span>
        </button>
      </form>

      {/* Data Management Options */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 pt-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span>Business Data & Records Management</span>
        </h3>
        <p className="text-[11px] text-slate-400">
          Wipe all sample data to start completely fresh, or reload default catalog entries if needed.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleClearAllData}
            disabled={isProcessingData}
            className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 active:scale-95"
          >
            {isProcessingData ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isProcessingData ? 'Clearing...' : 'Wipe All Data'}</span>
          </button>

          <button
            type="button"
            onClick={handleReloadSampleData}
            disabled={isProcessingData}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50 active:scale-95"
          >
            {isProcessingData ? (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <RotateCcw className="w-4 h-4 text-slate-400" />
            )}
            <span>{isProcessingData ? 'Loading...' : 'Load Samples'}</span>
          </button>
        </div>
      </div>

      {/* Security Check Passcode Modal for Reset Actions */}
      <PinModal
        isOpen={!!securityAction}
        onClose={() => setSecurityAction(null)}
        correctPin={profile.ownerPin || '1234'}
        title={
          securityAction === 'wipe'
            ? 'Confirm Data Wipe'
            : 'Confirm Sample Reload'
        }
        subtitle={
          securityAction === 'wipe'
            ? 'Enter owner passcode PIN to wipe all business figures and start completely fresh.'
            : 'Enter owner passcode PIN to reload sample catalog figures.'
        }
        onSuccess={handleConfirmSecurityAction}
      />
    </div>
  );
};
