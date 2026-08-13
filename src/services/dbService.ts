import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
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

// Storage keys for local offline cache
const CACHE_KEYS = {
  PRODUCTS: 'app_products_v1',
  CATEGORIES: 'app_categories_v1',
  TRANSACTIONS: 'app_transactions_v1',
  CUSTOMERS: 'app_customers_v1',
  PROFILE: 'app_profile_v1',
  MOVEMENTS: 'app_movements_v1',
  OFFLINE_QUEUE: 'app_offline_queue_v1',
};

// Subscriber sets for real-time local + online reactivity
const productSubscribers = new Set<(products: Product[]) => void>();
const categorySubscribers = new Set<(categories: Category[]) => void>();
const transactionSubscribers = new Set<(transactions: Transaction[]) => void>();
const customerSubscribers = new Set<(customers: Customer[]) => void>();
const profileSubscribers = new Set<(profile: BusinessProfile) => void>();

// Helper for local storage read
function getLocalCache<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// Helper for local storage write
function setLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

function getProductsCache(): Product[] {
  const hasInit = localStorage.getItem('app_has_initialized_v1');
  return getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, hasInit ? [] : INITIAL_PRODUCTS);
}

function getTransactionsCache(): Transaction[] {
  const hasInit = localStorage.getItem('app_has_initialized_v1');
  return getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, hasInit ? [] : INITIAL_TRANSACTIONS);
}

export function getCustomersCache(): Customer[] {
  const hasInit = localStorage.getItem('app_has_initialized_v1');
  return getLocalCache<Customer[]>(CACHE_KEYS.CUSTOMERS, hasInit ? [] : INITIAL_CUSTOMERS);
}

export function notifyProducts(): void {
  const current = getProductsCache();
  productSubscribers.forEach((cb) => cb(current));
}

export function notifyCategories(): void {
  const current = getLocalCache<Category[]>(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
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

async function clearFirestoreCollection(collectionName: string): Promise<void> {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, collectionName));
    if (snap.empty) return;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 400);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (e) {
    console.warn(`Error clearing Firestore collection ${collectionName}:`, e);
  }
}

// Subscribe to Products
export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  productSubscribers.add(callback);
  const local = getProductsCache();
  callback(local);

  let unsubFirestore = () => {};
  if (db) {
    try {
      const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Product[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Product, 'id'>),
            }));
            setLocalCache(CACHE_KEYS.PRODUCTS, list);
            notifyProducts();
          } else {
            const hasInit = localStorage.getItem('app_has_initialized_v1');
            if (!hasInit) {
              seedInitialData().then(() => {
                notifyProducts();
              });
            } else {
              setLocalCache(CACHE_KEYS.PRODUCTS, []);
              notifyProducts();
            }
          }
        },
        (err) => {
          console.warn('Firestore snapshot error for products (using local store):', err);
        }
      );
    } catch (e) {
      console.warn('Firestore subscription failed, running local mode');
    }
  }

  return () => {
    productSubscribers.delete(callback);
    unsubFirestore();
  };
}

// Subscribe to Categories
export function subscribeCategories(callback: (categories: Category[]) => void): () => void {
  categorySubscribers.add(callback);
  const local = getLocalCache<Category[]>(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  callback(local);

  let unsubFirestore = () => {};
  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'categories'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Category[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Category, 'id'>),
            }));
            setLocalCache(CACHE_KEYS.CATEGORIES, list);
            notifyCategories();
          } else {
            setLocalCache(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
            notifyCategories();
          }
        },
        (err) => {
          console.warn('Firestore categories error:', err);
        }
      );
    } catch (e) {
      console.warn('Firestore categories subscription failed');
    }
  }

  return () => {
    categorySubscribers.delete(callback);
    unsubFirestore();
  };
}

// Subscribe to Transactions
export function subscribeTransactions(callback: (transactions: Transaction[]) => void): () => void {
  transactionSubscribers.add(callback);
  const local = getTransactionsCache();
  callback(local);

  let unsubFirestore = () => {};
  if (db) {
    try {
      const q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
      unsubFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Transaction[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<Transaction, 'id'>),
            }));
            setLocalCache(CACHE_KEYS.TRANSACTIONS, list);
            notifyTransactions();
          } else {
            setLocalCache(CACHE_KEYS.TRANSACTIONS, []);
            notifyTransactions();
          }
        },
        (err) => {
          console.warn('Firestore transactions error:', err);
        }
      );
    } catch (e) {
      console.warn('Firestore transactions subscription failed');
    }
  }

  return () => {
    transactionSubscribers.delete(callback);
    unsubFirestore();
  };
}

// Subscribe to Business Profile
export function subscribeProfile(callback: (profile: BusinessProfile) => void): () => void {
  profileSubscribers.add(callback);
  const local = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  callback(local);

  let unsubFirestore = () => {};
  if (db) {
    try {
      const docRef = doc(db, 'profile', 'business_info');
      unsubFirestore = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as BusinessProfile;
            setLocalCache(CACHE_KEYS.PROFILE, data);
            notifyProfile();
          } else {
            setDoc(docRef, INITIAL_BUSINESS_PROFILE);
          }
        },
        (err) => {
          console.warn('Firestore profile error:', err);
        }
      );
    } catch (e) {
      console.warn('Firestore profile subscription failed');
    }
  }

  return () => {
    profileSubscribers.delete(callback);
    unsubFirestore();
  };
}

// Subscribe to Customers
export function subscribeCustomers(callback: (customers: Customer[]) => void): () => void {
  customerSubscribers.add(callback);
  const local = getCustomersCache();
  callback(local);

  let unsubFirestore = () => {};

  if (db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'customers'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Customer[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data() as Customer;
              return { ...data, id: docSnap.id };
            });
            setLocalCache(CACHE_KEYS.CUSTOMERS, list);
            notifyCustomers();
          } else {
            const hasInit = localStorage.getItem('app_has_initialized_v1');
            if (hasInit) {
              setLocalCache(CACHE_KEYS.CUSTOMERS, []);
              notifyCustomers();
            } else {
              setLocalCache(CACHE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
              notifyCustomers();
            }
          }
        },
        (err) => {
          console.warn('Firestore customers error, using local cache:', err);
        }
      );
    } catch (e) {
      console.warn('Firestore customers subscription failed');
    }
  }

  return () => {
    customerSubscribers.delete(callback);
    unsubFirestore();
  };
}

// Seed initial database
export async function seedInitialData(force = false): Promise<void> {
  localStorage.setItem('app_has_initialized_v1', 'true');
  if (!db) {
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
    return;
  }

  try {
    if (!force) {
      const pSnap = await getDocs(collection(db, 'products'));
      if (!pSnap.empty) return;
    } else {
      await clearFirestoreCollection('products');
      await clearFirestoreCollection('transactions');
      await clearFirestoreCollection('categories');
      await clearFirestoreCollection('customers');
    }

    const batch = writeBatch(db);

    // Products
    INITIAL_PRODUCTS.forEach((p) => {
      const pRef = doc(db, 'products', p.id);
      batch.set(pRef, p);
    });

    // Categories
    INITIAL_CATEGORIES.forEach((c) => {
      const cRef = doc(db, 'categories', c.id);
      batch.set(cRef, c);
    });

    // Transactions
    INITIAL_TRANSACTIONS.forEach((t) => {
      const tRef = doc(db, 'transactions', t.id);
      batch.set(tRef, t);
    });

    // Customers
    INITIAL_CUSTOMERS.forEach((cust) => {
      const custRef = doc(db, 'customers', cust.id);
      batch.set(custRef, cust);
    });

    // Profile
    const profRef = doc(db, 'profile', 'business_info');
    batch.set(profRef, INITIAL_BUSINESS_PROFILE);

    await batch.commit();

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
  } catch (e) {
    console.error('Error seeding database:', e);
    // Ensure offline local cache is set regardless
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
  }
}

// Add or Edit Product
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

  // Update local cache first (instant UI responsiveness)
  const currentProds = getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, []);
  const updatedProds = isNew
    ? [product, ...currentProds]
    : currentProds.map((p) => (p.id === id ? product : p));
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProds);
  notifyProducts(); // Instant UI sync across subscribers

  // Firestore write
  if (db) {
    try {
      await setDoc(doc(db, 'products', id), product, { merge: true });
    } catch (e) {
      console.warn('Firestore product write saved locally (offline):', e);
    }
  }

  return id;
}

// Delete Product
export async function deleteProduct(productId: string): Promise<void> {
  const currentProds = getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, []);
  const updatedProds = currentProds.filter((p) => p.id !== productId);
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProds);
  notifyProducts(); // Instant UI sync across subscribers

  if (db) {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (e) {
      console.warn('Firestore product delete queued offline:', e);
    }
  }
}

// Process Sale Transaction (with stock auto-deduction)
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

  const productsList = getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, []);
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

      // Also attempt async Firestore update for product stock if configured
      if (db) {
        setDoc(
          doc(db, 'products', prod.id),
          { stockQuantity: newStock, updatedAt: now },
          { merge: true }
        ).catch(() => {});
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

  // If customer name was provided, update or create CRM record
  if (saleData.customerName && saleData.customerName.trim() && saleData.customerName !== 'Walk-in Customer') {
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

  // Update local caches
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProducts);
  const currentTxs = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);

  notifyProducts(); // Instant UI sync across subscribers
  notifyTransactions(); // Instant UI sync across subscribers

  // Firestore write
  if (db) {
    try {
      await setDoc(doc(db, 'transactions', txId), transaction);
    } catch (e) {
      console.warn('Sale saved offline:', e);
    }
  }

  return txId;
}

// Record Expense
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

  const currentTxs = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);
  notifyTransactions(); // Instant UI sync across subscribers

  if (db) {
    try {
      await setDoc(doc(db, 'transactions', txId), transaction);
    } catch (e) {
      console.warn('Expense saved offline:', e);
    }
  }

  return txId;
}

// Record Capital Injection
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

  const currentTxs = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);
  notifyTransactions(); // Instant UI sync across subscribers

  if (db) {
    try {
      await setDoc(doc(db, 'transactions', txId), transaction);
    } catch (e) {
      console.warn('Capital transaction saved offline:', e);
    }
  }

  return txId;
}

// Refill / Adjust Product Stock
export async function recordStockRefill(refillData: {
  productId: string;
  quantityToAdd: number;
  costPerUnit?: number;
  reason?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const products = getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, []);
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

    // Record Stock Movement / Transaction
    const txId = `tx-${Date.now()}`;
    const tx: Transaction = {
      id: txId,
      type: 'stock_refill',
      amount: refillData.quantityToAdd * newBuyPrice,
      date: now,
      description: `Stock Refill: +${refillData.quantityToAdd} ${prod.unit} of ${prod.name}`,
      createdAt: now,
    };

    const txs = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
    setLocalCache(CACHE_KEYS.TRANSACTIONS, [tx, ...txs]);

    notifyProducts(); // Instant UI sync across subscribers
    notifyTransactions(); // Instant UI sync across subscribers

    if (db) {
      try {
        await setDoc(doc(db, 'products', prod.id), products[idx], { merge: true });
        await setDoc(doc(db, 'transactions', txId), tx);
      } catch (e) {
        console.warn('Stock refill saved offline:', e);
      }
    }
  }
}

// Save Business Profile
export async function saveBusinessProfile(profile: Partial<BusinessProfile>): Promise<void> {
  const current = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  const updated = { ...current, ...profile };
  setLocalCache(CACHE_KEYS.PROFILE, updated);
  notifyProfile(); // Instant UI sync across subscribers

  if (db) {
    try {
      await setDoc(doc(db, 'profile', 'business_info'), updated, { merge: true });
    } catch (e) {
      console.warn('Profile updated offline:', e);
    }
  }
}

// Save Category
export async function saveCategory(category: Category): Promise<void> {
  const current = getLocalCache<Category[]>(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  const exists = current.some((c) => c.id === category.id);
  const updated = exists
    ? current.map((c) => (c.id === category.id ? category : c))
    : [...current, category];

  setLocalCache(CACHE_KEYS.CATEGORIES, updated);
  notifyCategories(); // Instant UI sync across subscribers

  if (db) {
    try {
      await setDoc(doc(db, 'categories', category.id), category, { merge: true });
    } catch (e) {
      console.warn('Category saved offline:', e);
    }
  }
}

// Delete Transaction
export async function deleteTransaction(txId: string): Promise<void> {
  const current = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
  const updated = current.filter((t) => t.id !== txId);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, updated);
  notifyTransactions(); // Instant UI sync across subscribers

  if (db) {
    try {
      await deleteDoc(doc(db, 'transactions', txId));
    } catch (e) {
      console.warn('Transaction deleted offline:', e);
    }
  }
}

// Add or Edit Customer
export async function saveCustomer(customerData: Partial<Customer>): Promise<string> {
  const id = customerData.id || `cust-${Date.now()}`;
  const totalSpent = customerData.totalSpent ?? 0;

  let tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP' = customerData.tier || 'Bronze';
  if (totalSpent >= 3000) tier = 'VIP';
  else if (totalSpent >= 1000) tier = 'Gold';
  else if (totalSpent >= 300) tier = 'Silver';

  const customer: Customer = {
    id,
    name: customerData.name || 'New Customer',
    phone: customerData.phone || '',
    email: customerData.email || '',
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

  if (db) {
    try {
      await setDoc(doc(db, 'customers', id), customer);
    } catch (e) {
      console.warn('Saved customer offline:', e);
    }
  }

  return id;
}

// Delete Customer
export async function deleteCustomer(customerId: string): Promise<void> {
  const current = getCustomersCache();
  const updated = current.filter((c) => c.id !== customerId);
  setLocalCache(CACHE_KEYS.CUSTOMERS, updated);
  notifyCustomers();

  if (db) {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (e) {
      console.warn('Deleted customer offline:', e);
    }
  }
}

// Settle Customer Debt
export async function settleCustomerDebt(customerId: string): Promise<void> {
  const current = getCustomersCache();
  const index = current.findIndex((c) => c.id === customerId);
  if (index >= 0) {
    const updated = [...current];
    updated[index] = { ...updated[index], debtBalance: 0 };
    setLocalCache(CACHE_KEYS.CUSTOMERS, updated);
    notifyCustomers();

    if (db) {
      try {
        await updateDoc(doc(db, 'customers', customerId), { debtBalance: 0 });
      } catch (e) {
        console.warn('Settled debt offline:', e);
      }
    }
  }
}

// Clear all business records and start completely fresh
export async function clearAllBusinessData(): Promise<void> {
  localStorage.setItem('app_has_initialized_v1', 'true');

  setLocalCache(CACHE_KEYS.PRODUCTS, []);
  setLocalCache(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, []);
  setLocalCache(CACHE_KEYS.CUSTOMERS, []);
  setLocalCache(CACHE_KEYS.MOVEMENTS, []);
  setLocalCache(CACHE_KEYS.OFFLINE_QUEUE, []);
  
  const cleanProfile = {
    ...INITIAL_BUSINESS_PROFILE,
    businessName: 'My Retail Store',
    ownerName: 'Store Owner',
  };
  setLocalCache(CACHE_KEYS.PROFILE, cleanProfile);

  notifyProducts();
  notifyCategories();
  notifyTransactions();
  notifyCustomers();
  notifyProfile();

  if (db) {
    try {
      await clearFirestoreCollection('products');
      await clearFirestoreCollection('transactions');
      await clearFirestoreCollection('customers');
      await clearFirestoreCollection('movements');
      await clearFirestoreCollection('categories');

      const batch = writeBatch(db);
      INITIAL_CATEGORIES.forEach((c) => {
        batch.set(doc(db, 'categories', c.id), c);
      });
      batch.set(doc(db, 'profile', 'business_info'), cleanProfile);
      await batch.commit();
    } catch (e) {
      console.warn('Error clearing Firestore collections:', e);
    }
  }
}

// Reset database to initial sample data
export async function resetDatabaseToDemo(): Promise<void> {
  localStorage.setItem('app_has_initialized_v1', 'true');

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

  await seedInitialData(true);
}
