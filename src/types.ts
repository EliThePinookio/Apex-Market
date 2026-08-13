export type TransactionType = 'sale' | 'expense' | 'capital' | 'stock_refill' | 'adjustment';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mobile_money' | 'other';

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  buyPrice: number; // Cost price
  sellPrice: number; // Selling price
  stockQuantity: number;
  minStockThreshold: number; // Low stock alert level
  unit: string; // e.g., pcs, kg, box, bottle
  barcode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitBuyPrice: number;
  unitSellPrice: number;
  totalSellPrice: number;
  totalBuyPrice: number; // COGS
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Net amount (for sales = total revenue, for expense = expense amount, for capital = capital amount)
  cogs?: number; // Total Cost of Goods Sold (for sales)
  grossProfit?: number; // amount - cogs (for sales)
  netProfit?: number; // for sales = gross profit; for expenses = -amount
  date: string; // ISO string
  description: string;
  items?: TransactionItem[];
  category?: string; // For expenses (e.g. Rent, Utilities, Salaries) or product categories
  paymentMethod?: PaymentMethod;
  referenceNo?: string;
  customerName?: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'damage';
  quantity: number;
  costPerUnit: number;
  reason: string;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalSpent: number;
  orderCount: number;
  debtBalance: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  lastVisit: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  currencySymbol: string;
  ownerPin: string; // Default 1234
  isPinLocked: boolean;
  taxRate: number; // % e.g. 0 or 5 or 10
  lowStockAlertEnabled: boolean;
  allowNegativeStock: boolean;
  receiptHeaderMsg?: string;
}

export type DateFilterPreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'all' | 'custom';

export interface DateRangeFilter {
  preset: DateFilterPreset;
  startDate?: string;
  endDate?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalCapital: number;
  totalInventoryValuation: number; // Based on buy prices
  totalPotentialRevenue: number; // Based on sell prices
  lowStockCount: number;
  outOfStockCount: number;
  transactionCount: number;
}
