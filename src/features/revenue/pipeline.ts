import { RevenueStage, WinProbabilityDetails, RevenueDeal } from './types';
import { logger } from '@/lib/logger';

/**
 * AI Win Probability Engine.
 * Calculates Win %, Risk %, Competition %, Urgency %, and Stakeholder Engagement %.
 */
export function calculateDealWinProbability(stage: RevenueStage, buyingScore: number = 90): WinProbabilityDetails {
  let winPercent = 20;

  switch (stage) {
    case 'NEW_LEAD': winPercent = 15; break;
    case 'QUALIFIED': winPercent = 30; break;
    case 'DISCOVERY_CALL': winPercent = 45; break;
    case 'TECHNICAL_DISCUSSION': winPercent = 60; break;
    case 'PROPOSAL_SENT': winPercent = 75; break;
    case 'NEGOTIATION': winPercent = 85; break;
    case 'CONTRACT_SENT': winPercent = 92; break;
    case 'CONTRACT_SIGNED': winPercent = 98; break;
    case 'PROJECT_STARTED': winPercent = 99; break;
    case 'WON': winPercent = 100; break;
    case 'LOST': winPercent = 0; break;
  }

  // Adjust for Buying Score
  const adjustedWinPercent = Math.min(100, Math.max(0, Math.round((winPercent + buyingScore) / 2)));

  return {
    currentWinPercent: adjustedWinPercent,
    revenueProbabilityPercent: Math.round(adjustedWinPercent * 0.95),
    riskLevelPercent: Math.max(5, 100 - adjustedWinPercent),
    competitionLevelPercent: 25,
    urgencyPercent: Math.round(buyingScore * 0.9),
    stakeholderEngagementPercent: Math.round(buyingScore * 0.95),
    expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    confidenceLevel: adjustedWinPercent >= 80 ? 'VERY_HIGH' : adjustedWinPercent >= 60 ? 'HIGH' : 'MEDIUM',
  };
}

/**
 * Update Deal Stage & Recalibrate Pipeline.
 */
export function updateDealStage(deal: RevenueDeal, newStage: RevenueStage): RevenueDeal {
  logger.info(`Enterprise Pipeline Engine: Moving deal '${deal.companyName}' from ${deal.stage} to ${newStage}...`);
  
  const updatedWinProbability = calculateDealWinProbability(newStage, deal.buyingScore);
  const event = {
    id: `evt_${Date.now()}`,
    eventType: 'STAGE_UPDATED',
    title: `Stage Changed to ${newStage.replace(/_/g, ' ')}`,
    description: `Deal progressed to ${newStage} with win probability ${updatedWinProbability.currentWinPercent}%.`,
    timestamp: new Date().toISOString(),
    performedBy: 'Senior BDE Lead',
  };

  return {
    ...deal,
    stage: newStage,
    winProbability: updatedWinProbability,
    timeline: [event, ...deal.timeline],
    updatedAt: new Date().toISOString(),
  };
}
