import type {
  BusinessProfile,
  Category,
  Customer,
  Product,
  Transaction,
  TransactionItem,
} from "@/types";
import { customerTier, loyaltyFromSale } from "@/lib/apex/summary";
import { newId } from "@/lib/apex/money";

export interface ApexSnapshot {
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  customers: Customer[];
  profile: BusinessProfile;
}

export function recordSaleOn(
  snapshot: ApexSnapshot,
  sale: {
    items: TransactionItem[];
    customerName?: string;
    customerId?: string;
    paymentMethod: Transaction["paymentMethod"];
    description?: string;
    discountAmount?: number;
  },
): { snapshot: ApexSnapshot; txId: string; transaction: Transaction } {
  const now = new Date().toISOString();
  const txId = newId("tx");
  let totalSellPrice = 0;
  let totalBuyPrice = 0;
  const products = snapshot.products.map((p) => ({ ...p }));

  for (const item of sale.items) {
    totalSellPrice += item.totalSellPrice;
    totalBuyPrice += item.totalBuyPrice;
    const idx = products.findIndex((p) => p.id === item.productId);
    if (idx >= 0) {
      const prod = products[idx];
      products[idx] = {
        ...prod,
        stockQuantity: Math.max(0, prod.stockQuantity - item.quantity),
        updatedAt: now,
      };
    }
  }

  const discount = sale.discountAmount || 0;
  const netRevenue = Math.max(0, totalSellPrice - discount);
  const grossProfit = netRevenue - totalBuyPrice;

  const transaction: Transaction = {
    id: txId,
    type: "sale",
    amount: netRevenue,
    cogs: totalBuyPrice,
    grossProfit,
    netProfit: grossProfit,
    date: now,
    description:
      sale.description ||
      `Sale of ${sale.items.reduce((s, i) => s + i.quantity, 0)} item(s)`,
    items: sale.items,
    customerName: sale.customerName || "Walk-in Customer",
    customerId: sale.customerId,
    paymentMethod: sale.paymentMethod || "cash",
    createdAt: now,
  };

  let customers = snapshot.customers.map((c) => ({ ...c }));
  const name = (sale.customerName || "").trim();
  if (name && name !== "Walk-in Customer") {
    const matched = customers.find(
      (c) => c.id === sale.customerId || c.name.toLowerCase() === name.toLowerCase(),
    );
    const points = loyaltyFromSale(netRevenue);
    if (matched) {
      const totalSpent = matched.totalSpent + netRevenue;
      customers = customers.map((c) =>
        c.id === matched.id
          ? {
              ...c,
              totalSpent,
              orderCount: c.orderCount + 1,
              loyaltyPoints: c.loyaltyPoints + points,
              lastVisit: "Just now",
              tier: customerTier(totalSpent),
              updatedAt: now,
            }
          : c,
      );
      transaction.customerId = matched.id;
    } else {
      const created: Customer = {
        id: newId("cust"),
        name,
        phone: "",
        email: "",
        loyaltyPoints: points,
        totalSpent: netRevenue,
        orderCount: 1,
        debtBalance: 0,
        tier: customerTier(netRevenue),
        lastVisit: "Just now",
        createdAt: now,
        updatedAt: now,
      };
      customers = [created, ...customers];
      transaction.customerId = created.id;
    }
  }

  const next: ApexSnapshot = {
    ...snapshot,
    products,
    customers,
    transactions: [transaction, ...snapshot.transactions],
  };
  return { snapshot: next, txId, transaction };
}

export function recordExpenseOn(
  snapshot: ApexSnapshot,
  data: {
    amount: number;
    category: string;
    description: string;
    paymentMethod?: Transaction["paymentMethod"];
  },
): ApexSnapshot {
  const now = new Date().toISOString();
  const tx: Transaction = {
    id: newId("tx"),
    type: "expense",
    amount: Number(data.amount) || 0,
    netProfit: -(Number(data.amount) || 0),
    date: now,
    description: data.description || "Business Expense",
    category: data.category || "General Expense",
    paymentMethod: data.paymentMethod || "cash",
    createdAt: now,
  };
  return { ...snapshot, transactions: [tx, ...snapshot.transactions] };
}

export function recordCapitalOn(
  snapshot: ApexSnapshot,
  data: {
    amount: number;
    description: string;
    paymentMethod?: Transaction["paymentMethod"];
  },
): ApexSnapshot {
  const now = new Date().toISOString();
  const tx: Transaction = {
    id: newId("tx"),
    type: "capital",
    amount: Number(data.amount) || 0,
    date: now,
    description: data.description || "Capital Injection",
    paymentMethod: data.paymentMethod || "transfer",
    createdAt: now,
  };
  return { ...snapshot, transactions: [tx, ...snapshot.transactions] };
}

export function recordStockRefillOn(
  snapshot: ApexSnapshot,
  data: { productId: string; quantityToAdd: number; costPerUnit?: number },
): ApexSnapshot {
  const now = new Date().toISOString();
  const products = snapshot.products.map((p) => ({ ...p }));
  const idx = products.findIndex((p) => p.id === data.productId);
  if (idx < 0) return snapshot;
  const prod = products[idx];
  const newQty = prod.stockQuantity + data.quantityToAdd;
  const newBuyPrice = data.costPerUnit || prod.buyPrice;
  products[idx] = { ...prod, stockQuantity: newQty, buyPrice: newBuyPrice, updatedAt: now };
  const totalRefillCost = data.quantityToAdd * newBuyPrice;
  const tx: Transaction = {
    id: newId("tx"),
    type: "stock_refill",
    amount: totalRefillCost,
    date: now,
    description: `Stock refill: +${data.quantityToAdd} ${prod.unit} of ${prod.name}`,
    createdAt: now,
  };
  return {
    ...snapshot,
    products,
    transactions: [tx, ...snapshot.transactions],
  };
}

export function saveProductOn(
  snapshot: ApexSnapshot,
  productData: Partial<Product>,
): ApexSnapshot {
  const now = new Date().toISOString();
  const id = productData.id || newId("prod");
  const product: Product = {
    id,
    name: productData.name?.trim() || "New Product",
    sku: productData.sku?.trim() || `SKU-${Date.now().toString().slice(-4)}`,
    category: productData.category?.trim() || "Apparels",
    buyPrice: Number(productData.buyPrice) || 0,
    sellPrice: Number(productData.sellPrice) || 0,
    stockQuantity: Number(productData.stockQuantity) ?? 0,
    minStockThreshold: Number(productData.minStockThreshold) ?? 5,
    unit: productData.unit?.trim() || "pcs",
    barcode: productData.barcode || "",
    notes: productData.notes || "",
    createdAt: productData.createdAt || now,
    updatedAt: now,
  };
  const exists = snapshot.products.some((p) => p.id === id);
  const products = exists
    ? snapshot.products.map((p) => (p.id === id ? product : p))
    : [product, ...snapshot.products];
  return { ...snapshot, products };
}

export function deleteProductOn(snapshot: ApexSnapshot, productId: string): ApexSnapshot {
  return {
    ...snapshot,
    products: snapshot.products.filter((p) => p.id !== productId),
  };
}

export function saveCustomerOn(
  snapshot: ApexSnapshot,
  data: Partial<Customer>,
): ApexSnapshot {
  const now = new Date().toISOString();
  const id = data.id || newId("cust");
  const totalSpent = data.totalSpent ?? 0;
  const customer: Customer = {
    id,
    name: data.name?.trim() || "New Customer",
    phone: data.phone?.trim() || "",
    email: data.email?.trim() || "",
    loyaltyPoints: data.loyaltyPoints ?? loyaltyFromSale(totalSpent),
    totalSpent,
    orderCount: data.orderCount ?? 0,
    debtBalance: data.debtBalance ?? 0,
    tier: data.tier || customerTier(totalSpent),
    lastVisit: data.lastVisit || "Just now",
    notes: data.notes || "",
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
  const exists = snapshot.customers.some((c) => c.id === id);
  const customers = exists
    ? snapshot.customers.map((c) => (c.id === id ? customer : c))
    : [customer, ...snapshot.customers];
  return { ...snapshot, customers };
}

export function deleteCustomerOn(snapshot: ApexSnapshot, id: string): ApexSnapshot {
  return { ...snapshot, customers: snapshot.customers.filter((c) => c.id !== id) };
}

export function settleDebtOn(snapshot: ApexSnapshot, id: string): ApexSnapshot {
  return {
    ...snapshot,
    customers: snapshot.customers.map((c) =>
      c.id === id ? { ...c, debtBalance: 0, updatedAt: new Date().toISOString() } : c,
    ),
  };
}

export function saveProfileOn(
  snapshot: ApexSnapshot,
  patch: Partial<BusinessProfile>,
): ApexSnapshot {
  return { ...snapshot, profile: { ...snapshot.profile, ...patch } };
}

export function deleteTransactionOn(snapshot: ApexSnapshot, txId: string): ApexSnapshot {
  return {
    ...snapshot,
    transactions: snapshot.transactions.filter((t) => t.id !== txId),
  };
}

export function wipeBusiness(keepProfile: BusinessProfile): ApexSnapshot {
  return {
    products: [],
    categories: [],
    transactions: [],
    customers: [],
    profile: keepProfile,
  };
}
