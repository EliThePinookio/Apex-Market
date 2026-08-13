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
  isIOS?: boolean;
  isAndroid?: boolean;
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
    <div className="pb-24 md:pb-12 pt-4 px-4 md:px-6 max-w-7xl mx-auto space-y-6">
      {/* Settings Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <span>Owner & App Preferences</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure business identity, PIN security protection, currency, and data management
          </p>
        </div>

        {profile.isPinLocked && (
          <button
            onClick={isOwnerUnlocked ? onLockOwner : onUnlockOwnerRequest}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
              isOwnerUnlocked
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs hover:bg-emerald-100'
                : 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs hover:bg-rose-100'
            }`}
          >
            {isOwnerUnlocked ? 'Lock Security Session' : 'Unlock PIN Access'}
          </button>
        )}
      </div>

      {/* PWA App Install Promotion Card */}
      {canInstallPwa && !isPwaInstalled && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Install Mobile App</h4>
              <p className="text-[11px] text-slate-300">
                Use offline, fullscreen with quick home screen launch.
              </p>
            </div>
          </div>
          <button
            onClick={onInstallPwa}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs whitespace-nowrap shadow-xs active:scale-95 transition-all"
          >
            Install PWA
          </button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Information */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>Business Profile</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                <label className="block text-slate-600 font-semibold mb-1">
                  Receipt Footer / Header Note
                </label>
                <input
                  type="text"
                  value={receiptHeaderMsg}
                  placeholder="e.g. Thank you for shopping with us!"
                  onChange={(e) => setReceiptHeaderMsg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Security & Rules Column */}
          <div className="space-y-6">
            {/* Security & Owner Lock */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Owner Security & PIN Lock</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900">Require Owner Security PIN</p>
                    <p className="text-[10px] text-slate-500">
                      Protect analytics, data resets, settings & profit figures
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPinLocked}
                    onChange={(e) => setIsPinLocked(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {isPinLocked && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Owner Passcode PIN (4 digits)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold tracking-widest text-base focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Rules */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Inventory Stock Rules</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900">Low Stock Alert Notifications</p>
                    <p className="text-[10px] text-slate-500">
                      Highlight items below minimum threshold
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowStockAlertEnabled}
                    onChange={(e) => setLowStockAlertEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900">Allow Negative Stock Sales</p>
                    <p className="text-[10px] text-slate-500">
                      Allow POS sales even when stock quantity is 0
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Save Settings Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Save Profile Preferences</span>
        </button>
      </form>

      {/* Data Management Options */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Business Data & Records Management</span>
        </h3>
        <p className="text-xs text-slate-500">
          Wipe all sample data to start completely fresh, or reload default catalog entries if needed. Protected by your owner security passcode.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleClearAllData}
            disabled={isProcessingData}
            className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {isProcessingData ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isProcessingData ? 'Clearing...' : 'Wipe All Data (Protected)'}</span>
          </button>

          <button
            type="button"
            onClick={handleReloadSampleData}
            disabled={isProcessingData}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {isProcessingData ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <RotateCcw className="w-4 h-4 text-slate-500" />
            )}
            <span>{isProcessingData ? 'Loading...' : 'Load Sample Catalog (Protected)'}</span>
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
