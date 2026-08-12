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
  StockMovement,
  FinancialSummary,
  TransactionItem,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_BUSINESS_PROFILE,
} from '../data/seedData';

// Storage keys for local offline cache
const CACHE_KEYS = {
  PRODUCTS: 'app_products_v1',
  CATEGORIES: 'app_categories_v1',
  TRANSACTIONS: 'app_transactions_v1',
  PROFILE: 'app_profile_v1',
  MOVEMENTS: 'app_movements_v1',
  OFFLINE_QUEUE: 'app_offline_queue_v1',
};

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

// Subscribe to Products
export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  // Return local cache immediately
  const local = getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  callback(local);

  try {
    const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Product, 'id'>),
          }));
          setLocalCache(CACHE_KEYS.PRODUCTS, list);
          callback(list);
        } else {
          // If Firestore is empty, seed initial products
          seedInitialData().then(() => {
            callback(INITIAL_PRODUCTS);
          });
        }
      },
      (err) => {
        console.warn('Firestore snapshot error for products (using cache):', err);
      }
    );
  } catch (e) {
    console.warn('Firestore subscription failed, running offline mode');
    return () => {};
  }
}

// Subscribe to Categories
export function subscribeCategories(callback: (categories: Category[]) => void): () => void {
  const local = getLocalCache<Category[]>(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  callback(local);

  try {
    return onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Category[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Category, 'id'>),
          }));
          setLocalCache(CACHE_KEYS.CATEGORIES, list);
          callback(list);
        }
      },
      (err) => {
        console.warn('Firestore categories error:', err);
      }
    );
  } catch (e) {
    return () => {};
  }
}

// Subscribe to Transactions
export function subscribeTransactions(callback: (transactions: Transaction[]) => void): () => void {
  const local = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  callback(local);

  try {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Transaction[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Transaction, 'id'>),
          }));
          setLocalCache(CACHE_KEYS.TRANSACTIONS, list);
          callback(list);
        }
      },
      (err) => {
        console.warn('Firestore transactions error:', err);
      }
    );
  } catch (e) {
    return () => {};
  }
}

// Subscribe to Business Profile
export function subscribeProfile(callback: (profile: BusinessProfile) => void): () => void {
  const local = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  callback(local);

  try {
    const docRef = doc(db, 'profile', 'business_info');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as BusinessProfile;
          setLocalCache(CACHE_KEYS.PROFILE, data);
          callback(data);
        } else {
          setDoc(docRef, INITIAL_BUSINESS_PROFILE);
        }
      },
      (err) => {
        console.warn('Firestore profile error:', err);
      }
    );
  } catch (e) {
    return () => {};
  }
}

// Seed initial database
export async function seedInitialData(force = false): Promise<void> {
  try {
    const pSnap = await getDocs(collection(db, 'products'));
    if (!pSnap.empty && !force) return;

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

    // Profile
    const profRef = doc(db, 'profile', 'business_info');
    batch.set(profRef, INITIAL_BUSINESS_PROFILE);

    await batch.commit();

    setLocalCache(CACHE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setLocalCache(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    setLocalCache(CACHE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    setLocalCache(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  } catch (e) {
    console.error('Error seeding database:', e);
    // Ensure offline local cache is set regardless
    setLocalCache(CACHE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setLocalCache(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    setLocalCache(CACHE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    setLocalCache(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  }
}

// Add or Edit Product
export async function saveProduct(productData: Partial<Product>): Promise<string> {
  const isNew = !productData.id;
  const id = productData.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();

  const product: Product = {
    id,
    name: productData.name || 'New Product',
    sku: productData.sku || `SKU-${Date.now().toString().slice(-4)}`,
    category: productData.category || 'General',
    buyPrice: Number(productData.buyPrice) || 0,
    sellPrice: Number(productData.sellPrice) || 0,
    stockQuantity: Number(productData.stockQuantity) || 0,
    minStockThreshold: Number(productData.minStockThreshold) || 5,
    unit: productData.unit || 'pcs',
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

  // Firestore write
  try {
    await setDoc(doc(db, 'products', id), product, { merge: true });
  } catch (e) {
    console.warn('Firestore product write saved locally (offline):', e);
  }

  return id;
}

// Delete Product
export async function deleteProduct(productId: string): Promise<void> {
  const currentProds = getLocalCache<Product[]>(CACHE_KEYS.PRODUCTS, []);
  const updatedProds = currentProds.filter((p) => p.id !== productId);
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProds);

  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (e) {
    console.warn('Firestore product delete queued offline:', e);
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
  const productMap = new Map(productsList.map((p) => [p.id, p]));

  // Verify and update product stocks
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

      // Also attempt async Firestore update for product stock
      setDoc(
        doc(db, 'products', prod.id),
        { stockQuantity: newStock, updatedAt: now },
        { merge: true }
      ).catch(() => {});
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

  // Update local caches
  setLocalCache(CACHE_KEYS.PRODUCTS, updatedProducts);
  const currentTxs = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, [transaction, ...currentTxs]);

  // Firestore write
  try {
    await setDoc(doc(db, 'transactions', txId), transaction);
  } catch (e) {
    console.warn('Sale saved offline:', e);
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

  try {
    await setDoc(doc(db, 'transactions', txId), transaction);
  } catch (e) {
    console.warn('Expense saved offline:', e);
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

  try {
    await setDoc(doc(db, 'transactions', txId), transaction);
  } catch (e) {
    console.warn('Capital transaction saved offline:', e);
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

    try {
      await setDoc(doc(db, 'products', prod.id), products[idx], { merge: true });
      await setDoc(doc(db, 'transactions', txId), tx);
    } catch (e) {
      console.warn('Stock refill saved offline:', e);
    }
  }
}

// Save Business Profile
export async function saveBusinessProfile(profile: Partial<BusinessProfile>): Promise<void> {
  const current = getLocalCache<BusinessProfile>(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);
  const updated = { ...current, ...profile };
  setLocalCache(CACHE_KEYS.PROFILE, updated);

  try {
    await setDoc(doc(db, 'profile', 'business_info'), updated, { merge: true });
  } catch (e) {
    console.warn('Profile updated offline:', e);
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

  try {
    await setDoc(doc(db, 'categories', category.id), category, { merge: true });
  } catch (e) {
    console.warn('Category saved offline:', e);
  }
}

// Delete Transaction
export async function deleteTransaction(txId: string): Promise<void> {
  const current = getLocalCache<Transaction[]>(CACHE_KEYS.TRANSACTIONS, []);
  const updated = current.filter((t) => t.id !== txId);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, updated);

  try {
    await deleteDoc(doc(db, 'transactions', txId));
  } catch (e) {
    console.warn('Transaction deleted offline:', e);
  }
}

// Clear or Reset database to seed data
export async function resetDatabaseToDemo(): Promise<void> {
  setLocalCache(CACHE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  setLocalCache(CACHE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  setLocalCache(CACHE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  setLocalCache(CACHE_KEYS.PROFILE, INITIAL_BUSINESS_PROFILE);

  await seedInitialData(true);
}
