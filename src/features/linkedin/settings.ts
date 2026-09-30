import { SettingsService } from '@/lib/settings';

const CHOICE_MARKER = 'linkedinEnabledChosen';

/**
 * Whether LinkedIn is switched on in Settings.
 *
 * While LinkedIn was a "Coming Soon" placeholder, every settings save stored linkedinEnabled=false
 * by default. That stale value must not block the integration once a key is added, so "false"
 * only counts after the user has saved the LinkedIn setting themselves (the marker below).
 */
export async function isLinkedInEnabledSetting(): Promise<boolean> {
  const [value, chosen] = await Promise.all([
    SettingsService.get('linkedinEnabled', 'true'),
    SettingsService.get(CHOICE_MARKER, 'false'),
  ]);
  return value !== 'false' || chosen !== 'true';
}

/** Saves the switch as an explicit user choice. */
export async function saveLinkedInEnabledSetting(value: string): Promise<void> {
  await SettingsService.set('linkedinEnabled', value === 'false' ? 'false' : 'true');
  await SettingsService.set(CHOICE_MARKER, 'true');
}
