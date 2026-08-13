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
import { isFirestoreConfigured } from '../firebase';
import { resetDatabaseToDemo } from '../services/dbService';

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
    <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Architecture & Off-Site Backups</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Primary cloud database with offline resilience & Google Drive versioned backups
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Production Ready
          </span>
        </div>
      </div>

      {/* DATA STATUS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Primary Database */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Primary Database</span>
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isFirestoreConfigured ? 'Firestore Cloud' : 'Local Persistence'}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected & Active
            </div>
          </div>
        </div>

        {/* Card 2: Synchronization */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Synchronization</span>
            <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Offline Resilient</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Auto-synced on reconnect</div>
          </div>
        </div>

        {/* Card 3: Last Backup */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Last Backup</span>
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {lastBackup ? new Date(lastBackup).toLocaleString() : 'No Backups Yet'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Versioned JSON payload</div>
          </div>
        </div>

        {/* Card 4: Google Drive Destination */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Google Drive</span>
            <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {driveConnected ? 'Connected' : 'Not Connected'}
            </div>
            {driveConnected ? (
              <button
                onClick={handleDisconnectDrive}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline font-medium mt-0.5 cursor-pointer"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectDrive}
                disabled={isConnectingDrive}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline mt-0.5 cursor-pointer"
              >
                {isConnectingDrive ? 'Connecting...' : 'Connect Drive'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS BAR */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Data Actions & Off-Site Backups
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Back Up Now */}
          <button
            onClick={handleBackUpNow}
            disabled={isBackingUp}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Cloud className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
            {isBackingUp ? 'Backing Up...' : 'Back Up Now'}
          </button>

          {/* Export Excel */}
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>

          {/* Export JSON */}
          <button
            onClick={exportToJSON}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Export JSON
          </button>

          {/* View Backup History */}
          <button
            onClick={handleFetchHistory}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs sm:text-sm transition flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Backup History
          </button>

          {/* Restore Backup */}
          <label className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm transition flex items-center gap-2 border border-amber-200 dark:border-amber-800 cursor-pointer">
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
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Destructive Data Operations
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clear all live business records to start fresh. Google Drive off-site backups are never deleted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadDemoData}
            disabled={isDemoLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            {isDemoLoading ? 'Loading...' : 'Load Demo Sample Data'}
          </button>
          <button
            onClick={() => setIsWipeModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold transition border border-red-200 dark:border-red-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Wipe All Data
          </button>
        </div>
      </div>

      {/* MODAL 1: BACKUP HISTORY DRAWER / MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Drive Backup History</h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                  Loading versioned backups from Google Drive...
                </div>
              ) : historyFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm space-y-3">
                  <CloudOff className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div>No off-site backups found in Google Drive yet.</div>
                  <button
                    onClick={handleBackUpNow}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    Create First Backup Now
                  </button>
                </div>
              ) : (
                historyFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-600 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDeleteHistoryFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition cursor-pointer"
                        title="Delete Backup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>Path: Google Drive / BEANNEL BUSINESS BACKUPS</span>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTORE CONFIRMATION PREVIEW */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Database Restoration</h3>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Restoring this backup bundle will update live database records. An automatic safety backup of your current database will be saved before performing restoration.
            </p>

            {/* RECORD COUNTS SUMMARY */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                Backup File Details
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Source:</span>{' '}
                  <span className="font-semibold text-slate-900 dark:text-white capitalize">
                    {selectedBackupForRestore.source} ({selectedBackupForRestore.filename || 'File'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Schema Version:</span>{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{validationInfo?.version || '1.0.0'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Timestamp:</span>{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(validationInfo?.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {validationInfo?.counts?.products ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Products</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {validationInfo?.counts?.customers ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Customers</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {validationInfo?.counts?.transactions ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Transactions</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {validationInfo?.counts?.expenses ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Expenses</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Wipe All Business Data</h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">High Destructive Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action erases live business records (products, sales, expenses, customers, CRM history).
              <br />
              <strong className="text-slate-900 dark:text-white">Note:</strong> Your Google Drive off-site backups will NOT be touched or deleted. An automatic pre-wipe backup will also be saved.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type <span className="font-extrabold text-red-600 dark:text-red-400">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsWipeModalOpen(false);
                  setWipeConfirmText('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteWipe}
                disabled={isWiping || wipeConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
