import { supabase, isSupabaseConfigured } from '../supabase';
import {
  Product,
  Category,
  Transaction,
  BusinessProfile,
  Customer,
  StockMovement,
  FinancialSummary,
  TransactionItem,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_BUSINESS_PROFILE,
  INITIAL_CUSTOMERS,
} from '../data/seedData';

// Storage keys for local offline cache & fallback
const CACHE_KEYS = {
  PRODUCTS: 'app_products_v1',
  CATEGORIES: 'app_categories_v1',
  TRANSACTIONS: 'app_transactions_v1',
  CUSTOMERS: 'app_customers_v1',
  PROFILE: 'app_profile_v1',
  MOVEMENTS: 'app_movements_v1',
  OFFLINE_QUEUE: 'app_offline_queue_v1',
  CURRENT_BIZ_ID: 'app_current_business_id_v1',
};

// Default clean initial categories for new businesses
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-general', name: 'General', color: '#10b981' },
  { id: 'cat-beverages', name: 'Beverages', color: '#06b6d4' },
  { id: 'cat-snacks', name: 'Snacks', color: '#f59e0b' },
  { id: 'cat-essentials', name: 'Essentials', color: '#8b5cf6' },
];

// Subscriber sets for local + online UI reactivity
const productSubscribers = new Set<(products: Product[]) => void>();
const categorySubscribers = new Set<(categories: Category[]) => void>();
const transactionSubscribers = new Set<(transactions: Transaction[]) => void>();
const customerSubscribers = new Set<(customers: Customer[]) => void>();
const profileSubscribers = new Set<(profile: BusinessProfile) => void>();

// Helper for local storage read
export function getLocalCache<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// Helper for local storage write
export function setLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

export function getProductsCache(): Product[] {
  return getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, []);
}

export function getCategoriesCache(): Category[] {
  return getLocalCache<Category[]>(CACHE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
}

export function getTransactionsCache(): Transaction[] {
  return getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
}

export function getCustomersCache(): Customer[] {
  return getLocalCache<Customer[]>(CACHE_KEYS.CUSTOMERS, []);
}

export function notifyProducts(): void {
  const current = getProductsCache();
  productSubscribers.forEach((cb) => cb(current));
}

export function notifyCategories(): void {
  const current = getCategoriesCache();
  categorySubscribers.forEach((cb) => cb(current));
}

export function notifyTransactions(): void {
  const current = getTransactionsCache();
  transactionSubscribers.forEach((cb) => cb(current));
}

export function notifyCustomers(): void {
  const current = getCustomersCache();
  customerSubscribers.forEach((cb) => cb(current));
}

export function notifyProfile(): void {
  const current = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  profileSubscribers.forEach((cb) => cb(current));
}

/**
 * Get active business ID for multi-tenant data isolation
 */
export async function getActiveBusinessId(): Promise<string | null> {
  if (!isSupabaseConfigured) {
    return localStorage.getItem(CACHE_KEYS.CURRENT_BIZ_ID) || 'local-biz';
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      const uId = data.session.user.id;
      // Fetch profile to get assigned business_id
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', uId)
        .maybeSingle();

      if (!error && prof?.business_id) {
        localStorage.setItem(CACHE_KEYS.CURRENT_BIZ_ID, prof.business_id);
        return prof.business_id;
      }
      localStorage.setItem(CACHE_KEYS.CURRENT_BIZ_ID, uId);
      return uId;
    }
  } catch (e) {
    // In network disruption, fallback to cached ID
  }
  return localStorage.getItem(CACHE_KEYS.CURRENT_BIZ_ID) || null;
}

// Global consolidated Realtime channel reference
let activeRealtimeChannel: any = null;
let activeRealtimeBizId: string | null = null;

/**
 * Safe Realtime Subscription Manager
 * Connects a single unified WebSocket channel only when authenticated.
 * Gracefully handles errors, timeouts, and WebSocket closures without unhandled rejections.
 * Returns an unsubscribe cleanup function.
 */
export function initSupabaseRealtime(bizId: string): () => void {
  if (!isSupabaseConfigured || !bizId) return () => {};
  if (activeRealtimeChannel && activeRealtimeBizId === bizId) {
    return () => {
      cleanupSupabaseRealtime();
    };
  }

  // Clean up any existing channel
  if (activeRealtimeChannel) {
    try {
      if (typeof activeRealtimeChannel.unsubscribe === 'function') {
        activeRealtimeChannel.unsubscribe();
      }
      supabase.removeChannel(activeRealtimeChannel);
    } catch (e) {
      // Safe cleanup
    }
    activeRealtimeChannel = null;
  }

  activeRealtimeBizId = bizId;

  try {
    const channelName = `realtime:biz:${bizId.slice(0, 8)}`;
    activeRealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchSupabaseProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          fetchSupabaseCategories();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchSupabaseTransactions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          fetchSupabaseCustomers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses' },
        () => {
          fetchSupabaseProfile();
        }
      );

    // Subscribe with status callback to handle errors gracefully
    activeRealtimeChannel.subscribe((status: string, err: any) => {
      if (status === 'SUBSCRIBED') {
        // Realtime stream active
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (err) {
          // Graceful silent fallback to local state/polling without crashing
        }
      }
    });
  } catch (e) {
    // Realtime not supported or blocked in environment - continue with direct queries
  }

  return () => {
    cleanupSupabaseRealtime();
  };
}

export function cleanupSupabaseRealtime(): void {
  if (activeRealtimeChannel) {
    try {
      if (typeof activeRealtimeChannel.unsubscribe === 'function') {
        activeRealtimeChannel.unsubscribe();
      }
      supabase.removeChannel(activeRealtimeChannel);
    } catch (e) {
      // Safe cleanup
    }
    activeRealtimeChannel = null;
    activeRealtimeBizId = null;
  }
}

/**
 * Fetch and synchronize Products from Supabase PostgreSQL
 */
export async function fetchSupabaseProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return getProductsCache();
  try {
    const bizId = await getActiveBusinessId();
    if (!bizId) return getProductsCache();

    let query = supabase.from('products').select('*').order('updated_at', { ascending: false });
    query = query.or(`business_id.eq.${bizId},business_id.is.null`);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        // Table does not exist yet in Supabase DB
        return getProductsCache();
      }
      return getProductsCache();
    }

    if (data) {
      const list: Product[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        sku: d.sku,
        category: d.category || 'General',
        buyPrice: Number(d.buy_price) || 0,
        sellPrice: Number(d.sell_price) || 0,
        stockQuantity: Number(d.stock_quantity) || 0,
        minStockThreshold: Number(d.min_stock_threshold) || 5,
        unit: d.unit || 'pcs',
        barcode: d.barcode || '',
        notes: d.notes || '',
        createdAt: d.created_at || new Date().toISOString(),
        updatedAt: d.updated_at || new Date().toISOString(),
      }));
      setLocalCache(CACHE_KEYS.PRODUCTS, list);
      notifyProducts();
      return list;
    }
  } catch (e) {
    // Fallback to cache
  }
  return getProductsCache();
}

/**
 * Fetch and synchronize Categories from Supabase PostgreSQL
 */
export async function fetchSupabaseCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return getCategoriesCache();
  try {
    const bizId = await getActiveBusinessId();
    if (!bizId) return getCategoriesCache();

    let query = supabase.from('categories').select('*').order('name');
    query = query.or(`business_id.eq.${bizId},business_id.is.null`);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return getCategoriesCache();
      }
      return getCategoriesCache();
    }

    if (data && data.length > 0) {
      const list: Category[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color || '#10b981',
      }));
      setLocalCache(CACHE_KEYS.CATEGORIES, list);
      notifyCategories();
      return list;
    }
  } catch (e) {
    // Fallback
  }
  return getCategoriesCache();
}

/**
 * Fetch and synchronize Transactions from Supabase PostgreSQL
 */
export async function fetchSupabaseTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured) return getTransactionsCache();
  try {
    const bizId = await getActiveBusinessId();
    if (!bizId) return getTransactionsCache();

    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(1000);
    query = query.or(`business_id.eq.${bizId},business_id.is.null`);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return getTransactionsCache();
      }
      return getTransactionsCache();
    }

    if (data) {
      const list: Transaction[] = data.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount) || 0,
        cogs: t.cogs != null ? Number(t.cogs) : undefined,
        grossProfit: t.gross_profit != null ? Number(t.gross_profit) : undefined,
        netProfit: t.net_profit != null ? Number(t.net_profit) : undefined,
        date: t.date || new Date().toISOString(),
        description: t.description || '',
        category: t.category || '',
        paymentMethod: t.payment_method,
        referenceNo: t.reference_no,
        customerName: t.customer_name,
        customerId: t.customer_id,
        items: t.items || [],
        createdAt: t.created_at || new Date().toISOString(),
      }));
      setLocalCache(CACHE_KEYS.TRANSACTIONS, list);
      notifyTransactions();
      return list;
    }
  } catch (e) {
    // Fallback
  }
  return getTransactionsCache();
}

/**
 * Fetch and synchronize Business Profile from Supabase PostgreSQL
 */
export async function fetchSupabaseProfile(): Promise<BusinessProfile> {
  const local = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  if (!isSupabaseConfigured) return local;

  try {
    const bizId = await getActiveBusinessId();
    if (!bizId) return local;

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', bizId)
      .maybeSingle();

    if (error) {
      return local;
    }

    if (data) {
      const prof: BusinessProfile = {
        businessName: data.name || local.businessName || 'BEANNEL',
        ownerName: data.owner_name || local.ownerName || 'Store Owner',
        currencySymbol: data.currency_symbol || local.currencySymbol || '$',
        ownerPin: local.ownerPin || '1234',
        isPinLocked: local.isPinLocked || false,
        biometricEnabled: local.biometricEnabled ?? true,
        taxRate: Number(data.tax_rate) || 0,
        lowStockAlertEnabled: data.low_stock_alert_enabled ?? true,
        allowNegativeStock: data.allow_negative_stock ?? false,
        receiptHeaderMsg: data.receipt_header_msg || 'Thank you for shopping with us!',
      };
      setLocalCache(CACHE_KEYS.PROFILE, prof);
      notifyProfile();
      return prof;
    }
  } catch (e) {
    // Fallback
  }
  return local;
}

/**
 * Fetch and synchronize Customers from Supabase PostgreSQL
 */
export async function fetchSupabaseCustomers(): Promise<Customer[]> {
  if (!isSupabaseConfigured) return getCustomersCache();
  try {
    const bizId = await getActiveBusinessId();
    if (!bizId) return getCustomersCache();

    let query = supabase.from('customers').select('*').order('updated_at', { ascending: false });
    query = query.or(`business_id.eq.${bizId},business_id.is.null`);

    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return getCustomersCache();
      }
      return getCustomersCache();
    }

    if (data) {
      const list: Customer[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        loyaltyPoints: Number(c.loyalty_points) || 0,
        totalSpent: Number(c.total_spent) || 0,
        orderCount: Number(c.order_count) || 0,
        debtBalance: Number(c.debt_balance) || 0,
        tier: c.tier || 'Bronze',
        lastVisit: c.last_visit || 'Just now',
        notes: c.notes || '',
        createdAt: c.created_at || new Date().toISOString(),
        updatedAt: c.updated_at || new Date().toISOString(),
      }));
      setLocalCache(CACHE_KEYS.CUSTOMERS, list);
      notifyCustomers();
      return list;
    }
  } catch (e) {
    // Fallback
  }
  return getCustomersCache();
}

// React Hook Subscriptions
export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  productSubscribers.add(callback);
  callback(getProductsCache());
  return () => {
    productSubscribers.delete(callback);
  };
}

export function subscribeCategories(callback: (categories: Category[]) => void): () => void {
  categorySubscribers.add(callback);
  callback(getCategoriesCache());
  return () => {
    categorySubscribers.delete(callback);
  };
}

export function subscribeTransactions(callback: (transactions: Transaction[]) => void): () => void {
  transactionSubscribers.add(callback);
  callback(getTransactionsCache());
  return () => {
    transactionSubscribers.delete(callback);
  };
}

export function subscribeProfile(callback: (profile: BusinessProfile) => void): () => void {
  profileSubscribers.add(callback);
  callback(getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE));
  return () => {
    profileSubscribers.delete(callback);
  };
}

export function subscribeCustomers(callback: (customers: Customer[]) => void): () => void {
  customerSubscribers.add(callback);
  callback(getCustomersCache());
  return () => {
    customerSubscribers.delete(callback);
  };
}

/**
 * Loads all authoritative data for the active business upon authentication
 */
export async function loadAuthorizedBusinessData(): Promise<() => void> {
  const bizId = await getActiveBusinessId();
  if (!bizId) return () => {};

  // Initialize safe consolidated Realtime stream
  const unsubscribe = initSupabaseRealtime(bizId);

  // Fetch all tables in parallel
  await Promise.allSettled([
    fetchSupabaseProfile(),
    fetchSupabaseCategories(),
    fetchSupabaseProducts(),
    fetchSupabaseTransactions(),
    fetchSupabaseCustomers(),
  ]);

  return unsubscribe;
}

/**
 * Save Product (Add or Edit)
 */
export async function saveProduct(productData: Partial<Product>): Promise<string> {
  const isNew = !productData.id;
  const id = productData.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();

  const product: Product = {
    id,
    name: productData.name?.trim() || 'New Product',
    sku: productData.sku?.trim() || `SKU-${Date.now().toString().slice(-4)}`,
    category: productData.category?.trim() || 'General',
    buyPrice: Number(productData.buyPrice) || 0,
    sellPrice: Number(productData.sellPrice) || 0,
    stockQuantity: Number(productData.stockQuantity) ?? 0,
    minStockThreshold: Number(productData.minStockThreshold) ?? 5,
    unit: productData.unit?.trim() || 'pcs',
    barcode: productData.barcode || '',
    notes: productData.notes || '',
    createdAt: productData.createdAt || now,
    updatedAt: now,
  };

  // Immediate optimistic local update
  const currentProds = getProductsCache();
  const updatedProds = isNew
    ? [product, ...currentProds]
    : currentProds.map((p) => (p.id === id ? product : p));
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProds);
  notifyProducts();

  // Supabase PostgreSQL write
  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      await supabase.from('products').upsert(
        {
          id,
          business_id: bizId,
          name: product.name,
          sku: product.sku,
          category: product.category,
          buy_price: product.buyPrice,
          sell_price: product.sellPrice,
          stock_quantity: product.stockQuantity,
          min_stock_threshold: product.minStockThreshold,
          unit: product.unit,
          barcode: product.barcode,
          notes: product.notes,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Product saved locally (offline):', e);
    }
  }

  return id;
}

/**
 * Delete Product
 */
export async function deleteProduct(productId: string): Promise<void> {
  const currentProds = getProductsCache();
  const updatedProds = currentProds.filter((p) => p.id !== productId);
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProds);
  notifyProducts();

  if (isSupabaseConfigured) {
    try {
      await supabase.from('products').delete().eq('id', productId);
    } catch (e) {
      console.warn('Product delete saved locally:', e);
    }
  }
}

/**
 * Process Sale Transaction (with stock auto-deduction, COGS, gross profit, and CRM update)
 */
export async function recordSale(saleData: {
  items: TransactionItem[];
  customerName?: string;
  paymentMethod: any;
  description?: string;
  discountAmount?: number;
}): Promise<string> {
  const txId = `tx-${Date.now()}`;
  const now = new Date().toISOString();

  let totalSellPrice = 0;
  let totalBuyPrice = 0;

  const productsList = getProductsCache();
  const updatedProducts = [...productsList];

  saleData.items.forEach((item) => {
    totalSellPrice += item.totalSellPrice;
    totalBuyPrice += item.totalBuyPrice;

    const prodIdx = updatedProducts.findIndex((p) => p.id === item.productId);
    if (prodIdx >= 0) {
      const prod = updatedProducts[prodIdx];
      const newStock = Math.max(0, prod.stockQuantity - item.quantity);
      updatedProducts[prodIdx] = {
        ...prod,
        stockQuantity: newStock,
        updatedAt: now,
      };

      if (isSupabaseConfigured) {
        supabase
          .from('products')
          .update({ stock_quantity: newStock, updated_at: now })
          .eq('id', prod.id)
          .then();
      }
    }
  });

  const discount = saleData.discountAmount || 0;
  const netRevenue = Math.max(0, totalSellPrice - discount);
  const grossProfit = netRevenue - totalBuyPrice;

  const transaction: Transaction = {
    id: txId,
    type: 'sale',
    amount: netRevenue,
    cogs: totalBuyPrice,
    grossProfit: grossProfit,
    netProfit: grossProfit,
    date: now,
    description:
      saleData.description ||
      `Sale of ${saleData.items.reduce((s, i) => s + i.quantity, 0)} item(s)`,
    items: saleData.items,
    customerName: saleData.customerName || 'Walk-in Customer',
    paymentMethod: saleData.paymentMethod || 'cash',
    createdAt: now,
  };

  // Update CRM if customer name is provided
  if (
    saleData.customerName &&
    saleData.customerName.trim() &&
    saleData.customerName !== 'Walk-in Customer'
  ) {
    const custNameClean = saleData.customerName.trim();
    const customers = getCustomersCache();
    const matched = customers.find(
      (c) => c.name.toLowerCase() === custNameClean.toLowerCase() || c.id === custNameClean
    );

    if (matched) {
      const addedPoints = Math.floor(netRevenue / 10);
      const newSpent = matched.totalSpent + netRevenue;
      saveCustomer({
        ...matched,
        totalSpent: newSpent,
        orderCount: matched.orderCount + 1,
        loyaltyPoints: matched.loyaltyPoints + addedPoints,
        lastVisit: 'Just now',
      });
    } else {
      saveCustomer({
        name: custNameClean,
        totalSpent: netRevenue,
        orderCount: 1,
        loyaltyPoints: Math.floor(netRevenue / 10),
        lastVisit: 'Just now',
      });
    }
  }

  // Update local state
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProducts);
  const currentTxs = getTransactionsCache();
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);

  notifyProducts();
  notifyTransactions();

  // Supabase PostgreSQL write
  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;

      // 1. Insert into sales table
      await supabase.from('sales').insert({
        id: txId,
        business_id: bizId,
        customer_id: null,
        user_id: currentUserId,
        reference_no: txId,
        sale_date: now,
        subtotal: totalSellPrice,
        discount: discount,
        tax: 0,
        total: netRevenue,
        cogs: totalBuyPrice,
        gross_profit: grossProfit,
        payment_method: saleData.paymentMethod || 'cash',
        payment_status: 'paid',
        customer_name: saleData.customerName || 'Walk-in Customer',
        notes: saleData.description || '',
        created_at: now,
        updated_at: now,
      });

      // 2. Insert into sale_items table
      if (saleData.items.length > 0) {
        const saleItemRows = saleData.items.map((item) => ({
          sale_id: txId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitSellPrice,
          cost_price: item.unitBuyPrice,
          line_total: item.totalSellPrice,
          line_cogs: item.totalBuyPrice,
          created_at: now,
        }));
        await supabase.from('sale_items').insert(saleItemRows);
      }

      // 3. Log stock movements
      for (const item of saleData.items) {
        await supabase.from('stock_movements').insert({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          business_id: bizId,
          product_id: item.productId,
          product_name: item.productName,
          type: 'out',
          quantity: item.quantity,
          cost_per_unit: item.unitBuyPrice,
          reference_id: txId,
          reason: `Sale ${txId}`,
          date: now,
          created_at: now,
        });
      }

      // 4. Insert into unified transactions ledger
      await supabase.from('transactions').insert({
        id: txId,
        business_id: bizId,
        type: 'sale',
        amount: netRevenue,
        cogs: totalBuyPrice,
        gross_profit: grossProfit,
        net_profit: grossProfit,
        date: now,
        description: transaction.description,
        payment_method: transaction.paymentMethod,
        customer_name: transaction.customerName,
        related_sale_id: txId,
        items: transaction.items,
        created_at: now,
      });
    } catch (e) {
      console.warn('Sale saved locally (offline):', e);
    }
  }

  return txId;
}

/**
 * Record Business Operating Expense
 */
export async function recordExpense(expenseData: {
  amount: number;
  category: string;
  description: string;
  paymentMethod?: any;
}): Promise<string> {
  const txId = `tx-${Date.now()}`;
  const now = new Date().toISOString();

  const transaction: Transaction = {
    id: txId,
    type: 'expense',
    amount: Number(expenseData.amount) || 0,
    netProfit: -(Number(expenseData.amount) || 0),
    date: now,
    description: expenseData.description || 'Business Expense',
    category: expenseData.category || 'General Expense',
    paymentMethod: expenseData.paymentMethod || 'cash',
    createdAt: now,
  };

  const currentTxs = getTransactionsCache();
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);
  notifyTransactions();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;

      // 1. Insert into expenses table
      await supabase.from('expenses').insert({
        id: txId,
        business_id: bizId,
        user_id: currentUserId,
        category: transaction.category || 'General Expense',
        amount: transaction.amount,
        description: transaction.description,
        payment_method: transaction.paymentMethod || 'cash',
        date: now,
        reference_no: txId,
        created_at: now,
        updated_at: now,
      });

      // 2. Insert into transactions table
      await supabase.from('transactions').insert({
        id: txId,
        business_id: bizId,
        type: 'expense',
        amount: transaction.amount,
        net_profit: transaction.netProfit,
        date: now,
        description: transaction.description,
        category: transaction.category,
        payment_method: transaction.paymentMethod,
        related_expense_id: txId,
        created_at: now,
      });
    } catch (e) {
      console.warn('Expense saved offline:', e);
    }
  }

  return txId;
}

/**
 * Record Owner Capital Contribution
 * Accounting: Cash +amount, Owner Capital +amount. Inventory & COGS are NOT affected.
 */
export async function recordCapital(capitalData: {
  amount: number;
  description: string;
  paymentMethod?: any;
}): Promise<string> {
  const txId = `tx-${Date.now()}`;
  const now = new Date().toISOString();

  const transaction: Transaction = {
    id: txId,
    type: 'capital',
    amount: Number(capitalData.amount) || 0,
    date: now,
    description: capitalData.description || 'Capital Injection',
    paymentMethod: capitalData.paymentMethod || 'transfer',
    createdAt: now,
  };

  const currentTxs = getTransactionsCache();
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);
  notifyTransactions();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;

      // 1. Insert into owner_capital table
      await supabase.from('owner_capital').insert({
        id: txId,
        business_id: bizId,
        user_id: currentUserId,
        type: 'contribution',
        amount: transaction.amount,
        description: transaction.description,
        date: now,
        payment_method: transaction.paymentMethod || 'transfer',
        created_at: now,
      });

      // 2. Insert into transactions table
      await supabase.from('transactions').insert({
        id: txId,
        business_id: bizId,
        type: 'capital',
        amount: transaction.amount,
        date: now,
        description: transaction.description,
        payment_method: transaction.paymentMethod,
        created_at: now,
      });
    } catch (e) {
      console.warn('Capital transaction saved offline:', e);
    }
  }

  return txId;
}

/**
 * Record Stock Refill / Inventory Purchase
 * Accounting: Inventory +amount, Cash -amount. Owner Capital is unchanged.
 */
export async function recordStockRefill(refillData: {
  productId: string;
  quantityToAdd: number;
  costPerUnit?: number;
  reason?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const products = getProductsCache();
  const idx = products.findIndex((p) => p.id === refillData.productId);

  if (idx >= 0) {
    const prod = products[idx];
    const newQty = prod.stockQuantity + refillData.quantityToAdd;
    const newBuyPrice = refillData.costPerUnit || prod.buyPrice;

    products[idx] = {
      ...prod,
      stockQuantity: newQty,
      buyPrice: newBuyPrice,
      updatedAt: now,
    };

    setLocalCache(CACHE_KEYS.PRODUCTS, products);

    const txId = `tx-${Date.now()}`;
    const totalRefillCost = refillData.quantityToAdd * newBuyPrice;
    const tx: Transaction = {
      id: txId,
      type: 'stock_refill',
      amount: totalRefillCost,
      date: now,
      description: `Stock Refill: +${refillData.quantityToAdd} ${prod.unit} of ${prod.name}`,
      createdAt: now,
    };

    const txs = getTransactionsCache();
    setLocalCache(CACHE_KEYS.TRANSACTIONS, [tx, ...txs]);

    notifyProducts();
    notifyTransactions();

    if (isSupabaseConfigured) {
      try {
        const bizId = await getActiveBusinessId();
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData?.session?.user?.id || null;

        // 1. Update product stock and cost price
        await supabase
          .from('products')
          .update({
            stock_quantity: newQty,
            buy_price: newBuyPrice,
            updated_at: now,
          })
          .eq('id', prod.id);

        // 2. Insert into purchases table
        await supabase.from('purchases').insert({
          id: txId,
          business_id: bizId,
          user_id: currentUserId,
          reference_no: txId,
          purchase_date: now,
          subtotal: totalRefillCost,
          tax: 0,
          total: totalRefillCost,
          payment_status: 'paid',
          payment_method: 'cash',
          notes: refillData.reason || `Stock Refill for ${prod.name}`,
          created_at: now,
          updated_at: now,
        });

        // 3. Insert into purchase_items table
        await supabase.from('purchase_items').insert({
          purchase_id: txId,
          product_id: prod.id,
          product_name: prod.name,
          quantity: refillData.quantityToAdd,
          unit_cost: newBuyPrice,
          line_total: totalRefillCost,
          created_at: now,
        });

        // 4. Insert into transactions table
        await supabase.from('transactions').insert({
          id: txId,
          business_id: bizId,
          type: 'stock_refill',
          amount: tx.amount,
          date: now,
          description: tx.description,
          related_purchase_id: txId,
          created_at: now,
        });

        // 5. Insert into stock movements audit log
        await supabase.from('stock_movements').insert({
          id: `mov-${Date.now()}`,
          business_id: bizId,
          product_id: prod.id,
          product_name: prod.name,
          type: 'in',
          quantity: refillData.quantityToAdd,
          cost_per_unit: newBuyPrice,
          reason: refillData.reason || 'Stock Refill',
          reference_id: txId,
          date: now,
          created_at: now,
        });
      } catch (e) {
        console.warn('Stock refill saved offline:', e);
      }
    }
  }
}

/**
 * Save Business Profile
 */
export async function saveBusinessProfile(profile: Partial<BusinessProfile>): Promise<void> {
  const current = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  const updated = { ...current, ...profile };
  setLocalCache(CACHE_KEYS.PROFILE, updated);
  notifyProfile();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      if (bizId) {
        await supabase.from('businesses').upsert(
          {
            id: bizId,
            name: updated.businessName,
            owner_name: updated.ownerName,
            currency_symbol: updated.currencySymbol,
            tax_rate: updated.taxRate,
            low_stock_alert_enabled: updated.lowStockAlertEnabled,
            allow_negative_stock: updated.allowNegativeStock,
            receipt_header_msg: updated.receiptHeaderMsg,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    } catch (e) {
      console.warn('Profile updated offline:', e);
    }
  }
}

/**
 * Save Category
 */
export async function saveCategory(category: Category): Promise<void> {
  const current = getCategoriesCache();
  const exists = current.some((c) => c.id === category.id);
  const updated = exists
    ? current.map((c) => (c.id === category.id ? category : c))
    : [...current, category];

  setLocalCache(CACHE_KEYS.CATEGORIES, updated);
  notifyCategories();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      await supabase.from('categories').upsert(
        {
          id: category.id,
          business_id: bizId,
          name: category.name,
          color: category.color || '#10b981',
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Category saved offline:', e);
    }
  }
}

/**
 * Delete Transaction
 */
export async function deleteTransaction(txId: string): Promise<void> {
  const current = getTransactionsCache();
  const updated = current.filter((t) => t.id !== txId);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, updated);
  notifyTransactions();

  if (isSupabaseConfigured) {
    try {
      await supabase.from('transactions').delete().eq('id', txId);
    } catch (e) {
      console.warn('Transaction deleted offline:', e);
    }
  }
}

/**
 * Add or Edit Customer
 */
export async function saveCustomer(customerData: Partial<Customer>): Promise<string> {
  const id = customerData.id || `cust-${Date.now()}`;
  const totalSpent = customerData.totalSpent ?? 0;

  let tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP' = customerData.tier || 'Bronze';
  if (totalSpent >= 3000) tier = 'VIP';
  else if (totalSpent >= 1000) tier = 'Gold';
  else if (totalSpent >= 300) tier = 'Silver';

  const customer: Customer = {
    id,
    name: customerData.name?.trim() || 'New Customer',
    phone: customerData.phone?.trim() || '',
    email: customerData.email?.trim() || '',
    loyaltyPoints: customerData.loyaltyPoints ?? Math.floor(totalSpent / 10),
    totalSpent,
    orderCount: customerData.orderCount ?? 0,
    debtBalance: customerData.debtBalance ?? 0,
    tier,
    lastVisit: customerData.lastVisit || 'Just now',
    notes: customerData.notes || '',
    createdAt: customerData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = getCustomersCache();
  const index = current.findIndex((c) => c.id === id);
  let updatedList: Customer[];

  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = customer;
  } else {
    updatedList = [customer, ...current];
  }

  setLocalCache(CACHE_KEYS.CUSTOMERS, updatedList);
  notifyCustomers();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      await supabase.from('customers').upsert(
        {
          id,
          business_id: bizId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          loyalty_points: customer.loyaltyPoints,
          total_spent: customer.totalSpent,
          order_count: customer.orderCount,
          debt_balance: customer.debtBalance,
          tier: customer.tier,
          last_visit: customer.lastVisit,
          notes: customer.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Saved customer offline:', e);
    }
  }

  return id;
}

/**
 * Delete Customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const current = getCustomersCache();
  const updated = current.filter((c) => c.id !== customerId);
  setLocalCache(CACHE_KEYS.CUSTOMERS, updated);
  notifyCustomers();

  if (isSupabaseConfigured) {
    try {
      await supabase.from('customers').delete().eq('id', customerId);
    } catch (e) {
      console.warn('Deleted customer offline:', e);
    }
  }
}

/**
 * Settle Customer Debt
 */
export async function settleCustomerDebt(customerId: string): Promise<void> {
  const current = getCustomersCache();
  const index = current.findIndex((c) => c.id === customerId);
  if (index >= 0) {
    const updated = [...current];
    updated[index] = { ...updated[index], debtBalance: 0 };
    setLocalCache(CACHE_KEYS.CUSTOMERS, updated);
    notifyCustomers();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('customers')
          .update({ debt_balance: 0, updated_at: new Date().toISOString() })
          .eq('id', customerId);
      } catch (e) {
        console.warn('Settled debt offline:', e);
      }
    }
  }
}

/**
 * Clear all business records and start completely fresh
 */
export async function clearAllBusinessData(): Promise<void> {
  setLocalCache(CACHE_KEYS.PRODUCTS, []);
  setLocalCache(CACHE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, []);
  setLocalCache(CACHE_KEYS.CUSTOMERS, []);
  setLocalCache(CACHE_KEYS.MOVEMENTS, []);
  setLocalCache(CACHE_KEYS.OFFLINE_QUEUE, []);

  const cleanProfile: BusinessProfile = {
    ...INITIAL_BUSINESS_PROFILE,
    businessName: 'BEANNEL',
    ownerName: 'Store Owner',
  };
  setLocalCache(CACHE_KEYS.PROFILE, cleanProfile);

  notifyProducts();
  notifyCategories();
  notifyTransactions();
  notifyCustomers();
  notifyProfile();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();
      if (bizId) {
        await supabase.from('products').delete().eq('business_id', bizId);
        await supabase.from('transactions').delete().eq('business_id', bizId);
        await supabase.from('customers').delete().eq('business_id', bizId);
        await supabase.from('categories').delete().eq('business_id', bizId);
      }
    } catch (e) {
      console.warn('Error clearing Supabase business records:', e);
    }
  }
}

/**
 * Reset database to initial sample demo data (explicit user action only)
 */
export async function resetDatabaseToDemo(): Promise<void> {
  setLocalCache(CACHE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  setLocalCache(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  setLocalCache(CACHE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  setLocalCache(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);

  notifyProducts();
  notifyCategories();
  notifyTransactions();
  notifyCustomers();
  notifyProfile();

  if (isSupabaseConfigured) {
    try {
      const bizId = await getActiveBusinessId();

      const catRows = INITIAL_CATEGORIES.map((c) => ({
        id: c.id,
        business_id: bizId,
        name: c.name,
        color: c.color,
      }));
      await supabase.from('categories').upsert(catRows, { onConflict: 'id' });

      const prodRows = INITIAL_PRODUCTS.map((p) => ({
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
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));
      await supabase.from('products').upsert(prodRows, { onConflict: 'id' });

      const custRows = INITIAL_CUSTOMERS.map((c) => ({
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
      }));
      await supabase.from('customers').upsert(custRows, { onConflict: 'id' });

      const txRows = INITIAL_TRANSACTIONS.map((t) => ({
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
    } catch (e) {
      console.warn('Demo data sync note:', e);
    }
  }
}

/**
 * Migration Utility: Safely synchronize local records into Supabase PostgreSQL
 */
export async function migrateLocalDataToSupabase(): Promise<{
  success: boolean;
  counts: { products: number; transactions: number; customers: number; categories: number };
  message: string;
}> {
  const products = getProductsCache();
  const transactions = getTransactionsCache();
  const customers = getCustomersCache();
  const categories = getCategoriesCache();

  try {
    const bizId = await getActiveBusinessId();

    if (categories.length > 0) {
      const catRows = categories.map((c) => ({
        id: c.id,
        business_id: bizId,
        name: c.name,
        color: c.color,
      }));
      const { error: catErr } = await supabase.from('categories').upsert(catRows, { onConflict: 'id' });
      if (catErr) throw catErr;
    }

    if (products.length > 0) {
      const prodRows = products.map((p) => ({
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
      const { error: prodErr } = await supabase.from('products').upsert(prodRows, { onConflict: 'id' });
      if (prodErr) throw prodErr;
    }

    if (customers.length > 0) {
      const custRows = customers.map((c) => ({
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
      const { error: custErr } = await supabase.from('customers').upsert(custRows, { onConflict: 'id' });
      if (custErr) throw custErr;
    }

    if (transactions.length > 0) {
      const txRows = transactions.map((t) => ({
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
      const { error: txErr } = await supabase.from('transactions').upsert(txRows, { onConflict: 'id' });
      if (txErr) throw txErr;
    }

    return {
      success: true,
      counts: {
        products: products.length,
        transactions: transactions.length,
        customers: customers.length,
        categories: categories.length,
      },
      message: `Successfully synchronized ${products.length} products, ${transactions.length} transactions, and ${customers.length} customers to Supabase!`,
    };
  } catch (err: any) {
    console.error('Migration error:', err);
    return {
      success: false,
      counts: { products: 0, transactions: 0, customers: 0, categories: 0 },
      message: err.message || 'Migration to Supabase encountered an error.',
    };
  }
}
