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

// Gemini AI Profit & Business Advisor Endpoint
app.post('/api/gemini/profit-advisor', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured on the server.',
      });
    }

    const { summary, topProducts, currency, customPrompt } = req.body || {};

    // Sanitize and validate inputs
    const safeCurrency = typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 5) : '$';
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
    const cleanLowStock = sanitizeNum(summary?.lowStockCount);

    const grossMarginPct = cleanRevenue > 0 ? ((cleanGrossProfit / cleanRevenue) * 100).toFixed(1) : '0.0';
    const netMarginPct = cleanRevenue > 0 ? ((cleanNetProfit / cleanRevenue) * 100).toFixed(1) : '0.0';

    const safeTopProducts = Array.isArray(topProducts)
      ? topProducts.slice(0, 10).map((p: any) => ({
          name: String(p?.name || 'Product').slice(0, 50),
          buyPrice: sanitizeNum(p?.buyPrice),
          sellPrice: sanitizeNum(p?.sellPrice),
          stock: sanitizeNum(p?.stock),
        }))
      : [];

    const safeCustomPrompt = typeof customPrompt === 'string' ? customPrompt.trim().slice(0, 500) : '';

    const systemInstruction = `You are a financial business advisor and profit strategist for retail businesses and shop owners.
Your job is to analyze the business's revenue, cost of goods sold (COGS), gross profit, operating expenses, net profit, profit margins, and inventory metrics.
Provide sharp, actionable, practical, and highly strategic advice to increase net profit margins, reduce expenses, optimize pricing, and boost inventory turnover.

Format your response cleanly in readable text with section headers and concise bullet points.
Structure your insights into 4 key sections:
1. 📊 Profitability & Margin Health Assessment
2. 💡 COGS & Pricing Strategy (Expanding Gross Margin)
3. 📉 Expense Control & Cost Reduction
4. 🚀 3 Immediate Action Items to Boost Net Income`;

    const prompt = `Analyze this retail business's financial data:
Currency: ${safeCurrency}
Total Sales Revenue: ${cleanRevenue}
Cost of Goods Sold (COGS): ${cleanCOGS}
Gross Profit: ${cleanGrossProfit}
Operating Expenses: ${cleanExpenses}
Net Profit: ${cleanNetProfit}
Gross Profit Margin: ${grossMarginPct}%
Net Profit Margin: ${netMarginPct}%
Owner Capital Injected: ${cleanCapital}
Inventory Valuation (Cost): ${cleanValuation}
Potential Sales Value: ${cleanPotential}
Low Stock Alert Count: ${cleanLowStock}
Top Selling Products: ${JSON.stringify(safeTopProducts)}

${safeCustomPrompt ? `User Specific Focus: ${safeCustomPrompt}` : 'Provide a comprehensive profit analysis and strategic advice.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const analysisText = response.text?.trim() || 'Analysis completed. Maintain strong pricing and continuous inventory monitoring.';

    return res.json({
      analysis: analysisText,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    const msg = error?.status === 429
      ? 'AI rate limit reached. Please wait a few seconds before requesting another analysis.'
      : error?.message || 'Failed to generate profit analysis.';
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
