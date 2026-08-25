import {
  FinancialSummary,
  BusinessProfile,
  Product,
  Transaction,
  Category,
} from '../types';

export type AITaskCategory = 'FAST_TASK' | 'ANALYTICAL_TASK' | 'REASONING_TASK' | 'CREATIVE_TASK' | 'FALLBACK_TASK';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'openrouter' | 'gemini';
  tag: string;
  recommendedFor?: AITaskCategory;
}

export interface AIUpsellRecommendation {
  headline: string;
  suggestedProductId?: string;
  suggestedProductName: string;
  rationale: string;
  pitch: string;
  estimatedMarginBoost: string;
}

export interface AIExecutiveBriefingData {
  healthSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  score: number;
}

export interface AIQueryOptions {
  mode?: 'general_query' | 'dashboard_briefing' | 'pos_upsell' | 'inventory_restock' | 'expense_audit' | 'customer_loyalty' | string;
  prompt?: string;
  storeContext?: Record<string, any>;
  taskCategory?: AITaskCategory;
  preferredModel?: string;
  preferredProvider?: 'openrouter' | 'gemini';
  customApiKey?: string;
}

export interface AIResponse {
  result: string;
  advice?: string;
  analysis?: string;
  mode?: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  note?: string;
  timestamp: string;
}

export interface AIPingResponse {
  status: 'healthy' | 'fallback_ready';
  openRouterStatus: 'connected' | 'unconfigured' | 'error';
  openRouterKeyConfigured: boolean;
  geminiKeyConfigured: boolean;
  latencyMs: number;
  testedModel: string;
  errorMsg?: string;
  availableFreeModels?: Array<{ id: string; name: string }>;
  timestamp: string;
}

export const AVAILABLE_AI_MODELS: AIModelConfig[] = [
  { id: 'gemini-3.7-flash', name: 'Google Gemini 3.7 Flash', provider: 'gemini', tag: 'Native Google Core', recommendedFor: 'FAST_TASK' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter', tag: 'Executive Advisor', recommendedFor: 'ANALYTICAL_TASK' },
  { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B', provider: 'openrouter', tag: 'Sharp & Crisp', recommendedFor: 'FAST_TASK' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'openrouter', tag: 'Deep Analysis', recommendedFor: 'REASONING_TASK' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'openrouter', tag: 'Fast Business Logic', recommendedFor: 'ANALYTICAL_TASK' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'openrouter', tag: 'Fast & Efficient', recommendedFor: 'FAST_TASK' },
  { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', provider: 'openrouter', tag: 'Lightweight', recommendedFor: 'FAST_TASK' },
];

const LOCAL_KEY_STORAGE = 'pos_openrouter_custom_key';
const LOCAL_MODEL_STORAGE = 'pos_openrouter_selected_model';

/**
 * Client-Side AIController
 * Single point of entry for all AI features across the application.
 */
export class ClientAIController {
  private static instance: ClientAIController;

  public static getInstance(): ClientAIController {
    if (!ClientAIController.instance) {
      ClientAIController.instance = new ClientAIController();
    }
    return ClientAIController.instance;
  }

  // ==========================================
  // Storage & Configuration Management
  // ==========================================
  public getStoredApiKey(): string {
    try {
      return localStorage.getItem(LOCAL_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  }

  public setStoredApiKey(key: string): void {
    try {
      if (!key || key.trim() === '') {
        localStorage.removeItem(LOCAL_KEY_STORAGE);
      } else {
        localStorage.setItem(LOCAL_KEY_STORAGE, key.trim());
      }
    } catch (e) {
      console.warn('Unable to persist API key', e);
    }
  }

  public getStoredModel(): string {
    try {
      return localStorage.getItem(LOCAL_MODEL_STORAGE) || 'gemini-3.7-flash';
    } catch {
      return 'gemini-3.7-flash';
    }
  }

  public setStoredModel(modelId: string): void {
    try {
      localStorage.setItem(LOCAL_MODEL_STORAGE, modelId);
    } catch (e) {
      console.warn('Unable to persist selected AI model', e);
    }
  }

  // ==========================================
  // Task Routing Classifier
  // ==========================================
  public classifyTask(mode?: string, prompt?: string): AITaskCategory {
    if (mode === 'pos_upsell' || mode === 'quick_summary') return 'FAST_TASK';
    if (mode === 'creative_copy' || mode === 'marketing') return 'CREATIVE_TASK';
    if (mode === 'inventory_restock' || mode === 'what_if_simulation' || mode === 'strategic_forecast') return 'REASONING_TASK';
    
    if (prompt) {
      const lower = prompt.toLowerCase();
      if (lower.includes('why') || lower.includes('simulate') || lower.includes('forecast') || lower.includes('what if') || lower.includes('strategy') || lower.includes('expand')) {
        return 'REASONING_TASK';
      }
      if (lower.includes('write') || lower.includes('description') || lower.includes('post') || lower.includes('pitch')) {
        return 'CREATIVE_TASK';
      }
      if (lower.includes('quick') || lower.includes('who') || lower.includes('status') || lower.includes('hello')) {
        return 'FAST_TASK';
      }
    }

    return 'ANALYTICAL_TASK';
  }

  // ==========================================
  // Structured Response Validation
  // ==========================================
  public extractAndValidateJSON<T>(
    text: string,
    validator: (parsed: any) => boolean,
    fallback: T
  ): T {
    try {
      if (!text || typeof text !== 'string') return fallback;
      const cleaned = text
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonStr = match ? match[0] : cleaned;
      const parsed = JSON.parse(jsonStr);
      if (validator(parsed)) {
        return parsed as T;
      }
      return fallback;
    } catch (e) {
      console.warn('Structured response validation failed:', e);
      return fallback;
    }
  }

  // ==========================================
  // Unified AI Request Dispatcher
  // ==========================================
  public async executeQuery(options: AIQueryOptions): Promise<AIResponse> {
    const customKey = options.customApiKey || this.getStoredApiKey();
    const activeModel = options.preferredModel || this.getStoredModel();
    const activeProvider =
      options.preferredProvider || (activeModel.startsWith('gemini-') ? 'gemini' : 'openrouter');
    const taskCategory = options.taskCategory || this.classifyTask(options.mode, options.prompt);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) {
      headers['x-openrouter-key'] = customKey;
    }

    const payload = {
      mode: options.mode || 'general_query',
      prompt: options.prompt,
      storeContext: options.storeContext || {},
      preferredModel: activeModel,
      preferredProvider: activeProvider,
      taskCategory,
      clientApiKey: customKey || undefined,
    };

    const res = await fetch('/api/ai/central-brain', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `AI request failed with status ${res.status}`);
    }

    return res.json();
  }

  // ==========================================
  // Specialized Domain Helper Methods
  // ==========================================
  public async getAdvisorAnalysis(payload: {
    summary: FinancialSummary;
    profile: BusinessProfile;
    products: Product[];
    transactions: Transaction[];
    customPrompt?: string;
    selectedModel?: string;
    preferredProvider?: 'gemini' | 'openrouter';
  }): Promise<AIResponse> {
    const { summary, profile, products, transactions, customPrompt, selectedModel, preferredProvider } = payload;
    const cur = profile.currencySymbol || '$';
    const customKey = this.getStoredApiKey();

    const lowStock = products.filter((p) => p.stockQuantity <= p.minStockThreshold);
    const slowItems = products.filter((p) => p.stockQuantity > 5);

    // Calculate ranked top products
    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    transactions
      .filter((t) => t.type === 'sale' && t.items)
      .forEach((t) => {
        t.items?.forEach((item) => {
          const rev = item.totalSellPrice || item.unitSellPrice * item.quantity;
          const cost = item.totalBuyPrice || item.unitBuyPrice * item.quantity;
          const existing = productSalesMap.get(item.productId) || {
            name: item.productName,
            qty: 0,
            revenue: 0,
            profit: 0,
          };
          existing.qty += item.quantity;
          existing.revenue += rev;
          existing.profit += rev - cost;
          productSalesMap.set(item.productId, existing);
        });
      });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);

    const slowProducts = slowItems
      .map((p) => ({
        name: p.name,
        stock: p.stockQuantity,
        moneyTrapped: p.stockQuantity * p.buyPrice,
      }))
      .sort((a, b) => b.moneyTrapped - a.moneyTrapped)
      .slice(0, 8);

    const cleanRevenue = Number(summary.totalRevenue) || 0;
    const cleanNetProfit = Number(summary.netProfit) || 0;
    const centsKept = cleanRevenue > 0 ? Math.round((cleanNetProfit / cleanRevenue) * 100) : 0;

    const requestBody = {
      businessName: profile.businessName || 'Your Store',
      ownerName: profile.ownerName || 'Store Owner',
      currency: cur,
      totalRevenue: cleanRevenue,
      wholesaleCost: Number(summary.totalCOGS) || 0,
      grossProfit: Number(summary.grossProfit) || 0,
      totalExpenses: Number(summary.totalExpenses) || 0,
      netProfit: cleanNetProfit,
      centsKept,
      txCount: transactions.length,
      healthScore: cleanRevenue > 0 && cleanNetProfit > 0 ? 82 : 55,
      healthStatus: cleanRevenue > 0 && cleanNetProfit > 0 ? 'Good' : 'Fair',
      healthSentence: `Store is active with ${centsKept}¢ net retention per dollar.`,
      topProducts,
      lowStockItems: lowStock.slice(0, 8).map((p) => ({ name: p.name, stock: p.stockQuantity, minThreshold: p.minStockThreshold })),
      slowProducts,
      forecastSales: cleanRevenue * 1.1,
      forecastProfit: cleanNetProfit * 1.1,
      dailyVelocity: transactions.length > 0 ? cleanRevenue / Math.max(1, transactions.length) : 0,
      customPrompt,
      model: selectedModel || this.getStoredModel(),
      provider: preferredProvider || (selectedModel?.startsWith('gemini-') ? 'gemini' : 'openrouter'),
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) {
      headers['x-openrouter-key'] = customKey;
    }

    const res = await fetch('/api/business-advisor', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Advisor request failed with status ${res.status}`);
    }

    return res.json();
  }

  public async getPosUpsellRecommendation(
    cartItems: any[],
    availableCatalog: Product[],
    currencySymbol = '$'
  ): Promise<AIUpsellRecommendation> {
    const defaultFallback: AIUpsellRecommendation = {
      headline: 'Recommended Add-on',
      suggestedProductName: availableCatalog[0]?.name || 'Popular Item',
      rationale: 'Customers who buy items in this category often pick this up.',
      pitch: `Would you like to add ${availableCatalog[0]?.name || 'a featured item'} to your order?`,
      estimatedMarginBoost: `+${currencySymbol}3.50 margin`,
    };

    try {
      const response = await this.executeQuery({
        mode: 'pos_upsell',
        taskCategory: 'FAST_TASK',
        storeContext: {
          cartItems,
          availableCatalog: availableCatalog.slice(0, 15).map((p) => ({
            id: p.id,
            name: p.name,
            price: p.sellPrice,
            category: p.category,
          })),
          currency: currencySymbol,
        },
      });

      return this.extractAndValidateJSON<AIUpsellRecommendation>(
        response.result,
        (obj) => typeof obj?.headline === 'string' && typeof obj?.suggestedProductName === 'string',
        defaultFallback
      );
    } catch (e) {
      console.warn('Failed to retrieve AI upsell recommendation, using default:', e);
      return defaultFallback;
    }
  }

  public async pingDiagnostic(customApiKey?: string, modelId?: string): Promise<AIPingResponse> {
    const key = customApiKey !== undefined ? customApiKey : this.getStoredApiKey();
    const model = modelId || this.getStoredModel();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) {
      headers['x-openrouter-key'] = key;
    }

    const res = await fetch('/api/ai/ping', {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiKey: key, model }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    return res.json();
  }
}

export const AIController = ClientAIController.getInstance();
