import { RevenueDeal } from './types';
import { logger } from '@/lib/logger';

export type ForecastProjections = {
  expectedMonthlyRevenueInr: string;
  expectedQuarterlyRevenueInr: string;
  expectedAnnualRevenueInr: string;
  totalPipelineValueInr: string;
  weightedPipelineValueInr: string;
  wonRevenueInr: string;
  lostRevenueInr: string;
  averageDealSizeInr: string;
  averageSalesCycleDays: number;
};

/**
 * Revenue Forecast Engine.
 * Calculates weighted cash flow and quarterly/annual revenue projections.
 */
export function calculateRevenueForecast(deals: RevenueDeal[]): ForecastProjections {
  logger.info(`Revenue Forecast Engine: Calculating projections for ${deals.length} active deals...`);

  if (deals.length === 0) {
    return {
      expectedMonthlyRevenueInr: '₹0',
      expectedQuarterlyRevenueInr: '₹0',
      expectedAnnualRevenueInr: '₹0',
      totalPipelineValueInr: '₹0',
      weightedPipelineValueInr: '₹0',
      wonRevenueInr: '₹0',
      lostRevenueInr: '₹0',
      averageDealSizeInr: '₹0',
      averageSalesCycleDays: 0,
    };
  }

  let totalVal = 0;
  let weightedVal = 0;
  let wonVal = 0;
  let lostVal = 0;

  // Deals without an estimated value count as zero; won and lost deals are no longer pipeline.
  const wonCycles: number[] = [];
  let valuedCount = 0;
  let valuedTotal = 0;
  for (const d of deals) {
    const val = parseInt((d.dealValueInr || '').replace(/[^0-9]/g, ''), 10) || 0;
    const prob = d.winProbability?.currentWinPercent ?? 0;
    if (val > 0) { valuedCount++; valuedTotal += val; }
    if (d.stage === 'WON') {
      wonVal += val;
      wonCycles.push((new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()) / 86400000);
    } else if (d.stage === 'LOST') {
      lostVal += val;
    } else {
      totalVal += val;
      weightedVal += (val * prob) / 100;
    }
  }

  const avgVal = valuedCount > 0 ? Math.round(valuedTotal / valuedCount) : 0;
  const monthly = Math.round(weightedVal / 3);
  const quarterly = Math.round(weightedVal);
  const annual = Math.round(weightedVal * 4);

  return {
    expectedMonthlyRevenueInr: `₹${monthly.toLocaleString('en-IN')}`,
    expectedQuarterlyRevenueInr: `₹${quarterly.toLocaleString('en-IN')}`,
    expectedAnnualRevenueInr: `₹${annual.toLocaleString('en-IN')}`,
    totalPipelineValueInr: `₹${totalVal.toLocaleString('en-IN')}`,
    weightedPipelineValueInr: `₹${Math.round(weightedVal).toLocaleString('en-IN')}`,
    wonRevenueInr: `₹${wonVal.toLocaleString('en-IN')}`,
    lostRevenueInr: `₹${lostVal.toLocaleString('en-IN')}`,
    averageDealSizeInr: `₹${avgVal.toLocaleString('en-IN')}`,
    averageSalesCycleDays: wonCycles.length ? Math.round(wonCycles.reduce((a, b) => a + b, 0) / wonCycles.length) : 0,
  };
}
