'use server';

import { SettingsService } from '@/lib/settings';
import { AILearningService, StylePatternsReport } from './service';
import { safeRevalidatePath } from '@/lib/revalidate';
import { logger } from '@/lib/logger';

export type AppConfigData = {
  primaryTone: string;
  secondaryTone: string;
  tertiaryTone: string;
  activeModel: string;
  weeklyLimit: string;
  apolloEnabled: string;
  apolloConfirmRequired: string;
  apolloMaxEnrich: string;
  apolloAllowPersonalEmail: string;
  apolloAllowPhone: string;
  apolloCreditWarningThreshold: string;
  apolloApiKey?: string;
  linkedinEnabled?: string;
  linkedinApiKey?: string;
  crunchbaseEnabled?: string;
  crunchbaseApiKey?: string;
  githubEnabled?: string;
  githubApiKey?: string;
  immediateActionThreshold?: string;
  defaultSignature?: string;
};

/**
 * Load calculated AI writing style insights.
 */
export async function getStyleInsights(): Promise<StylePatternsReport> {
  return AILearningService.analyzeStylePatterns();
}

/**
 * Fetch Service Catalog from Database
 */
export async function getServiceCatalog(): Promise<any[]> {
  try {
    const rawData = await SettingsService.get('serviceCatalog', '[]');
    const catalog = JSON.parse(rawData);
    if (Array.isArray(catalog) && catalog.length > 0) {
      return catalog;
    }
  } catch (err: unknown) {
    logger.warn('Failed to parse service catalog from settings', { error: err instanceof Error ? err.message : String(err) });
  }

  // Return defaults if empty
  return [
    { id: '1', name: 'AI, Machine Learning & LLM Systems', minInr: '₹35,00,000', minUsd: '$45,000', stack: 'TensorFlow, PyTorch, Python, OpenCV, Hugging Face, LangChain, LLAMA, Pandas, Scikit-learn, Numpy, AWS SageMaker, Google Vertex AI', model: 'AI Consulting', threshold: 85 },
    { id: '2', name: 'Native & Cross-Platform Mobile Applications', minInr: '₹25,00,000', minUsd: '$30,000', stack: 'Swift, SwiftUI, Kotlin, Jetpack, Flutter, React Native, Firebase, GraphQL, Xcode, Android Studio, App Store, Google Play', model: 'Dedicated Team', threshold: 80 },
    { id: '3', name: 'Modern Web Architecture & Web Platforms', minInr: '₹25,00,000', minUsd: '$30,000', stack: 'HTML5, CSS3, JavaScript, React, Next.js, Vue.js, TypeScript, Node.js, Express, MongoDB, PostgreSQL, WordPress, Shopify', model: 'Dedicated Team', threshold: 80 },
    { id: '4', name: 'Enterprise Backend, Cloud & DevOps Infrastructure', minInr: '₹30,00,000', minUsd: '$38,000', stack: 'Python, Django, C#, C++, .NET, AWS, Azure, Docker, Kubernetes, PostgreSQL, MongoDB', model: 'Fixed Price', threshold: 80 },
    { id: '5', name: 'E-Commerce Platforms & Headless Digital Retail', minInr: '₹20,00,000', minUsd: '$25,000', stack: 'Shopify, WooCommerce, BigCommerce, Magento, React', model: 'Staff Augmentation', threshold: 75 },
    { id: '6', name: 'UI/UX Design Systems & Product Prototyping', minInr: '₹15,00,000', minUsd: '$18,000', stack: 'Figma, Adobe XD, HTML5, CSS3', model: 'Fixed Price', threshold: 70 },
  ];
}

/**
 * Update Service Catalog in Database
 */
export async function updateServiceCatalog(catalog: any[]) {
  try {
    await SettingsService.set('serviceCatalog', JSON.stringify(catalog));
    safeRevalidatePath('/settings');
    return { success: true };
  } catch (err: unknown) {
    logger.error('Failed to update service catalog', { error: err instanceof Error ? err.message : String(err) });
    return { success: false };
  }
}

/**
 * Fetch all App Settings.
 */
export async function getAppSettings(): Promise<AppConfigData> {
  try {
    const primaryTone = await SettingsService.get('primaryTone', 'Insightful');
    const secondaryTone = await SettingsService.get('secondaryTone', 'Casual');
    const tertiaryTone = await SettingsService.get('tertiaryTone', 'Professional');
    const activeModel = await SettingsService.get('activeModel', 'gemini-1.5-flash');
    const weeklyLimit = await SettingsService.get('weeklyLimit', '150');

    const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
    const apolloConfirmRequired = await SettingsService.get('apolloConfirmRequired', 'true');
    const apolloMaxEnrich = await SettingsService.get('apolloMaxEnrich', '5');
    const apolloAllowPersonalEmail = await SettingsService.get('apolloAllowPersonalEmail', 'false');
    const apolloAllowPhone = await SettingsService.get('apolloAllowPhone', 'false');
    const apolloCreditWarningThreshold = await SettingsService.get('apolloCreditWarningThreshold', '20');
    const apolloApiKey = await SettingsService.get('apolloApiKey', 'ap_live_98a7f432194b2');

    const linkedinEnabled = await SettingsService.get('linkedinEnabled', 'false');
    const linkedinApiKey = await SettingsService.get('linkedinApiKey', '');
    const crunchbaseEnabled = await SettingsService.get('crunchbaseEnabled', 'false');
    const crunchbaseApiKey = await SettingsService.get('crunchbaseApiKey', '');
    const githubEnabled = await SettingsService.get('githubEnabled', 'false');
    const githubApiKey = await SettingsService.get('githubApiKey', '');
    
    const immediateActionThreshold = await SettingsService.get('immediateActionThreshold', '90');
    const defaultSignature = await SettingsService.get('defaultSignature', 'Akash | BD Owner | Tiny Script Soft Tech Pvt. Ltd. (akash@tinyscript.com)');

    return {
      primaryTone,
      secondaryTone,
      tertiaryTone,
      activeModel,
      weeklyLimit,
      apolloEnabled,
      apolloConfirmRequired,
      apolloMaxEnrich,
      apolloAllowPersonalEmail,
      apolloAllowPhone,
      apolloCreditWarningThreshold,
      apolloApiKey,
      linkedinEnabled,
      linkedinApiKey,
      crunchbaseEnabled,
      crunchbaseApiKey,
      githubEnabled,
      githubApiKey,
      immediateActionThreshold,
      defaultSignature,
    };
  } catch {
    logger.warn('Failed to query database for App Settings. Returning default configurations.');
    return {
      primaryTone: 'Insightful',
      secondaryTone: 'Casual',
      tertiaryTone: 'Professional',
      activeModel: 'gemini-1.5-flash',
      weeklyLimit: '150',
      apolloEnabled: 'true',
      apolloConfirmRequired: 'true',
      apolloMaxEnrich: '5',
      apolloAllowPersonalEmail: 'false',
      apolloAllowPhone: 'false',
      apolloCreditWarningThreshold: '20',
      apolloApiKey: 'ap_live_98a7f432194b2',
      linkedinEnabled: 'false',
      linkedinApiKey: '',
      crunchbaseEnabled: 'false',
      crunchbaseApiKey: '',
      githubEnabled: 'false',
      githubApiKey: '',
      immediateActionThreshold: '90',
      defaultSignature: 'Akash | BD Owner | Tiny Script Soft Tech Pvt. Ltd. (akash@tinyscript.com)',
    };
  }
}

/**
 * Save updated App Settings keys and values.
 */
export async function updateAppSettings(config: AppConfigData) {
  try {
    await SettingsService.set('primaryTone', config.primaryTone);
    await SettingsService.set('secondaryTone', config.secondaryTone);
    await SettingsService.set('tertiaryTone', config.tertiaryTone);
    await SettingsService.set('activeModel', config.activeModel);
    await SettingsService.set('weeklyLimit', config.weeklyLimit);

    await SettingsService.set('apolloEnabled', config.apolloEnabled);
    await SettingsService.set('apolloConfirmRequired', config.apolloConfirmRequired);
    await SettingsService.set('apolloMaxEnrich', config.apolloMaxEnrich);
    await SettingsService.set('apolloAllowPersonalEmail', config.apolloAllowPersonalEmail);
    await SettingsService.set('apolloAllowPhone', config.apolloAllowPhone);
    await SettingsService.set('apolloCreditWarningThreshold', config.apolloCreditWarningThreshold);
    
    if (config.apolloApiKey !== undefined) await SettingsService.set('apolloApiKey', config.apolloApiKey);
    if (config.linkedinEnabled !== undefined) await SettingsService.set('linkedinEnabled', config.linkedinEnabled);
    if (config.linkedinApiKey !== undefined) await SettingsService.set('linkedinApiKey', config.linkedinApiKey);
    if (config.crunchbaseEnabled !== undefined) await SettingsService.set('crunchbaseEnabled', config.crunchbaseEnabled);
    if (config.crunchbaseApiKey !== undefined) await SettingsService.set('crunchbaseApiKey', config.crunchbaseApiKey);
    if (config.githubEnabled !== undefined) await SettingsService.set('githubEnabled', config.githubEnabled);
    if (config.githubApiKey !== undefined) await SettingsService.set('githubApiKey', config.githubApiKey);
    if (config.immediateActionThreshold !== undefined) await SettingsService.set('immediateActionThreshold', config.immediateActionThreshold);
    if (config.defaultSignature !== undefined) await SettingsService.set('defaultSignature', config.defaultSignature);

    logger.info('App Settings updated successfully.');
    safeRevalidatePath('/settings');
    return { success: true };
  } catch {
    logger.error('Failed to update App Settings keys');
    return { success: false };
  }
}
