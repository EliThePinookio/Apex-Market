import { Transaction, Product, FinancialSummary, ActualVsForecastMetric } from '../types';

export type ForecastingModelType =
  | 'linear_trend'
  | 'simple_moving_average'
  | 'weighted_moving_average'
  | 'exponential_smoothing'
  | 'ensemble';

export interface ForecastingConfig {
  model: ForecastingModelType;
  historicalDays: number; // e.g., 7, 14, 30, 60, 90
  forecastAheadDays: number; // e.g., 3, 7, 14, 30
  movingAverageWindow: number; // e.g., 3, 7, 14
  smoothingAlpha: number; // 0.1 to 0.9 (for Exponential Smoothing)
  growthMultiplier: number; // 0.5 to 2.0 (1.0 = normal baseline)
  includeConfidenceBands: boolean;
}

export interface DailyTimeSeriesPoint {
  date: string;
  timestamp: number;
  rawDateStr: string;
  dayOfWeek: string;
  actualSales: number;
  actualCOGS: number;
  actualExpenses: number;
  actualProfit: number;
  transactionCount: number;
  // Moving averages
  smaSales: number | null;
  wmaSales: number | null;
  emaSales: number | null;
  // Forecasted values
  forecastSales: number;
  forecastExpenses: number;
  forecastProfit: number;
  confidenceUpper: number;
  confidenceLower: number;
  isProjected: boolean;
}

export interface ModelAccuracyStats {
  mae: number; // Mean Absolute Error
  mape: number; // Mean Absolute Percentage Error (%)
  rmse: number; // Root Mean Squared Error
  rSquared: number; // Coefficient of Determination (0 to 1)
  reliabilityScore: number; // 0 to 100%
  sampleSize: number;
}

export interface ProductDemandForecast {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  dailyVelocity: number; // avg units sold per day
  forecastedDemandUnits: number; // estimated units needed over forecastAheadDays
  daysOfInventoryRemaining: number; // currentStock / dailyVelocity
  stockoutRisk: 'CRITICAL' | 'MODERATE' | 'HEALTHY' | 'OVERSTOCKED';
  recommendedRefillUnits: number;
}

export interface ComprehensiveForecastResult {
  config: ForecastingConfig;
  metrics: ActualVsForecastMetric[];
  timeSeries: DailyTimeSeriesPoint[];
  accuracy: ModelAccuracyStats;
  productForecasts: ProductDemandForecast[];
  summaryStats: {
    totalActualSales: number;
    totalForecastSales: number;
    salesVarianceAmount: number;
    salesVariancePercent: number;
    totalActualProfit: number;
    totalForecastProfit: number;
    profitVarianceAmount: number;
    profitVariancePercent: number;
    dailyAvgSalesVelocity: number;
    dailyAvgBurnRate: number;
    projectedRunwayDays: number;
    linearSlope: number;
    trendDirection: 'GROWTH' | 'DECLINE' | 'STABLE';
  };
}

/**
 * Standard default configuration for the central forecasting engine
 */
export const DEFAULT_FORECAST_CONFIG: ForecastingConfig = {
  model: 'ensemble',
  historicalDays: 30,
  forecastAheadDays: 7,
  movingAverageWindow: 7,
  smoothingAlpha: 0.35,
  growthMultiplier: 1.0,
  includeConfidenceBands: true,
};

/**
 * Helper to compute Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], windowSize: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += data[i - j];
      }
      result.push(Number((sum / windowSize).toFixed(2)));
    }
  }
  return result;
}

/**
 * Helper to compute Weighted Moving Average (WMA)
 * Recent days receive linearly higher weights
 */
export function calculateWMA(data: number[], windowSize: number): (number | null)[] {
  const result: (number | null)[] = [];
  const denominator = (windowSize * (windowSize + 1)) / 2;

  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(null);
    } else {
      let weightedSum = 0;
      for (let j = 0; j < windowSize; j++) {
        const weight = windowSize - j;
        weightedSum += data[i - j] * weight;
      }
      result.push(Number((weightedSum / denominator).toFixed(2)));
    }
  }
  return result;
}

/**
 * Helper to compute Single Exponential Smoothing (EMA)
 */
export function calculateEMA(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    const nextVal = alpha * data[i] + (1 - alpha) * result[i - 1];
    result.push(Number(nextVal.toFixed(2)));
  }
  return result;
}

/**
 * Helper to compute Ordinary Least Squares (OLS) Linear Regression Trendline
 */
export function calculateLinearRegression(data: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
} {
  const n = data.length;
  if (n <= 1) {
    const defaultVal = data[0] || 0;
    return {
      slope: 0,
      intercept: defaultVal,
      rSquared: 1,
      predict: () => defaultVal,
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let x = 0; x < n; x++) {
    const y = data[x];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Compute R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let x = 0; x < n; x++) {
    const y = data[x];
    const yPred = intercept + slope * x;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yPred) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  return {
    slope,
    intercept,
    rSquared: Number(rSquared.toFixed(3)),
    predict: (x: number) => Math.max(0, intercept + slope * x),
  };
}

/**
 * Main Central Forecasting Function
 * Computes moving averages, statistical regression projections, model evaluation, and product velocities.
 */
export function generateForecast(
  transactions: Transaction[],
  products: Product[],
  summary: FinancialSummary,
  customConfig?: Partial<ForecastingConfig>
): ComprehensiveForecastResult {
  const config: ForecastingConfig = {
    ...DEFAULT_FORECAST_CONFIG,
    ...(customConfig || {}),
  };

  const now = new Date();
  const historicalDays = Math.max(3, config.historicalDays);
  const forecastAheadDays = Math.max(1, config.forecastAheadDays);
  const movingWindow = Math.min(historicalDays, Math.max(1, config.movingAverageWindow));
  const alpha = Math.max(0.01, Math.min(0.99, Number(config.smoothingAlpha) || 0.35));
  const multiplier = Math.max(0, Math.min(5.0, Number(config.growthMultiplier) ?? 1.0));

  // 1. Build continuous daily buckets for the historical timeframe
  const daysMap: {
    [key: string]: {
      dateStr: string;
      timestamp: number;
      dayOfWeek: string;
      actualSales: number;
      actualCOGS: number;
      actualExpenses: number;
      actualProfit: number;
      transactionCount: number;
    };
  } = {};

  const sortedDailyDates: string[] = [];

  for (let i = historicalDays - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const dayOfWeek = d.toLocaleDateString([], { weekday: 'short' });

    daysMap[key] = {
      dateStr: label,
      timestamp: d.getTime(),
      dayOfWeek,
      actualSales: 0,
      actualCOGS: 0,
      actualExpenses: 0,
      actualProfit: 0,
      transactionCount: 0,
    };
    sortedDailyDates.push(key);
  }

  // 2. Aggregate actual transactions into day buckets
  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    txDate.setHours(0, 0, 0, 0);
    const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;

    if (daysMap[key]) {
      if (tx.type === 'sale') {
        daysMap[key].actualSales += tx.amount || 0;
        daysMap[key].actualCOGS += tx.cogs || 0;
        daysMap[key].actualProfit += tx.grossProfit ?? (tx.amount - (tx.cogs || 0));
        daysMap[key].transactionCount += 1;
      } else if (tx.type === 'expense') {
        daysMap[key].actualExpenses += tx.amount || 0;
        daysMap[key].actualProfit -= tx.amount || 0;
        daysMap[key].transactionCount += 1;
      }
    }
  });

  const rawSalesSeries = sortedDailyDates.map((k) => daysMap[k].actualSales);
  const rawExpensesSeries = sortedDailyDates.map((k) => daysMap[k].actualExpenses);
  const rawProfitSeries = sortedDailyDates.map((k) => daysMap[k].actualProfit);

  // 3. Compute Moving Averages
  const smaSeries = calculateSMA(rawSalesSeries, movingWindow);
  const wmaSeries = calculateWMA(rawSalesSeries, movingWindow);
  const emaSeries = calculateEMA(rawSalesSeries, alpha);
  const salesRegression = calculateLinearRegression(rawSalesSeries);
  const expenseRegression = calculateLinearRegression(rawExpensesSeries);

  // Calculate Standard Deviation of Residuals for 95% Confidence Intervals
  let sumSquaredResiduals = 0;
  rawSalesSeries.forEach((val, idx) => {
    const fitted = salesRegression.predict(idx);
    sumSquaredResiduals += (val - fitted) ** 2;
  });
  const stdDevResiduals = Math.sqrt(sumSquaredResiduals / Math.max(1, rawSalesSeries.length - 2)) || (summary.totalRevenue * 0.05);

  // 4. Build Historical Time-Series points
  const timeSeriesPoints: DailyTimeSeriesPoint[] = sortedDailyDates.map((k, idx) => {
    const bucket = daysMap[k];
    const sma = smaSeries[idx];
    const wma = wmaSeries[idx];
    const ema = emaSeries[idx];
    const trend = salesRegression.predict(idx);

    let selectedForecast = trend;
    if (config.model === 'simple_moving_average' && sma !== null) selectedForecast = sma;
    else if (config.model === 'weighted_moving_average' && wma !== null) selectedForecast = wma;
    else if (config.model === 'exponential_smoothing') selectedForecast = ema;
    else if (config.model === 'ensemble') {
      const validSma = sma ?? trend;
      const validWma = wma ?? trend;
      selectedForecast = (trend * 0.4 + validWma * 0.35 + ema * 0.25);
    }

    selectedForecast = Number((selectedForecast * multiplier).toFixed(2));
    const expForecast = Number(expenseRegression.predict(idx).toFixed(2));
    const profitForecast = Number((selectedForecast - expForecast).toFixed(2));

    const marginOfError = 1.96 * stdDevResiduals;
    const confidenceUpper = Number((selectedForecast + marginOfError).toFixed(2));
    const confidenceLower = Number(Math.max(0, selectedForecast - marginOfError).toFixed(2));

    return {
      date: bucket.dateStr,
      timestamp: bucket.timestamp,
      rawDateStr: k,
      dayOfWeek: bucket.dayOfWeek,
      actualSales: Number(bucket.actualSales.toFixed(2)),
      actualCOGS: Number(bucket.actualCOGS.toFixed(2)),
      actualExpenses: Number(bucket.actualExpenses.toFixed(2)),
      actualProfit: Number(bucket.actualProfit.toFixed(2)),
      transactionCount: bucket.transactionCount,
      smaSales: sma,
      wmaSales: wma,
      emaSales: ema,
      forecastSales: selectedForecast,
      forecastExpenses: expForecast,
      forecastProfit: profitForecast,
      confidenceUpper,
      confidenceLower,
      isProjected: false,
    };
  });

  // 5. Append Future Forecast Days (Projections)
  const lastEmaVal = emaSeries[emaSeries.length - 1] || 0;
  const lastWmaVal = wmaSeries[wmaSeries.length - 1] || salesRegression.predict(rawSalesSeries.length - 1);
  const lastSmaVal = smaSeries[smaSeries.length - 1] || salesRegression.predict(rawSalesSeries.length - 1);

  for (let f = 1; f <= forecastAheadDays; f++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + f);
    futureDate.setHours(0, 0, 0, 0);
    const key = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
    const label = `${futureDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} (Est)`;
    const dayOfWeek = futureDate.toLocaleDateString([], { weekday: 'short' });

    const stepIndex = rawSalesSeries.length + f - 1;
    const trendProj = salesRegression.predict(stepIndex);

    let futureSales = trendProj;
    if (config.model === 'simple_moving_average') futureSales = lastSmaVal;
    else if (config.model === 'weighted_moving_average') futureSales = (lastWmaVal * 0.7 + trendProj * 0.3);
    else if (config.model === 'exponential_smoothing') futureSales = (lastEmaVal * 0.6 + trendProj * 0.4);
    else if (config.model === 'ensemble') {
      futureSales = (trendProj * 0.5 + lastWmaVal * 0.3 + lastEmaVal * 0.2);
    }

    futureSales = Number((futureSales * multiplier).toFixed(2));
    const futureExpenses = Number(expenseRegression.predict(stepIndex).toFixed(2));
    const futureProfit = Number((futureSales - futureExpenses).toFixed(2));

    // Confidence bands widen as we project further into the future
    const distanceFactor = Math.sqrt(1 + f / historicalDays);
    const marginOfError = 1.96 * stdDevResiduals * distanceFactor;
    const confidenceUpper = Number((futureSales + marginOfError).toFixed(2));
    const confidenceLower = Number(Math.max(0, futureSales - marginOfError).toFixed(2));

    timeSeriesPoints.push({
      date: label,
      timestamp: futureDate.getTime(),
      rawDateStr: key,
      dayOfWeek,
      actualSales: 0,
      actualCOGS: 0,
      actualExpenses: 0,
      actualProfit: 0,
      transactionCount: 0,
      smaSales: lastSmaVal,
      wmaSales: lastWmaVal,
      emaSales: lastEmaVal,
      forecastSales: futureSales,
      forecastExpenses: futureExpenses,
      forecastProfit: futureProfit,
      confidenceUpper,
      confidenceLower,
      isProjected: true,
    });
  }

  // 6. Compute Historical Model Accuracy Metrics (MAE, MAPE, RMSE)
  let sumAbsError = 0;
  let sumAbsPercentError = 0;
  let sumSquaredError = 0;
  let evaluatedPointsCount = 0;

  timeSeriesPoints
    .filter((p) => !p.isProjected)
    .forEach((p) => {
      const error = Math.abs(p.actualSales - p.forecastSales);
      sumAbsError += error;
      sumSquaredError += error ** 2;
      if (p.actualSales > 0) {
        sumAbsPercentError += (error / p.actualSales) * 100;
        evaluatedPointsCount++;
      }
    });

  const sampleSize = timeSeriesPoints.filter((p) => !p.isProjected).length;
  const mae = sampleSize > 0 ? Number((sumAbsError / sampleSize).toFixed(2)) : 0;
  const mape = evaluatedPointsCount > 0 ? Number((sumAbsPercentError / evaluatedPointsCount).toFixed(1)) : 12.5;
  const rmse = sampleSize > 0 ? Number(Math.sqrt(sumSquaredError / sampleSize).toFixed(2)) : 0;

  // Reliability Score (0 to 100 based on MAPE and R²)
  const reliabilityScore = Math.max(0, Math.min(100, Math.round((100 - Math.min(100, mape * 1.5)) * 0.6 + salesRegression.rSquared * 40)));

  const accuracyStats: ModelAccuracyStats = {
    mae,
    mape,
    rmse,
    rSquared: salesRegression.rSquared,
    reliabilityScore,
    sampleSize,
  };

  // 7. Aggregated Metrics Calculation
  const totalObservedSales = rawSalesSeries.reduce((a, b) => a + b, 0);
  const totalObservedExpenses = rawExpensesSeries.reduce((a, b) => a + b, 0);
  const totalObservedProfit = rawProfitSeries.reduce((a, b) => a + b, 0);

  const forecastHistoricalSalesSum = timeSeriesPoints
    .filter((p) => !p.isProjected)
    .reduce((sum, p) => sum + p.forecastSales, 0);

  const forecastHistoricalExpenseSum = timeSeriesPoints
    .filter((p) => !p.isProjected)
    .reduce((sum, p) => sum + p.forecastExpenses, 0);

  const forecastHistoricalProfitSum = forecastHistoricalSalesSum - forecastHistoricalExpenseSum;

  const salesVarianceAmount = totalObservedSales - forecastHistoricalSalesSum;
  const salesVariancePercent = forecastHistoricalSalesSum > 0 ? (salesVarianceAmount / forecastHistoricalSalesSum) * 100 : 0;

  const profitVarianceAmount = totalObservedProfit - forecastHistoricalProfitSum;
  const profitVariancePercent = forecastHistoricalProfitSum !== 0 ? (profitVarianceAmount / Math.abs(forecastHistoricalProfitSum)) * 100 : 0;

  const dailyAvgSalesVelocity = totalObservedSales / historicalDays;
  const dailyAvgBurnRate = totalObservedExpenses / historicalDays;
  const workingCash = summary.totalRevenue + summary.totalCapital - summary.totalExpenses - summary.totalCOGS;
  const projectedRunwayDays = dailyAvgBurnRate > 0 && workingCash > 0 ? Math.round(workingCash / dailyAvgBurnRate) : 999;

  const trendDirection = salesRegression.slope > 0.5 ? 'GROWTH' : salesRegression.slope < -0.5 ? 'DECLINE' : 'STABLE';

  // 8. Build Actual vs Forecast Metrics Table
  const buildMetric = (
    name: string,
    actual: number,
    baseline: number,
    isCostMetric: boolean = false
  ): ActualVsForecastMetric => {
    const conservative = isCostMetric ? baseline * 1.12 : baseline * 0.85;
    const optimistic = isCostMetric ? baseline * 0.88 : baseline * 1.2;
    const variancePercent = baseline > 0 ? ((actual - baseline) / baseline) * 100 : 0;
    const trendDir: 'up' | 'down' | 'flat' = variancePercent > 2 ? 'up' : variancePercent < -2 ? 'down' : 'flat';

    let status: 'outperforming' | 'on_track' | 'underperforming' = 'on_track';
    if (isCostMetric) {
      if (variancePercent < -3) status = 'outperforming'; // lower costs = good
      else if (variancePercent > 5) status = 'underperforming';
    } else {
      if (variancePercent > 3) status = 'outperforming'; // higher revenue/profit = good
      else if (variancePercent < -5) status = 'underperforming';
    }

    return {
      metricName: name,
      actual: Number(actual.toFixed(2)),
      forecastBaseline: Number(baseline.toFixed(2)),
      forecastConservative: Number(conservative.toFixed(2)),
      forecastOptimistic: Number(optimistic.toFixed(2)),
      variancePercent: Number(variancePercent.toFixed(1)),
      trendDirection: trendDir,
      status,
    };
  };

  const metrics: ActualVsForecastMetric[] = [
    buildMetric('Sales Revenue', totalObservedSales, forecastHistoricalSalesSum, false),
    buildMetric(
      'Cost of Goods Sold (COGS)',
      summary.totalCOGS,
      totalObservedSales > 0 ? (summary.totalCOGS / totalObservedSales) * forecastHistoricalSalesSum : forecastHistoricalSalesSum * 0.6,
      true
    ),
    buildMetric(
      'Gross Profit Margin',
      totalObservedSales - summary.totalCOGS,
      forecastHistoricalSalesSum * (totalObservedSales > 0 ? (totalObservedSales - summary.totalCOGS) / totalObservedSales : 0.4),
      false
    ),
    buildMetric('Operating Overhead (Expenses)', totalObservedExpenses, forecastHistoricalExpenseSum, true),
    buildMetric('Net Business Profit', totalObservedProfit, forecastHistoricalProfitSum, false),
  ];

  // 9. Product-Level Velocity & Stockout Risk Forecasting
  const productUnitSalesMap: { [productId: string]: number } = {};

  transactions
    .filter((tx) => tx.type === 'sale' && Array.isArray(tx.items))
    .forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      const cutoffTime = now.getTime() - historicalDays * 86400000;
      if (txTime >= cutoffTime) {
        tx.items?.forEach((item) => {
          productUnitSalesMap[item.productId] = (productUnitSalesMap[item.productId] || 0) + (item.quantity || 0);
        });
      }
    });

  const productForecasts: ProductDemandForecast[] = products.map((prod) => {
    const totalUnitsSold = productUnitSalesMap[prod.id] || 0;
    const dailyVelocity = Number((totalUnitsSold / historicalDays).toFixed(2));
    const forecastedDemandUnits = Math.ceil(dailyVelocity * forecastAheadDays * multiplier);
    const daysOfInventoryRemaining = dailyVelocity > 0 ? Number((prod.stockQuantity / dailyVelocity).toFixed(1)) : 999;

    let stockoutRisk: 'CRITICAL' | 'MODERATE' | 'HEALTHY' | 'OVERSTOCKED' = 'HEALTHY';
    if (prod.stockQuantity <= 0 || daysOfInventoryRemaining < 3) {
      stockoutRisk = 'CRITICAL';
    } else if (daysOfInventoryRemaining < 10) {
      stockoutRisk = 'MODERATE';
    } else if (daysOfInventoryRemaining > 90 && prod.stockQuantity > 50) {
      stockoutRisk = 'OVERSTOCKED';
    }

    const recommendedRefillUnits = Math.max(
      0,
      Math.ceil(dailyVelocity * (forecastAheadDays + 14)) - prod.stockQuantity
    );

    return {
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category,
      currentStock: prod.stockQuantity,
      dailyVelocity,
      forecastedDemandUnits,
      daysOfInventoryRemaining,
      stockoutRisk,
      recommendedRefillUnits,
    };
  }).sort((a, b) => a.daysOfInventoryRemaining - b.daysOfInventoryRemaining);

  return {
    config,
    metrics,
    timeSeries: timeSeriesPoints,
    accuracy: accuracyStats,
    productForecasts,
    summaryStats: {
      totalActualSales: Number(totalObservedSales.toFixed(2)),
      totalForecastSales: Number(forecastHistoricalSalesSum.toFixed(2)),
      salesVarianceAmount: Number(salesVarianceAmount.toFixed(2)),
      salesVariancePercent: Number(salesVariancePercent.toFixed(1)),
      totalActualProfit: Number(totalObservedProfit.toFixed(2)),
      totalForecastProfit: Number(forecastHistoricalProfitSum.toFixed(2)),
      profitVarianceAmount: Number(profitVarianceAmount.toFixed(2)),
      profitVariancePercent: Number(profitVariancePercent.toFixed(1)),
      dailyAvgSalesVelocity: Number(dailyAvgSalesVelocity.toFixed(2)),
      dailyAvgBurnRate: Number(dailyAvgBurnRate.toFixed(2)),
      projectedRunwayDays,
      linearSlope: Number(salesRegression.slope.toFixed(2)),
      trendDirection,
    },
  };
}
