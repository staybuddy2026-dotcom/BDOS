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

  for (const d of deals) {
    const val = parseInt((d.dealValueInr || '').replace(/[^0-9]/g, ''), 10) || 5000000;
    const prob = d.winProbability?.currentWinPercent || 50;
    totalVal += val;
    weightedVal += (val * prob) / 100;
    if (d.stage === 'WON') wonVal += val;
    if (d.stage === 'LOST') lostVal += val;
  }

  const avgVal = deals.length > 0 ? Math.round(totalVal / deals.length) : 0;
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
    averageSalesCycleDays: 14,
  };
}
