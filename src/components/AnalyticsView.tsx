import React, { useState, useMemo } from 'react';
import {
  PieChart as PieIcon,
  TrendingUp,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Activity,
  Calculator,
  Target,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers,
  Percent,
  TrendingDown,
  Info,
  Clock,
  Gauge,
  SlidersHorizontal,
  PackageCheck,
  AlertTriangle,
  Boxes,
  Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import { Transaction, Product, BusinessProfile, FinancialSummary, WhatIfSimulationParams } from '../types';
import { computeActualVsForecast, simulateWhatIf } from '../services/financialEngine';
import {
  generateForecast,
  ForecastingConfig,
  ForecastingModelType,
  DEFAULT_FORECAST_CONFIG,
} from '../utils/forecastingEngine';
import { GeminiProfitAdvisor } from './GeminiProfitAdvisor';

interface AnalyticsViewProps {
  transactions: Transaction[];
  products: Product[];
  profile: BusinessProfile;
  summary: FinancialSummary;
}

type AnalyticsTab = 'forecast' | 'what_if' | 'pl_statement' | 'health_ratios';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  products,
  profile,
  summary,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('forecast');

  // Central Forecasting Engine Interactive State
  const [forecastConfig, setForecastConfig] = useState<ForecastingConfig>(DEFAULT_FORECAST_CONFIG);
  const [selectedSubView, setSelectedSubView] = useState<'financial' | 'inventory_demand'>('financial');

  // 'What-If' Simulation Parameters
  const [whatIfParams, setWhatIfParams] = useState<WhatIfSimulationParams>({
    priceChangePercent: 0,
    volumeChangePercent: 0,
    cogsChangePercent: 0,
    expenseChangePercent: 0,
    additionalCapital: 0,
  });

  const cur = profile.currencySymbol;

  // Run the Central Forecasting Engine
  const forecastResult = useMemo(() => {
    return generateForecast(transactions, products, summary, forecastConfig);
  }, [transactions, products, summary, forecastConfig]);

  // Compute Static Health Ratios from Financial Engine
  const { healthRatios, dailyVelocity } = useMemo(() => {
    return computeActualVsForecast(transactions, summary, forecastConfig.historicalDays);
  }, [transactions, summary, forecastConfig.historicalDays]);

  // Compute What-If Simulation Result
  const simulationResult = useMemo(() => {
    return simulateWhatIf(summary, whatIfParams);
  }, [summary, whatIfParams]);

  // Category expense share pie chart data
  const categoryExpenseData = useMemo(() => {
    const map: { [cat: string]: number } = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'General';
        map[cat] = (map[cat] || 0) + t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

  // Quick Preset Scenarios for What-If
  const applyPreset = (preset: 'price_hike' | 'cost_cutting' | 'expansion' | 'conservative' | 'reset') => {
    switch (preset) {
      case 'price_hike':
        setWhatIfParams({
          priceChangePercent: 8,
          volumeChangePercent: -2,
          cogsChangePercent: 0,
          expenseChangePercent: 0,
          additionalCapital: 0,
        });
        break;
      case 'cost_cutting':
        setWhatIfParams({
          priceChangePercent: 0,
          volumeChangePercent: 0,
          cogsChangePercent: -6,
          expenseChangePercent: -15,
          additionalCapital: 0,
        });
        break;
      case 'expansion':
        setWhatIfParams({
          priceChangePercent: 0,
          volumeChangePercent: 30,
          cogsChangePercent: -4,
          expenseChangePercent: 12,
          additionalCapital: 500,
        });
        break;
      case 'conservative':
        setWhatIfParams({
          priceChangePercent: 0,
          volumeChangePercent: -15,
          cogsChangePercent: 5,
          expenseChangePercent: -10,
          additionalCapital: 0,
        });
        break;
      case 'reset':
        setWhatIfParams({
          priceChangePercent: 0,
          volumeChangePercent: 0,
          cogsChangePercent: 0,
          expenseChangePercent: 0,
          additionalCapital: 0,
        });
        break;
    }
  };

  const modelLabels: { [key in ForecastingModelType]: { name: string; desc: string } } = {
    ensemble: {
      name: 'Ensemble Multi-Model',
      desc: 'Blends Linear Regression (50%), Weighted Moving Average (30%), and Exponential Smoothing (20%)',
    },
    simple_moving_average: {
      name: 'Simple Moving Average (SMA)',
      desc: 'Unweighted rolling mean over the specified window',
    },
    weighted_moving_average: {
      name: 'Weighted Moving Avg (WMA)',
      desc: 'Linearly weights recent days higher than older days',
    },
    exponential_smoothing: {
      name: 'Exponential Smoothing (EMA)',
      desc: 'Recursive smoothing with alpha parameter giving exponential decay to historical data',
    },
    linear_trend: {
      name: 'Linear Regression Trendline',
      desc: 'Ordinary least squares slope regression projecting trajectory',
    },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Deep Atmospheric Apple-style Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#131722] to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-white/[0.08] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-wider uppercase mb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Central Forecasting & Moving Average Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Financial Intelligence & Predictive Analytics
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl font-medium leading-relaxed">
              Historical time-series modeling, rolling moving averages, actual vs. forecast variances, and product velocity forecasting.
            </p>
          </div>

          {/* Tab Navigation Pill Bar (iOS Segmented Style) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-black/40 rounded-2xl border border-white/[0.1] text-xs font-semibold shrink-0 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 active:scale-[0.97] ${
                activeTab === 'forecast'
                  ? 'bg-white text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Actual vs Forecast</span>
            </button>

            <button
              onClick={() => setActiveTab('what_if')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 active:scale-[0.97] ${
                activeTab === 'what_if'
                  ? 'bg-white text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>'What-If' Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('pl_statement')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 active:scale-[0.97] ${
                activeTab === 'pl_statement'
                  ? 'bg-white text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>P&L Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('health_ratios')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 active:scale-[0.97] ${
                activeTab === 'health_ratios'
                  ? 'bg-white text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Health Ratios</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Level Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl ios-card">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Sales Revenue Variance</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                forecastResult.summaryStats.salesVariancePercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
              }`}
            >
              {forecastResult.summaryStats.salesVariancePercent >= 0 ? '+' : ''}
              {forecastResult.summaryStats.salesVariancePercent}%
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
            {cur}{forecastResult.summaryStats.totalActualSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Forecast: <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">{cur}{forecastResult.summaryStats.totalForecastSales.toFixed(2)}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl ios-card">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Profit Margin Variance</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                forecastResult.summaryStats.profitVariancePercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
              }`}
            >
              {forecastResult.summaryStats.profitVariancePercent >= 0 ? '+' : ''}
              {forecastResult.summaryStats.profitVariancePercent}%
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {cur}{forecastResult.summaryStats.totalActualProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Expected: <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">{cur}{forecastResult.summaryStats.totalForecastProfit.toFixed(2)}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl ios-card">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Daily Run-Rate</p>
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/20 px-2 py-0.5 rounded-full">
              {forecastResult.summaryStats.trendDirection}
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
            {cur}{forecastResult.summaryStats.dailyAvgSalesVelocity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs text-slate-400 font-normal ml-1">/day</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Burn: <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">{cur}{forecastResult.summaryStats.dailyAvgBurnRate.toFixed(2)}/d</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl ios-card">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Model Reliability</p>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              MAPE {forecastResult.accuracy.mape}%
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {forecastResult.accuracy.reliabilityScore}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            R² Fit: <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">{forecastResult.accuracy.rSquared}</span> (MAE: {cur}{forecastResult.accuracy.mae})
          </p>
        </div>
      </div>

      {/* TAB 1: CENTRAL FORECASTING & MOVING AVERAGE ENGINE */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Interactive Central Forecasting Engine Control Station */}
          <div className="p-5 rounded-2xl ios-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Forecasting Engine Controls & Algorithms</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Switch between time-series algorithms, adjust rolling moving-average windows, and tune projection horizons.
                  </p>
                </div>
              </div>

              {/* Sub-view toggle (Financial vs Inventory) */}
              <div className="flex items-center space-x-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSubView('financial')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 active:scale-[0.97] ${
                    selectedSubView === 'financial'
                      ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Financial Metrics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubView('inventory_demand')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 active:scale-[0.97] ${
                    selectedSubView === 'inventory_demand'
                      ? 'bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Stockout & Demand Velocity</span>
                </button>
              </div>
            </div>

            {/* Control Row 1: Model Selection Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Select Forecasting Algorithm:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {(
                  [
                    'ensemble',
                    'simple_moving_average',
                    'weighted_moving_average',
                    'exponential_smoothing',
                    'linear_trend',
                  ] as const
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForecastConfig({ ...forecastConfig, model: m })}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer active:scale-[0.97] ${
                      forecastConfig.model === m
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold'
                        : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <p className="text-xs font-bold truncate">{modelLabels[m].name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{modelLabels[m].desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Control Row 2: Parameters Grid (Historical Window, Future Horizon, Scenario Multiplier) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
              {/* Historical Days */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Historical Data Span:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{forecastConfig.historicalDays} Days</span>
                </label>
                <div className="flex items-center space-x-1">
                  {[7, 14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForecastConfig({ ...forecastConfig, historicalDays: d })}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-[0.96] ${
                        forecastConfig.historicalDays === d
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Future Projection Days */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Future Forecast Horizon:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{forecastConfig.forecastAheadDays} Days Ahead</span>
                </label>
                <div className="flex items-center space-x-1">
                  {[3, 7, 14, 30].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForecastConfig({ ...forecastConfig, forecastAheadDays: f })}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-[0.96] ${
                        forecastConfig.forecastAheadDays === f
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      +{f}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenario Growth Multiplier */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>Scenario Multiplier:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {Math.round(forecastConfig.growthMultiplier * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="1"
                  value={Math.round(forecastConfig.growthMultiplier * 100)}
                  onChange={(e) =>
                    setForecastConfig({ ...forecastConfig, growthMultiplier: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>0% (Halted)</span>
                  <span>100% (Base)</span>
                  <span>200% (2x Growth)</span>
                </div>
                <div className="flex items-center space-x-1 pt-0.5">
                  {[
                    { label: '85% (Bear)', val: 0.85 },
                    { label: '100% (Base)', val: 1.0 },
                    { label: '120% (Bull)', val: 1.2 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setForecastConfig({ ...forecastConfig, growthMultiplier: s.val })}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer active:scale-[0.96] ${
                        forecastConfig.growthMultiplier === s.val
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moving Average / Alpha Tuning */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {forecastConfig.model === 'exponential_smoothing' ? 'Alpha Weight' : 'MA Window'}
                  </label>
                  <label className="flex items-center space-x-1 text-[10px] text-slate-500 dark:text-slate-400 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forecastConfig.includeConfidenceBands}
                      onChange={(e) =>
                        setForecastConfig({ ...forecastConfig, includeConfidenceBands: e.target.checked })
                      }
                      className="accent-emerald-600 rounded"
                    />
                    <span>95% Confidence</span>
                  </label>
                </div>

                {forecastConfig.model === 'exponential_smoothing' ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={forecastConfig.smoothingAlpha}
                      onChange={(e) =>
                        setForecastConfig({ ...forecastConfig, smoothingAlpha: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 w-8">
                      {forecastConfig.smoothingAlpha}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    {[3, 5, 7, 14].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setForecastConfig({ ...forecastConfig, movingAverageWindow: w })}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-[0.96] ${
                          forecastConfig.movingAverageWindow === w
                            ? 'bg-slate-800 border-slate-800 text-white shadow-2xs'
                            : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        {w}d
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SUB-VIEW 1: FINANCIAL METRICS & ACTUAL VS FORECAST TABLE */}
          {selectedSubView === 'financial' && (
            <div className="space-y-6">
              {/* Actual vs Forecasted Metrics Table Card */}
              <div className="p-5 rounded-2xl ios-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Actual vs. Forecasted Performance Metrics ({forecastConfig.historicalDays} Days Span)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Regression & moving average baseline compared against recorded actuals, conservative (-15%), and optimistic (+20%) scenarios.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.05] dark:border-white/[0.06] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Metric Name</th>
                        <th className="py-2.5 px-3 text-right">Actual Recorded</th>
                        <th className="py-2.5 px-3 text-right">Forecast Baseline</th>
                        <th className="py-2.5 px-3 text-right">Conservative</th>
                        <th className="py-2.5 px-3 text-right">Optimistic</th>
                        <th className="py-2.5 px-3 text-right">Variance (%)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] tabular-nums">
                      {forecastResult.metrics.map((m) => (
                        <tr key={m.metricName} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>{m.metricName}</span>
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {cur}{m.actual.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-slate-600 dark:text-slate-400">
                            {cur}{m.forecastBaseline.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-500 dark:text-slate-400">
                            {cur}{m.forecastConservative.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                            {cur}{m.forecastOptimistic.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={`font-bold inline-flex items-center space-x-0.5 ${
                                m.variancePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {m.variancePercent >= 0 ? '+' : ''}
                              {m.variancePercent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {m.status === 'outperforming' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                Outperforming
                              </span>
                            )}
                            {m.status === 'on_track' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/[0.08]">
                                On Track
                              </span>
                            )}
                            {m.status === 'underperforming' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                Underperforming
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Recharts Composed Chart with Moving Averages & Future Projections */}
              <div className="p-5 rounded-2xl ios-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Sales Time-Series with Moving Average & +{forecastConfig.forecastAheadDays}d Projections
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Model: <span className="font-bold text-emerald-600 dark:text-emerald-400">{modelLabels[forecastConfig.model].name}</span> | Window: {forecastConfig.movingAverageWindow}d
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" /> Actual Recorded
                    </span>
                    <span className="flex items-center text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-0.5 bg-teal-600 mr-1.5" /> Forecast Trajectory
                    </span>
                    <span className="flex items-center text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-0.5 bg-amber-500 mr-1.5" /> Rolling MA (SMA/WMA)
                    </span>
                    {forecastConfig.includeConfidenceBands && (
                      <span className="flex items-center text-slate-700 dark:text-slate-300">
                        <span className="w-2.5 h-2 bg-emerald-500/20 mr-1.5 rounded-xs" /> 95% Confidence
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastResult.timeSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(28, 28, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '16px',
                          fontSize: '12px',
                          color: '#ffffff',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        }}
                        formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
                      />
                      {forecastConfig.includeConfidenceBands && (
                        <Area
                          type="monotone"
                          dataKey="confidenceUpper"
                          stroke="transparent"
                          fill="#10b981"
                          fillOpacity={0.15}
                          name="Confidence Upper"
                        />
                      )}
                      <Bar dataKey="actualSales" fill="#10b981" radius={[6, 6, 0, 0]} name="Actual Sales" />
                      <Line
                        type="monotone"
                        dataKey="forecastSales"
                        stroke="#14b8a6"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        name="Forecast Baseline"
                      />
                      <Line
                        type="monotone"
                        dataKey={
                          forecastConfig.model === 'weighted_moving_average'
                            ? 'wmaSales'
                            : forecastConfig.model === 'exponential_smoothing'
                            ? 'emaSales'
                            : 'smaSales'
                        }
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        name="Moving Average"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: INVENTORY DEMAND VELOCITY & STOCKOUT RUNOUT FORECAST */}
          {selectedSubView === 'inventory_demand' && (
            <div className="p-5 rounded-2xl ios-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Product Velocity & Predicted Stockout Runout ({forecastConfig.forecastAheadDays} Days Horizon)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Calculates average daily sales velocity from historical transactions to project stockout dates and reorder quantities.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/[0.05] dark:border-white/[0.06] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">In Stock</th>
                      <th className="py-2.5 px-3 text-right">Daily Velocity</th>
                      <th className="py-2.5 px-3 text-right">Est. Demand (+{forecastConfig.forecastAheadDays}d)</th>
                      <th className="py-2.5 px-3 text-right">Runout Days</th>
                      <th className="py-2.5 px-3 text-center">Stockout Risk</th>
                      <th className="py-2.5 px-3 text-right">Recommended Refill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04] tabular-nums">
                    {forecastResult.productForecasts.map((p) => (
                      <tr key={p.productId} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 dark:text-white">{p.productName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">{p.category}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{p.currentStock}</td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{p.dailyVelocity} units/d</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200">{p.forecastedDemandUnits} units</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-bold ${
                              p.daysOfInventoryRemaining < 7
                                ? 'text-rose-600 dark:text-rose-400'
                                : p.daysOfInventoryRemaining < 14
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.daysOfInventoryRemaining > 365 ? '>1 year' : `${p.daysOfInventoryRemaining} days`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {p.stockoutRisk === 'CRITICAL' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                              CRITICAL
                            </span>
                          )}
                          {p.stockoutRisk === 'MODERATE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              MODERATE
                            </span>
                          )}
                          {p.stockoutRisk === 'HEALTHY' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              HEALTHY
                            </span>
                          )}
                          {p.stockoutRisk === 'OVERSTOCKED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-black/[0.06] dark:border-white/[0.08]">
                              OVERSTOCKED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {p.recommendedRefillUnits > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{p.recommendedRefillUnits} units</span>
                          ) : (
                            <span className="text-slate-400 font-medium">Sufficient</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE 'WHAT-IF' SIMULATION LAB */}
      {activeTab === 'what_if' && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="p-4 rounded-2xl ios-card flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Quick 'What-If' Simulation Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPreset('price_hike')}
                className="px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-emerald-500/15 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer active:scale-[0.96]"
              >
                +8% Price Raise (-2% Vol)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cost_cutting')}
                className="px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-emerald-500/15 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer active:scale-[0.96]"
              >
                -15% Expense & -6% COGS
              </button>
              <button
                type="button"
                onClick={() => applyPreset('expansion')}
                className="px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-emerald-500/15 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer active:scale-[0.96]"
              >
                Aggressive Growth (+30% Vol)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('conservative')}
                className="px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-rose-500/15 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-bold border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer active:scale-[0.96]"
              >
                Downside Shock (-15% Vol)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('reset')}
                className="px-3 py-1.5 rounded-xl bg-black/[0.08] dark:bg-white/[0.1] hover:bg-black/[0.12] dark:hover:bg-white/[0.15] text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer active:scale-[0.96]"
              >
                Reset to Zero
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive Simulation Sliders & Inputs (6 Cols) */}
            <div className="lg:col-span-6 p-6 rounded-2xl ios-card space-y-5">
              <div className="border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Hypothetical Variable Adjustments</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Drag the sliders to test the sensitivity of price elasticity, procurement, and overheads.
                </p>
              </div>

              {/* Variable 1: Selling Price Change % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Product Selling Price Adjustment</span>
                  <span className={`font-mono ${whatIfParams.priceChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                    {whatIfParams.priceChangePercent >= 0 ? '+' : ''}{whatIfParams.priceChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={whatIfParams.priceChangePercent}
                  onChange={(e) => setWhatIfParams({ ...whatIfParams, priceChangePercent: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>-30% (Discount)</span>
                  <span>0%</span>
                  <span>+50% (Premium)</span>
                </div>
              </div>

              {/* Variable 2: Sales Volume % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Customer Sales Volume / Demand Change</span>
                  <span className={`font-mono ${whatIfParams.volumeChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                    {whatIfParams.volumeChangePercent >= 0 ? '+' : ''}{whatIfParams.volumeChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  value={whatIfParams.volumeChangePercent}
                  onChange={(e) => setWhatIfParams({ ...whatIfParams, volumeChangePercent: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>-50% (Slow Season)</span>
                  <span>0%</span>
                  <span>+100% (Doubled)</span>
                </div>
              </div>

              {/* Variable 3: Supplier COGS Cost % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Supplier Cost / COGS Procurement</span>
                  <span className={`font-mono ${whatIfParams.cogsChangePercent <= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                    {whatIfParams.cogsChangePercent >= 0 ? '+' : ''}{whatIfParams.cogsChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={whatIfParams.cogsChangePercent}
                  onChange={(e) => setWhatIfParams({ ...whatIfParams, cogsChangePercent: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>-30% (Bulk Discount)</span>
                  <span>0%</span>
                  <span>+50% (Cost Inflation)</span>
                </div>
              </div>

              {/* Variable 4: Operating Expenses Change % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Operating Overhead (Rent, Utilities, Staff)</span>
                  <span className={`font-mono ${whatIfParams.expenseChangePercent <= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                    {whatIfParams.expenseChangePercent >= 0 ? '+' : ''}{whatIfParams.expenseChangePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={whatIfParams.expenseChangePercent}
                  onChange={(e) => setWhatIfParams({ ...whatIfParams, expenseChangePercent: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>-50% (Trimmed)</span>
                  <span>0%</span>
                  <span>+50% (Expanded)</span>
                </div>
              </div>

              {/* Variable 5: Additional Capital Injection */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Owner Capital Injection ({cur})
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={whatIfParams.additionalCapital || ''}
                  placeholder="0"
                  onChange={(e) => setWhatIfParams({ ...whatIfParams, additionalCapital: Number(e.target.value) || 0 })}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Right Column: Real-time Projected Outcome Cards (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Main Net Profit Projection Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-[#131722] to-slate-950 text-white border border-white/[0.08] shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Projected Net Profit
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Net Margin: {simulationResult.projectedNetMarginPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white font-mono tabular-nums">
                      {cur}{simulationResult.projectedNetProfit.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Current Actual: <span className="font-mono text-slate-200">{cur}{summary.netProfit.toFixed(2)}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl font-mono text-xs font-bold ${
                        simulationResult.netProfitDelta >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      }`}
                    >
                      {simulationResult.netProfitDelta >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>
                        {simulationResult.netProfitDelta >= 0 ? '+' : ''}
                        {cur}{simulationResult.netProfitDelta.toFixed(2)} ({simulationResult.netProfitDeltaPercent >= 0 ? '+' : ''}{simulationResult.netProfitDeltaPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Comparison Cards */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl ios-card">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Projected Revenue</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                    {cur}{simulationResult.projectedRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold font-mono mt-0.5">
                    {simulationResult.revenueDelta >= 0 ? '+' : ''}{cur}{simulationResult.revenueDelta.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl ios-card">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Projected Gross Profit</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tabular-nums">
                    {cur}{simulationResult.projectedGrossProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold font-mono mt-0.5">
                    Margin: {simulationResult.projectedGrossMarginPercent}%
                  </p>
                </div>

                <div className="p-4 rounded-2xl ios-card">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Projected Overhead</p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono tabular-nums">
                    {cur}{simulationResult.projectedExpenses.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold font-mono mt-0.5">
                    {simulationResult.expensesDelta >= 0 ? '+' : ''}{cur}{simulationResult.expensesDelta.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl ios-card">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Break-Even Revenue</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                    {cur}{simulationResult.projectedBreakEvenRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-bold font-mono mt-0.5">
                    Safety: {simulationResult.marginOfSafetyPercent}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTIVE P&L STATEMENT & REVENUE VELOCITY */}
      {activeTab === 'pl_statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recharts Bar Chart (7 Cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl ios-card space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Revenue vs Operating Expenses Velocity</span>
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <span className="flex items-center text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" /> Sales
                </span>
                <span className="flex items-center text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-1.5" /> Expense
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastResult.timeSeries.filter(p => !p.isProjected)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(28, 28, 30, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#ffffff',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}
                    formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
                  />
                  <Bar dataKey="actualSales" fill="#10b981" radius={[6, 6, 0, 0]} name="Sales" />
                  <Bar dataKey="actualExpenses" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column: Structured P&L Statement (5 Cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl ios-card space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Income & Profit Loss Statement (P&L)
              </h3>

              <div className="space-y-2 text-xs font-mono tabular-nums">
                <div className="flex justify-between p-2.5 rounded-xl ios-subcard font-semibold text-slate-800 dark:text-slate-200">
                  <span className="font-sans">Sales Revenue</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{cur}{summary.totalRevenue.toFixed(2)}</span>
                </div>

                <div className="flex justify-between p-2.5 rounded-xl ios-subcard text-slate-500 dark:text-slate-400">
                  <span className="font-sans">Less: COGS (Cost of Goods)</span>
                  <span>- {cur}{summary.totalCOGS.toFixed(2)}</span>
                </div>

                <div className="flex justify-between p-2.5 rounded-xl ios-subcard font-bold text-slate-900 dark:text-white border-l-4 border-emerald-600">
                  <span className="font-sans">GROSS PROFIT</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">={cur}{summary.grossProfit.toFixed(2)}</span>
                </div>

                <div className="flex justify-between p-2.5 rounded-xl ios-subcard text-slate-500 dark:text-slate-400">
                  <span className="font-sans">Less: Operating Overhead</span>
                  <span className="text-rose-600 dark:text-rose-400">- {cur}{summary.totalExpenses.toFixed(2)}</span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 font-bold text-sm text-slate-900 dark:text-white">
                  <span className="font-sans">NET BUSINESS PROFIT</span>
                  <span className={summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {cur}{summary.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expense Category Share Pie Chart */}
            {categoryExpenseData.length > 0 && (
              <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Expenses Share Breakdown
                </h4>

                <div className="h-32 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryExpenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryExpenseData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(28, 28, 30, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#ffffff',
                        }}
                        formatter={(val: any) => [`${cur}${Number(val).toFixed(2)}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL HEALTH & ACCOUNTING RATIOS */}
      {activeTab === 'health_ratios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl ios-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gross Margin Ratio</span>
              <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {healthRatios.grossMarginPercent}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Percentage of sales revenue retained after subtracting direct goods cost (COGS).
            </p>
          </div>

          <div className="p-5 rounded-2xl ios-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Profit Margin</span>
              <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </div>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
              {healthRatios.netMarginPercent}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Final bottom-line profit retained per unit of sales after overhead expenses.
            </p>
          </div>

          <div className="p-5 rounded-2xl ios-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operating Expense Ratio</span>
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {healthRatios.operatingExpenseRatio}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Operational efficiency measure: overhead spending as a percentage of total sales.
            </p>
          </div>

          <div className="p-5 rounded-2xl ios-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Break-Even Sales Target</span>
              <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums">
              {cur}{healthRatios.breakEvenSales.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Minimum revenue needed to cover fixed overheads and prevent operational loss.
            </p>
          </div>

          <div className="p-5 rounded-2xl ios-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inventory Velocity (Turns)</span>
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {healthRatios.inventoryTurnoverRatio}x
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Inventory turnover rate: ratio of cost of goods sold to current stock valuation.
            </p>
          </div>

          <div className="p-5 rounded-2xl ios-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Liquid Cash Runway</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {healthRatios.cashToExpenseRunwayMonths} months
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Estimated working capital buffer to cover fixed operating expenditures.
            </p>
          </div>
        </div>
      )}

      {/* Gemini AI Profit Advisor Section */}
      <GeminiProfitAdvisor summary={summary} profile={profile} products={products} />
    </div>
  );
};
