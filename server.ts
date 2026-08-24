import express from 'express';
import http from 'http';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to get server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Standard Business Advisor system prompt for OpenRouter & AI Advisor
const BUSINESS_ADVISOR_SYSTEM_MESSAGE = `You are a friendly and highly capable Business Advisor (also called Business Concierge) for a small business owner.

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

// Helper to call OpenRouter API (OpenAI-compatible) with fallback model support
const callOpenRouter = async (model: string, systemInstruction: string, prompt: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not configured.');
  }

  const appUrl = process.env.APP_URL || 'https://ai.studio';
  const effectiveSystemMessage = systemInstruction || BUSINESS_ADVISOR_SYSTEM_MESSAGE;
  const candidateModels = Array.from(
    new Set([
      model || 'z-ai/glm-5.2:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-r1:free',
    ])
  );

  let lastError: any = null;

  for (const currentModel of candidateModels) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': appUrl,
          'X-Title': 'POS Business Advisor',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: 'system', content: effectiveSystemMessage },
            { role: 'user', content: prompt },
          ],
          temperature: 0.65,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || errorData?.message || `OpenRouter HTTP ${response.status}`;
        throw new Error(`${currentModel}: ${errorMsg}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error(`${currentModel} returned an empty response.`);
      }

      return {
        text,
        model: currentModel,
      };
    } catch (err: any) {
      console.warn(`OpenRouter candidate ${currentModel} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All OpenRouter candidate models failed.');
};

// Helper to call Gemini API with resilient multi-model fallbacks (handles 503 high demand spikes)
const callGemini = async (model: string, systemInstruction: string, prompt: string) => {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  // Model fallback chain: requested model -> gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash
  const candidateModels = Array.from(
    new Set([
      model || 'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-3.7-flash',
    ])
  );

  let lastError: any = null;

  for (const currentModel of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.65,
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
      console.warn(`Gemini model ${currentModel} encountered issue (trying fallback):`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed.');
};

// Deterministic local business advisor engine when all external AI APIs encounter rate/demand limits
const generateLocalAdvisorBriefing = (data: {
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
  lowStockItems: Array<{ name: string; stock: number; minThreshold: number; sellPrice?: number }>;
  forecastSales: number;
  forecastProfit: number;
  customPrompt?: string;
}) => {
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

  const topSellerNames = topProducts.slice(0, 3).map((p) => `**${p.name}** (${currency}${p.revenue.toFixed(2)} sales)`).join(', ');
  const lowStockNames = lowStockItems.slice(0, 3).map((i) => `**${i.name}** (${i.stock} left)`).join(', ');
  const slowStockNames = slowProducts.slice(0, 2).map((s) => `**${s.name}** (${currency}${(s.moneyTrapped || 0).toFixed(2)} trapped)`).join(', ');

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
};

// Business Advisor Endpoint (OpenRouter primary with Gemini fallback & model switching)
app.post('/api/gemini/profit-advisor', async (req, res) => {
  try {
    const {
      summary,
      health,
      topProducts,
      slowProducts,
      lowStockItems,
      categorySales,
      categoryExpenses,
      forecast,
      currency,
      businessName,
      ownerName,
      customPrompt,
      preferredProvider, // 'openrouter' | 'gemini' | 'auto'
      selectedModel,     // e.g. 'z-ai/glm-5.2:free' or 'nvidia/nemotron-3-ultra-550b-a55b:free'
    } = req.body || {};

    // Sanitize and validate inputs
    const safeCurrency = typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 5) : '$';
    const safeBusinessName = typeof businessName === 'string' && businessName.trim() ? businessName.trim().slice(0, 80) : 'Your Store';
    const safeOwnerName = typeof ownerName === 'string' && ownerName.trim() ? ownerName.trim().slice(0, 60) : 'Store Owner';

    const sanitizeNum = (val: any) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const cleanRevenue = sanitizeNum(summary?.totalRevenue);
    const cleanCOGS = sanitizeNum(summary?.totalCOGS);
    const cleanGrossProfit = sanitizeNum(summary?.grossProfit);
    const cleanExpenses = sanitizeNum(summary?.totalExpenses);
    const cleanNetProfit = sanitizeNum(summary?.netProfit);
    const cleanCapital = sanitizeNum(summary?.totalCapital);
    const cleanValuation = sanitizeNum(summary?.totalInventoryValuation);
    const cleanPotential = sanitizeNum(summary?.totalPotentialRevenue);
    const cleanLowStockCount = sanitizeNum(summary?.lowStockCount);
    const cleanOutOfStockCount = sanitizeNum(summary?.outOfStockCount);
    const cleanTxCount = sanitizeNum(summary?.transactionCount);

    const cleanHealthScore = sanitizeNum(health?.healthScore) || (cleanRevenue > 0 && cleanNetProfit > 0 ? 75 : 50);
    const safeHealthStatus = typeof health?.healthStatus === 'string' ? health.healthStatus.slice(0, 40) : 'Operating';
    const safeHealthSentence = typeof health?.healthSummarySentence === 'string' ? health.healthSummarySentence.slice(0, 200) : '';
    const cleanCentsKept = sanitizeNum(health?.centsKeptPerDollar);
    const cleanExpenseBite = sanitizeNum(health?.expenseBiteRate);
    const cleanDailyVelocity = sanitizeNum(health?.dailySalesVelocity);

    const safeTopProducts = Array.isArray(topProducts)
      ? topProducts.slice(0, 8).map((p: any) => ({
          name: String(p?.name || 'Product').slice(0, 50),
          category: String(p?.category || 'General').slice(0, 40),
          qtySold: sanitizeNum(p?.qtySold),
          revenue: sanitizeNum(p?.revenue),
          profit: sanitizeNum(p?.profit),
          buyPrice: sanitizeNum(p?.buyPrice),
          sellPrice: sanitizeNum(p?.sellPrice),
          stock: sanitizeNum(p?.stock),
        }))
      : [];

    const safeSlowProducts = Array.isArray(slowProducts)
      ? slowProducts.slice(0, 8).map((p: any) => ({
          name: String(p?.name || 'Product').slice(0, 50),
          category: String(p?.category || 'General').slice(0, 40),
          stock: sanitizeNum(p?.stock),
          buyPrice: sanitizeNum(p?.buyPrice),
          sellPrice: sanitizeNum(p?.sellPrice),
          moneyTrapped: sanitizeNum(p?.moneyTrapped),
        }))
      : [];

    const safeLowStock = Array.isArray(lowStockItems)
      ? lowStockItems.slice(0, 8).map((p: any) => ({
          name: String(p?.name || 'Product').slice(0, 50),
          stock: sanitizeNum(p?.stock),
          minThreshold: sanitizeNum(p?.minThreshold),
          sellPrice: sanitizeNum(p?.sellPrice),
        }))
      : [];

    const safeCategorySales = Array.isArray(categorySales)
      ? categorySales.slice(0, 6).map((c: any) => ({
          name: String(c?.name || 'Category').slice(0, 40),
          revenue: sanitizeNum(c?.revenue),
          profit: sanitizeNum(c?.profit),
        }))
      : [];

    const safeCategoryExpenses = Array.isArray(categoryExpenses)
      ? categoryExpenses.slice(0, 6).map((e: any) => ({
          name: String(e?.name || 'Expense Category').slice(0, 40),
          value: sanitizeNum(e?.value),
        }))
      : [];

    const cleanForecastSales = sanitizeNum(forecast?.expected30DaySales);
    const cleanForecastProfit = sanitizeNum(forecast?.expected30DayProfit);
    const safeTrend = typeof forecast?.trendDirection === 'string' ? forecast.trendDirection.slice(0, 30) : 'steady';

    const safeCustomPrompt = typeof customPrompt === 'string' ? customPrompt.trim().slice(0, 800) : '';

    const systemInstruction = BUSINESS_ADVISOR_SYSTEM_MESSAGE;

    // Construct the rich data briefing
    const realDataBriefing = `### REAL CALCULATED BUSINESS DATA FOR "${safeBusinessName}":
- **Owner Name**: ${safeOwnerName}
- **Currency**: ${safeCurrency}
- **Business Health Score**: ${cleanHealthScore}/100 (${safeHealthStatus}) - "${safeHealthSentence}"
- **Total Sales Earned**: ${safeCurrency}${cleanRevenue.toFixed(2)} (${cleanTxCount} total transactions, ~${safeCurrency}${cleanDailyVelocity.toFixed(2)}/day velocity)
- **Wholesale Goods Cost**: ${safeCurrency}${cleanCOGS.toFixed(2)}
- **Profit from Product Sales**: ${safeCurrency}${cleanGrossProfit.toFixed(2)}
- **Store Bills & Overhead**: ${safeCurrency}${cleanExpenses.toFixed(2)} (${cleanExpenseBite}% of sales consumed by bills)
- **Actual Take-Home Profit**: ${safeCurrency}${cleanNetProfit.toFixed(2)} (${cleanCentsKept}¢ kept on every $1.00 earned)
- **Total Capital Injected**: ${safeCurrency}${cleanCapital.toFixed(2)}
- **Total Inventory Valuation (Wholesale)**: ${safeCurrency}${cleanValuation.toFixed(2)}
- **Potential Retail Value of Stock**: ${safeCurrency}${cleanPotential.toFixed(2)}
- **Low Stock Alerts**: ${cleanLowStockCount} items low, ${cleanOutOfStockCount} items completely out of stock
- **Critical Low Stock Items**: ${safeLowStock.length > 0 ? JSON.stringify(safeLowStock) : 'None currently (stock levels healthy)'}
- **Top-Selling Products**: ${safeTopProducts.length > 0 ? JSON.stringify(safeTopProducts) : 'No sales recorded yet'}
- **Slow-Moving / Idle Products (Money Trapped)**: ${safeSlowProducts.length > 0 ? JSON.stringify(safeSlowProducts) : 'None (all products moving)'}
- **Category Sales Breakdown**: ${safeCategorySales.length > 0 ? JSON.stringify(safeCategorySales) : 'General'}
- **Expense Categories Breakdown**: ${safeCategoryExpenses.length > 0 ? JSON.stringify(safeCategoryExpenses) : 'No expenses recorded'}
- **30-Day App Forecast**: Projected Sales ~${safeCurrency}${cleanForecastSales.toFixed(2)}, Projected Take-Home Profit ~${safeCurrency}${cleanForecastProfit.toFixed(2)} (${safeTrend} trend)`;

    let prompt = '';
    if (safeCustomPrompt) {
      prompt = `${realDataBriefing}

The store owner is asking you this follow-up question:
"${safeCustomPrompt}"

Please answer the question directly using the real business numbers above. Keep your answer concise, easy to read, encouraging, and honest.`;
    } else {
      prompt = `${realDataBriefing}

Please analyze the real business data above for ${safeOwnerName} and provide your advice structured exactly as:
1. **Overall business health** (1–2 sentences)
2. **What’s going well**
3. **Main problems and why they are happening**
4. **Practical recommendations** (3–5 clear actions)`;
    }

    // Determine primary provider & model (OpenRouter is primary by default with z-ai/glm-5.2:free)
    const targetModel = selectedModel || 'z-ai/glm-5.2:free';
    const providerChoice = preferredProvider || 'openrouter';

    let resultText = '';
    let usedProvider = '';
    let usedModel = '';
    let fallbackUsed = false;
    let errorDetail = '';

    const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

    if (providerChoice === 'gemini') {
      // User explicitly requested Gemini
      try {
        const geminiRes = await callGemini(selectedModel || 'gemini-2.5-flash', systemInstruction, prompt);
        resultText = geminiRes.text;
        usedProvider = 'gemini';
        usedModel = geminiRes.model;
      } catch (geminiErr: any) {
        console.warn('Gemini request failed, trying OpenRouter fallback:', geminiErr.message);
        errorDetail = geminiErr.message;
        if (hasOpenRouterKey) {
          try {
            const openRouterRes = await callOpenRouter(targetModel, systemInstruction, prompt);
            resultText = openRouterRes.text;
            usedProvider = 'openrouter';
            usedModel = openRouterRes.model;
            fallbackUsed = true;
          } catch (openRouterErr: any) {
            console.warn('OpenRouter fallback also failed, using local analytical advisor:', openRouterErr.message);
            resultText = generateLocalAdvisorBriefing({
              businessName: safeBusinessName,
              ownerName: safeOwnerName,
              currency: safeCurrency,
              healthScore: cleanHealthScore,
              healthStatus: safeHealthStatus,
              healthSentence: safeHealthSentence,
              totalRevenue: cleanRevenue,
              totalCOGS: cleanCOGS,
              grossProfit: cleanGrossProfit,
              totalExpenses: cleanExpenses,
              netProfit: cleanNetProfit,
              centsKept: cleanCentsKept,
              dailyVelocity: cleanDailyVelocity,
              txCount: cleanTxCount,
              valuation: cleanValuation,
              topProducts: safeTopProducts,
              slowProducts: safeSlowProducts,
              lowStockItems: safeLowStock,
              forecastSales: cleanForecastSales,
              forecastProfit: cleanForecastProfit,
              customPrompt: safeCustomPrompt,
            });
            usedProvider = 'local';
            usedModel = 'POS High-Availability Analytical Engine';
            fallbackUsed = true;
          }
        } else {
          // Use instant local business analytical engine
          resultText = generateLocalAdvisorBriefing({
            businessName: safeBusinessName,
            ownerName: safeOwnerName,
            currency: safeCurrency,
            healthScore: cleanHealthScore,
            healthStatus: safeHealthStatus,
            healthSentence: safeHealthSentence,
            totalRevenue: cleanRevenue,
            totalCOGS: cleanCOGS,
            grossProfit: cleanGrossProfit,
            totalExpenses: cleanExpenses,
            netProfit: cleanNetProfit,
            centsKept: cleanCentsKept,
            dailyVelocity: cleanDailyVelocity,
            txCount: cleanTxCount,
            valuation: cleanValuation,
            topProducts: safeTopProducts,
            slowProducts: safeSlowProducts,
            lowStockItems: safeLowStock,
            forecastSales: cleanForecastSales,
            forecastProfit: cleanForecastProfit,
            customPrompt: safeCustomPrompt,
          });
          usedProvider = 'local';
          usedModel = 'POS High-Availability Analytical Engine';
          fallbackUsed = true;
        }
      }
    } else {
      // OpenRouter requested or default
      if (hasOpenRouterKey) {
        try {
          const openRouterRes = await callOpenRouter(targetModel, systemInstruction, prompt);
          resultText = openRouterRes.text;
          usedProvider = 'openrouter';
          usedModel = openRouterRes.model;
        } catch (openRouterErr: any) {
          console.warn(`OpenRouter (${targetModel}) failed, trying Gemini fallback:`, openRouterErr.message);
          errorDetail = openRouterErr.message;
          if (hasGeminiKey) {
            try {
              const geminiRes = await callGemini('gemini-2.5-flash', systemInstruction, prompt);
              resultText = geminiRes.text;
              usedProvider = 'gemini';
              usedModel = geminiRes.model;
              fallbackUsed = true;
            } catch (geminiErr: any) {
              console.warn('Gemini fallback also encountered issue, using local advisor engine:', geminiErr.message);
              resultText = generateLocalAdvisorBriefing({
                businessName: safeBusinessName,
                ownerName: safeOwnerName,
                currency: safeCurrency,
                healthScore: cleanHealthScore,
                healthStatus: safeHealthStatus,
                healthSentence: safeHealthSentence,
                totalRevenue: cleanRevenue,
                totalCOGS: cleanCOGS,
                grossProfit: cleanGrossProfit,
                totalExpenses: cleanExpenses,
                netProfit: cleanNetProfit,
                centsKept: cleanCentsKept,
                dailyVelocity: cleanDailyVelocity,
                txCount: cleanTxCount,
                valuation: cleanValuation,
                topProducts: safeTopProducts,
                slowProducts: safeSlowProducts,
                lowStockItems: safeLowStock,
                forecastSales: cleanForecastSales,
                forecastProfit: cleanForecastProfit,
                customPrompt: safeCustomPrompt,
              });
              usedProvider = 'local';
              usedModel = 'POS High-Availability Analytical Engine';
              fallbackUsed = true;
            }
          } else {
            resultText = generateLocalAdvisorBriefing({
              businessName: safeBusinessName,
              ownerName: safeOwnerName,
              currency: safeCurrency,
              healthScore: cleanHealthScore,
              healthStatus: safeHealthStatus,
              healthSentence: safeHealthSentence,
              totalRevenue: cleanRevenue,
              totalCOGS: cleanCOGS,
              grossProfit: cleanGrossProfit,
              totalExpenses: cleanExpenses,
              netProfit: cleanNetProfit,
              centsKept: cleanCentsKept,
              dailyVelocity: cleanDailyVelocity,
              txCount: cleanTxCount,
              valuation: cleanValuation,
              topProducts: safeTopProducts,
              slowProducts: safeSlowProducts,
              lowStockItems: safeLowStock,
              forecastSales: cleanForecastSales,
              forecastProfit: cleanForecastProfit,
              customPrompt: safeCustomPrompt,
            });
            usedProvider = 'local';
            usedModel = 'POS High-Availability Analytical Engine';
            fallbackUsed = true;
          }
        }
      } else if (hasGeminiKey) {
        // OpenRouter key not set, automatically use Gemini with multi-model fallback
        try {
          const geminiRes = await callGemini('gemini-2.5-flash', systemInstruction, prompt);
          resultText = geminiRes.text;
          usedProvider = 'gemini';
          usedModel = geminiRes.model;
          fallbackUsed = true;
        } catch (geminiErr: any) {
          console.warn('Gemini encountered demand issue, using local advisor engine:', geminiErr.message);
          resultText = generateLocalAdvisorBriefing({
            businessName: safeBusinessName,
            ownerName: safeOwnerName,
            currency: safeCurrency,
            healthScore: cleanHealthScore,
            healthStatus: safeHealthStatus,
            healthSentence: safeHealthSentence,
            totalRevenue: cleanRevenue,
            totalCOGS: cleanCOGS,
            grossProfit: cleanGrossProfit,
            totalExpenses: cleanExpenses,
            netProfit: cleanNetProfit,
            centsKept: cleanCentsKept,
            dailyVelocity: cleanDailyVelocity,
            txCount: cleanTxCount,
            valuation: cleanValuation,
            topProducts: safeTopProducts,
            slowProducts: safeSlowProducts,
            lowStockItems: safeLowStock,
            forecastSales: cleanForecastSales,
            forecastProfit: cleanForecastProfit,
            customPrompt: safeCustomPrompt,
          });
          usedProvider = 'local';
          usedModel = 'POS High-Availability Analytical Engine';
          fallbackUsed = true;
        }
      } else {
        // Local deterministic briefing fallback
        resultText = generateLocalAdvisorBriefing({
          businessName: safeBusinessName,
          ownerName: safeOwnerName,
          currency: safeCurrency,
          healthScore: cleanHealthScore,
          healthStatus: safeHealthStatus,
          healthSentence: safeHealthSentence,
          totalRevenue: cleanRevenue,
          totalCOGS: cleanCOGS,
          grossProfit: cleanGrossProfit,
          totalExpenses: cleanExpenses,
          netProfit: cleanNetProfit,
          centsKept: cleanCentsKept,
          dailyVelocity: cleanDailyVelocity,
          txCount: cleanTxCount,
          valuation: cleanValuation,
          topProducts: safeTopProducts,
          slowProducts: safeSlowProducts,
          lowStockItems: safeLowStock,
          forecastSales: cleanForecastSales,
          forecastProfit: cleanForecastProfit,
          customPrompt: safeCustomPrompt,
        });
        usedProvider = 'local';
        usedModel = 'POS High-Availability Analytical Engine';
        fallbackUsed = true;
      }
    }

    return res.json({
      analysis: resultText,
      provider: usedProvider,
      model: usedModel,
      fallbackUsed,
      note: fallbackUsed ? `Fallback was used because primary provider was unavailable (${errorDetail || 'no key'})` : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Business Advisor API Error:', error);
    const msg = error?.status === 429 || error?.message?.includes('rate limit')
      ? 'AI rate limit reached. Please wait a few seconds before requesting another analysis.'
      : error?.message || 'Failed to generate business advisor analysis.';
    return res.status(500).json({
      error: msg,
    });
  }
});

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
