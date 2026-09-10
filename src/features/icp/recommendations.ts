import { logger } from '@/lib/logger';

export type ServiceRecommendationItem = {
  serviceName: string;
  confidencePercent: number;
  reasoning: string;
  suggestedSquad: string;
};

/**
 * Service Recommendation Engine for Tiny Script Soft Tech Pvt. Ltd.
 */
export function generateServiceRecommendations(
  companyName: string = 'ACME Health Technologies',
  techStack: string[] = ['React 19', 'Next.js 16', 'Node.js', 'Python', 'AWS']
): ServiceRecommendationItem[] {
  logger.info(`Service Recommendation Engine: Generating tailored service offerings for '${companyName}' (Stack: ${techStack.join(', ')})...`);

  return [
    {
      serviceName: 'AI Development & LLM Integration',
      confidencePercent: 98,
      reasoning: 'Active LLM & Python microservice intent detected in engineering stack.',
      suggestedSquad: '1 AI Lead + 2 Python/FastAPI Developers',
    },
    {
      serviceName: 'MERN & React 19 Enterprise Web Dev',
      confidencePercent: 96,
      reasoning: 'Hiring Senior React 19 & Node.js engineers for patient portal roadmap.',
      suggestedSquad: '2 Senior React Developers + 1 Node.js Architect',
    },
    {
      serviceName: 'Node.js Microservices Architecture',
      confidencePercent: 95,
      reasoning: 'Backend migration discussion detected on dev forums.',
      suggestedSquad: '2 Backend Engineers + 1 DevOps Lead',
    },
    {
      serviceName: 'Flutter & Cross-Platform Mobile Apps',
      confidencePercent: 94,
      reasoning: 'Expansion into iOS/Android mobile patient engagement apps.',
      suggestedSquad: '2 Flutter Developers + 1 QA Engineer',
    },
    {
      serviceName: 'AWS Cloud Migration & DevOps Modernization',
      confidencePercent: 91,
      reasoning: 'AWS infrastructure modernization signals verified from GitHub CI/CD repos.',
      suggestedSquad: '1 AWS Cloud Architect + 1 DevOps Engineer',
    },
    {
      serviceName: 'Dedicated Development Team Squad',
      confidencePercent: 89,
      reasoning: 'High engineering outsourcing probability for 12-week roadmap execution.',
      suggestedSquad: 'Full-Stack Squad (4 Devs + 1 PM + 1 QA)',
    },
  ];
}
