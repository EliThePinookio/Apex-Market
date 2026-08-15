export type TransactionType = 'sale' | 'expense' | 'capital' | 'stock_refill' | 'adjustment' | 'owner_draw';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mobile_money' | 'other';

export interface Category {
  id: string;
  name: string;
  color?: string;
  businessId?: string;
}

export interface Supplier {
  id: string;
  businessId?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  businessId?: string;
  categoryId?: string;
  name: string;
  sku: string;
  category: string;
  buyPrice: number; // Cost price
  sellPrice: number; // Selling price
  stockQuantity: number;
  minStockThreshold: number; // Low stock alert level
  unit: string; // e.g., pcs, kg, box, bottle
  barcode?: string;
  supplierId?: string;
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

export interface SaleItem {
  id?: string;
  saleId?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  lineCogs: number;
  createdAt?: string;
}

export interface Sale {
  id: string;
  businessId?: string;
  customerId?: string;
  userId?: string;
  referenceNo?: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cogs: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending' | 'partial' | 'refunded';
  customerName?: string;
  notes?: string;
  items?: SaleItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  id?: string;
  purchaseId?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  createdAt?: string;
}

export interface Purchase {
  id: string;
  businessId?: string;
  supplierId?: string;
  userId?: string;
  referenceNo?: string;
  purchaseDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paymentMethod: PaymentMethod;
  notes?: string;
  items?: PurchaseItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  businessId?: string;
  userId?: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  date: string;
  referenceNo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OwnerCapital {
  id: string;
  businessId?: string;
  userId?: string;
  type: 'contribution' | 'drawing';
  amount: number;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface Transaction {
  id: string;
  businessId?: string;
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
  customerId?: string;
  relatedSaleId?: string;
  relatedPurchaseId?: string;
  relatedExpenseId?: string;
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
  biometricEnabled?: boolean; // Apple Face ID / Touch ID / Device Biometrics
  taxRate: number; // % e.g. 0 or 5 or 10
  lowStockAlertEnabled: boolean;
  allowNegativeStock: boolean;
  receiptHeaderMsg?: string;
}

export interface ActualVsForecastMetric {
  metricName: string;
  actual: number;
  forecastBaseline: number;
  forecastConservative: number;
  forecastOptimistic: number;
  variancePercent: number; // (actual - forecastBaseline) / forecastBaseline * 100
  trendDirection: 'up' | 'down' | 'flat';
  status: 'outperforming' | 'on_track' | 'underperforming';
}

export interface WhatIfSimulationParams {
  priceChangePercent: number; // -30% to +50%
  volumeChangePercent: number; // -50% to +100%
  cogsChangePercent: number; // -30% to +50%
  expenseChangePercent: number; // -50% to +50%
  additionalCapital: number;
}

export interface WhatIfSimulationResult {
  currentRevenue: number;
  projectedRevenue: number;
  revenueDelta: number;

  currentCOGS: number;
  projectedCOGS: number;
  cogsDelta: number;

  currentGrossProfit: number;
  projectedGrossProfit: number;
  grossProfitDelta: number;
  projectedGrossMarginPercent: number;

  currentExpenses: number;
  projectedExpenses: number;
  expensesDelta: number;

  currentNetProfit: number;
  projectedNetProfit: number;
  netProfitDelta: number;
  netProfitDeltaPercent: number;
  projectedNetMarginPercent: number;

  currentBreakEvenRevenue: number;
  projectedBreakEvenRevenue: number;
  breakEvenDelta: number;

  marginOfSafetyPercent: number;
  projectedWorkingCash: number;
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

export type AppUserRole = 'owner' | 'manager' | 'cashier' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  businessId?: string;
  role: AppUserRole;
  createdAt: string;
}

