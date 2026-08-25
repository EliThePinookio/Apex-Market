import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Product, Transaction, BusinessProfile, FinancialSummary, Category } from '../types';
import { queryCentralBrain } from '../services/centralBrainService';

interface CentralBrainAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  categories?: Category[];
  profile: BusinessProfile;
  summary: FinancialSummary;
  onNavigateToTab?: (tab: string) => void;
}

interface ChatTurn {
  id: string;
  sender: 'user' | 'brain';
  text: string;
  time: string;
}

export const CentralBrainAssistantModal: React.FC<CentralBrainAssistantModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  profile,
  summary,
}) => {
  const cur = profile.currencySymbol || '$';
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize with welcoming prompt if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          sender: 'brain',
          text: `Hello! I'm your business assistant for **${profile.businessName || 'your store'}**.\n\nI have real-time visibility into your sales (**${transactions.length} orders**), inventory (**${products.length} catalog items**), and gross revenue (**${cur}${summary.totalRevenue.toFixed(2)}**).\n\nHow can I help you today? You can ask for restock advice, sales trends, profit optimization, or what-if projections.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [messages.length, profile.businessName, transactions.length, products.length, cur, summary.totalRevenue]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputVal).trim();
    if (!textToSend || isLoading) return;

    const userTurn: ChatTurn = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    if (!customText) setInputVal('');
    setIsLoading(true);
    setError(null);

    const lowStock = products.filter((p) => p.stockQuantity <= p.minStockThreshold);
    const slowItems = products.filter((p) => p.stockQuantity > 5).slice(0, 5);

    const storeContext = {
      businessName: profile.businessName || 'Your Store',
      currency: cur,
      totalRevenue: summary.totalRevenue,
      wholesaleCost: summary.totalCOGS,
      grossProfit: summary.grossProfit,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      centsKept: summary.totalRevenue > 0 ? Math.round((summary.netProfit / summary.totalRevenue) * 100) : 0,
      txCount: transactions.length,
      productCount: products.length,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 5).map((p) => ({ name: p.name, stock: p.stockQuantity })),
      slowProducts: slowItems.map((p) => ({ name: p.name, stock: p.stockQuantity, trapped: p.stockQuantity * p.buyPrice })),
      dailyVelocity: transactions.length > 0 ? (summary.totalRevenue / Math.max(1, transactions.length)).toFixed(2) : 0,
    };

    try {
      const response = await queryCentralBrain({
        mode: 'general_query',
        prompt: textToSend,
        storeContext,
      });

      const brainTurn: ChatTurn = {
        id: (Date.now() + 1).toString(),
        sender: 'brain',
        text: response.result || 'Analysis completed with no output.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, brainTurn]);
    } catch (err: any) {
      setError(err.message || 'Communication error. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white font-display">
                  Ask BEANNEL
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Business intelligence & strategic decision assistant
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Store Snapshot Strip */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-xs overflow-x-auto gap-3 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-blue-500" />
            <span>Revenue: <strong>{cur}{summary.totalRevenue.toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Profit: <strong>{cur}{summary.netProfit.toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Package className="w-3.5 h-3.5 text-amber-500" />
            <span>Low Stock: <strong>{products.filter((p) => p.stockQuantity <= p.minStockThreshold).length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ShoppingCart className="w-3.5 h-3.5 text-purple-500" />
            <span>Sales: <strong>{transactions.length}</strong></span>
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[260px] max-h-[420px]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-indigo-600/20 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                }`}
              >
                {msg.sender === 'user' ? <span className="text-xs font-bold">You</span> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                <span
                  className={`text-[10px] block mt-1.5 font-medium ${
                    msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>Analyzing store data...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/[0.06] flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => handleSendMessage('What are my top 3 priorities today to maximize profit?')}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0 cursor-pointer text-[11px] font-semibold"
          >
            🎯 Today's Priorities
          </button>
          <button
            onClick={() => handleSendMessage('Which items should I reorder immediately and what will it cost?')}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0 cursor-pointer text-[11px] font-semibold"
          >
            📦 Restock Plan
          </button>
          <button
            onClick={() => handleSendMessage('Audit my overhead expenses and tell me where cash is leaking.')}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shrink-0 cursor-pointer text-[11px] font-semibold"
          >
            💰 Expense Audit
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/[0.08]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask anything about sales, restock, profit, expenses..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
