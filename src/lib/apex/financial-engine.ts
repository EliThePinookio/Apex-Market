import {
  Transaction,
  Product,
  FinancialSummary,
  ActualVsForecastMetric,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
} from '@/types';

export interface DailyAggregationPoint {
  date: string;
  actualSales: number;
  forecastSales: number;
  actualExpenses: number;
  forecastExpenses: number;
  actualProfit: number;
  forecastProfit: number;
  isProjected?: boolean;
}

export interface FinancialHealthRatios {
  grossMarginPercent: number;
  netMarginPercent: number;
  operatingExpenseRatio: number;
  breakEvenSales: number;
  marginOfSafetyPercent: number;
  inventoryTurnoverRatio: number;
  workingCashPosition: number;
  cashToExpenseRunwayMonths: number;
}

/**
 * Computes Actual vs Forecasted Metrics based on historical pattern regression and velocity
 */
export function computeActualVsForecast(
  transactions: Transaction[],
  summary: FinancialSummary,
  periodDays: number = 30
): {
  metrics: ActualVsForecastMetric[];
  dailyTrend: DailyAggregationPoint[];
  healthRatios: FinancialHealthRatios;
  dailyVelocity: { avgSales: number; avgExpenses: number; avgProfit: number };
} {
  const salesTx = transactions.filter((t) => t.type === 'sale');
  const expenseTx = transactions.filter((t) => t.type === 'expense');

  // Compute active date span
  const now = new Date();
  const daysMap: { [dateStr: string]: { actualSales: number; actualExpenses: number; actualProfit: number } } = {};

  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    daysMap[key] = { actualSales: 0, actualExpenses: 0, actualProfit: 0 };
  }

  // Populate actuals
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (daysMap[key]) {
      if (t.type === 'sale') {
        daysMap[key].actualSales += t.amount;
        daysMap[key].actualProfit += t.grossProfit || 0;
      } else if (t.type === 'expense') {
        daysMap[key].actualExpenses += t.amount;
        daysMap[key].actualProfit -= t.amount;
      }
    }
  });

  const dailyKeys = Object.keys(daysMap);
  const totalDays = dailyKeys.length || 1;

  // Compute daily velocities
  const totalObservedSales = Object.values(daysMap).reduce((sum, d) => sum + d.actualSales, 0);
  const totalObservedExpenses = Object.values(daysMap).reduce((sum, d) => sum + d.actualExpenses, 0);
  const totalObservedProfit = Object.values(daysMap).reduce((sum, d) => sum + d.actualProfit, 0);

  const avgSalesDaily = totalObservedSales / totalDays;
  const avgExpensesDaily = totalObservedExpenses / totalDays;
  const avgProfitDaily = totalObservedProfit / totalDays;

  // Linear trend calculation (slope) for forecast weighting
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  const n = dailyKeys.length;

  dailyKeys.forEach((key, idx) => {
    const val = daysMap[key].actualSales;
    sumX += idx;
    sumY += val;
    sumXY += idx * val;
    sumX2 += idx * idx;
  });

  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const intercept = n > 1 ? (sumY - slope * sumX) / n : avgSalesDaily;

  // Build daily trend with historical actuals + regression baseline
  const dailyTrend: DailyAggregationPoint[] = dailyKeys.map((key, idx) => {
    const point = daysMap[key];
    const trendExpectedSales = Math.max(0, intercept + slope * idx);
    const trendExpectedExpenses = avgExpensesDaily;
    const trendExpectedProfit = trendExpectedSales * (summary.totalRevenue > 0 ? summary.grossProfit / summary.totalRevenue : 0.4) - trendExpectedExpenses;

    return {
      date: key,
      actualSales: Number(point.actualSales.toFixed(2)),
      forecastSales: Number(trendExpectedSales.toFixed(2)),
      actualExpenses: Number(point.actualExpenses.toFixed(2)),
      forecastExpenses: Number(trendExpectedExpenses.toFixed(2)),
      actualProfit: Number(point.actualProfit.toFixed(2)),
      forecastProfit: Number(trendExpectedProfit.toFixed(2)),
    };
  });

  // Build 5 future forecast projection days
  for (let i = 1; i <= 5; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = futureDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' (Est)';
    const idx = n + i - 1;
    const projSales = Math.max(0, intercept + slope * idx);
    const projExpenses = avgExpensesDaily;
    const projProfit = projSales * (summary.totalRevenue > 0 ? summary.grossProfit / summary.totalRevenue : 0.4) - projExpenses;

    dailyTrend.push({
      date: key,
      actualSales: 0,
      forecastSales: Number(projSales.toFixed(2)),
      actualExpenses: 0,
      forecastExpenses: Number(projExpenses.toFixed(2)),
      actualProfit: 0,
      forecastProfit: Number(projProfit.toFixed(2)),
      isProjected: true,
    });
  }

  // Baseline forecasted aggregate for the period
  const forecastBaselineSales = Math.max(summary.totalRevenue * 0.95, avgSalesDaily * periodDays);
  const forecastConservativeSales = forecastBaselineSales * 0.85; // -15% demand shock
  const forecastOptimisticSales = forecastBaselineSales * 1.2; // +20% growth momentum

  const forecastBaselineExpenses = Math.max(summary.totalExpenses * 0.95, avgExpensesDaily * periodDays);
  const forecastConservativeExpenses = forecastBaselineExpenses * 1.1; // +10% cost inflation
  const forecastOptimisticExpenses = forecastBaselineExpenses * 0.9; // -10% cost optimization

  const forecastBaselineGrossProfit = summary.totalRevenue > 0
    ? (summary.grossProfit / summary.totalRevenue) * forecastBaselineSales
    : forecastBaselineSales * 0.4;
  const forecastBaselineNetProfit = forecastBaselineGrossProfit - forecastBaselineExpenses;

  // Helper function for metric construction
  const buildMetric = (
    name: string,
    actual: number,
    baseline: number,
    conservative: number,
    optimistic: number,
    isCostMetric: boolean = false
  ): ActualVsForecastMetric => {
    const variancePercent = baseline > 0 ? ((actual - baseline) / baseline) * 100 : 0;
    const trendDirection = variancePercent > 2 ? 'up' : variancePercent < -2 ? 'down' : 'flat';
    
    let status: 'outperforming' | 'on_track' | 'underperforming' = 'on_track';
    if (isCostMetric) {
      if (variancePercent < -3) status = 'outperforming'; // lower costs is good
      else if (variancePercent > 5) status = 'underperforming';
    } else {
      if (variancePercent > 3) status = 'outperforming'; // higher revenue/profit is good
      else if (variancePercent < -5) status = 'underperforming';
    }

    return {
      metricName: name,
      actual: Number(actual.toFixed(2)),
      forecastBaseline: Number(baseline.toFixed(2)),
      forecastConservative: Number(conservative.toFixed(2)),
      forecastOptimistic: Number(optimistic.toFixed(2)),
      variancePercent: Number(variancePercent.toFixed(1)),
      trendDirection,
      status,
    };
  };

  const metrics: ActualVsForecastMetric[] = [
    buildMetric(
      'Sales Revenue',
      summary.totalRevenue,
      forecastBaselineSales,
      forecastConservativeSales,
      forecastOptimisticSales,
      false
    ),
    buildMetric(
      'Cost of Goods Sold (COGS)',
      summary.totalCOGS,
      summary.totalRevenue > 0 ? (summary.totalCOGS / summary.totalRevenue) * forecastBaselineSales : forecastBaselineSales * 0.6,
      forecastConservativeSales * 0.65,
      forecastOptimisticSales * 0.55,
      true
    ),
    buildMetric(
      'Gross Profit',
      summary.grossProfit,
      forecastBaselineGrossProfit,
      forecastConservativeSales * 0.35,
      forecastOptimisticSales * 0.45,
      false
    ),
    buildMetric(
      'Operating Overhead',
      summary.totalExpenses,
      forecastBaselineExpenses,
      forecastConservativeExpenses,
      forecastOptimisticExpenses,
      true
    ),
    buildMetric(
      'Net Business Profit',
      summary.netProfit,
      forecastBaselineNetProfit,
      (forecastConservativeSales * 0.35) - forecastConservativeExpenses,
      (forecastOptimisticSales * 0.45) - forecastOptimisticExpenses,
      false
    ),
  ];

  // Financial Health Ratios
  const grossMarginPercent = summary.totalRevenue > 0 ? (summary.grossProfit / summary.totalRevenue) * 100 : 0;
  const netMarginPercent = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;
  const operatingExpenseRatio = summary.totalRevenue > 0 ? (summary.totalExpenses / summary.totalRevenue) * 100 : 0;

  // Contribution Margin Ratio
  const cmRatio = summary.totalRevenue > 0 ? summary.grossProfit / summary.totalRevenue : 0.4;
  const breakEvenSales = cmRatio > 0 ? summary.totalExpenses / cmRatio : 0;
  const marginOfSafetyPercent = summary.totalRevenue > breakEvenSales && summary.totalRevenue > 0
    ? ((summary.totalRevenue - breakEvenSales) / summary.totalRevenue) * 100
    : 0;

  const inventoryTurnoverRatio = summary.totalInventoryValuation > 0
    ? summary.totalCOGS / summary.totalInventoryValuation
    : 0;

  const workingCashPosition = summary.totalRevenue + summary.totalCapital - summary.totalExpenses - summary.totalCOGS;
  const monthlyBurn = avgExpensesDaily * 30;
  const cashToExpenseRunwayMonths = monthlyBurn > 0 && workingCashPosition > 0
    ? workingCashPosition / monthlyBurn
    : workingCashPosition > 0 ? 12 : 0;

  return {
    metrics,
    dailyTrend,
    healthRatios: {
      grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
      netMarginPercent: Number(netMarginPercent.toFixed(1)),
      operatingExpenseRatio: Number(operatingExpenseRatio.toFixed(1)),
      breakEvenSales: Number(breakEvenSales.toFixed(2)),
      marginOfSafetyPercent: Number(marginOfSafetyPercent.toFixed(1)),
      inventoryTurnoverRatio: Number(inventoryTurnoverRatio.toFixed(2)),
      workingCashPosition: Number(workingCashPosition.toFixed(2)),
      cashToExpenseRunwayMonths: Number(cashToExpenseRunwayMonths.toFixed(1)),
    },
    dailyVelocity: {
      avgSales: Number(avgSalesDaily.toFixed(2)),
      avgExpenses: Number(avgExpensesDaily.toFixed(2)),
      avgProfit: Number(avgProfitDaily.toFixed(2)),
    },
  };
}

/**
 * Runs the dynamic 'What-If' Simulation Model
 */
export function simulateWhatIf(
  summary: FinancialSummary,
  params: WhatIfSimulationParams
): WhatIfSimulationResult {
  const currentRevenue = summary.totalRevenue;
  const currentCOGS = summary.totalCOGS;
  const currentGrossProfit = summary.grossProfit;
  const currentExpenses = summary.totalExpenses;
  const currentNetProfit = summary.netProfit;

  // Volume & Price multipliers
  const priceMultiplier = 1 + params.priceChangePercent / 100;
  const volumeMultiplier = 1 + params.volumeChangePercent / 100;
  const cogsUnitMultiplier = 1 + params.cogsChangePercent / 100;
  const expenseMultiplier = 1 + params.expenseChangePercent / 100;

  // Projected Revenue = Base Revenue * Price Multiplier * Volume Multiplier
  const projectedRevenue = currentRevenue * priceMultiplier * volumeMultiplier;

  // Projected COGS = Base COGS * Supplier Cost Multiplier * Volume Multiplier
  const projectedCOGS = currentCOGS * cogsUnitMultiplier * volumeMultiplier;

  // Projected Gross Profit
  const projectedGrossProfit = projectedRevenue - projectedCOGS;
  const projectedGrossMarginPercent = projectedRevenue > 0 ? (projectedGrossProfit / projectedRevenue) * 100 : 0;

  // Projected Overhead Expenses
  const projectedExpenses = Math.max(0, currentExpenses * expenseMultiplier);

  // Projected Net Profit
  const projectedNetProfit = projectedGrossProfit - projectedExpenses;
  const netProfitDelta = projectedNetProfit - currentNetProfit;
  const netProfitDeltaPercent = currentNetProfit !== 0
    ? ((projectedNetProfit - currentNetProfit) / Math.abs(currentNetProfit)) * 100
    : 0;
  const projectedNetMarginPercent = projectedRevenue > 0 ? (projectedNetProfit / projectedRevenue) * 100 : 0;

  // Break-even calculations
  const projectedCMRatio = projectedRevenue > 0 ? projectedGrossProfit / projectedRevenue : 0.4;
  const currentCMRatio = currentRevenue > 0 ? currentGrossProfit / currentRevenue : 0.4;

  const currentBreakEvenRevenue = currentCMRatio > 0 ? currentExpenses / currentCMRatio : 0;
  const projectedBreakEvenRevenue = projectedCMRatio > 0 ? projectedExpenses / projectedCMRatio : 0;
  const breakEvenDelta = projectedBreakEvenRevenue - currentBreakEvenRevenue;

  const marginOfSafetyPercent = projectedRevenue > projectedBreakEvenRevenue && projectedRevenue > 0
    ? ((projectedRevenue - projectedBreakEvenRevenue) / projectedRevenue) * 100
    : 0;

  const projectedWorkingCash =
    projectedRevenue +
    summary.totalCapital +
    params.additionalCapital -
    projectedExpenses -
    projectedCOGS;

  return {
    currentRevenue: Number(currentRevenue.toFixed(2)),
    projectedRevenue: Number(projectedRevenue.toFixed(2)),
    revenueDelta: Number((projectedRevenue - currentRevenue).toFixed(2)),

    currentCOGS: Number(currentCOGS.toFixed(2)),
    projectedCOGS: Number(projectedCOGS.toFixed(2)),
    cogsDelta: Number((projectedCOGS - currentCOGS).toFixed(2)),

    currentGrossProfit: Number(currentGrossProfit.toFixed(2)),
    projectedGrossProfit: Number(projectedGrossProfit.toFixed(2)),
    grossProfitDelta: Number((projectedGrossProfit - currentGrossProfit).toFixed(2)),
    projectedGrossMarginPercent: Number(projectedGrossMarginPercent.toFixed(1)),

    currentExpenses: Number(currentExpenses.toFixed(2)),
    projectedExpenses: Number(projectedExpenses.toFixed(2)),
    expensesDelta: Number((projectedExpenses - currentExpenses).toFixed(2)),

    currentNetProfit: Number(currentNetProfit.toFixed(2)),
    projectedNetProfit: Number(projectedNetProfit.toFixed(2)),
    netProfitDelta: Number(netProfitDelta.toFixed(2)),
    netProfitDeltaPercent: Number(netProfitDeltaPercent.toFixed(1)),
    projectedNetMarginPercent: Number(projectedNetMarginPercent.toFixed(1)),

    currentBreakEvenRevenue: Number(currentBreakEvenRevenue.toFixed(2)),
    projectedBreakEvenRevenue: Number(projectedBreakEvenRevenue.toFixed(2)),
    breakEvenDelta: Number(breakEvenDelta.toFixed(2)),

    marginOfSafetyPercent: Number(marginOfSafetyPercent.toFixed(1)),
    projectedWorkingCash: Number(projectedWorkingCash.toFixed(2)),
  };
}
