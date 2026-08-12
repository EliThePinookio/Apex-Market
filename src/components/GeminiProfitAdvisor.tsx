import React, { useState } from 'react';
import { Sparkles, Bot, RefreshCw, AlertCircle, ArrowRight, Lightbulb, TrendingUp } from 'lucide-react';
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

    try {
      const response = await fetch('/api/gemini/profit-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          topProducts,
          currency: cur,
          customPrompt: promptToUse,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate AI profit insights.');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error('AI Profit Advisor Error:', err);
      setError(err?.message || 'Unable to connect to Gemini AI Profit Advisor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-3xl glass-panel border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden space-y-4">
      {/* Decorative Glow Background */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <Sparkles className="w-5 h-5 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-slate-100 tracking-tight">
                Gemini AI Profit Advisor
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-[10px] font-black text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.2)]">
                Gemini 3.6
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              AI-driven margin optimization & expense strategy
            </p>
          </div>
        </div>

        {analysis && (
          <button
            onClick={() => fetchAiAnalysis()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all border border-slate-700/80 flex items-center space-x-1 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        )}
      </div>

      {/* Financial Snapshot Bar */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px]">
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-bold">Revenue</span>
          <span className="font-black text-emerald-400">
            {cur}{summary.totalRevenue.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-bold">Net Profit</span>
          <span className={`font-black ${summary.netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {cur}{summary.netProfit.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase font-bold">Net Margin</span>
          <span className="font-black text-amber-400">
            {summary.totalRevenue > 0 ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
      </div>

      {/* Preset Strategy Questions */}
      {!analysis && !loading && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-300">
            Select an analysis topic or click generate:
          </p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              onClick={() => fetchAiAnalysis('Focus on increasing net profit margin and pricing strategy.')}
              className="px-2.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold transition-all active:scale-95"
            >
              📈 Boost Net Margin
            </button>
            <button
              onClick={() => fetchAiAnalysis('Focus on identifying expense reduction opportunities.')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold transition-all active:scale-95"
            >
              ✂️ Cut Overhead Costs
            </button>
            <button
              onClick={() => fetchAiAnalysis('Focus on inventory turnover and cash flow optimization.')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold transition-all active:scale-95"
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
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={() => fetchAiAnalysis()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs shadow-[0_0_15px_rgba(139,92,246,0.3)] active:scale-95 transition-all flex items-center space-x-1.5 whitespace-nowrap"
          >
            <Bot className="w-4 h-4" />
            <span>Analyze</span>
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-6 rounded-2xl bg-slate-950/90 border border-indigo-500/30 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-100">
              Gemini AI is analyzing your financial metrics...
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Calculating profit margins, COGS efficiency, and cost optimizations
            </p>
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">AI Analysis Unavailable</p>
            <p className="text-[11px] text-rose-300/80">{error}</p>
            <button
              onClick={() => fetchAiAnalysis()}
              className="text-[11px] underline font-bold text-rose-200 hover:text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Result Display */}
      {analysis && !loading && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/20 text-slate-200 text-xs space-y-3 leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
            <div className="markdown-body font-sans text-slate-200 space-y-2">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              onClick={() => setAnalysis(null)}
              className="text-slate-400 hover:text-slate-200 font-semibold"
            >
              ← Ask another question
            </button>
            <button
              onClick={() => fetchAiAnalysis()}
              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
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
