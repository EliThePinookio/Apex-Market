import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Send,
  MessageSquare,
  Sliders,
  Award,
  Zap,
  ShoppingBag,
  ChevronRight,
  ChevronDown,
  Calculator,
  Lightbulb,
  AlertCircle,
  ThumbsUp,
  PackageX,
  PiggyBank,
  CheckCircle,
  Bot,
  User,
  HelpCircle,
  Cpu,
  Globe,
  Settings2,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Transaction, Product, BusinessProfile, FinancialSummary, WhatIfSimulationParams } from '../types';
import { computeActualVsForecast, simulateWhatIf } from '../services/financialEngine';
import { generateForecast, DEFAULT_FORECAST_CONFIG } from '../utils/forecastingEngine';

export interface AIModelOption {
  id: string;
  name: string;
  provider: 'openrouter' | 'gemini';
  badge: string;
  tag: string;
  description: string;
}

export const AVAILABLE_AI_MODELS: AIModelOption[] = [
  {
    id: 'z-ai/glm-5.2:free',
    name: 'GLM 5.2 (Free)',
    provider: 'openrouter',
    badge: 'OpenRouter Free',
    tag: '⚡ Default',
    description: 'Balanced, fast business intelligence model via OpenRouter.',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B (Free)',
    provider: 'openrouter',
    badge: 'OpenRouter Free',
    tag: '🧠 Deep Reasoning',
    description: 'High-parameter business reasoning engine via OpenRouter.',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    provider: 'openrouter',
    badge: 'OpenRouter Free',
    tag: '🚀 Llama 3.3',
    description: 'Open-weight instruction model via OpenRouter.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    badge: 'Google Gemini',
    tag: '⚡ Ultra Fast',
    description: 'High-availability, ultra-responsive Google Gemini model.',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    provider: 'gemini',
    badge: 'Google Gemini',
    tag: '✨ Gemini 3.7',
    description: 'Direct server-side Google Gemini 3.7 multimodal model.',
  },
];

interface BusinessAdvisorViewProps {
  transactions: Transaction[];
  products: Product[];
  profile: BusinessProfile;
  summary: FinancialSummary;
  onNavigateToPOS?: () => void;
  onNavigateToInventory?: (filterLowStock?: boolean) => void;
  onNavigateToTransactions?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'advisor' | 'user';
  text: string;
  timestamp: string;
  modelUsed?: string;
  providerUsed?: string;
}

export const BusinessAdvisorView: React.FC<BusinessAdvisorViewProps> = ({
  transactions,
  products,
  profile,
  summary,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToTransactions,
}) => {
  const cur = profile.currencySymbol || '$';

  // Sub-tabs
  const [advisorViewTab, setAdvisorViewTab] = useState<'overview' | 'simulator' | 'ask_advisor'>('overview');

  // Selected AI Model (Defaults to OpenRouter free model z-ai/glm-5.2:free)
  const [selectedModelId, setSelectedModelId] = useState<string>('z-ai/glm-5.2:free');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = useMemo(() => {
    return AVAILABLE_AI_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_AI_MODELS[0];
  }, [selectedModelId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Executive AI Advisor Review State (Auto-analyzed on mount)
  const [executiveReview, setExecutiveReview] = useState<string | null>(null);
  const [isExecutiveLoading, setIsExecutiveLoading] = useState(false);
  const [executiveError, setExecutiveError] = useState<string | null>(null);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string | null>(null);
  const [executiveModelInfo, setExecutiveModelInfo] = useState<{ model: string; provider: string; fallbackUsed?: boolean; note?: string } | null>(null);

  // Chat Q&A State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // State for Interactive Scenario Simulator (Plain Language)
  const [simulatorParams, setSimulatorParams] = useState<WhatIfSimulationParams>({
    priceChangePercent: 0,
    volumeChangePercent: 0,
    cogsChangePercent: 0,
    expenseChangePercent: 0,
    additionalCapital: 0,
  });

  // Background computation 1: Run forecasting engine
  const forecast = useMemo(() => {
    return generateForecast(transactions, products, summary, DEFAULT_FORECAST_CONFIG);
  }, [transactions, products, summary]);

  // Background computation 2: Compute Actuals & Underlying Health Velocity
  const { dailyVelocity } = useMemo(() => {
    return computeActualVsForecast(transactions, summary, 30);
  }, [transactions, summary]);

  // Background computation 3: What-if Simulation
  const simulationResult = useMemo(() => {
    return simulateWhatIf(summary, simulatorParams);
  }, [summary, simulatorParams]);

  // Product sales velocity map
  const productSalesMap = useMemo(() => {
    const map = new Map<string, { product: Product; qtySold: number; revenue: number; profit: number }>();

    transactions
      .filter((t) => t.type === 'sale' && t.items)
      .forEach((t) => {
        t.items?.forEach((item) => {
          const prod: Product = products.find((p) => p.id === item.productId) || {
            id: item.productId,
            name: item.productName,
            sku: 'N/A',
            category: 'General',
            buyPrice: item.unitBuyPrice || 0,
            sellPrice: item.unitSellPrice || 0,
            stockQuantity: 0,
            minStockThreshold: 5,
            unit: 'pcs',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const existing = map.get(item.productId) || {
            product: prod,
            qtySold: 0,
            revenue: 0,
            profit: 0,
          };

          const itemRev = item.totalSellPrice || (item.unitSellPrice * item.quantity);
          const itemCost = item.totalBuyPrice || (item.unitBuyPrice * item.quantity);
          existing.qtySold += item.quantity;
          existing.revenue += itemRev;
          existing.profit += itemRev - itemCost;
          map.set(item.productId, existing);
        });
      });

    return map;
  }, [transactions, products]);

  // Ranked Top Sellers
  const rankedTopProducts = useMemo(() => {
    return Array.from(productSalesMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [productSalesMap]);

  // Slow Moving Stock & Trapped Cash
  const slowMovingProducts = useMemo(() => {
    return products
      .filter((p) => {
        const sold = productSalesMap.get(p.id);
        return (!sold || sold.qtySold === 0) && p.stockQuantity > 0;
      })
      .map((p) => ({
        product: p,
        moneyTrapped: p.buyPrice * p.stockQuantity,
      }))
      .sort((a, b) => b.moneyTrapped - a.moneyTrapped);
  }, [products, productSalesMap]);

  const moneyInSlowStock = useMemo(() => {
    return slowMovingProducts.reduce((acc, item) => acc + item.moneyTrapped, 0);
  }, [slowMovingProducts]);

  // Critical Low Stock Items
  const criticalStockItems = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockThreshold);
  }, [products]);

  // Category sales breakdown
  const categorySales = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'sale' && t.items)
      .forEach((t) => {
        t.items?.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const cat = prod?.categoryId || 'General';
          const rev = item.totalSellPrice || (item.unitSellPrice * item.quantity);
          map.set(cat, (map.get(cat) || 0) + rev);
        });
      });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions, products]);

  const bestCategory = useMemo(() => {
    if (categorySales.length === 0) return null;
    const sorted = [...categorySales].sort((a, b) => b.value - a.value);
    return { name: sorted[0].name, revenue: sorted[0].value };
  }, [categorySales]);

  const lowestCategory = useMemo(() => {
    if (categorySales.length === 0) return null;
    const sorted = [...categorySales].sort((a, b) => a.value - b.value);
    return { name: sorted[0].name, revenue: sorted[0].value };
  }, [categorySales]);

  // Category expense breakdown
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'General Bills';
        map.set(cat, (map.get(cat) || 0) + (t.amount || 0));
      });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Plain-Language Financial Retention Ratio (Cents kept per dollar)
  const centsKeptPerDollar = useMemo(() => {
    if (!summary.totalRevenue || summary.totalRevenue <= 0) return 0;
    const cents = Math.round((summary.netProfit / summary.totalRevenue) * 100);
    return Math.max(0, cents);
  }, [summary]);

  // Overhead Bite Rate (% of revenue taken by non-inventory bills)
  const expenseBiteRate = useMemo(() => {
    if (!summary.totalRevenue || summary.totalRevenue <= 0) return 0;
    return Math.round((summary.totalExpenses / summary.totalRevenue) * 100);
  }, [summary]);

  // Overall Health Score Calculation (0-100)
  const { healthScore, healthStatus, healthSummarySentence, healthBadgeColor } = useMemo(() => {
    let score = 50;

    if (summary.totalRevenue > 0) {
      const margin = summary.netProfit / summary.totalRevenue;
      if (margin >= 0.25) score += 25;
      else if (margin >= 0.10) score += 15;
      else if (margin > 0) score += 5;
      else score -= 20;
    }

    if (criticalStockItems.length === 0 && products.length > 0) {
      score += 15;
    } else if (criticalStockItems.length > 5) {
      score -= 15;
    }

    if (summary.totalRevenue > 0 && expenseBiteRate < 25) {
      score += 10;
    } else if (expenseBiteRate > 50) {
      score -= 15;
    }

    score = Math.max(10, Math.min(99, score));

    let status = 'Fair';
    let sentence = 'Your store is running with stable foundations, but fixing low stock and trimming overhead will unlock higher profit.';
    let badgeColor = 'from-amber-500 to-orange-500';

    if (score >= 80) {
      status = 'Excellent';
      sentence = `Your business is in great financial shape, keeping ${centsKeptPerDollar}¢ on every dollar earned with high inventory velocity.`;
      badgeColor = 'from-emerald-500 to-teal-500';
    } else if (score >= 65) {
      status = 'Good';
      sentence = `You are generating healthy revenue, with steady customer demand across ${transactions.length} recorded transactions.`;
      badgeColor = 'from-blue-500 to-indigo-500';
    } else if (score < 40) {
      status = 'Needs Attention';
      sentence = 'Expenses or stockouts are eating into take-home money. Review the action items below to protect daily cash.';
      badgeColor = 'from-rose-500 to-pink-500';
    }

    return {
      healthScore: score,
      healthStatus: status,
      healthSummarySentence: sentence,
      healthBadgeColor: badgeColor,
    };
  }, [summary, criticalStockItems, products, expenseBiteRate, centsKeptPerDollar, transactions]);

  // Function to call AI Business Advisor Backend
  const fetchExecutiveReview = async (forceRefresh: boolean = false, overrideModelId?: string) => {
    setIsExecutiveLoading(true);
    setExecutiveError(null);

    const modelToUse = overrideModelId || selectedModelId;
    const modelObj = AVAILABLE_AI_MODELS.find((m) => m.id === modelToUse) || selectedModel;

    const payload = {
      businessName: profile.businessName || 'My Store',
      ownerName: profile.ownerName || 'Alex',
      currency: cur,
      totalRevenue: summary.totalRevenue,
      wholesaleCost: summary.totalCOGS,
      grossProfit: summary.grossProfit,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      centsKept: centsKeptPerDollar,
      txCount: transactions.length,
      healthScore,
      healthStatus,
      healthSentence: healthSummarySentence,
      topProducts: rankedTopProducts.map((p) => ({
        name: p.product.name,
        qtySold: p.qtySold,
        revenue: p.revenue,
        profit: p.profit,
      })),
      lowStockItems: criticalStockItems.map((p) => ({
        name: p.name,
        stock: p.stockQuantity,
        minThreshold: p.minStockThreshold,
      })),
      slowProducts: slowMovingProducts.slice(0, 5).map((p) => ({
        name: p.product.name,
        moneyTrapped: p.moneyTrapped,
      })),
      expenseCategories: categoryExpenses.map((c) => ({
        name: c.name,
        amount: c.value,
      })),
      forecastSales: forecast.summaryStats.totalForecastSales,
      forecastProfit: forecast.summaryStats.totalForecastProfit,
      dailyVelocity: dailyVelocity.avgSales || 0,
      customPrompt: undefined,
      model: modelToUse,
      provider: modelObj.provider,
    };

    try {
      const res = await fetch('/api/business-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      setExecutiveReview(data.advice || 'No recommendations returned.');
      setExecutiveModelInfo({
        model: data.model || modelToUse,
        provider: data.provider || modelObj.provider,
        fallbackUsed: data.fallbackUsed,
        note: data.note,
      });
      setLastAnalyzedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setExecutiveError(err.message || 'Unable to connect to AI Advisor. Please try again.');
    } finally {
      setIsExecutiveLoading(false);
    }
  };

  // Auto-analyze once on view load
  useEffect(() => {
    if (!executiveReview && !isExecutiveLoading) {
      fetchExecutiveReview(false);
    }
  }, []);

  // Send a custom follow-up Q&A question
  const handleSendChatMessage = async (presetQuestion?: string) => {
    const questionText = presetQuestion || chatInput.trim();
    if (!questionText || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetQuestion) setChatInput('');
    setIsChatLoading(true);
    setChatError(null);

    const payload = {
      businessName: profile.businessName || 'My Store',
      ownerName: profile.ownerName || 'Alex',
      currency: cur,
      totalRevenue: summary.totalRevenue,
      wholesaleCost: summary.totalCOGS,
      grossProfit: summary.grossProfit,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      centsKept: centsKeptPerDollar,
      txCount: transactions.length,
      healthScore,
      healthStatus,
      healthSentence: healthSummarySentence,
      topProducts: rankedTopProducts.map((p) => ({
        name: p.product.name,
        qtySold: p.qtySold,
        revenue: p.revenue,
        profit: p.profit,
      })),
      lowStockItems: criticalStockItems.map((p) => ({
        name: p.name,
        stock: p.stockQuantity,
        minThreshold: p.minStockThreshold,
      })),
      slowProducts: slowMovingProducts.slice(0, 5).map((p) => ({
        name: p.product.name,
        moneyTrapped: p.moneyTrapped,
      })),
      expenseCategories: categoryExpenses.map((c) => ({
        name: c.name,
        amount: c.value,
      })),
      forecastSales: forecast.summaryStats.totalForecastSales,
      forecastProfit: forecast.summaryStats.totalForecastProfit,
      dailyVelocity: dailyVelocity.avgSales || 0,
      customPrompt: questionText,
      model: selectedModelId,
      provider: selectedModel.provider,
    };

    try {
      const res = await fetch('/api/business-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const advisorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'advisor',
        text: data.advice || 'I analyzed your numbers, but could not produce a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModelId,
        providerUsed: data.provider || selectedModel.provider,
      };

      setChatMessages((prev) => [...prev, advisorMsg]);
    } catch (err: any) {
      setChatError(err.message || 'Advisor connection interrupted. Please try again.');
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Detected Business Bottlenecks
  const detectedProblems = useMemo(() => {
    const list: {
      id: string;
      title: string;
      cause: string;
      impact: string;
      severity: 'high' | 'medium' | 'low';
      actionLabel: string;
      actionType: 'refill' | 'expense' | 'prices';
    }[] = [];

    if (criticalStockItems.length > 0) {
      const topLow = criticalStockItems.slice(0, 3).map((p) => p.name).join(', ');
      list.push({
        id: 'low_stock',
        title: `${criticalStockItems.length} items are running dangerously low on stock`,
        cause: `Customer demand has been strong for (${topLow}), but inventory levels have dropped to critical minimums.`,
        impact: `Risk of turning away customers and missing out on estimated ${cur}${(criticalStockItems.length * 45).toFixed(0)} in upcoming sales.`,
        severity: 'high',
        actionLabel: 'Refill Low Stock',
        actionType: 'refill',
      });
    }

    if (expenseBiteRate > 35 && summary.totalRevenue > 0) {
      const highestExpense = categoryExpenses.sort((a, b) => b.value - a.value)[0]?.name || 'bills';
      list.push({
        id: 'high_expenses',
        title: `Store bills take up ${expenseBiteRate}% of your total sales`,
        cause: `Your overhead spending (especially on ${highestExpense}) is relatively high compared to current sales volume.`,
        impact: `Leaves only ${centsKeptPerDollar}¢ per dollar in your pocket instead of an optimal 25¢–40¢.`,
        severity: expenseBiteRate > 50 ? 'high' : 'medium',
        actionLabel: 'Review Bills',
        actionType: 'expense',
      });
    }

    if (slowMovingProducts.length > 0 && moneyInSlowStock > 0) {
      list.push({
        id: 'slow_stock',
        title: `${cur}${moneyInSlowStock.toFixed(0)} is trapped in slow-moving products`,
        cause: `${slowMovingProducts.length} items on your shelves haven't sold recently, locking up cash you could reinvest.`,
        impact: `Traps working cash that could be used to buy your bestsellers.`,
        severity: 'medium',
        actionLabel: 'Clear Out Stock',
        actionType: 'prices',
      });
    }

    return list;
  }, [criticalStockItems, expenseBiteRate, summary, centsKeptPerDollar, categoryExpenses, slowMovingProducts, moneyInSlowStock, cur]);

  // Quick preset chips for What-If Simulator
  const applySimPreset = (type: 'price_bump' | 'cost_cut' | 'grow_sales' | 'reset') => {
    switch (type) {
      case 'price_bump':
        setSimulatorParams({ priceChangePercent: 5, volumeChangePercent: 0, cogsChangePercent: 0, expenseChangePercent: 0, additionalCapital: 0 });
        break;
      case 'cost_cut':
        setSimulatorParams({ priceChangePercent: 0, volumeChangePercent: 0, cogsChangePercent: -5, expenseChangePercent: -15, additionalCapital: 0 });
        break;
      case 'grow_sales':
        setSimulatorParams({ priceChangePercent: 0, volumeChangePercent: 20, cogsChangePercent: 0, expenseChangePercent: 5, additionalCapital: 0 });
        break;
      case 'reset':
        setSimulatorParams({ priceChangePercent: 0, volumeChangePercent: 0, cogsChangePercent: 0, expenseChangePercent: 0, additionalCapital: 0 });
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-7 pb-24 font-sans">
      {/* 1. OVERALL BUSINESS HEALTH HERO BANNER */}
      <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-white/[0.1] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
              <span>Business Intelligence</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
              {profile.businessName || 'BEANNEL'} Advisory Suite
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed bg-white/[0.06] p-4 rounded-2xl border border-white/[0.08] backdrop-blur-md">
              💡 {healthSummarySentence}
            </p>
          </div>

          {/* Health Score Card */}
          <div className="flex sm:flex-col items-center justify-between sm:justify-center p-5 rounded-2xl bg-white/[0.07] border border-white/[0.12] backdrop-blur-xl shrink-0 min-w-[200px] text-center gap-3">
            <div className="text-left sm:text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">
                Health Score
              </span>
              <div className="flex items-baseline space-x-1 sm:justify-center mt-0.5">
                <span className="text-4xl font-extrabold font-display text-white">{healthScore}</span>
                <span className="text-xs text-slate-400 font-bold">/100</span>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-extrabold text-white bg-gradient-to-r ${healthBadgeColor} shadow-md`}>
              {healthStatus}
            </span>
          </div>
        </div>

        {/* Advisor Navigation Subtabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/[0.08] text-xs font-bold relative z-10">
          <button
            onClick={() => setAdvisorViewTab('overview')}
            className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center space-x-2 active:scale-[0.97] ${
              advisorViewTab === 'overview'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/25'
                : 'text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Health & Executive Briefing</span>
          </button>

          <button
            onClick={() => setAdvisorViewTab('ask_advisor')}
            className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center space-x-2 active:scale-[0.97] ${
              advisorViewTab === 'ask_advisor'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/25'
                : 'text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Ask Advisor (Live Q&A)</span>
            {chatMessages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-400 text-slate-900 text-[10px] font-black">
                {chatMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdvisorViewTab('simulator')}
            className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center space-x-2 active:scale-[0.97] ${
              advisorViewTab === 'simulator'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-indigo-500/25'
                : 'text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Profit Simulator</span>
          </button>
        </div>
      </div>

      {/* 2. OVERVIEW & EXECUTIVE BRIEFING TAB */}
      {advisorViewTab === 'overview' && (
        <div className="space-y-8">
          {/* A. EXECUTIVE ADVISOR BRIEFING CARD */}
          <div className="glass-card p-6 sm:p-7 rounded-3xl relative overflow-hidden border border-slate-200/80 dark:border-white/[0.08] space-y-5">
            {/* Header: Title, Live Status & Model Dropdown */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/[0.06] pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                      Executive Briefing
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 text-[9px] font-extrabold uppercase">
                      Live Grounded
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Plain-language strategic analysis based on your real store numbers.
                  </p>
                </div>
              </div>

              {/* Action Controls: Model Selector Dropdown & Refresh */}
              <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap">
                {/* Clean Model Selector Dropdown */}
                <div className="relative" ref={modelDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                    className="px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/[0.1] shadow-xs text-xs font-bold flex items-center space-x-2 transition-all active:scale-[0.97] cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-extrabold truncate max-w-[140px] sm:max-w-[180px]">{selectedModel.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold">
                      {selectedModel.tag}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isModelDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl floating-dock p-2 z-50 shadow-2xl border border-slate-200/80 dark:border-white/[0.1] space-y-1"
                      >
                        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Select Intelligence Engine
                        </div>
                        {AVAILABLE_AI_MODELS.map((model) => {
                          const isSelected = selectedModelId === model.id;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setSelectedModelId(model.id);
                                setIsModelDropdownOpen(false);
                                fetchExecutiveReview(true, model.id);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-500/10 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300 font-extrabold'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold truncate">{model.name}</span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/[0.05] dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 font-bold">
                                    {model.badge}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-tight">
                                  {model.description}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Re-analyze Button */}
                <button
                  onClick={() => fetchExecutiveReview(true)}
                  disabled={isExecutiveLoading}
                  className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-500/25 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.96]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isExecutiveLoading ? 'animate-spin' : ''}`} />
                  <span>Re-analyze</span>
                </button>
              </div>
            </div>

            {/* Active Model Indicator bar */}
            {executiveModelInfo && !isExecutiveLoading && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    Analysis powered by <strong className="text-slate-800 dark:text-slate-200">{executiveModelInfo.model}</strong> ({executiveModelInfo.provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'})
                  </span>
                </div>
                {lastAnalyzedTime && (
                  <span className="text-[10px] text-slate-400">
                    Updated at {lastAnalyzedTime}
                  </span>
                )}
              </div>
            )}

            {/* Loading State */}
            {isExecutiveLoading && (
              <div className="p-10 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] flex flex-col items-center justify-center space-y-3 text-center border border-slate-200/50 dark:border-white/[0.04]">
                <div className="p-3.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-spin">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Advisor is analyzing your store with {selectedModel.name}...
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                  Correlating inventory turnover, wholesale product markups, and daily store bills.
                </p>
              </div>
            )}

            {/* Error State with Recovery Actions */}
            {executiveError && !isExecutiveLoading && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-3">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold">Notice: AI Cloud Model Demand Peak</p>
                    <p className="text-[11px] font-medium">{executiveError}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fetchExecutiveReview(true, selectedModelId)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Analysis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModelId('gemini-2.5-flash');
                      fetchExecutiveReview(true, 'gemini-2.5-flash');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.08] text-slate-800 dark:text-white border border-slate-200 dark:border-white/[0.1] font-bold text-[11px] hover:bg-black/[0.05] transition-all cursor-pointer"
                  >
                    <span>⚡ Try Gemini 2.5 Flash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModelId('z-ai/glm-5.2:free');
                      fetchExecutiveReview(true, 'z-ai/glm-5.2:free');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.08] text-slate-800 dark:text-white border border-slate-200 dark:border-white/[0.1] font-bold text-[11px] hover:bg-black/[0.05] transition-all cursor-pointer"
                  >
                    <span>🤖 Try GLM 5.2 (Free)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Generated Review Display */}
            {executiveReview && !isExecutiveLoading && (
              <div className="space-y-4">
                <div className="p-5 sm:p-6 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-xs">
                  <div className="markdown-body font-sans text-slate-800 dark:text-slate-200 space-y-3 ai-insight-text leading-relaxed">
                    <ReactMarkdown>{executiveReview}</ReactMarkdown>
                  </div>
                </div>

                {/* Quick Action Shortcuts */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                  {criticalStockItems.length > 0 && (
                    <button
                      onClick={() => onNavigateToInventory?.(true)}
                      className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-[0.96]"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Refill {criticalStockItems.length} Low Stock Items</span>
                    </button>
                  )}
                  <button
                    onClick={() => setAdvisorViewTab('ask_advisor')}
                    className="px-3.5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-[0.96]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Follow-up Question</span>
                  </button>
                  <button
                    onClick={() => setAdvisorViewTab('simulator')}
                    className="px-3.5 py-2 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/20 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-[0.96]"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Simulate Price Adjustments</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. 4 HIGH-IMPACT KEY INSIGHT CARDS */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base sm:text-lg font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                Calculated Ledger Metrics
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: What's Performing Well */}
              <div className="glass-card p-5 rounded-3xl space-y-3 flex flex-col justify-between border-t-2 border-t-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                    <ThumbsUp className="w-3.5 h-3.5 mr-1" /> What's Going Well
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-black font-display text-slate-900 dark:text-white tabular-nums">
                    {centsKeptPerDollar}¢ kept
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    On every dollar brought in, you keep {centsKeptPerDollar} cents in pure take-home profit.
                  </p>
                </div>

                {rankedTopProducts.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                    🏆 Top Earner: <span className="font-extrabold text-slate-800 dark:text-slate-200">{rankedTopProducts[0].product.name}</span>
                  </div>
                )}
              </div>

              {/* Card 2: What's Hurting the Business */}
              <div className="glass-card p-5 rounded-3xl space-y-3 flex flex-col justify-between border-t-2 border-t-rose-500">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> What's Hurting
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    !
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-black font-display text-rose-600 dark:text-rose-400 tabular-nums">
                    {cur}{summary.totalExpenses.toFixed(0)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    Store bills and overhead take {expenseBiteRate}% of your sales income.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                  {criticalStockItems.length > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">⚠️ {criticalStockItems.length} items low in stock</span>
                  ) : (
                    <span>Overhead is steady</span>
                  )}
                </div>
              </div>

              {/* Card 3: Best and Worst Selling Areas */}
              <div className="glass-card p-5 rounded-3xl space-y-3 flex flex-col justify-between border-t-2 border-t-blue-500">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center space-x-1">
                    <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Top Category
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    ★
                  </div>
                </div>

                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    Best: <span className="text-blue-600 dark:text-blue-400">{bestCategory ? bestCategory.name : 'All Items'}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {bestCategory ? `${cur}${bestCategory.revenue.toFixed(0)} total sales` : 'Logging initial transactions'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                  {lowestCategory && lowestCategory.name !== bestCategory?.name ? (
                    <span>Slowest: <span className="font-extrabold text-slate-700 dark:text-slate-300">{lowestCategory.name}</span></span>
                  ) : (
                    <span>Single primary category</span>
                  )}
                </div>
              </div>

              {/* Card 4: Predicted Income / Profit (Next 30 Days) */}
              <div className="glass-card p-5 rounded-3xl space-y-3 flex flex-col justify-between border-t-2 border-t-violet-500">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 mr-1" /> 30-Day Forecast
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
                    ↗
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-black font-display text-violet-600 dark:text-violet-400 tabular-nums">
                    {cur}{forecast.summaryStats.totalForecastSales.toFixed(0)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    Estimated 30-day sales with <span className="font-extrabold text-slate-900 dark:text-white">{cur}{forecast.summaryStats.totalForecastProfit.toFixed(0)}</span> in profit.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                  Daily velocity: <span className="font-bold text-slate-800 dark:text-slate-200">~{cur}{(dailyVelocity.avgSales || 0).toFixed(0)}/day</span>
                </div>
              </div>
            </div>
          </div>

          {/* C. PROBLEMS DETECTED */}
          {detectedProblems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-base sm:text-lg font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                  Problems Detected & Root Causes
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {detectedProblems.map((prob) => (
                  <div
                    key={prob.id}
                    className={`glass-card p-5 rounded-3xl space-y-3 flex flex-col justify-between border-l-2 ${
                      prob.severity === 'high' ? 'border-l-rose-500' : 'border-l-amber-500'
                    }`}
                  >
                    <div className="space-y-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          prob.severity === 'high'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {prob.severity === 'high' ? 'High Impact' : 'Needs Review'}
                      </span>
                      <h3 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                        {prob.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        <strong className="text-slate-700 dark:text-slate-300">Why: </strong>
                        {prob.cause}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/50 dark:border-white/[0.06] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {prob.impact}
                      </span>
                      {prob.actionType === 'refill' && (
                        <button
                          onClick={() => onNavigateToInventory?.(true)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {prob.actionLabel} &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. LIVE Q&A TAB (ASK YOUR ADVISOR) */}
      {advisorViewTab === 'ask_advisor' && (
        <div className="glass-card p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-white/[0.06] pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                  Consult Your Business Advisor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Ask anything about your store. All responses use your live store numbers.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="px-3.5 py-1.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-black/[0.08] cursor-pointer"
                >
                  Clear Conversation
                </button>
              )}
            </div>
          </div>

          {/* Popular Question Starters */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Suggested consultations tailored to your current store state:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSendChatMessage('How can I boost my take-home profit this month based on my current sales?')}
                className="px-3.5 py-2 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-800 dark:text-blue-300 font-bold transition-all cursor-pointer active:scale-[0.96]"
              >
                📈 How do I increase take-home profit?
              </button>
              {criticalStockItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSendChatMessage(`Which low-stock items should I reorder first: ${criticalStockItems.slice(0, 2).map((p) => p.name).join(', ')}?`)}
                  className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-800 dark:text-rose-300 font-bold transition-all cursor-pointer active:scale-[0.96]"
                >
                  ⚠️ What inventory should I reorder now?
                </button>
              )}
              {slowMovingProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSendChatMessage(`How can I sell my slow items like "${slowMovingProducts[0]?.product.name}" and unlock trapped cash?`)}
                  className="px-3.5 py-2 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-800 dark:text-purple-300 font-bold transition-all cursor-pointer active:scale-[0.96]"
                >
                  📦 How to sell slow-moving stock?
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSendChatMessage('What would happen to my profit if I raised prices by 6% on my top sellers?')}
                className="px-3.5 py-2 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-800 dark:text-teal-300 font-bold transition-all cursor-pointer active:scale-[0.96]"
              >
                🏷️ Should I raise prices?
              </button>
              <button
                type="button"
                onClick={() => handleSendChatMessage('How much money can I safely take out as the business owner without squeezing store cash flow?')}
                className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold transition-all cursor-pointer active:scale-[0.96]"
              >
                💰 How much owner pay can I withdraw?
              </button>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar p-4 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06]">
            {chatMessages.length === 0 && !isChatLoading && (
              <div className="p-8 text-center space-y-2 text-slate-500 dark:text-slate-400">
                <Bot className="w-8 h-8 mx-auto text-blue-500 opacity-60" />
                <p className="text-xs font-bold">Your Advisor is ready.</p>
                <p className="text-[11px]">Click a suggested prompt above or type any question below to get plain-language advice.</p>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'advisor' && (
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md font-semibold'
                      : 'bg-white dark:bg-white/[0.06] text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/80 dark:border-white/[0.08] shadow-xs'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p>{msg.text}</p>
                  ) : (
                    <div className="markdown-body font-sans text-slate-800 dark:text-slate-200 space-y-2 ai-insight-text">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[9px] mt-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <span className={msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}>
                      {msg.timestamp}
                    </span>
                    {msg.sender === 'advisor' && msg.modelUsed && (
                      <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold">
                        ⚡ {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-2xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-xs flex items-center space-x-2 text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  <span>Advisor ({selectedModel.name}) is reviewing your numbers...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Error */}
          {chatError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{chatError}</span>
            </div>
          )}

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything about your store's sales, stock, or bills..."
              className="flex-1 bg-white/80 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatInput.trim()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.97] transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              {isChatLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. INTERACTIVE SIMULATOR ("What-If" Calculator) */}
      {advisorViewTab === 'simulator' && (
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="glass-card p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calculator className="w-4 h-4 text-blue-500" />
              <span>Quick Everyday Scenarios:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applySimPreset('price_bump')}
                className="px-3.5 py-1.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-500/20 transition-all cursor-pointer active:scale-[0.96]"
              >
                🏷️ +5% Price Bump
              </button>
              <button
                type="button"
                onClick={() => applySimPreset('cost_cut')}
                className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20 transition-all cursor-pointer active:scale-[0.96]"
              >
                ✂️ Cut Bills by 15%
              </button>
              <button
                type="button"
                onClick={() => applySimPreset('grow_sales')}
                className="px-3.5 py-1.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-500/20 transition-all cursor-pointer active:scale-[0.96]"
              >
                🚀 +20% Customer Demand
              </button>
              <button
                type="button"
                onClick={() => applySimPreset('reset')}
                className="px-3.5 py-1.5 rounded-2xl bg-black/[0.06] dark:bg-white/[0.08] hover:bg-black/[0.1] text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer active:scale-[0.96]"
              >
                Reset to Current
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Sliders */}
            <div className="lg:col-span-6 glass-card p-6 sm:p-7 rounded-3xl space-y-6">
              <div className="border-b border-slate-200/60 dark:border-white/[0.06] pb-3.5">
                <h3 className="text-sm font-extrabold font-display text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Adjust Your Business Levers</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  See how strategic adjustments affect real take-home cash.
                </p>
              </div>

              {/* Lever 1: Selling Price */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Product Selling Prices</span>
                  <span className={`tabular-nums ${simulatorParams.priceChangePercent >= 0 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-rose-600 font-extrabold'}`}>
                    {simulatorParams.priceChangePercent >= 0 ? '+' : ''}{simulatorParams.priceChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  value={simulatorParams.priceChangePercent}
                  onChange={(e) => setSimulatorParams({ ...simulatorParams, priceChangePercent: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-20% (Discount)</span>
                  <span>0%</span>
                  <span>+40% (Premium)</span>
                </div>
              </div>

              {/* Lever 2: Customer Sales Volume */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Customer Sales Volume</span>
                  <span className={`tabular-nums ${simulatorParams.volumeChangePercent >= 0 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-rose-600 font-extrabold'}`}>
                    {simulatorParams.volumeChangePercent >= 0 ? '+' : ''}{simulatorParams.volumeChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="80"
                  value={simulatorParams.volumeChangePercent}
                  onChange={(e) => setSimulatorParams({ ...simulatorParams, volumeChangePercent: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-40% (Slow Season)</span>
                  <span>0%</span>
                  <span>+80% (Boom)</span>
                </div>
              </div>

              {/* Lever 3: Store Bills / Expenses */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Store Bills & Overhead</span>
                  <span className={`tabular-nums ${simulatorParams.expenseChangePercent <= 0 ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}`}>
                    {simulatorParams.expenseChangePercent >= 0 ? '+' : ''}{simulatorParams.expenseChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={simulatorParams.expenseChangePercent}
                  onChange={(e) => setSimulatorParams({ ...simulatorParams, expenseChangePercent: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-40% (Trimmed)</span>
                  <span>0%</span>
                  <span>+40% (Expanded)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Projected Outcome Cards */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-6 rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white border border-white/[0.1] shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                    Projected Take-Home Money
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {simulationResult.projectedNetMarginPercent}% profit share
                  </span>
                </div>

                <div className="flex items-baseline justify-between relative z-10">
                  <div>
                    <p className="text-3xl font-black font-display text-white tabular-nums">
                      {cur}{simulationResult.projectedNetProfit.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Current Actual: <span className="text-slate-200 font-bold tabular-nums">{cur}{summary.netProfit.toFixed(2)}</span>
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-2xl text-xs font-extrabold ${
                      simulationResult.netProfitDelta >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    }`}
                  >
                    {simulationResult.netProfitDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span className="tabular-nums">{simulationResult.netProfitDelta >= 0 ? '+' : ''}{cur}{simulationResult.netProfitDelta.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-xs text-slate-200 font-medium leading-relaxed">
                  💬 {simulationResult.netProfitDelta >= 0
                    ? `With these adjustments, your estimated take-home earnings grow by +${cur}${simulationResult.netProfitDelta.toFixed(0)}!`
                    : `This scenario would reduce your take-home earnings by ${cur}${Math.abs(simulationResult.netProfitDelta).toFixed(0)}.`}
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="glass-card p-4 rounded-3xl">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Projected Total Sales</p>
                  <p className="text-lg font-black font-display text-slate-900 dark:text-white mt-1 tabular-nums">
                    {cur}{simulationResult.projectedRevenue.toFixed(2)}
                  </p>
                </div>

                <div className="glass-card p-4 rounded-3xl">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Estimated Monthly Bills</p>
                  <p className="text-lg font-black font-display text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                    {cur}{simulationResult.projectedExpenses.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
