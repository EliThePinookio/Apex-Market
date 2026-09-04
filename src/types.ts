export type TransactionType =
  | "sale"
  | "expense"
  | "capital"
  | "stock_refill"
  | "adjustment"
  | "owner_draw";

export type PaymentMethod = "cash" | "card" | "transfer" | "mobile_money" | "other";

export interface Category {
  id: string;
  name: string;
  color?: string;
  businessId?: string;
}

export interface Product {
  id: string;
  businessId?: string;
  categoryId?: string;
  name: string;
  sku: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  unit: string;
  barcode?: string;
  supplierId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  size?: string;
  garmentType?: string;
  imageUrl?: string;
  listed?: boolean;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitBuyPrice: number;
  unitSellPrice: number;
  totalSellPrice: number;
  totalBuyPrice: number;
}

export interface Transaction {
  id: string;
  businessId?: string;
  type: TransactionType;
  amount: number;
  cogs?: number;
  grossProfit?: number;
  netProfit?: number;
  date: string;
  description: string;
  items?: TransactionItem[];
  category?: string;
  paymentMethod?: PaymentMethod;
  referenceNo?: string;
  customerName?: string;
  customerId?: string;
  relatedSaleId?: string;
  relatedPurchaseId?: string;
  relatedExpenseId?: string;
  createdAt: string;
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
  tier: "Bronze" | "Silver" | "Gold" | "VIP";
  lastVisit: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  currencySymbol: string;
  ownerPin: string;
  isPinLocked: boolean;
  biometricEnabled?: boolean;
  taxRate: number;
  lowStockAlertEnabled: boolean;
  allowNegativeStock: boolean;
  receiptHeaderMsg?: string;
  whatsappNumber?: string;
  shopTagline?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalCapital: number;
  totalInventoryValuation: number;
  totalPotentialRevenue: number;
  lowStockCount: number;
  outOfStockCount: number;
  transactionCount: number;
}

export interface ActualVsForecastMetric {
  metricName: string;
  actual: number;
  forecastBaseline: number;
  forecastConservative: number;
  forecastOptimistic: number;
  variancePercent: number;
  trendDirection: "up" | "down" | "flat";
  status: "outperforming" | "on_track" | "underperforming";
}

export interface WhatIfSimulationParams {
  priceChangePercent: number;
  volumeChangePercent: number;
  cogsChangePercent: number;
  expenseChangePercent: number;
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

export type DateFilterPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "this_year"
  | "all"
  | "custom";

export type AppUserRole = "owner" | "manager" | "cashier" | "viewer" | "customer";

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  businessId?: string;
  role: AppUserRole;
  createdAt: string;
}

export type NavId =
  | "dashboard"
  | "pos"
  | "inventory"
  | "ledger"
  | "customers"
  | "advisor"
  | "settings";
