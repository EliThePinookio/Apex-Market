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
  getActiveBusinessId,
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
import { supabase, isSupabaseConfigured } from '../supabase';

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
    businessName: 'BEANNEL',
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
    appName: 'BEANNEL',
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

  // Sheet 3: Customers (CRM)
  const customerData = bundle.customers.map((c) => ({
    Name: c.name,
    Phone: c.phone || '-',
    Email: c.email || '-',
    Tier: c.tier,
    'Total Spent ($)': c.totalSpent,
    'Orders Count': c.orderCount,
    'Loyalty Points': c.loyaltyPoints,
    'Outstanding Debt ($)': c.debtBalance,
    'Last Visit': c.lastVisit,
  }));
  const custSheet = XLSX.utils.json_to_sheet(
    customerData.length ? customerData : [{ Status: 'No Customers' }]
  );
  XLSX.utils.book_append_sheet(wb, custSheet, 'Customers CRM');

  // Sheet 4: Financial Summary & KPI Sheet
  const totalRev = bundle.transactions.filter((t) => t.type === 'sale').reduce((s, t) => s + (t.amount || 0), 0);
  const totalCOGS = bundle.transactions.filter((t) => t.type === 'sale').reduce((s, t) => s + (t.cogs || 0), 0);
  const totalExp = bundle.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const totalCap = bundle.transactions.filter((t) => t.type === 'capital').reduce((s, t) => s + (t.amount || 0), 0);
  const grossProfit = totalRev - totalCOGS;
  const netProfit = grossProfit - totalExp;
  const invVal = bundle.products.reduce((s, p) => s + p.buyPrice * p.stockQuantity, 0);

  const summaryData = [
    { Metric: 'Store Name', Value: bundle.profile.businessName },
    { Metric: 'Owner Name', Value: bundle.profile.ownerName },
    { Metric: 'Export Timestamp', Value: new Date().toLocaleString() },
    { Metric: 'Primary Database', Value: 'Supabase PostgreSQL' },
    { Metric: 'Total Sales Revenue', Value: totalRev },
    { Metric: 'Total Cost of Goods Sold (COGS)', Value: totalCOGS },
    { Metric: 'Gross Profit', Value: grossProfit },
    { Metric: 'Operating Expenses', Value: totalExp },
    { Metric: 'Net Profit', Value: netProfit },
    { Metric: 'Owner Capital Injected', Value: totalCap },
    { Metric: 'Current Inventory Valuation (Cost)', Value: invVal },
    { Metric: 'Total Active Products', Value: bundle.products.length },
    { Metric: 'Total Customers', Value: bundle.customers.length },
    { Metric: 'Total Recorded Transactions', Value: bundle.transactions.length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');

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

  // 3. Write to Supabase PostgreSQL if configured
  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();

      // Clear existing records first
      await clearAllBusinessData();

      // Re-insert categories
      if (bundle.categories && bundle.categories.length > 0) {
        const catRows = bundle.categories.map((c) => ({
          id: c.id,
          business_id: bizId,
          name: c.name,
          color: c.color || '#10b981',
        }));
        await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
      }

      // Re-insert products
      if (bundle.products && bundle.products.length > 0) {
        const prodRows = bundle.products.map((p) => ({
          id: p.id,
          business_id: bizId,
          name: p.name,
          sku: p.sku,
          category: p.category,
          buy_price: p.buyPrice,
          sell_price: p.sellPrice,
          stock_quantity: p.stockQuantity,
          min_stock_threshold: p.minStockThreshold,
          unit: p.unit,
          barcode: p.barcode,
          notes: p.notes,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        }));
        await supabase.from('products').upsert(prodRows, { onConflict: 'id' });
      }

      // Re-insert customers
      if (bundle.customers && bundle.customers.length > 0) {
        const custRows = bundle.customers.map((c) => ({
          id: c.id,
          business_id: bizId,
          name: c.name,
          phone: c.phone,
          email: c.email,
          loyalty_points: c.loyaltyPoints,
          total_spent: c.totalSpent,
          order_count: c.orderCount,
          debt_balance: c.debtBalance,
          tier: c.tier,
          last_visit: c.lastVisit,
          notes: c.notes,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        }));
        await supabase.from('customers').upsert(custRows, { onConflict: 'id' });
      }

      // Re-insert transactions
      if (bundle.transactions && bundle.transactions.length > 0) {
        const txRows = bundle.transactions.map((t) => ({
          id: t.id,
          business_id: bizId,
          type: t.type,
          amount: t.amount,
          cogs: t.cogs || 0,
          gross_profit: t.grossProfit || 0,
          net_profit: t.netProfit || 0,
          date: t.date,
          description: t.description,
          category: t.category || '',
          payment_method: t.paymentMethod || 'cash',
          customer_name: t.customerName || '',
          items: t.items || [],
          created_at: t.createdAt,
        }));
        await supabase.from('transactions').upsert(txRows, { onConflict: 'id' });
      }

      // Upsert business profile
      if (bundle.profile && bizId) {
        await supabase.from('businesses').upsert(
          {
            id: bizId,
            name: bundle.profile.businessName,
            owner_name: bundle.profile.ownerName,
            currency_symbol: bundle.profile.currencySymbol,
            tax_rate: bundle.profile.taxRate,
            low_stock_alert_enabled: bundle.profile.lowStockAlertEnabled,
            allow_negative_stock: bundle.profile.allowNegativeStock,
            receipt_header_msg: bundle.profile.receiptHeaderMsg,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    } catch (e) {
      console.error('Error syncing restored data to Supabase:', e);
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
  // 1. Create local pre-wipe safety backup first
  try {
    const safetyBundle = generateBackupBundle();
    localStorage.setItem('app_pre_wipe_safety_backup_v1', JSON.stringify(safetyBundle));
    if (isDriveConnected()) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const uploadPromise = uploadBackupToDrive(`PRE_WIPE_SAFETY_BACKUP_${dateStr}_${timeStr}.json`, safetyBundle);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Drive backup timed out')), 4000));
      await Promise.race([uploadPromise, timeoutPromise]).catch((e) => {
        console.warn('Pre-wipe drive upload skipped or timed out:', e);
      });
    }
  } catch (e) {
    console.warn('Pre-wipe safety backup notice:', e);
  }

  // 2. Wipe live business data
  await clearAllBusinessData();

  // 3. Mark initialized metadata so app stays completely empty and doesn't auto-seed demo data
  localStorage.setItem('app_has_initialized_v1', 'true');
}
