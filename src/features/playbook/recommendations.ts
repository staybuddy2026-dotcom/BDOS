import { ServiceMatchItem } from './types';
import { logger } from '@/lib/logger';

/**
 * Service Recommendation Engine: Matches prospect tech stack with Tiny Script services.
 */
export function generatePlaybookServiceRecommendations(
  companyName: string = 'ACME Health Technologies'
): ServiceMatchItem[] {
  logger.info(`Playbook Service Recommendation Engine: Scoring services for '${companyName}'...`);

  return [
    {
      serviceName: 'AI & LLM Development (RAG & Autonomous Agents)',
      matchScore: 98,
      confidenceLevel: 'High',
      justification: 'Prospect is expanding AI patient diagnosis portal and hiring machine learning specialists.',
      relevanceReason: 'Tiny Script has ready-to-deploy LLM integration patterns for Healthcare SaaS platforms.',
    },
    {
      serviceName: 'Dedicated Development Team (React 19 + Node.js Squad)',
      matchScore: 96,
      confidenceLevel: 'High',
      justification: '60+ day recruitment delays for senior local engineers are creating delivery bottlenecks.',
      relevanceReason: 'Immediate availability of 2 Senior React Devs + 1 PM + 1 QA with 48-hour onboarding.',
    },
    {
      serviceName: 'AWS Cloud Migration & Kubernetes DevOps Modernization',
      matchScore: 92,
      confidenceLevel: 'High',
      justification: 'Infrastructure signals indicate legacy Docker containers requiring auto-scaling Kubernetes cluster setup.',
      relevanceReason: 'Tiny Script certified AWS Cloud architects can optimize infrastructure monthly spend by 30%.',
    },
    {
      serviceName: 'Flutter & React Native Cross-Platform Mobile Apps',
      matchScore: 88,
      confidenceLevel: 'Medium',
      justification: 'Company plans Q4 mobile iOS/Android companion launch for clinical staff.',
      relevanceReason: 'Single codebase mobile architecture saves 40% initial development timeline.',
    },
  ];
}
