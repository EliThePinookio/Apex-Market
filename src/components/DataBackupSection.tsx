import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  ShieldCheck,
  Trash2,
  X,
  Clock,
  Check,
  Lock,
  CloudOff,
  ExternalLink,
} from 'lucide-react';
import {
  getLastBackupTimestamp,
  exportToExcel,
  exportToJSON,
  performGoogleDriveBackup,
  validateBackupSchema,
  restoreFromBackup,
  performDestructiveDataWipe,
  BackupBundle,
} from '../services/backupManager';
import {
  authenticateGoogleDrive,
  isDriveConnected,
  disconnectDrive,
  listDriveBackups,
  downloadDriveBackup,
  deleteDriveBackup,
  DriveBackupFile,
} from '../services/driveBackupService';
import { isSupabaseConfigured } from '../supabase';
import { resetDatabaseToDemo, migrateLocalDataToSupabase } from '../services/dbService';

interface DataBackupSectionProps {
  onNotification: (msg: string) => void;
  isOwnerUnlocked?: boolean;
}

export const DataBackupSection: React.FC<DataBackupSectionProps> = ({
  onNotification,
  isOwnerUnlocked = true,
}) => {
  const [driveConnected, setDriveConnected] = useState<boolean>(isDriveConnected());
  const [lastBackup, setLastBackup] = useState<string | null>(getLastBackupTimestamp());
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [historyFiles, setHistoryFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);

  // Restore state
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<{
    source: 'drive' | 'file';
    bundle: BackupBundle;
    fileId?: string;
    filename?: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [validationInfo, setValidationInfo] = useState<any>(null);

  // Wipe state
  const [isWipeModalOpen, setIsWipeModalOpen] = useState<boolean>(false);
  const [wipeConfirmText, setWipeConfirmText] = useState<string>('');
  const [isWiping, setIsWiping] = useState<boolean>(false);

  // Demo load state
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);

  useEffect(() => {
    setDriveConnected(isDriveConnected());
  }, []);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      await authenticateGoogleDrive();
      setDriveConnected(true);
      onNotification('Google Drive connected successfully for off-site backups!');
    } catch (err: any) {
      console.error('Drive auth error:', err);
      alert(`Google Drive connection failed: ${err.message || 'Check OAuth permissions'}`);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = () => {
    disconnectDrive();
    setDriveConnected(false);
    onNotification('Google Drive disconnected.');
  };

  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await migrateLocalDataToSupabase();
      if (res.success) {
        onNotification(res.message);
      } else {
        alert(res.message);
      }
    } catch (e: any) {
      alert(`Supabase sync failed: ${e.message}`);
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleBackUpNow = async () => {
    setIsBackingUp(true);
    try {
      if (!driveConnected) {
        await authenticateGoogleDrive();
        setDriveConnected(true);
      }
      const res = await performGoogleDriveBackup();
      setLastBackup(res.timestamp);
      onNotification(`Off-site backup created successfully: ${res.filename}`);
    } catch (err: any) {
      console.error('Backup failed:', err);
      alert(`Backup failed: ${err.message || 'Could not write to Google Drive'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFetchHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      if (!driveConnected) {
        await authenticateGoogleDrive();
        setDriveConnected(true);
      }
      const files = await listDriveBackups();
      setHistoryFiles(files);
    } catch (err: any) {
      console.error('History fetch error:', err);
      alert(`Could not load backup history: ${err.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteHistoryFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this backup from Google Drive?')) return;
    try {
      await deleteDriveBackup(fileId);
      setHistoryFiles((prev) => prev.filter((f) => f.id !== fileId));
      onNotification('Backup file removed from Google Drive.');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleSelectDriveBackupForRestore = async (file: DriveBackupFile) => {
    try {
      setIsLoadingHistory(true);
      const data = await downloadDriveBackup(file.id);
      const val = validateBackupSchema(data);
      if (!val.valid) {
        alert(`Selected file is not a valid backup: ${val.error}`);
        return;
      }
      setValidationInfo(val);
      setSelectedBackupForRestore({
        source: 'drive',
        bundle: data as BackupBundle,
        fileId: file.id,
        filename: file.name,
      });
      setIsRestoreModalOpen(true);
    } catch (err: any) {
      alert(`Failed to prepare backup file: ${err.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileUploadForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        const val = validateBackupSchema(parsed);
        if (!val.valid) {
          alert(`Invalid backup JSON: ${val.error}`);
          return;
        }
        setValidationInfo(val);
        setSelectedBackupForRestore({
          source: 'file',
          bundle: parsed as BackupBundle,
          filename: file.name,
        });
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    setIsRestoring(true);
    try {
      await restoreFromBackup(selectedBackupForRestore.bundle);
      setIsRestoreModalOpen(false);
      setSelectedBackupForRestore(null);
      setIsHistoryOpen(false);
      onNotification('Database restored successfully! All business records refreshed.');
    } catch (err: any) {
      console.error('Restore error:', err);
      alert(`Restoration failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteWipe = async () => {
    if (wipeConfirmText.trim().toUpperCase() !== 'DELETE') {
      alert('Please type "DELETE" to confirm data wipe.');
      return;
    }
    setIsWiping(true);
    try {
      await performDestructiveDataWipe();
      setIsWipeModalOpen(false);
      setWipeConfirmText('');
      onNotification('Live business data wiped cleanly. Google Drive backups remain intact.');
    } catch (err: any) {
      alert(`Data wipe failed: ${err.message}`);
    } finally {
      setIsWiping(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (!confirm('This will load sample demo products, transactions, and customers for testing. Proceed?')) return;
    setIsDemoLoading(true);
    try {
      await resetDatabaseToDemo();
      onNotification('Sample demo data loaded successfully.');
    } catch (e: any) {
      alert(`Demo load failed: ${e.message}`);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="ios-card rounded-3xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Data Architecture & Off-Site Backups</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Authoritative Supabase PostgreSQL database with offline resilience & Google Drive versioned backups
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Supabase Authoritative
          </span>
        </div>
      </div>

      {/* DATA STATUS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Primary Database */}
        <div className="p-4 rounded-2xl ios-subcard flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Primary Database</span>
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Local Fast DB'}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected & Active
            </div>
          </div>
        </div>

        {/* Card 2: Synchronization */}
        <div className="p-4 rounded-2xl ios-subcard flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Synchronization</span>
            <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">Offline Resilient</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-semibold">Auto-synced on reconnect</div>
          </div>
        </div>

        {/* Card 3: Last Backup */}
        <div className="p-4 rounded-2xl ios-subcard flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Last Drive Backup</span>
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {lastBackup ? new Date(lastBackup).toLocaleString() : 'No Drive Backups Yet'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">Versioned JSON payload</div>
          </div>
        </div>

        {/* Card 4: Google Drive Destination */}
        <div className="p-4 rounded-2xl ios-subcard flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Google Drive Backup</span>
            <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {driveConnected ? 'Connected' : 'Not Connected'}
            </div>
            {driveConnected ? (
              <button
                onClick={handleDisconnectDrive}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold mt-0.5 cursor-pointer underline"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectDrive}
                disabled={isConnectingDrive}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold underline mt-0.5 cursor-pointer"
              >
                {isConnectingDrive ? 'Connecting...' : 'Connect Drive'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS BAR */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Data Actions & Cloud Backup
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Sync to Supabase */}
          <button
            onClick={handleSyncToSupabase}
            disabled={isSyncingSupabase}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.97] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
            {isSyncingSupabase ? 'Syncing to Supabase...' : 'Sync to Supabase'}
          </button>

          {/* Back Up Now */}
          <button
            onClick={handleBackUpNow}
            disabled={isBackingUp}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.97] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Cloud className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
            {isBackingUp ? 'Backing Up...' : 'Back Up to Google Drive'}
          </button>

          {/* Export Excel */}
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 rounded-2xl ios-subcard hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 font-extrabold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer active:scale-[0.97]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>

          {/* Export JSON */}
          <button
            onClick={exportToJSON}
            className="px-4 py-2.5 rounded-2xl ios-subcard hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 font-extrabold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer active:scale-[0.97]"
          >
            <FileJson className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Export JSON
          </button>

          {/* View Backup History */}
          <button
            onClick={handleFetchHistory}
            className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs sm:text-sm transition flex items-center gap-2 border border-indigo-500/20 cursor-pointer active:scale-[0.97]"
          >
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Drive Backup History
          </button>

          {/* Restore Backup */}
          <label className="px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold text-xs sm:text-sm transition flex items-center gap-2 border border-amber-500/20 cursor-pointer active:scale-[0.97]">
            <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Restore from JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileUploadForRestore}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* DANGER ZONE / WIPE DATA */}
      <div className="mt-6 pt-6 border-t border-black/[0.05] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Destructive Data Operations
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Clear all live business records to start fresh. Google Drive off-site backups are never deleted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadDemoData}
            disabled={isDemoLoading}
            className="px-3.5 py-2 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer active:scale-[0.97]"
          >
            {isDemoLoading ? 'Loading...' : 'Load Demo Sample Data'}
          </button>
          <button
            onClick={() => setIsWipeModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wipe All Data
          </button>
        </div>
      </div>

      {/* MODAL 1: BACKUP HISTORY DRAWER / MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-2xl rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-white/80 dark:border-white/[0.12] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Google Drive Backup History</h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                  Loading versioned backups from Google Drive...
                </div>
              ) : historyFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm space-y-3">
                  <CloudOff className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>No off-site backups found in Google Drive yet.</div>
                  <button
                    onClick={handleBackUpNow}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs transition cursor-pointer shadow-md shadow-blue-500/25"
                  >
                    Create First Backup Now
                  </button>
                </div>
              ) : (
                historyFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/40 bg-black/[0.02] dark:bg-white/[0.03] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{file.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>Created: {new Date(file.createdTime).toLocaleString()}</span>
                        {file.size && <span>Size: {(Number(file.size) / 1024).toFixed(1)} KB</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectDriveBackupForRestore(file)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition cursor-pointer active:scale-[0.97] shadow-xs"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteHistoryFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                        title="Delete Backup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-black/[0.05] dark:border-white/[0.06] flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Path: Google Drive / BEANNEL BUSINESS BACKUPS</span>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-2xl bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] text-slate-800 dark:text-slate-200 font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTORE CONFIRMATION PREVIEW */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/80 dark:border-white/[0.12] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Confirm Database Restoration</h3>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Restoring this backup bundle will update live database records. An automatic safety backup of your current database will be saved before performing restoration.
            </p>

            {/* RECORD COUNTS SUMMARY */}
            <div className="p-4 rounded-2xl ios-subcard space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                Backup File Details
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Source:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white capitalize">
                    {selectedBackupForRestore.source} ({selectedBackupForRestore.filename || 'File'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Schema Version:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{validationInfo?.version || '1.0.0'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Timestamp:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(validationInfo?.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-[#151D2A]/60 border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {validationInfo?.counts?.products ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Products</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-[#151D2A]/60 border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {validationInfo?.counts?.customers ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Customers</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-[#151D2A]/60 border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {validationInfo?.counts?.transactions ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Transactions</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-[#151D2A]/60 border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {validationInfo?.counts?.expenses ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Expenses</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.97]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                {isRestoring ? 'Restoring Database...' : 'Confirm & Restore Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: WIPE ALL DATA CONFIRMATION */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-2xl rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Wipe All Business Data</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-extrabold">High Destructive Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              This action erases live business records (products, sales, expenses, customers, CRM history).
              <br />
              <strong className="text-slate-900 dark:text-white">Note:</strong> Your Google Drive off-site backups will NOT be touched or deleted. An automatic pre-wipe backup will also be saved.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Type <span className="font-extrabold text-rose-600 dark:text-rose-400">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsWipeModalOpen(false);
                  setWipeConfirmText('');
                }}
                className="px-4 py-2 rounded-2xl bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteWipe}
                disabled={isWiping || wipeConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-[0.97]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isWiping ? 'Wiping...' : 'Wipe Live Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
