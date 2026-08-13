import React, { useState } from 'react';
import { Sparkles, Bot, RefreshCw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FinancialSummary, BusinessProfile, Product } from '../types';

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

  const cur = profile.currencySymbol;

  // Prepare top products payload
  const topProducts = products
    .slice(0, 5)
    .map((p) => ({ name: p.name, buyPrice: p.buyPrice, sellPrice: p.sellPrice, stock: p.stockQuantity }));

  const fetchAiAnalysis = async (overridePrompt?: string) => {
    setLoading(true);
    setError(null);

    const promptToUse = overridePrompt !== undefined ? overridePrompt : customPrompt;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

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
      };

      const response = await fetch('/api/gemini/profit-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          summary: sanitizedSummary,
          topProducts,
          currency: cur,
          customPrompt: promptToUse,
        }),
      });

      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      console.error('AI Profit Advisor Error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your network connection and try again.');
      } else {
        setError(err?.message || 'Unable to connect to Gemini AI Profit Advisor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden space-y-4">
      {/* Header Badge & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Gemini AI Profit Advisor
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-800">
                Gemini 3.6
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              AI-driven margin optimization & expense strategy
            </p>
          </div>
        </div>

        {analysis && (
          <button
            onClick={() => fetchAiAnalysis()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center space-x-1 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        )}
      </div>

      {/* Financial Snapshot Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
        <div>
          <span className="text-slate-500 block text-[9px] uppercase font-bold">Revenue</span>
          <span className="font-black text-emerald-700 font-mono">
            {cur}{summary.totalRevenue.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase font-bold">Net Profit</span>
          <span className={`font-black font-mono ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {cur}{summary.netProfit.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase font-bold">Net Margin</span>
          <span className="font-black text-amber-700 font-mono">
            {summary.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
      </div>

      {/* Preset Strategy Questions */}
      {!analysis && !loading && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-700">
            Select an analysis topic or click generate:
          </p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              onClick={() => fetchAiAnalysis('Focus on increasing net profit margin and pricing strategy.')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold transition-all active:scale-95"
            >
              📈 Boost Net Margin
            </button>
            <button
              onClick={() => fetchAiAnalysis('Focus on identifying expense reduction opportunities.')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold transition-all active:scale-95"
            >
              ✂️ Cut Overhead Costs
            </button>
            <button
              onClick={() => fetchAiAnalysis('Focus on inventory turnover and cash flow optimization.')}
              className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold transition-all active:scale-95"
            >
              📦 Inventory Turnover
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
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
          <button
            onClick={() => fetchAiAnalysis()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center space-x-1.5 whitespace-nowrap"
          >
            <Bot className="w-4 h-4" />
            <span>Analyze</span>
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-6 rounded-2xl bg-slate-50 border border-emerald-200 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="p-3 rounded-full bg-emerald-100 text-emerald-700 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900">
              Gemini AI is analyzing your financial metrics...
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Calculating profit margins, COGS efficiency, and cost optimizations
            </p>
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">AI Analysis Unavailable</p>
            <p className="text-[11px] text-rose-700">{error}</p>
            <button
              onClick={() => fetchAiAnalysis()}
              className="text-[11px] underline font-bold text-rose-900 hover:text-black"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Result Display */}
      {analysis && !loading && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs space-y-3 leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
            <div className="markdown-body font-sans text-slate-800 space-y-2">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => setAnalysis(null)}
              className="text-slate-500 hover:text-slate-800 font-semibold"
            >
              ← Ask another question
            </button>
            <button
              onClick={() => fetchAiAnalysis()}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
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

