import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { AIController } from './src/server/aiController';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Centralized AIController singleton
const aiController = AIController.getInstance();

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ==========================================
// UNIFIED AI CONTROLLER ENDPOINTS
// All AI requests route strictly through AIController
// ==========================================

// 1. Direct General Task Execution Endpoint
app.post('/api/ai/execute', async (req, res) => {
  try {
    const customKey = (typeof req.headers['x-openrouter-key'] === 'string' && req.headers['x-openrouter-key']) || req.body?.customApiKey;
    const result = await aiController.executeTask({
      taskCategory: req.body?.taskCategory,
      mode: req.body?.mode,
      systemInstruction: req.body?.systemInstruction,
      prompt: req.body?.prompt,
      preferredModel: req.body?.preferredModel,
      preferredProvider: req.body?.preferredProvider,
      customApiKey: customKey,
      temperature: req.body?.temperature,
      maxTokens: req.body?.maxTokens,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[AIController API] Execute task error:', err);
    return res.status(500).json({ error: err.message || 'AI task execution failed.' });
  }
});

// 2. Business Profit Advisor Endpoint (Legacy & Enhanced Compatibility)
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
      preferredProvider,
      selectedModel,
      apiKey,
    } = req.body || {};

    const customKey = (typeof req.headers['x-openrouter-key'] === 'string' && req.headers['x-openrouter-key']) || apiKey;

    const sanitizeNum = (val: any) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const cleanRevenue = sanitizeNum(summary?.totalRevenue);
    const cleanCOGS = sanitizeNum(summary?.totalCOGS);
    const cleanGrossProfit = sanitizeNum(summary?.grossProfit);
    const cleanExpenses = sanitizeNum(summary?.totalExpenses);
    const cleanNetProfit = sanitizeNum(summary?.netProfit);
    const cleanTxCount = sanitizeNum(summary?.transactionCount);
    const cleanValuation = sanitizeNum(summary?.totalInventoryValuation);

    const cleanHealthScore = sanitizeNum(health?.healthScore) || (cleanRevenue > 0 && cleanNetProfit > 0 ? 78 : 50);
    const safeHealthStatus = typeof health?.healthStatus === 'string' ? health.healthStatus : 'Operating';
    const safeHealthSentence = typeof health?.healthSummarySentence === 'string' ? health.healthSummarySentence : '';
    const cleanCentsKept = sanitizeNum(health?.centsKeptPerDollar) || (cleanRevenue > 0 ? Math.round((cleanNetProfit / cleanRevenue) * 100) : 0);
    const cleanDailyVelocity = sanitizeNum(health?.dailySalesVelocity);

    const safeTopProducts = Array.isArray(topProducts)
      ? topProducts.slice(0, 8).map((p: any) => ({
          name: String(p?.name || 'Product'),
          qtySold: sanitizeNum(p?.qtySold),
          revenue: sanitizeNum(p?.revenue),
          profit: sanitizeNum(p?.profit),
        }))
      : [];

    const safeSlowProducts = Array.isArray(slowProducts)
      ? slowProducts.slice(0, 8).map((p: any) => ({
          name: String(p?.name || 'Product'),
          stock: sanitizeNum(p?.stock),
          moneyTrapped: sanitizeNum(p?.moneyTrapped),
        }))
      : [];

    const safeLowStock = Array.isArray(lowStockItems)
      ? lowStockItems.slice(0, 8).map((p: any) => ({
          name: String(p?.name || 'Product'),
          stock: sanitizeNum(p?.stock),
          minThreshold: sanitizeNum(p?.minThreshold),
        }))
      : [];

    const result = await aiController.handleAdvisorRequest({
      businessName: typeof businessName === 'string' && businessName.trim() ? businessName.trim() : 'Your Store',
      ownerName: typeof ownerName === 'string' && ownerName.trim() ? ownerName.trim() : 'Store Owner',
      currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 5) : '$',
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
      categorySales: Array.isArray(categorySales) ? categorySales : [],
      categoryExpenses: Array.isArray(categoryExpenses) ? categoryExpenses : [],
      forecastSales: sanitizeNum(forecast?.expected30DaySales),
      forecastProfit: sanitizeNum(forecast?.expected30DayProfit),
      trendDirection: typeof forecast?.trendDirection === 'string' ? forecast.trendDirection : 'steady',
      customPrompt: typeof customPrompt === 'string' ? customPrompt.trim() : undefined,
      preferredProvider,
      selectedModel,
      apiKey: customKey,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[AIController API] Profit advisor error:', err);
    return res.status(500).json({ error: err.message || 'Profit advisor analysis failed.' });
  }
});

// 3. Business Advisor Endpoint
app.post('/api/business-advisor', async (req, res) => {
  try {
    const customKey = (typeof req.headers['x-openrouter-key'] === 'string' && req.headers['x-openrouter-key']) || req.body?.apiKey;

    const sanitizeNum = (val: any) => {
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const cleanRevenue = sanitizeNum(req.body?.totalRevenue);
    const cleanCOGS = sanitizeNum(req.body?.wholesaleCost);
    const cleanGrossProfit = sanitizeNum(req.body?.grossProfit);
    const cleanExpenses = sanitizeNum(req.body?.totalExpenses);
    const cleanNetProfit = sanitizeNum(req.body?.netProfit);
    const cleanTxCount = sanitizeNum(req.body?.txCount);
    const cleanCentsKept = sanitizeNum(req.body?.centsKept) || (cleanRevenue > 0 ? Math.round((cleanNetProfit / cleanRevenue) * 100) : 0);
    const cleanDailyVelocity = sanitizeNum(req.body?.dailyVelocity);
    const cleanHealthScore = sanitizeNum(req.body?.healthScore) || (cleanRevenue > 0 && cleanNetProfit > 0 ? 78 : 50);

    const safeTopProducts = Array.isArray(req.body?.topProducts) ? req.body.topProducts.slice(0, 8) : [];
    const safeLowStock = Array.isArray(req.body?.lowStockItems) ? req.body.lowStockItems.slice(0, 8) : [];
    const safeSlowProducts = Array.isArray(req.body?.slowProducts) ? req.body.slowProducts.slice(0, 8) : [];
    const safeExpenseCategories = Array.isArray(req.body?.expenseCategories) ? req.body.expenseCategories.slice(0, 6) : [];

    const result = await aiController.handleAdvisorRequest({
      businessName: typeof req.body?.businessName === 'string' && req.body.businessName.trim() ? req.body.businessName.trim() : 'Your Store',
      ownerName: typeof req.body?.ownerName === 'string' && req.body.ownerName.trim() ? req.body.ownerName.trim() : 'Store Owner',
      currency: typeof req.body?.currency === 'string' && req.body.currency.trim() ? req.body.currency.trim().slice(0, 5) : '$',
      healthScore: cleanHealthScore,
      healthStatus: typeof req.body?.healthStatus === 'string' ? req.body.healthStatus : 'Operating',
      healthSentence: typeof req.body?.healthSentence === 'string' ? req.body.healthSentence : '',
      totalRevenue: cleanRevenue,
      totalCOGS: cleanCOGS,
      grossProfit: cleanGrossProfit,
      totalExpenses: cleanExpenses,
      netProfit: cleanNetProfit,
      centsKept: cleanCentsKept,
      dailyVelocity: cleanDailyVelocity,
      txCount: cleanTxCount,
      valuation: 0,
      topProducts: safeTopProducts,
      slowProducts: safeSlowProducts,
      lowStockItems: safeLowStock,
      categoryExpenses: safeExpenseCategories,
      forecastSales: sanitizeNum(req.body?.forecastSales),
      forecastProfit: sanitizeNum(req.body?.forecastProfit),
      customPrompt: typeof req.body?.customPrompt === 'string' ? req.body.customPrompt.trim() : undefined,
      preferredProvider: req.body?.provider,
      selectedModel: req.body?.model,
      apiKey: customKey,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[AIController API] Business advisor error:', err);
    return res.status(500).json({ error: err.message || 'Business advisor error.' });
  }
});

// 4. Central Autonomous Brain Intelligence API
app.post('/api/ai/central-brain', async (req, res) => {
  try {
    const customKey = (typeof req.headers['x-openrouter-key'] === 'string' && req.headers['x-openrouter-key']) || req.body?.clientApiKey;

    const result = await aiController.handleCentralBrainRequest({
      mode: req.body?.mode || 'general_query',
      prompt: req.body?.prompt,
      storeContext: req.body?.storeContext,
      preferredModel: req.body?.preferredModel,
      preferredProvider: req.body?.preferredProvider,
      clientApiKey: customKey,
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[AIController API] Central brain error:', err);
    return res.status(500).json({ error: err.message || 'Central Brain processing failed.' });
  }
});

// 5. Diagnostic Ping & Model Health Check Endpoint
app.post('/api/ai/ping', async (req, res) => {
  try {
    const customKey = (typeof req.headers['x-openrouter-key'] === 'string' && req.headers['x-openrouter-key']) || req.body?.apiKey;
    const diagnostic = await aiController.pingDiagnostic(customKey, req.body?.model);
    return res.json(diagnostic);
  } catch (err: any) {
    console.error('[AIController API] Diagnostic ping error:', err);
    return res.status(500).json({ error: err.message || 'Diagnostic ping failed.' });
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
