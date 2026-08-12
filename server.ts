import express from 'express';
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

    const { summary, topProducts, currency, customPrompt } = req.body;

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
Currency: ${currency || '$'}
Total Sales Revenue: ${summary?.totalRevenue ?? 0}
Cost of Goods Sold (COGS): ${summary?.totalCOGS ?? 0}
Gross Profit: ${summary?.grossProfit ?? 0}
Operating Expenses: ${summary?.totalExpenses ?? 0}
Net Profit: ${summary?.netProfit ?? 0}
Gross Profit Margin: ${summary?.totalRevenue > 0 ? ((summary.grossProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
Net Profit Margin: ${summary?.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
Owner Capital Injected: ${summary?.totalCapital ?? 0}
Inventory Valuation (Cost): ${summary?.totalInventoryValuation ?? 0}
Potential Sales Value: ${summary?.totalPotentialRevenue ?? 0}
Low Stock Alert Count: ${summary?.lowStockCount ?? 0}
Top Selling Products: ${JSON.stringify(topProducts || [])}

${customPrompt ? `User Specific Focus: ${customPrompt}` : 'Provide a comprehensive profit analysis and strategic advice.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      analysis: response.text || 'No analysis text generated.',
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate profit analysis.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
