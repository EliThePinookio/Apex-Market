import * as XLSX from 'xlsx';
import {
  getProductsCache,
  getTransactionsCache,
  getCustomersCache,
  getLocalCache,
  setLocalCache,
  notifyProducts,
  notifyCategories,
  notifyTransactions,
  notifyCustomers,
  notifyProfile,
  clearAllBusinessData,
} from './dbService';
import {
  uploadBackupToDrive,
  listDriveBackups,
  downloadDriveBackup,
  isDriveConnected,
  authenticateGoogleDrive,
} from './driveBackupService';
import {
  Product,
  Category,
  Transaction,
  Customer,
  BusinessProfile,
  FinancialSummary,
} from '../types';
import { db } from '../firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';

export interface BackupBundle {
  schemaVersion: string;
  appName: string;
  backupTimestamp: string;
  recordCounts: {
    products: number;
    categories: number;
    transactions: number;
    customers: number;
    expenses: number;
  };
  profile: BusinessProfile;
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  customers: Customer[];
}

const LAST_BACKUP_KEY = 'app_last_backup_timestamp_v1';
const AUTO_BACKUP_KEY = 'app_auto_backup_enabled_v1';

export function getLastBackupTimestamp(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

export function setLastBackupTimestamp(ts: string): void {
  localStorage.setItem(LAST_BACKUP_KEY, ts);
}

/**
 * Generates a complete, machine-restorable JSON bundle from current live state
 */
export function generateBackupBundle(): BackupBundle {
  const products = getProductsCache();
  const transactions = getTransactionsCache();
  const customers = getCustomersCache();
  const categories = getLocalCache<Category[]>('app_categories_v1', []);
  const profile = getLocalCache<BusinessProfile>('app_profile_v1', {
    businessName: 'Apex Retail Store',
    ownerName: 'Store Owner',
    currencySymbol: '$',
    isPinLocked: false,
    ownerPin: '1234',
    taxRate: 0,
    lowStockAlertEnabled: true,
    allowNegativeStock: false,
  });

  const expensesCount = transactions.filter((t) => t.type === 'expense').length;

  return {
    schemaVersion: '1.0.0',
    appName: 'Beannel Business ERP',
    backupTimestamp: new Date().toISOString(),
    recordCounts: {
      products: products.length,
      categories: categories.length,
      transactions: transactions.length,
      customers: customers.length,
      expenses: expensesCount,
    },
    profile,
    products,
    categories,
    transactions,
    customers,
  };
}

/**
 * Exports human-readable multi-tab Excel spreadsheet (.xlsx)
 */
export function exportToExcel(): void {
  const bundle = generateBackupBundle();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sales & Transactions
  const salesData = bundle.transactions.map((t) => ({
    ID: t.id,
    Date: t.date ? new Date(t.date).toLocaleString() : '',
    Type: t.type.toUpperCase(),
    'Customer / Beneficiary': t.customerName || t.category || 'N/A',
    Description: t.description,
    'Amount ($)': t.amount,
    'Gross Profit ($)': t.grossProfit ?? '-',
    'Payment Method': t.paymentMethod || 'cash',
  }));
  const salesSheet = XLSX.utils.json_to_sheet(salesData.length ? salesData : [{ Status: 'No Transactions' }]);
  XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales & Transactions');

  // Sheet 2: Products & Inventory
  const inventoryData = bundle.products.map((p) => ({
    SKU: p.sku,
    Name: p.name,
    Category: p.category,
    Unit: p.unit,
    'Stock Qty': p.stockQuantity,
    'Buy Price ($)': p.buyPrice,
    'Sell Price ($)': p.sellPrice,
    'Total Valuation ($)': p.stockQuantity * p.buyPrice,
    Barcode: p.barcode || '-',
    'Min Threshold': p.minStockThreshold,
  }));
  const inventorySheet = XLSX.utils.json_to_sheet(
    inventoryData.length ? inventoryData : [{ Status: 'No Products' }]
  );
  XLSX.utils.book_append_sheet(wb, inventorySheet, 'Products & Stock');

  // Sheet 3: Customers & CRM
  const crmData = bundle.customers.map((c) => ({
    Name: c.name,
    Phone: c.phone,
    Email: c.email,
    Tier: c.tier,
    'Total Spent ($)': c.totalSpent,
    'Order Count': c.orderCount,
    'Loyalty Points': c.loyaltyPoints,
    'Debt Balance ($)': c.debtBalance,
    'Last Visit': c.lastVisit,
  }));
  const crmSheet = XLSX.utils.json_to_sheet(crmData.length ? crmData : [{ Status: 'No Customers' }]);
  XLSX.utils.book_append_sheet(wb, crmSheet, 'Customers & CRM');

  // Sheet 4: Expenses
  const expenses = bundle.transactions.filter((t) => t.type === 'expense');
  const expenseData = expenses.map((e) => ({
    ID: e.id,
    Date: e.date ? new Date(e.date).toLocaleString() : '',
    Category: e.category || 'General',
    Description: e.description,
    'Amount ($)': e.amount,
    'Payment Method': e.paymentMethod || 'cash',
  }));
  const expenseSheet = XLSX.utils.json_to_sheet(
    expenseData.length ? expenseData : [{ Status: 'No Expenses' }]
  );
  XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expenses');

  // Sheet 5: Financial Summary
  const totalSales = bundle.transactions
    .filter((t) => t.type === 'sale')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = bundle.transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalCogs = bundle.transactions
    .filter((t) => t.type === 'sale')
    .reduce((acc, t) => acc + (t.cogs || 0), 0);
  const grossProfit = totalSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  const summaryData = [
    { Metric: 'Business Name', Value: bundle.profile.businessName },
    { Metric: 'Export Date', Value: new Date().toLocaleString() },
    { Metric: 'Total Sales Revenue ($)', Value: totalSales },
    { Metric: 'Cost of Goods Sold (COGS) ($)', Value: totalCogs },
    { Metric: 'Gross Profit ($)', Value: grossProfit },
    { Metric: 'Total Expenses ($)', Value: totalExpenses },
    { Metric: 'Net Profit ($)', Value: netProfit },
    { Metric: 'Total Product Items', Value: bundle.products.length },
    { Metric: 'Total Registered Customers', Value: bundle.customers.length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Financial Summary');

  // Save File
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `BEANNEL_FINANCIAL_REPORT_${dateStr}.xlsx`);
}

/**
 * Downloads JSON backup bundle as local file
 */
export function exportToJSON(): void {
  const bundle = generateBackupBundle();
  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
  const fileName = `BEANNEL_BACKUP_${dateStr}_${timeStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Performs off-site Google Drive backup
 */
export async function performGoogleDriveBackup(): Promise<{ filename: string; timestamp: string }> {
  const bundle = generateBackupBundle();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const filename = `BEANNEL_BACKUP_${dateStr}_${timeStr}.json`;

  const uploadResult = await uploadBackupToDrive(filename, bundle);

  const ts = new Date().toISOString();
  setLastBackupTimestamp(ts);

  return {
    filename: uploadResult.filename,
    timestamp: ts,
  };
}

/**
 * Validates candidate JSON backup object schema
 */
export function validateBackupSchema(candidate: any): {
  valid: boolean;
  counts: { customers: number; products: number; transactions: number; expenses: number };
  timestamp: string;
  version: string;
  error?: string;
} {
  if (!candidate || typeof candidate !== 'object') {
    return {
      valid: false,
      counts: { customers: 0, products: 0, transactions: 0, expenses: 0 },
      timestamp: '',
      version: '',
      error: 'Invalid file format. File does not contain JSON data.',
    };
  }

  const products = Array.isArray(candidate.products) ? candidate.products : [];
  const transactions = Array.isArray(candidate.transactions) ? candidate.transactions : [];
  const customers = Array.isArray(candidate.customers) ? candidate.customers : [];
  const expensesCount = transactions.filter((t: any) => t.type === 'expense').length;

  if (!candidate.products && !candidate.transactions && !candidate.customers) {
    return {
      valid: false,
      counts: { customers: 0, products: 0, transactions: 0, expenses: 0 },
      timestamp: '',
      version: '',
      error: 'File is missing required ERP records (products, transactions, or customers).',
    };
  }

  return {
    valid: true,
    counts: {
      products: products.length,
      transactions: transactions.length,
      customers: customers.length,
      expenses: expensesCount,
    },
    timestamp: candidate.backupTimestamp || new Date().toISOString(),
    version: candidate.schemaVersion || '1.0.0',
  };
}

/**
 * Restores state from a validated BackupBundle with an automatic pre-restore safety backup
 */
export async function restoreFromBackup(bundle: BackupBundle): Promise<void> {
  // 1. Create local safety backup before restoration
  try {
    const safetyBundle = generateBackupBundle();
    localStorage.setItem('app_pre_restore_safety_backup_v1', JSON.stringify(safetyBundle));
    if (isDriveConnected()) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      await uploadBackupToDrive(`PRE_RESTORE_SAFETY_BACKUP_${dateStr}_${timeStr}.json`, safetyBundle).catch(() => {});
    }
  } catch (e) {
    console.warn('Pre-restore safety backup notice:', e);
  }

  // 2. Set local caches
  setLocalCache('app_products_v1', bundle.products || []);
  setLocalCache('app_categories_v1', bundle.categories || []);
  setLocalCache('app_transactions_v1', bundle.transactions || []);
  setLocalCache('app_customers_v1', bundle.customers || []);
  if (bundle.profile) {
    setLocalCache('app_profile_v1', bundle.profile);
  }
  localStorage.setItem('app_has_initialized_v1', 'true');

  // 3. Write to Firestore if connected
  if (db) {
    try {
      // Clear existing records first
      await clearAllBusinessData();

      const batch = writeBatch(db);

      (bundle.products || []).forEach((p) => {
        batch.set(doc(db, 'products', p.id), p);
      });

      (bundle.categories || []).forEach((c) => {
        batch.set(doc(db, 'categories', c.id), c);
      });

      (bundle.transactions || []).forEach((t) => {
        batch.set(doc(db, 'transactions', t.id), t);
      });

      (bundle.customers || []).forEach((c) => {
        batch.set(doc(db, 'customers', c.id), c);
      });

      if (bundle.profile) {
        batch.set(doc(db, 'profile', 'business_info'), bundle.profile);
      }

      // Mark metadata doc
      batch.set(doc(db, 'system', 'metadata'), {
        isInitialized: true,
        restoredAt: new Date().toISOString(),
        schemaVersion: '1.0.0',
      });

      await batch.commit();
    } catch (e) {
      console.error('Error syncing restored data to Firestore:', e);
    }
  }

  // 4. Notify subscribers across components
  notifyProducts();
  notifyCategories();
  notifyTransactions();
  notifyCustomers();
  notifyProfile();
}

/**
 * Performs double-confirmed destructive wipe, saving a pre-wipe safety backup first
 */
export async function performDestructiveDataWipe(): Promise<void> {
  // 1. Create pre-wipe safety backup
  try {
    const safetyBundle = generateBackupBundle();
    localStorage.setItem('app_pre_wipe_safety_backup_v1', JSON.stringify(safetyBundle));
    if (isDriveConnected()) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      await uploadBackupToDrive(`PRE_WIPE_SAFETY_BACKUP_${dateStr}_${timeStr}.json`, safetyBundle).catch(() => {});
    }
  } catch (e) {
    console.warn('Pre-wipe safety backup notice:', e);
  }

  // 2. Wipe live business data
  await clearAllBusinessData();

  // 3. Mark initialized metadata so app stays completely empty and doesn't auto-seed demo data
  localStorage.setItem('app_has_initialized_v1', 'true');
  if (db) {
    try {
      await setDoc(doc(db, 'system', 'metadata'), {
        isInitialized: true,
        wipedAt: new Date().toISOString(),
        schemaVersion: '1.0.0',
      });
    } catch (e) {}
  }
}
