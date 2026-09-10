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
};

/**
 * Load calculated AI writing style insights.
 */
export async function getStyleInsights(): Promise<StylePatternsReport> {
  return AILearningService.analyzeStylePatterns();
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
    if (config.apolloApiKey) {
      await SettingsService.set('apolloApiKey', config.apolloApiKey);
    }

    logger.info('App Settings updated successfully.');
    safeRevalidatePath('/settings');
    return { success: true };
  } catch {
    logger.error('Failed to update App Settings keys');
    return { success: false };
  }
}
