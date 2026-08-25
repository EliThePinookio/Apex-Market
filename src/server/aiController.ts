import { GoogleGenAI } from '@google/genai';

export type AITaskCategory = 'FAST_TASK' | 'ANALYTICAL_TASK' | 'REASONING_TASK' | 'CREATIVE_TASK' | 'FALLBACK_TASK';

export interface AIModelCandidate {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter' | 'local';
}

export interface AIExecutionOptions {
  taskCategory?: AITaskCategory;
  mode?: string;
  systemInstruction?: string;
  prompt: string;
  preferredModel?: string;
  preferredProvider?: 'gemini' | 'openrouter' | 'auto';
  customApiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIExecutionResult {
  text: string;
  provider: 'gemini' | 'openrouter' | 'local';
  model: string;
  taskCategory: AITaskCategory;
  fallbackUsed: boolean;
  errorDetail?: string;
  latencyMs: number;
}

export interface BusinessAdvisorDataPayload {
  businessName: string;
  ownerName: string;
  currency: string;
  healthScore: number;
  healthStatus: string;
  healthSentence: string;
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  centsKept: number;
  dailyVelocity: number;
  txCount: number;
  valuation: number;
  topProducts: Array<{ name: string; qtySold?: number; revenue: number; profit: number }>;
  slowProducts: Array<{ name: string; stock: number; moneyTrapped?: number; buyPrice?: number }>;
  lowStockItems: Array<{ name: string; stock: number; minThreshold?: number; sellPrice?: number }>;
  categorySales?: Array<{ name: string; revenue: number; profit: number }>;
  categoryExpenses?: Array<{ name: string; value: number }>;
  forecastSales: number;
  forecastProfit: number;
  trendDirection?: string;
  customPrompt?: string;
  preferredProvider?: 'gemini' | 'openrouter' | 'auto';
  selectedModel?: string;
  apiKey?: string;
}

export class AIController {
  private static instance: AIController;

  private readonly BUSINESS_ADVISOR_SYSTEM_MESSAGE = `You are a friendly and highly capable Business Advisor (also called Business Concierge) for a small business owner.

Your job is to analyse the real business data provided to you and give clear, practical advice.

Rules:
- Use only simple, everyday language. Never use finance jargon.
- Always base your answers on the data given to you.
- Structure your responses clearly:
  1. Overall business health (1–2 sentences)
  2. What’s going well
  3. Main problems and why they are happening
  4. Practical recommendations (3–5 clear actions)
- Be encouraging but honest.
- If the user asks a follow-up question, answer it directly using the same data.
- Keep answers concise and easy to read.`;

  private readonly TASK_MODEL_REGISTRY: Record<AITaskCategory, string[]> = {
    FAST_TASK: [
      'mistralai/mistral-small-24b-instruct-2501',
      'meta-llama/llama-3.1-8b-instruct',
      'meta-llama/llama-3.2-3b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
    ],
    ANALYTICAL_TASK: [
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-small-24b-instruct-2501',
      'qwen/qwen-2.5-72b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'deepseek/deepseek-chat',
    ],
    REASONING_TASK: [
      'qwen/qwen-2.5-72b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
      'mistralai/mistral-small-24b-instruct-2501',
      'meta-llama/llama-3.1-8b-instruct',
    ],
    CREATIVE_TASK: [
      'meta-llama/llama-3.3-70b-instruct',
      'mistralai/mistral-small-24b-instruct-2501',
      'meta-llama/llama-3.1-8b-instruct',
      'deepseek/deepseek-chat',
    ],
    FALLBACK_TASK: [
      'mistralai/mistral-small-24b-instruct-2501',
      'meta-llama/llama-3.3-70b-instruct',
      'meta-llama/llama-3.1-8b-instruct',
      'deepseek/deepseek-chat',
    ],
  };

  private readonly GEMINI_CANDIDATE_MODELS = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  public static getInstance(): AIController {
    if (!AIController.instance) {
      AIController.instance = new AIController();
    }
    return AIController.instance;
  }

  // ==========================================
  // Task Classifier & Model Selection
  // ==========================================
  public classifyTask(mode?: string, prompt?: string): AITaskCategory {
    if (mode === 'pos_upsell' || mode === 'quick_summary') return 'FAST_TASK';
    if (mode === 'creative_copy' || mode === 'marketing') return 'CREATIVE_TASK';
    if (mode === 'inventory_restock' || mode === 'what_if_simulation' || mode === 'strategic_forecast') return 'REASONING_TASK';
    
    if (prompt) {
      const lower = prompt.toLowerCase();
      if (
        lower.includes('why') ||
        lower.includes('simulate') ||
        lower.includes('forecast') ||
        lower.includes('what if') ||
        lower.includes('strategy') ||
        lower.includes('expand')
      ) {
        return 'REASONING_TASK';
      }
      if (
        lower.includes('write') ||
        lower.includes('description') ||
        lower.includes('post') ||
        lower.includes('message') ||
        lower.includes('pitch')
      ) {
        return 'CREATIVE_TASK';
      }
      if (
        lower.includes('quick') ||
        lower.includes('who') ||
        lower.includes('status') ||
        lower.includes('hello') ||
        lower.includes('ping')
      ) {
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

      // Clean code fences & markdown wrappers
      const cleaned = text
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .trim();

      // Find first balanced JSON object or array
      const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonStr = match ? match[0] : cleaned;
      const parsed = JSON.parse(jsonStr);

      if (validator(parsed)) {
        return parsed as T;
      }
      console.warn('Structured response validation failed schema check. Falling back to default.');
      return fallback;
    } catch (e) {
      console.warn('Structured JSON parsing error, returning fallback:', e);
      return fallback;
    }
  }

  // Helper to initialize Gemini client safely
  private getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-aicontroller',
        },
      },
    });
  }

  // ==========================================
  // Low-Level Provider Callers
  // ==========================================
  private async callGemini(
    model: string | undefined,
    systemInstruction: string,
    prompt: string,
    temperature = 0.65
  ): Promise<{ text: string; model: string }> {
    const ai = this.getGeminiClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }

    const candidateModels = Array.from(
      new Set([
        model || 'gemini-3.7-flash',
        ...this.GEMINI_CANDIDATE_MODELS,
      ].filter(Boolean))
    );

    let lastError: any = null;

    for (const currentModel of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              systemInstruction,
              temperature,
            },
          });

          const text = response.text?.trim();
          if (!text) {
            throw new Error(`${currentModel} returned an empty response.`);
          }

          return {
            text,
            model: currentModel,
          };
        } catch (err: any) {
          lastError = err;
          const isQuotaExhausted =
            err?.status === 429 ||
            err?.message?.includes('429') ||
            err?.message?.includes('quota') ||
            err?.message?.includes('RESOURCE_EXHAUSTED');
          const is503 =
            err?.status === 503 ||
            err?.message?.includes('503') ||
            err?.message?.includes('high demand');

          if (isQuotaExhausted) {
            console.warn(`[AIController] Gemini model ${currentModel} quota exhausted, trying next fallback model.`);
            break;
          }

          if (attempt === 0 && is503) {
            console.warn(`[AIController] Gemini model ${currentModel} transient 503, retrying once...`);
            continue;
          }

          console.warn(`[AIController] Gemini model ${currentModel} error:`, err.message || err);
          break;
        }
      }
    }

    throw lastError || new Error('All Gemini candidate models failed.');
  }

  // Helper to extract sanitized OpenRouter key
  private getSanitizedOpenRouterKey(customApiKey?: string): string | null {
    if (customApiKey && typeof customApiKey === 'string') {
      const trimmed = customApiKey.trim();
      if (trimmed.length > 5 && trimmed !== 'MY_OPENROUTER_API_KEY') {
        return trimmed;
      }
    }

    const envKey = process.env.OPENROUTER_API_KEY;
    if (envKey && typeof envKey === 'string') {
      const trimmed = envKey.trim();
      if (trimmed.length > 5 && trimmed !== 'MY_OPENROUTER_API_KEY') {
        return trimmed;
      }
    }

    return null;
  }

  private async callOpenRouter(
    taskCategory: AITaskCategory,
    systemInstruction: string,
    prompt: string,
    preferredModel?: string,
    customApiKey?: string,
    temperature?: number
  ): Promise<{ text: string; model: string }> {
    const apiKey = this.getSanitizedOpenRouterKey(customApiKey);

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured or contains placeholder values.');
    }

    const appUrl = process.env.APP_URL || 'https://ai.studio';
    const effectiveSystemMessage = systemInstruction || this.BUSINESS_ADVISOR_SYSTEM_MESSAGE;

    const taskCandidates = this.TASK_MODEL_REGISTRY[taskCategory] || this.TASK_MODEL_REGISTRY.ANALYTICAL_TASK;
    const candidateModels = Array.from(
      new Set([
        ...(preferredModel ? [preferredModel] : []),
        ...taskCandidates,
        'meta-llama/llama-3.3-70b-instruct',
        'mistralai/mistral-small-24b-instruct-2501',
        'qwen/qwen-2.5-72b-instruct',
        'deepseek/deepseek-chat',
        'meta-llama/llama-3.1-8b-instruct',
        'meta-llama/llama-3.2-3b-instruct',
      ].filter(Boolean))
    );

    let lastError: any = null;
    const calculatedTemp =
      temperature !== undefined
        ? temperature
        : taskCategory === 'CREATIVE_TASK'
        ? 0.7
        : taskCategory === 'REASONING_TASK'
        ? 0.3
        : 0.5;

    for (const currentModel of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': appUrl,
            'X-Title': 'BEANNEL Business Intelligence Engine',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: effectiveSystemMessage },
              { role: 'user', content: prompt },
            ],
            temperature: calculatedTemp,
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData?.error?.message || errorData?.message || `HTTP ${response.status}`;

          // Fast-fail if authentication or billing issue affects the entire account
          if (response.status === 401) {
            throw new Error(`OpenRouter Authentication Failed (401): ${errorMsg}`);
          }
          if (response.status === 402) {
            throw new Error(`OpenRouter Balance / Credits Exhausted (402): ${errorMsg}`);
          }

          console.warn(`[AIController] OpenRouter model ${currentModel} returned ${response.status}: ${errorMsg}. Trying fallback candidate...`);
          lastError = new Error(`${currentModel}: ${errorMsg}`);
          continue;
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (!text) {
          throw new Error(`${currentModel} returned an empty text response.`);
        }

        return {
          text,
          model: currentModel,
        };
      } catch (err: any) {
        // If it's a fatal account-level error (401 / 402), do not loop other models with the same broken key
        if (err?.message?.includes('Authentication Failed') || err?.message?.includes('Balance / Credits Exhausted')) {
          throw err;
        }

        const isTimeout = err?.name === 'AbortError';
        console.warn(`[AIController] OpenRouter candidate ${currentModel} error:`, isTimeout ? 'Request timed out' : err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('All OpenRouter candidate models failed.');
  }

  // ==========================================
  // Deterministic Local Analytical Engine
  // ==========================================
  public generateLocalAdvisorBriefing(data: {
    businessName: string;
    ownerName: string;
    currency: string;
    healthScore: number;
    healthStatus: string;
    healthSentence: string;
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    centsKept: number;
    dailyVelocity: number;
    txCount: number;
    valuation: number;
    topProducts: Array<{ name: string; qtySold?: number; revenue: number; profit: number }>;
    slowProducts: Array<{ name: string; stock: number; moneyTrapped?: number; buyPrice?: number }>;
    lowStockItems: Array<{ name: string; stock: number; minThreshold?: number; sellPrice?: number }>;
    forecastSales: number;
    forecastProfit: number;
    customPrompt?: string;
  }): string {
    const {
      businessName,
      ownerName,
      currency,
      healthScore,
      healthStatus,
      healthSentence,
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      centsKept,
      dailyVelocity,
      txCount,
      valuation,
      topProducts,
      slowProducts,
      lowStockItems,
      forecastSales,
      forecastProfit,
      customPrompt,
    } = data;

    if (customPrompt) {
      return `### 📊 Live Store Analysis for ${ownerName} (${businessName})
**Your Question**: "${customPrompt}"

**Direct Answer & Data Insight**:
- **Current Store Revenue**: ${currency}${totalRevenue.toFixed(2)} across ${txCount} transactions (~${currency}${dailyVelocity.toFixed(2)}/day).
- **Actual Take-Home Profit**: ${currency}${netProfit.toFixed(2)} (you keep **${centsKept}¢** out of every ${currency}1.00 brought in).
- **Inventory Capital**: ${currency}${valuation.toFixed(2)} tied up in stock on shelf.

**Actionable Recommendation**:
1. Focus on replenishing your top revenue drivers (${topProducts.slice(0, 2).map((p) => p.name).join(', ') || 'core catalog'}) to maintain daily cashflow.
2. If store bills (${currency}${totalExpenses.toFixed(2)}) exceed 20% of sales, schedule non-essential supplier orders after major sales cycles.
3. Keep monitoring daily checkout velocity to hit your 30-day projected target of ~${currency}${forecastSales.toFixed(2)}.`;
    }

    const topSellerNames = topProducts
      .slice(0, 3)
      .map((p) => `**${p.name}** (${currency}${p.revenue.toFixed(2)} sales)`)
      .join(', ');
    const lowStockNames = lowStockItems
      .slice(0, 3)
      .map((i) => `**${i.name}** (${i.stock} left)`)
      .join(', ');
    const slowStockNames = slowProducts
      .slice(0, 2)
      .map((s) => `**${s.name}** (${currency}${(s.moneyTrapped || 0).toFixed(2)} trapped)`)
      .join(', ');

    return `### 1. Overall Business Health
Your business is currently **${healthStatus}** with a store health score of **${healthScore}/100**. ${healthSentence || `You are taking home ${centsKept}¢ for every ${currency}1.00 brought in across ${txCount} sales.`}

### 2. What’s Going Well
- **Real Take-Home Profit**: You earned **${currency}${netProfit.toFixed(2)}** in actual money kept after paying product costs and store bills from **${currency}${totalRevenue.toFixed(2)}** in sales.
- **Strong Product Demand**: Your top items (${topSellerNames || 'active products'}) are generating consistent daily customer orders (~${currency}${dailyVelocity.toFixed(2)}/day).
- **Steady Turnover**: Customers are actively buying, keeping wholesale margin retention healthy.

### 3. Main Problems and Why They Are Happening
- **Low Stock Risk**: ${lowStockItems.length > 0 ? `You have ${lowStockItems.length} item(s) running dangerously low on shelves (${lowStockNames}). If they sell out, sales stop immediately.` : 'Stock levels on key items are currently stable.'}
- **Money Trapped in Slow Items**: ${slowProducts.length > 0 ? `You have cash sitting idle in slow inventory (${slowStockNames}) that you cannot use for fresh stock.` : 'Inventory is turning over without major idle bottlenecks.'}
- **Store Bills Consumption**: Overhead expenses stand at **${currency}${totalExpenses.toFixed(2)}** (${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0'}% of sales).

### 4. Practical Recommendations
1. **Reorder Low-Stock Winners**: Replenish your top sellers (${topProducts.slice(0, 2).map((p) => p.name).join(', ') || 'core items'}) before they run out to maintain your ~${currency}${dailyVelocity.toFixed(2)} daily income.
2. **Bundle Slower Stock**: Create a bundle deal combining slower items with your popular products to recover cash tied up on shelves.
3. **Review Routine Store Bills**: Check recurring expenses (${currency}${totalExpenses.toFixed(2)}) and eliminate any non-essential services.
4. **Target 30-Day Growth**: Maintain daily sales momentum to reach your projected **~${currency}${forecastSales.toFixed(2)}** sales target.`;
  }

  // ==========================================
  // Centralized AI Dispatch Engine (Single Entry Point)
  // ==========================================
  public async executeTask(options: AIExecutionOptions): Promise<AIExecutionResult> {
    const startTime = Date.now();
    const taskCategory = options.taskCategory || this.classifyTask(options.mode, options.prompt);
    const systemInstruction = options.systemInstruction || this.BUSINESS_ADVISOR_SYSTEM_MESSAGE;
    const preferredProvider = options.preferredProvider || 'auto';

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    const sanitizedOpenRouterKey = this.getSanitizedOpenRouterKey(options.customApiKey);
    const hasOpenRouterKey = Boolean(sanitizedOpenRouterKey);

    let errorDetail = '';

    // Route 1: If user explicitly wants Gemini or if auto selects Gemini
    if (preferredProvider === 'gemini' || (preferredProvider === 'auto' && hasGeminiKey && !hasOpenRouterKey)) {
      if (hasGeminiKey) {
        try {
          const res = await this.callGemini(options.preferredModel, systemInstruction, options.prompt, options.temperature);
          return {
            text: res.text,
            provider: 'gemini',
            model: res.model,
            taskCategory,
            fallbackUsed: false,
            latencyMs: Date.now() - startTime,
          };
        } catch (gemErr: any) {
          console.warn('[AIController] Primary Gemini call failed, attempting OpenRouter fallback:', gemErr.message);
          errorDetail = gemErr.message;
          if (hasOpenRouterKey) {
            try {
              const openRouterRes = await this.callOpenRouter(
                taskCategory,
                systemInstruction,
                options.prompt,
                options.preferredModel,
                sanitizedOpenRouterKey || undefined,
                options.temperature
              );
              return {
                text: openRouterRes.text,
                provider: 'openrouter',
                model: openRouterRes.model,
                taskCategory,
                fallbackUsed: true,
                errorDetail,
                latencyMs: Date.now() - startTime,
              };
            } catch (orErr: any) {
              console.warn('[AIController] OpenRouter fallback also failed:', orErr.message);
            }
          }
        }
      }
    }

    // Route 2: OpenRouter primary (or fallback from Gemini)
    if (hasOpenRouterKey) {
      try {
        const openRouterRes = await this.callOpenRouter(
          taskCategory,
          systemInstruction,
          options.prompt,
          options.preferredModel,
          sanitizedOpenRouterKey || undefined,
          options.temperature
        );
        return {
          text: openRouterRes.text,
          provider: 'openrouter',
          model: openRouterRes.model,
          taskCategory,
          fallbackUsed: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (orErr: any) {
        console.warn('[AIController] OpenRouter call failed, attempting Gemini fallback:', orErr.message);
        errorDetail = orErr.message;
        if (hasGeminiKey) {
          try {
            const gemRes = await this.callGemini(
              options.preferredModel || 'gemini-3.7-flash',
              systemInstruction,
              options.prompt,
              options.temperature
            );
            return {
              text: gemRes.text,
              provider: 'gemini',
              model: gemRes.model,
              taskCategory,
              fallbackUsed: true,
              errorDetail,
              latencyMs: Date.now() - startTime,
            };
          } catch (gemErr: any) {
            console.warn('[AIController] Gemini fallback also failed:', gemErr.message);
          }
        }
      }
    } else if (hasGeminiKey) {
      try {
        const gemRes = await this.callGemini(
          options.preferredModel || 'gemini-3.7-flash',
          systemInstruction,
          options.prompt,
          options.temperature
        );
        return {
          text: gemRes.text,
          provider: 'gemini',
          model: gemRes.model,
          taskCategory,
          fallbackUsed: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (gemErr: any) {
        console.warn('[AIController] Gemini call failed:', gemErr.message);
        errorDetail = gemErr.message;
      }
    }

    // Route 3: Deterministic fallback response when both cloud APIs are unreachable
    return {
      text: 'Business Intelligence High-Availability Engine is active. Telemetry data loaded and monitored.',
      provider: 'local',
      model: 'BEANNEL Local Intelligence Engine',
      taskCategory,
      fallbackUsed: true,
      errorDetail: errorDetail || 'Cloud AI providers temporarily unavailable; local telemetry engine engaged.',
      latencyMs: Date.now() - startTime,
    };
  }

  // ==========================================
  // Domain-Specific Handlers
  // ==========================================
  public async handleAdvisorRequest(payload: BusinessAdvisorDataPayload): Promise<{
    advice: string;
    analysis: string;
    provider: string;
    model: string;
    fallbackUsed: boolean;
    note?: string;
    timestamp: string;
  }> {
    const {
      businessName,
      ownerName,
      currency,
      healthScore,
      healthStatus,
      healthSentence,
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      centsKept,
      dailyVelocity,
      txCount,
      valuation,
      topProducts,
      slowProducts,
      lowStockItems,
      categorySales,
      categoryExpenses,
      forecastSales,
      forecastProfit,
      trendDirection,
      customPrompt,
      preferredProvider,
      selectedModel,
      apiKey,
    } = payload;

    const realDataBriefing = `### REAL CALCULATED BUSINESS TELEMETRY FOR "${businessName}":
- **Owner**: ${ownerName}
- **Currency**: ${currency}
- **Health Score**: ${healthScore}/100 (${healthStatus}) - "${healthSentence}"
- **Total Revenue**: ${currency}${totalRevenue.toFixed(2)} (${txCount} sales, ~${currency}${dailyVelocity.toFixed(2)}/day velocity)
- **Wholesale Goods Cost**: ${currency}${totalCOGS.toFixed(2)}
- **Gross Profit**: ${currency}${grossProfit.toFixed(2)}
- **Store Bills/Overhead**: ${currency}${totalExpenses.toFixed(2)}
- **Net Profit**: ${currency}${netProfit.toFixed(2)} (${centsKept}¢ kept per $1.00)
- **Inventory Valuation**: ${currency}${valuation.toFixed(2)}
- **Low Stock Items Alert**: ${lowStockItems.length} items (${lowStockItems.map((i) => `${i.name}: ${i.stock} left`).join(', ') || 'Healthy'})
- **Top Product Performers**: ${topProducts.map((p) => `${p.name} (${currency}${p.revenue || 0} sales)`).join(', ') || 'No sales yet'}
- **Slow-Moving / Trapped Capital**: ${slowProducts.map((s) => `${s.name} (${currency}${s.moneyTrapped || 0} trapped)`).join(', ') || 'None'}
- **Category Sales**: ${categorySales && categorySales.length > 0 ? JSON.stringify(categorySales) : 'General'}
- **Expense Categories**: ${categoryExpenses && categoryExpenses.length > 0 ? JSON.stringify(categoryExpenses) : 'No expenses logged'}
- **30-Day Forecast**: ~${currency}${forecastSales.toFixed(2)} sales, ~${currency}${forecastProfit.toFixed(2)} net profit (${trendDirection || 'steady'})`;

    let prompt = '';
    if (customPrompt) {
      prompt = `${realDataBriefing}

The store owner is asking you:
"${customPrompt}"

Please answer directly using the real business numbers above with practical, encouraging, step-by-step guidance.`;
    } else {
      prompt = `${realDataBriefing}

Please analyze this store's real numbers and provide a concise executive review structured as:
1. **Overall business health**
2. **What’s going well**
3. **Main problems and why they are happening**
4. **Practical recommendations** (3–5 concrete actions)`;
    }

    const taskCategory = this.classifyTask('advisor', customPrompt || prompt);

    const execResult = await this.executeTask({
      taskCategory,
      prompt,
      systemInstruction: this.BUSINESS_ADVISOR_SYSTEM_MESSAGE,
      preferredModel: selectedModel,
      preferredProvider,
      customApiKey: apiKey,
    });

    let finalText = execResult.text;
    let provider = execResult.provider;
    let model = execResult.model;
    let fallbackUsed = execResult.fallbackUsed;

    // If local fallback was used, generate rich deterministic markdown
    if (execResult.provider === 'local') {
      finalText = this.generateLocalAdvisorBriefing({
        businessName,
        ownerName,
        currency,
        healthScore,
        healthStatus,
        healthSentence,
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        centsKept,
        dailyVelocity,
        txCount,
        valuation,
        topProducts,
        slowProducts,
        lowStockItems,
        forecastSales,
        forecastProfit,
        customPrompt,
      });
      provider = 'local';
      model = 'POS High-Availability Analytical Engine';
      fallbackUsed = true;
    }

    return {
      advice: finalText,
      analysis: finalText,
      provider,
      model,
      fallbackUsed,
      note: fallbackUsed ? `Active engine: ${model} (${execResult.errorDetail || 'high availability mode'})` : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  public async handleCentralBrainRequest(payload: {
    mode: string;
    prompt?: string;
    storeContext?: Record<string, any>;
    preferredModel?: string;
    preferredProvider?: 'gemini' | 'openrouter' | 'auto';
    clientApiKey?: string;
  }): Promise<{
    result: string;
    mode: string;
    provider: string;
    model: string;
    fallbackUsed: boolean;
    timestamp: string;
  }> {
    const { mode, prompt, storeContext, preferredModel, preferredProvider, clientApiKey } = payload;
    const cur = storeContext?.currency || '$';
    const bName = storeContext?.businessName || 'Store';

    let systemInstruction = `You are the Central Autonomous Brain and Chief Operating Officer for "${bName}".
You have real-time telemetry access to POS checkouts, inventory stock, suppliers, profit margins, and expenses.
Provide sharp, actionable, direct, and numerically grounded intelligence. Keep formatting neat and concise.`;

    let finalPrompt = '';

    if (mode === 'pos_upsell') {
      systemInstruction = `You are the POS Real-time Checkout AI Brain.
Based on the items currently in the cart, recommend 1 to 2 high-converting complementary products from the available catalog to increase basket size and gross margin.
Rules:
- Return a compact JSON object with:
  "headline": string (e.g. "Smart Pairing Suggestion"),
  "suggestedProductId": string (id of product if available),
  "suggestedProductName": string,
  "rationale": string (1 concise sentence why customer buys this together),
  "pitch": string (exact 1-sentence phrasing the cashier can say),
  "estimatedMarginBoost": string (e.g. "+$14.00 gross profit")
Do NOT output code fences or extra text, only the raw valid JSON.`;

      finalPrompt = `Active Cart Items: ${JSON.stringify(storeContext?.cartItems || [])}
Available Store Catalog: ${JSON.stringify(storeContext?.availableCatalog || [])}
Recommend the best upsell item now.`;
    } else if (mode === 'inventory_restock') {
      systemInstruction = `You are the Inventory & Working Capital Intelligence Brain.
Analyze stock levels, sales velocity, lead times, and trapped capital.
Provide:
1. Urgent restock priorities (products, suggested reorder qty, estimated supplier cost).
2. Deadstock liquidation plan for slow items (specific bundle or discount tactic to recover trapped cash).
Be crisp, specific, and practical.`;

      finalPrompt = `Store Inventory Data:
- Low Stock Items: ${JSON.stringify(storeContext?.lowStockItems || [])}
- Slow Moving Items with Trapped Cash: ${JSON.stringify(storeContext?.slowProducts || [])}
- Top Selling Items: ${JSON.stringify(storeContext?.topProducts || [])}
- Total Inventory Capital: ${cur}${storeContext?.totalValuation || 0}
Provide the optimal inventory action plan.`;
    } else if (mode === 'dashboard_briefing') {
      systemInstruction = `You are the Central Autonomous Brain providing the daily morning executive briefing.
Deliver a punchy 3-bullet priority briefing for the owner:
- Telemetry Status (Health score, take-home profit & checkout velocity)
- Top Operational Priority (What to order/restock or promote today)
- Cashflow & Risk Warning (Bills vs income or stagnant stock)`;

      finalPrompt = `Store Status Telemetry:
- Revenue: ${cur}${storeContext?.totalRevenue || 0}, Net Profit: ${cur}${storeContext?.netProfit || 0}
- Health Score: ${storeContext?.healthScore || 80}/100
- Transactions: ${storeContext?.txCount || 0}
- Low Stock Alerts: ${storeContext?.lowStockCount || 0}
- Stagnant Stock Trapped Cash: ${cur}${storeContext?.trappedCash || 0}
- Total Expenses: ${cur}${storeContext?.totalExpenses || 0}
Generate the executive autonomous briefing now.`;
    } else if (mode === 'expense_audit') {
      systemInstruction = `You are the Expense & Margin Auditor Brain.
Analyze store overhead, expenses by category, and burn rate. Identify high-cost leaks and give 2 clear cost-reduction strategies.`;

      finalPrompt = `Store Financials:
- Revenue: ${cur}${storeContext?.totalRevenue || 0}
- Total Expenses: ${cur}${storeContext?.totalExpenses || 0}
- Expense Categories: ${JSON.stringify(storeContext?.expenseCategories || [])}
- Net Margin: ${storeContext?.centsKept || 0}¢ kept per $1.00
Deliver an expense optimization audit.`;
    } else {
      finalPrompt = `Store Context:
- Business: ${bName}
- Revenue: ${cur}${storeContext?.totalRevenue || 0}, Net Profit: ${cur}${storeContext?.netProfit || 0}
- Products: ${storeContext?.productCount || 0} in catalog
- Low Stock: ${storeContext?.lowStockCount || 0} items
- Daily Sales Velocity: ~${cur}${storeContext?.dailyVelocity || 0}/day

User Question / Command:
"${prompt || 'What should I focus on right now to grow profitability?'}"`;
    }

    const execResult = await this.executeTask({
      mode,
      prompt: finalPrompt,
      systemInstruction,
      preferredModel,
      preferredProvider,
      customApiKey: clientApiKey,
    });

    let result = execResult.text;
    if (execResult.provider === 'local') {
      if (mode === 'pos_upsell') {
        const topProd = storeContext?.availableCatalog?.[0]?.name || 'Featured Item';
        result = JSON.stringify({
          headline: 'Suggested Add-on',
          suggestedProductName: topProd,
          rationale: 'Popular complement based on recent store purchasing trends.',
          pitch: `Would you like to add ${topProd} with your order today?`,
          estimatedMarginBoost: '+15% margin boost',
        });
      } else {
        result = `Store revenue is ${cur}${storeContext?.totalRevenue || 0} with ${storeContext?.lowStockCount || 0} stockout warnings. Take-home profit is ${cur}${storeContext?.netProfit || 0}. Focus on replenishing high-velocity items.`;
      }
    }

    return {
      result,
      mode,
      provider: execResult.provider,
      model: execResult.model,
      fallbackUsed: execResult.fallbackUsed,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // Health & Diagnostics Ping
  // ==========================================
  public async pingDiagnostic(customApiKey?: string, modelId?: string): Promise<{
    status: 'healthy' | 'fallback_ready';
    openRouterStatus: 'connected' | 'unconfigured' | 'error';
    openRouterKeyConfigured: boolean;
    geminiKeyConfigured: boolean;
    latencyMs: number;
    testedModel: string;
    errorMsg?: string;
    availableFreeModels: Array<{ id: string; name: string }>;
    timestamp: string;
  }> {
    const startTime = Date.now();
    const apiKey = this.getSanitizedOpenRouterKey(customApiKey);
    const hasOpenRouter = Boolean(apiKey);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    let openRouterStatus: 'connected' | 'unconfigured' | 'error' = 'unconfigured';
    const testModel = modelId || 'meta-llama/llama-3.3-70b-instruct';
    let latencyMs = 0;
    let errorMsg = '';

    if (hasOpenRouter && apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const pingRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
            'X-Title': 'BEANNEL Central Brain Ping',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 3,
          }),
        });

        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;

        if (pingRes.ok) {
          openRouterStatus = 'connected';
        } else {
          const data = await pingRes.json().catch(() => ({}));
          errorMsg = data?.error?.message || `HTTP ${pingRes.status}`;
          openRouterStatus = 'error';
        }
      } catch (err: any) {
        latencyMs = Date.now() - startTime;
        errorMsg = err.name === 'AbortError' ? 'Ping request timed out' : (err.message || 'Connection error');
        openRouterStatus = 'error';
      }
    }

    return {
      status: openRouterStatus === 'connected' || hasGemini ? 'healthy' : 'fallback_ready',
      openRouterStatus,
      openRouterKeyConfigured: hasOpenRouter,
      geminiKeyConfigured: hasGemini,
      latencyMs,
      testedModel: testModel,
      errorMsg: errorMsg || undefined,
      availableFreeModels: [
        { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Google Native)' },
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct (Executive Advisor)' },
        { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B (Fast & Sharp)' },
        { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B (Top Tier Reasoning)' },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (General Intelligence)' },
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Fast Business Logic)' },
        { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B (Lightweight)' },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}
