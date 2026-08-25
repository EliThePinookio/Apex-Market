import { Product, Transaction, BusinessProfile, FinancialSummary, Category, TransactionItem } from '../types';
import {
  AIController,
  AVAILABLE_AI_MODELS,
  AIModelConfig,
  AIPingResponse,
  AIResponse,
} from './aiControllerService';

export type BrainModelConfig = AIModelConfig;
export const AVAILABLE_BRAIN_MODELS = AVAILABLE_AI_MODELS;

export const getStoredOpenRouterKey = (): string => AIController.getStoredApiKey();
export const setStoredOpenRouterKey = (key: string): void => AIController.setStoredApiKey(key);
export const getStoredBrainModel = (): string => AIController.getStoredModel();
export const setStoredBrainModel = (modelId: string): void => AIController.setStoredModel(modelId);

export type BrainPingResponse = AIPingResponse;

export const pingCentralBrain = async (customApiKey?: string, modelId?: string): Promise<BrainPingResponse> => {
  return AIController.pingDiagnostic(customApiKey, modelId);
};

export interface BrainTelemetryQuery {
  mode: 'general_query' | 'dashboard_briefing' | 'pos_upsell' | 'inventory_restock' | 'expense_audit' | 'customer_loyalty';
  prompt?: string;
  storeContext: Record<string, any>;
  preferredModel?: string;
  preferredProvider?: 'openrouter' | 'gemini';
}

export type BrainResponse = AIResponse;

export const queryCentralBrain = async (query: BrainTelemetryQuery): Promise<BrainResponse> => {
  return AIController.executeQuery({
    mode: query.mode,
    prompt: query.prompt,
    storeContext: query.storeContext,
    preferredModel: query.preferredModel,
    preferredProvider: query.preferredProvider,
  });
};

// Controlled Application Tools for Verified Business Data Retrieval
export const buildVerifiedStoreTools = (
  summary: FinancialSummary,
  products: Product[],
  transactions: Transaction[],
  profile: BusinessProfile
) => {
  const lowStock = products.filter((p) => p.stockQuantity <= p.minStockThreshold);
  const slowItems = products.filter((p) => p.stockQuantity > 5);
  const trappedCash = slowItems.reduce((acc, p) => acc + p.stockQuantity * p.buyPrice, 0);
  const totalValuation = products.reduce((acc, p) => acc + p.stockQuantity * p.buyPrice, 0);

  return {
    getDashboardMetrics: () => ({
      revenue: summary.totalRevenue,
      cogs: summary.totalCOGS,
      grossProfit: summary.grossProfit,
      expenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      marginPercent: summary.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : '0',
    }),
    getSalesSummary: () => {
      const salesTx = transactions.filter((t) => t.type === 'sale');
      return {
        totalSalesCount: salesTx.length,
        avgOrderValue: salesTx.length > 0 ? (summary.totalRevenue / salesTx.length).toFixed(2) : '0',
        paymentMethods: salesTx.reduce((acc: Record<string, number>, t) => {
          const pm = t.paymentMethod || 'cash';
          acc[pm] = (acc[pm] || 0) + (t.amount || 0);
          return acc;
        }, {}),
      };
    },
    getInventoryStatus: () => ({
      totalProducts: products.length,
      lowStockCount: lowStock.length,
      outOfStockCount: products.filter((p) => p.stockQuantity <= 0).length,
      totalInventoryValuation: totalValuation.toFixed(2),
      trappedDeadstockCapital: trappedCash.toFixed(2),
    }),
    getLowStockProducts: () =>
      lowStock.slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stockQuantity,
        threshold: p.minStockThreshold,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
      })),
    getProductPerformance: () => {
      const map = new Map<string, { name: string; qty: number; revenue: number }>();
      transactions
        .filter((t) => t.type === 'sale' && t.items)
        .forEach((t) => {
          t.items?.forEach((i) => {
            const cur = map.get(i.productId) || { name: i.productName, qty: 0, revenue: 0 };
            cur.qty += i.quantity;
            cur.revenue += i.totalSellPrice || (i.unitSellPrice * i.quantity);
            map.set(i.productId, cur);
          });
        });
      const sorted = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        topSellers: sorted.slice(0, 5),
        slowMoving: slowItems.slice(0, 5).map((s) => ({ name: s.name, stock: s.stockQuantity, trappedCash: s.stockQuantity * s.buyPrice })),
      };
    },
    getProfitAnalysis: () => ({
      revenue: summary.totalRevenue,
      netProfit: summary.netProfit,
      centsKeptPerDollar: summary.totalRevenue > 0 ? Math.round((summary.netProfit / summary.totalRevenue) * 100) : 0,
      expenseToRevenueRatio: summary.totalRevenue > 0 ? ((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(1) + '%' : '0%',
    }),
    getCapitalSummary: () => ({
      totalCapital: summary.totalCapital,
      trappedInventoryValue: totalValuation,
      netProfit: summary.netProfit,
    }),
  };
};
export const getDashboardAutonomousBriefing = async (
  summary: FinancialSummary,
  products: Product[],
  transactions: Transaction[],
  profile: BusinessProfile
): Promise<BrainResponse> => {
  const lowStock = products.filter((p) => p.stockQuantity <= p.minStockThreshold);
  const slowItems = products.filter((p) => p.stockQuantity > 5);
  const trappedCash = slowItems.reduce((acc, p) => acc + p.stockQuantity * p.buyPrice, 0);

  const context = {
    businessName: profile.businessName || 'Your Store',
    currency: profile.currencySymbol || '$',
    totalRevenue: summary.totalRevenue,
    netProfit: summary.netProfit,
    healthScore: summary.totalRevenue > 0 && summary.netProfit > 0 ? 88 : 65,
    txCount: transactions.length,
    lowStockCount: lowStock.length,
    trappedCash,
    totalExpenses: summary.totalExpenses,
    productCount: products.length,
  };

  return queryCentralBrain({
    mode: 'dashboard_briefing',
    storeContext: context,
  });
};

// Specialized Brain Helper: POS Smart Upsell Suggestions
export interface PosUpsellRecommendation {
  headline: string;
  suggestedProductId?: string;
  suggestedProductName: string;
  rationale: string;
  pitch: string;
  estimatedMarginBoost?: string;
}

export const getPosSmartUpsell = async (
  cartItems: TransactionItem[],
  catalog: Product[],
  profile: BusinessProfile
): Promise<PosUpsellRecommendation | null> => {
  if (cartItems.length === 0 || catalog.length === 0) return null;

  const cartProductIds = new Set(cartItems.map((i) => i.productId));
  const availableCatalog = catalog
    .filter((p) => !cartProductIds.has(p.id) && p.stockQuantity > 0)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      sellPrice: p.sellPrice,
      buyPrice: p.buyPrice,
      margin: p.sellPrice - p.buyPrice,
    }));

  if (availableCatalog.length === 0) return null;

  try {
    const response = await queryCentralBrain({
      mode: 'pos_upsell',
      storeContext: {
        currency: profile.currencySymbol || '$',
        cartItems: cartItems.map((c) => ({ name: c.productName, qty: c.quantity, price: c.unitSellPrice })),
        availableCatalog,
      },
    });

    const raw = response.result.trim();
    // Extract JSON if wrapped
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        headline: parsed.headline || 'Smart Upsell Suggestion',
        suggestedProductId: parsed.suggestedProductId,
        suggestedProductName: parsed.suggestedProductName || availableCatalog[0].name,
        rationale: parsed.rationale || 'Complementary purchase recommended by store brain.',
        pitch: parsed.pitch || `Would you like to add ${parsed.suggestedProductName || availableCatalog[0].name}?`,
        estimatedMarginBoost: parsed.estimatedMarginBoost || `+${profile.currencySymbol || '$'}${((availableCatalog[0].sellPrice - availableCatalog[0].buyPrice) || 5).toFixed(2)} margin`,
      };
    }

    return {
      headline: 'Autonomous Product Pairing',
      suggestedProductId: availableCatalog[0].id,
      suggestedProductName: availableCatalog[0].name,
      rationale: 'High velocity companion product.',
      pitch: `Customers also love our ${availableCatalog[0].name}. Add to checkout?`,
      estimatedMarginBoost: `+${profile.currencySymbol || '$'}${(availableCatalog[0].sellPrice - availableCatalog[0].buyPrice).toFixed(2)} profit`,
    };
  } catch (err) {
    console.warn('POS Upsell fallback to heuristic:', err);
    // Instant heuristic fallback
    const topMarginItem = availableCatalog.sort((a, b) => b.margin - a.margin)[0];
    if (!topMarginItem) return null;
    return {
      headline: 'High-Margin Recommendation',
      suggestedProductId: topMarginItem.id,
      suggestedProductName: topMarginItem.name,
      rationale: 'Popular companion item with strong margin retention.',
      pitch: `Would you like to pair this with ${topMarginItem.name}?`,
      estimatedMarginBoost: `+${profile.currencySymbol || '$'}${topMarginItem.margin.toFixed(2)} profit`,
    };
  }
};
