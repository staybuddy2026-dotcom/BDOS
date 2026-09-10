import { db } from './db';
import { logger } from './logger';

export class SettingsService {
  /**
   * Get an application setting by key.
   * Returns defaultValue if setting does not exist.
   */
  static async get(key: string, defaultValue = ''): Promise<string> {
    try {
      const setting = await db.applicationSettings.findUnique({
        where: { key },
      });
      return setting ? setting.value : defaultValue;
    } catch (error) {
      logger.error(`Failed to read application setting: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * Set or update an application setting.
   */
  static async set(key: string, value: string): Promise<boolean> {
    try {
      await db.applicationSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      logger.info(`Setting updated: ${key} = ${value}`);
      return true;
    } catch (error) {
      logger.error(`Failed to write application setting: ${key}`, error);
      return false;
    }
  }

  /**
   * Get all settings as a key-value object.
   */
  static async getAll(): Promise<Record<string, string>> {
    try {
      const settings = await db.applicationSettings.findMany();
      return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      logger.error('Failed to read all application settings', error);
      return {};
    }
  }
}
