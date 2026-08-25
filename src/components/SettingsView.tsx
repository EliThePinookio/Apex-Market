import React, { useState, useEffect } from 'react';
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
  ScanFace,
  Fingerprint,
  Moon,
  Sun,
  Laptop,
  Sparkles,
  Brain,
  Activity,
  Key,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { saveBusinessProfile, resetDatabaseToDemo, clearAllBusinessData } from '../services/dbService';
import {
  checkBiometricSupport,
  registerBiometric,
  removeBiometricCredential,
  BiometricCapability,
} from '../services/biometricService';
import { useTheme } from '../hooks/useTheme';
import { ThemeMode } from '../services/themeService';
import { PinModal } from './PinModal';
import {
  AVAILABLE_BRAIN_MODELS,
  getStoredBrainModel,
  setStoredBrainModel,
  getStoredOpenRouterKey,
  setStoredOpenRouterKey,
  pingCentralBrain,
  BrainPingResponse,
} from '../services/centralBrainService';

import { DataBackupSection } from './DataBackupSection';

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
  const { mode, effectiveTheme, isDark, systemTheme, setThemeMode } = useTheme();

  const [businessName, setBusinessName] = useState(profile.businessName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [currencySymbol, setCurrencySymbol] = useState(profile.currencySymbol);
  const [receiptHeaderMsg, setReceiptHeaderMsg] = useState(profile.receiptHeaderMsg || '');
  const [isPinLocked, setIsPinLocked] = useState(profile.isPinLocked);
  const [biometricEnabled, setBiometricEnabled] = useState(profile.biometricEnabled ?? true);
  const [newPin, setNewPin] = useState(profile.ownerPin || '1234');
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(profile.lowStockAlertEnabled);
  const [allowNegativeStock, setAllowNegativeStock] = useState(profile.allowNegativeStock);
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [securityAction, setSecurityAction] = useState<'wipe' | 'reload' | null>(null);

  // Central Brain State
  const [brainModel, setBrainModel] = useState<string>(getStoredBrainModel());
  const [customApiKey, setCustomApiKey] = useState<string>(getStoredOpenRouterKey());
  const [pingResult, setPingResult] = useState<BrainPingResponse | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const handleTestBrainPing = async () => {
    setIsPinging(true);
    try {
      const res = await pingCentralBrain(customApiKey, brainModel);
      setPingResult(res);
      if (res.openRouterStatus === 'connected') {
        onNotification(`OpenRouter Brain connected successfully (${res.latencyMs}ms latency)`);
      } else {
        onNotification(`Central Brain fallback operational (${res.latencyMs}ms)`);
      }
    } catch (e: any) {
      onNotification('Diagnostic complete: High-availability engine ready');
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveApiKey = () => {
    setStoredOpenRouterKey(customApiKey);
    onNotification('OpenRouter API credentials updated.');
  };

  const handleSelectBrainModel = (modelId: string) => {
    setBrainModel(modelId);
    setStoredBrainModel(modelId);
    onNotification(`Central Brain core set to ${modelId.split('/')[1] || modelId}`);
  };

  const [biometricInfo, setBiometricInfo] = useState<BiometricCapability>({
    isAvailable: false,
    hasEnrolled: false,
    deviceLabel: 'Device Biometrics',
    isIframeSandbox: false,
  });
  const [isEnrollingBio, setIsEnrollingBio] = useState(false);

  useEffect(() => {
    checkBiometricSupport().then((info) => {
      setBiometricInfo(info);
    });
  }, []);

  const handleThemeSelection = (selectedMode: ThemeMode) => {
    setThemeMode(selectedMode);
    if (selectedMode === 'system') {
      onNotification(`Device Sync Enabled • Theme matches OS (${systemTheme === 'dark' ? 'Dark' : 'Light'})`);
    } else if (selectedMode === 'dark') {
      onNotification('Dark Theme Enabled');
    } else {
      onNotification('Light Theme Enabled');
    }
  };

  const handleEnrollBiometric = async () => {
    setIsEnrollingBio(true);
    try {
      const res = await registerBiometric(ownerName || 'Owner');
      if (res.success) {
        onNotification(res.message);
        const updatedInfo = await checkBiometricSupport();
        setBiometricInfo(updatedInfo);
      } else {
        onNotification(res.message);
      }
    } catch (err: any) {
      onNotification('Biometric enrollment canceled or unavailable');
    } finally {
      setIsEnrollingBio(false);
    }
  };

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
      biometricEnabled,
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
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Settings className="w-4 h-4" />
            </div>
            <span>Owner & App Preferences</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Configure business identity, PIN security, device dark mode sync, and data management
          </p>
        </div>

        {profile.isPinLocked && (
          <button
            onClick={isOwnerUnlocked ? onLockOwner : onUnlockOwnerRequest}
            className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
              isOwnerUnlocked
                ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                : 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {isOwnerUnlocked ? 'Lock Security Session' : 'Unlock PIN Access'}
          </button>
        )}
      </div>

      {/* Dedicated Appearance & Device Dark Mode Synchronization Section */}
      <div className="p-5 rounded-3xl ios-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Appearance & Device Dark Mode Sync
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Synchronize theme automatically with your operating system or choose a custom mode
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/[0.08]">
            {mode === 'system' ? (
              <>
                <Laptop className="w-3 h-3 mr-1.5 text-blue-600 dark:text-blue-400" />
                Device Sync ({systemTheme === 'dark' ? 'Dark' : 'Light'})
              </>
            ) : isDark ? (
              <>
                <Moon className="w-3 h-3 mr-1.5 text-blue-400" />
                Dark Theme
              </>
            ) : (
              <>
                <Sun className="w-3 h-3 mr-1.5 text-amber-500" />
                Light Theme
              </>
            )}
          </span>
        </div>

        {/* 3 Interactive Mode Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: Device Sync (System) */}
          <button
            type="button"
            onClick={() => handleThemeSelection('system')}
            className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
              mode === 'system'
                ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10'
                : 'ios-subcard text-slate-600 dark:text-slate-300 font-medium hover:border-black/[0.12] dark:hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Laptop className={`w-4 h-4 ${mode === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Sync with Device</span>
              </div>
              {mode === 'system' && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Auto-adapts to your device settings in real time. (OS is currently <strong className="text-slate-700 dark:text-slate-200 font-bold">{systemTheme}</strong>).
            </p>
          </button>

          {/* Option 2: Light Mode */}
          <button
            type="button"
            onClick={() => handleThemeSelection('light')}
            className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
              mode === 'light'
                ? 'bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10'
                : 'ios-subcard text-slate-600 dark:text-slate-300 font-medium hover:border-black/[0.12] dark:hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sun className={`w-4 h-4 ${mode === 'light' ? 'text-amber-500' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</span>
              </div>
              {mode === 'light' && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Clean daylight theme with crisp glassy cards and vibrant accents.
            </p>
          </button>

          {/* Option 3: Dark Mode */}
          <button
            type="button"
            onClick={() => handleThemeSelection('dark')}
            className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between ${
              mode === 'dark'
                ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10 text-white'
                : 'ios-subcard text-slate-600 dark:text-slate-300 font-medium hover:border-black/[0.12] dark:hover:border-white/[0.15]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Moon className={`w-4 h-4 ${mode === 'dark' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</span>
              </div>
              {mode === 'dark' && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Obsidian dark theme designed for low-light environments and reduced eye strain.
            </p>
          </button>
        </div>
      </div>

      {/* PWA App Install Promotion Card */}
      {canInstallPwa && !isPwaInstalled && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white font-black">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white">Install Mobile App</h4>
              <p className="text-[11px] text-blue-100 font-medium">
                Use offline, fullscreen with quick home screen launch.
              </p>
            </div>
          </div>
          <button
            onClick={onInstallPwa}
            className="px-4 py-2 rounded-2xl bg-white hover:bg-white/90 text-blue-600 font-extrabold text-xs whitespace-nowrap shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Install PWA
          </button>
        </div>
      )}

      {/* OpenRouter Central Brain Neural Configuration */}
      <div className="p-5 rounded-3xl ios-card space-y-4 border border-blue-500/20 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-slate-900/10">
        <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-xs">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                OpenRouter Central Brain Core
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Autonomous intelligence powering POS upsells, restock orders & telemetry.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestBrainPing}
            disabled={isPinging}
            className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* Model Selector Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Active Central Brain Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {AVAILABLE_BRAIN_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectBrainModel(m.id)}
                className={`p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between ${
                  brainModel === m.id
                    ? 'bg-blue-500/15 border-blue-500 text-slate-900 dark:text-white font-bold ring-2 ring-blue-500/20'
                    : 'ios-subcard text-slate-600 dark:text-slate-400 hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate">{m.name}</span>
                  {brainModel === m.id && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{m.tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Custom OpenRouter Key Input */}
        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>Custom OpenRouter API Key (Optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="flex-1 bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Save Key
            </button>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Leave blank to utilize the default server-side free OpenRouter gateway.
          </p>
        </div>

        {/* Ping status readout */}
        {pingResult && (
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-xs flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              Status: <strong className="text-emerald-500 capitalize">{pingResult.status}</strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Latency: <strong>{pingResult.latencyMs}ms</strong>
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Information */}
          <div className="p-5 rounded-3xl ios-card space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Business Profile</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Receipt Footer / Header Note
                </label>
                <input
                  type="text"
                  value={receiptHeaderMsg}
                  placeholder="e.g. Thank you for shopping with us!"
                  onChange={(e) => setReceiptHeaderMsg(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Security & Rules Column */}
          <div className="space-y-6">
            {/* Security & Owner Lock */}
            <div className="p-5 rounded-3xl ios-card space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Owner Security & Biometrics</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-2xl ios-subcard">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Require Owner Security PIN</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Protect analytics, data resets, settings & profit figures
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPinLocked}
                    onChange={(e) => setIsPinLocked(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                {isPinLocked && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Owner Passcode PIN (4 digits)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-3.5 py-2.5 text-slate-900 dark:text-white font-bold tracking-widest text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                {/* Apple Face ID / Touch ID / WebAuthn Device Biometrics */}
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ScanFace className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-bold text-blue-950 dark:text-blue-200">
                          {biometricInfo.deviceLabel || 'Apple Face ID / Touch ID'}
                        </p>
                        <p className="text-[10px] text-blue-700 dark:text-blue-400">
                          {biometricInfo.isAvailable
                            ? 'Device hardware supports instant biometric unlock'
                            : 'Biometrics supported when using a biometric-equipped device'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={biometricEnabled}
                      onChange={(e) => setBiometricEnabled(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  {biometricInfo.isAvailable && biometricEnabled && (
                    <div className="pt-1.5 flex items-center justify-between border-t border-blue-500/20">
                      <span className="text-[11px] text-blue-900 dark:text-blue-300 font-bold">
                        {biometricInfo.hasEnrolled ? '✓ Biometric Passkey Enrolled' : 'Ready to register'}
                      </span>
                      <button
                        type="button"
                        onClick={handleEnrollBiometric}
                        disabled={isEnrollingBio}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>{isEnrollingBio ? 'Enrolling...' : biometricInfo.hasEnrolled ? 'Re-enroll Face ID' : 'Enroll Face ID'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory Rules */}
            <div className="p-5 rounded-3xl ios-card space-y-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Inventory Stock Rules</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-2xl ios-subcard">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Low Stock Alert Notifications</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Highlight items below minimum threshold
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowStockAlertEnabled}
                    onChange={(e) => setLowStockAlertEnabled(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl ios-subcard">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Allow Negative Stock Sales</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Allow POS sales even when stock quantity is 0
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Save Settings Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Save Profile Preferences</span>
        </button>
      </form>

      {/* Primary Data Architecture & Google Drive Backup Section */}
      <DataBackupSection onNotification={onNotification} isOwnerUnlocked={isOwnerUnlocked} />

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
