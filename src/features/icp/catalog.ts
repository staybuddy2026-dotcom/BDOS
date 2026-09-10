import { logger } from '@/lib/logger';

export type CatalogServiceItem = {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  industryFocus: string[];
  minProjectSizeInr: string;
  minProjectSizeUsd: string;
  deliveryModel: 'Dedicated Team' | 'Fixed Price' | 'Staff Augmentation' | 'AI Consulting';
  confidenceThreshold: number;
};

export const defaultServiceCatalog: CatalogServiceItem[] = [
  {
    id: 'srv_ai_ml_dev',
    name: 'AI, Machine Learning & Generative AI Systems',
    description: 'Custom LLM fine-tuning, RAG pipelines, computer vision, and ML workflow automation.',
    techStack: ['TensorFlow', 'PyTorch', 'Python', 'OpenCV', 'Hugging Face', 'LangChain', 'LLAMA', 'Pandas', 'Scikit-learn', 'Numpy', 'AWS SageMaker', 'Google Vertex AI'],
    industryFocus: ['AI Startups', 'Healthcare SaaS', 'FinTech', 'Enterprise Tech', 'EdTech'],
    minProjectSizeInr: '₹35,00,000',
    minProjectSizeUsd: '$45,000',
    deliveryModel: 'AI Consulting',
    confidenceThreshold: 85,
  },
  {
    id: 'srv_mobile_dev',
    name: 'Native & Cross-Platform Mobile Application Engineering',
    description: 'iOS & Android mobile apps built with native Swift/Kotlin or cross-platform Flutter & React Native.',
    techStack: ['Swift', 'SwiftUI', 'Kotlin', 'Jetpack', 'Flutter', 'React Native', 'Firebase', 'GraphQL', 'Xcode', 'Android Studio', 'App Store', 'Google Play'],
    industryFocus: ['Consumer Tech', 'Healthcare', 'FinTech', 'On-Demand Services', 'Logistics'],
    minProjectSizeInr: '₹25,00,000',
    minProjectSizeUsd: '$30,000',
    deliveryModel: 'Dedicated Team',
    confidenceThreshold: 80,
  },
  {
    id: 'srv_web_frontend',
    name: 'Modern Web Architecture & High-Performance Frontends',
    description: 'Scalable Next.js 16 portals, React/Vue frontend platforms, and high-concurrency Node.js microservices.',
    techStack: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Next.js', 'Vue.js', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL'],
    industryFocus: ['SaaS', 'Healthcare', 'FinTech', 'Enterprise Platforms', 'EdTech'],
    minProjectSizeInr: '₹25,00,000',
    minProjectSizeUsd: '$30,000',
    deliveryModel: 'Dedicated Team',
    confidenceThreshold: 80,
  },
  {
    id: 'srv_backend_cloud',
    name: 'Enterprise Cloud Infrastructure, Microservices & DevOps',
    description: 'Cloud containerization, high-concurrency microservices, and serverless DevOps architectures.',
    techStack: ['Python', 'Django', 'C#', 'C++', '.NET', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis'],
    industryFocus: ['FinTech', 'Healthcare Enterprise', 'Logistics', 'Security', 'SaaS'],
    minProjectSizeInr: '₹30,00,000',
    minProjectSizeUsd: '$38,000',
    deliveryModel: 'Fixed Price',
    confidenceThreshold: 80,
  },
  {
    id: 'srv_ecommerce',
    name: 'E-Commerce Platforms & Headless Digital Retail',
    description: 'Custom e-commerce marketplaces, headless commerce integration, and custom store development.',
    techStack: ['Shopify', 'WooCommerce', 'BigCommerce', 'Magento', 'React', 'Node.js', 'GraphQL'],
    industryFocus: ['Retail', 'E-Commerce Brands', 'D2C Marketplaces', 'B2B Wholesale'],
    minProjectSizeInr: '₹20,00,000',
    minProjectSizeUsd: '$25,000',
    deliveryModel: 'Staff Augmentation',
    confidenceThreshold: 75,
  },
  {
    id: 'srv_uiux_design',
    name: 'UI/UX Design Systems & Product Prototyping',
    description: 'User research, wireframing, high-fidelity design systems, and interactive product prototypes.',
    techStack: ['Figma', 'Adobe XD', 'HTML5', 'CSS3', 'Design Systems'],
    industryFocus: ['SaaS', 'Mobile Apps', 'Consumer Platforms', 'Enterprise Software'],
    minProjectSizeInr: '₹15,00,000',
    minProjectSizeUsd: '$18,000',
    deliveryModel: 'Fixed Price',
    confidenceThreshold: 70,
  },
  {
    id: 'srv_dedicated_squad',
    name: 'Dedicated Engineering Squad Outstaffing',
    description: 'Fully managed dedicated squads (2 Devs, 1 Lead, 1 PM, 1 QA) for rapid product roadmap delivery.',
    techStack: ['React', 'Next.js', 'Node.js', 'Python', 'Flutter', 'Swift', 'Kotlin', 'AWS'],
    industryFocus: ['Scaleups & High-Growth Tech Companies'],
    minProjectSizeInr: '₹40,00,000',
    minProjectSizeUsd: '$50,000',
    deliveryModel: 'Dedicated Team',
    confidenceThreshold: 85,
  },
];

/**
 * Returns dynamic Service Catalog for Tiny Script Soft Tech.
 */
export function getDynamicServiceCatalog(): CatalogServiceItem[] {
  logger.info('Service Catalog Engine: Fetching active service catalog configuration...');
  return defaultServiceCatalog;
}
