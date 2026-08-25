import React, { useState } from 'react';
import { Sparkles, Bot, RefreshCw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FinancialSummary, BusinessProfile, Product } from '../types';
import { AIController } from '../services/aiControllerService';

interface GeminiProfitAdvisorProps {
  summary: FinancialSummary;
  profile: BusinessProfile;
  products: Product[];
}

export const GeminiProfitAdvisor: React.FC<GeminiProfitAdvisorProps> = ({
  summary,
  profile,
  products,
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const cur = profile.currencySymbol || '$';

  // Prepare top products payload
  const topProducts = products
    .slice(0, 8)
    .map((p) => ({
      name: p.name,
      category: p.category,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      stock: p.stockQuantity,
    }));

  const fetchAiAnalysis = async (overridePrompt?: string) => {
    setLoading(true);
    setError(null);

    const promptToUse = overridePrompt !== undefined ? overridePrompt : customPrompt;

    try {
      const sanitizedSummary = {
        totalRevenue: Number(summary.totalRevenue) || 0,
        totalCOGS: Number(summary.totalCOGS) || 0,
        grossProfit: Number(summary.grossProfit) || 0,
        totalExpenses: Number(summary.totalExpenses) || 0,
        netProfit: Number(summary.netProfit) || 0,
        totalCapital: Number(summary.totalCapital) || 0,
        totalInventoryValuation: Number(summary.totalInventoryValuation) || 0,
        totalPotentialRevenue: Number(summary.totalPotentialRevenue) || 0,
        lowStockCount: Number(summary.lowStockCount) || 0,
        outOfStockCount: Number(summary.outOfStockCount) || 0,
        transactionCount: Number(summary.transactionCount) || 0,
      };

      const response = await fetch('/api/gemini/profit-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: sanitizedSummary,
          topProducts,
          currency: cur,
          businessName: profile.businessName || 'My Store',
          ownerName: profile.ownerName || 'Store Owner',
          customPrompt: promptToUse,
          preferredProvider: 'openrouter',
          selectedModel: 'z-ai/glm-5.2:free',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate AI profit insights.');
      }

      const data = await response.json();
      if (!data?.analysis) {
        throw new Error('Received empty response from AI Advisor.');
      }
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error('AI Profit Advisor Error:', err);
      setError(err?.message || 'Unable to connect to Gemini AI Profit Advisor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-3xl relative overflow-hidden space-y-4">
      {/* Header Badge & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Gemini Business Advisor
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/25 text-[10px] font-black text-blue-700 dark:text-blue-300">
                Personal AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Practical growth steps & plain-English profit recommendations
            </p>
          </div>
        </div>

        {analysis && (
          <button
            onClick={() => fetchAiAnalysis()}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-extrabold transition-all border border-black/[0.06] dark:border-white/[0.08] flex items-center space-x-1.5 active:scale-[0.97] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        )}
      </div>

      {/* Financial Snapshot Bar */}
      <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs">
        <div>
          <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider">Total Sales</span>
          <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums text-xs sm:text-sm">
            {cur}{summary.totalRevenue.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider">Take-Home Profit</span>
          <span className={`font-black tabular-nums text-xs sm:text-sm ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {cur}{summary.netProfit.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-extrabold tracking-wider">Profit Kept</span>
          <span className="font-black text-purple-600 dark:text-purple-400 tabular-nums text-xs sm:text-sm">
            {summary.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(0) : '0'}¢ / $1
          </span>
        </div>
      </div>

      {/* Preset Strategy Questions */}
      {!analysis && !loading && (
        <div className="space-y-2.5">
          <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            Select an advisor topic or ask anything:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => fetchAiAnalysis('Focus on practical steps to increase take-home profit and smart pricing adjustments.')}
              className="px-3.5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-blue-800 dark:text-blue-300 font-extrabold transition-all active:scale-[0.97] cursor-pointer"
            >
              📈 Increase Profit
            </button>
            <button
              onClick={() => fetchAiAnalysis('Focus on identifying ways to trim daily store bills and overhead.')}
              className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold transition-all active:scale-[0.97] cursor-pointer"
            >
              ✂️ Lower Store Bills
            </button>
            <button
              onClick={() => fetchAiAnalysis('Focus on turning slow inventory into cash and restocking bestsellers.')}
              className="px-3.5 py-2 rounded-2xl bg-teal-500/10 hover:bg-teal-500/15 border border-teal-500/20 text-teal-800 dark:text-teal-300 font-extrabold transition-all active:scale-[0.97] cursor-pointer"
            >
              📦 Faster Stock Sales
            </button>
          </div>
        </div>
      )}

      {/* Custom Prompt Input */}
      {!analysis && !loading && (
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask AI specific profit question (optional)..."
            className="flex-1 bg-white/70 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-semibold"
          />
          <button
            onClick={() => fetchAiAnalysis()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 active:scale-[0.97] transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Analyze</span>
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-7 rounded-3xl bg-black/[0.02] dark:bg-white/[0.03] border border-blue-500/20 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="p-3.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900 dark:text-white">
              Gemini AI is analyzing your financial metrics...
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Calculating profit margins, COGS efficiency, and cost optimizations
            </p>
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold">AI Analysis Unavailable</p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            <button
              onClick={() => fetchAiAnalysis()}
              className="text-[11px] underline font-extrabold text-rose-700 dark:text-rose-300 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Result Display */}
      {analysis && !loading && (
        <div className="space-y-3">
          <div className="p-6 rounded-3xl bg-black/[0.02] dark:bg-white/[0.03] text-slate-800 dark:text-slate-200 text-xs space-y-3 leading-relaxed max-h-96 overflow-y-auto custom-scrollbar border border-white/60 dark:border-white/[0.08] shadow-inner">
            <div className="markdown-body font-sans text-slate-800 dark:text-slate-200 space-y-2 ai-insight-text leading-relaxed">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              onClick={() => setAnalysis(null)}
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold cursor-pointer transition"
            >
              ← Ask another question
            </button>
            <button
              onClick={() => fetchAiAnalysis()}
              className="text-blue-600 dark:text-blue-400 hover:underline font-extrabold flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-analyze</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

