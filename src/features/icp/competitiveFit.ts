import { logger } from '@/lib/logger';

export type CompetitiveFitAnalysis = {
  fitScore: number;
  strengths: string[];
  challenges: string[];
  summary: string;
};

/**
 * Competitive Fit Analysis Engine: Evaluates Tiny Script strengths & prospective challenges.
 */
export function analyzeCompetitiveFit(
  companyName: string = 'ACME Health Technologies',
  industry: string = 'Technology',
  employeeCount: number = 200,
  techStack: string[] = [],
  fundingStage: string = 'Bootstrapped'
): CompetitiveFitAnalysis {
  logger.info(`Competitive Fit Engine: Analyzing competitive positioning for '${companyName}'...`);

  const strengths: string[] = [];
  const challenges: string[] = [];
  let fitScore = 80;

  // Strengths Logic
  const lowerTechStack = techStack.map(t => t.toLowerCase());
  
  if (lowerTechStack.some(t => ['react', 'next.js', 'node.js'].includes(t))) {
    strengths.push('Excellent modern tech stack expertise match (React/Node).');
    fitScore += 5;
  } else {
    strengths.push('Adaptable engineering team ready for cross-platform integration.');
  }

  if (industry.toLowerCase().includes('tech') || industry.toLowerCase().includes('software')) {
    strengths.push(`Proven ${industry} portfolio & deep domain knowledge.`);
    fitScore += 5;
  }

  if (employeeCount > 100) {
    strengths.push('Dedicated enterprise development squad immediate availability.');
  } else {
    strengths.push('Agile team structure perfect for rapid MVP development.');
    fitScore += 2;
  }

  strengths.push('In-house AI & LLM integration capability.');
  
  if (lowerTechStack.includes('aws') || lowerTechStack.includes('kubernetes')) {
    strengths.push('Strong AWS Cloud migration & Kubernetes expertise.');
    fitScore += 3;
  }

  // Challenges Logic
  if (employeeCount > 1000) {
    challenges.push('Formal enterprise procurement & legal review timeline (4-6 weeks).');
    challenges.push('Longer enterprise decision-making cycle and multiple stakeholders.');
    challenges.push('Potential existing third-party vendor relationship (Infosys/TCS).');
    fitScore -= 8;
  } else if (employeeCount > 200) {
    challenges.push('Moderate internal engineering team bias (Not Invented Here syndrome).');
    challenges.push('Procurement delays possible (2-3 weeks).');
    fitScore -= 4;
  } else {
    challenges.push('Budget constraints common for smaller teams.');
    if (fundingStage === 'Bootstrapped') {
      challenges.push('Founder-led sales cycle requires demonstrating immediate ROI.');
      fitScore -= 5;
    }
  }
  
  // Cap score
  fitScore = Math.min(99, Math.max(10, fitScore));

  const summary = employeeCount > 500 
    ? `${companyName} requires a heavy enterprise sales motion. Prove velocity to bypass existing vendors.` 
    : `${companyName} is an outstanding technical fit for Tiny Script Soft Tech. High probability of win.`;

  return {
    fitScore,
    strengths,
    challenges,
    summary,
  };
}
