'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

import { ProviderStatus, HealthStatus } from '@/features/providers/types';
import { providerRegistry } from '@/features/providers/registry';
import { SettingsService } from '@/lib/settings';

export type ConnectorCapabilities = {
  search: boolean;
  liveSync: boolean;
  aiQualification: boolean;
  proposalGen: boolean;
  reviewQueue: boolean;
  crm: boolean;
  contactEnrichment: boolean;
  budgetDetection: boolean;
  techExtraction: boolean;
};

export type ConnectorCardItem = {
  id: string;
  name: string;
  category: 'Apollo Prospecting' | 'Marketplace RFP' | 'RSS / Webhook' | 'Email / Import';
  status: ProviderStatus | 'Connected' | 'Disconnected' | 'Configuration Required';
  health: HealthStatus;
  lastSync: string;
  responseMs: number;
  importedToday: number;
  errorsCount: number;
  apiKeyMasked: string;
  capabilities: ConnectorCapabilities;
};

/**
 * Fetch all registered Marketplace Connectors and live health status.
 */
export async function getMarketplaceConnectors(): Promise<ConnectorCardItem[]> {
  try {
    await AuthService.verifySession();
    logger.info('Querying Marketplace Connectors & Capabilities Matrix...');

    const list: ConnectorCardItem[] = [];
    const providerIds = ['apollo', 'linkedin', 'crunchbase', 'github'];

    const apolloKey = await SettingsService.get('apolloApiKey', '');
    const linkedinKey = await SettingsService.get('linkedinApiKey', '');
    const crunchbaseKey = await SettingsService.get('crunchbaseApiKey', '');
    const githubKey = await SettingsService.get('githubApiKey', '');

    for (const id of providerIds) {
      const provider = providerRegistry.getProvider(id);
      const status = await provider.getStatus();
      const health = provider.getHealthStatus ? await provider.getHealthStatus() : 'Coming Soon';
      const isLive = provider.isLive === true && status === 'Connected';
      
      let keyToMask = '';
      if (id === 'apollo') keyToMask = apolloKey;
      else if (id === 'linkedin') keyToMask = linkedinKey;
      else if (id === 'crunchbase') keyToMask = crunchbaseKey;
      else if (id === 'github') keyToMask = githubKey;

      const masked = keyToMask && keyToMask.length > 10 
        ? `${keyToMask.slice(0, 7)}••••••••${keyToMask.slice(-4)}`
        : keyToMask ? '••••••••' : 'Not configured';

      let category: 'Apollo Prospecting' | 'Marketplace RFP' | 'RSS / Webhook' | 'Email / Import' = 'Apollo Prospecting';
      if (id === 'apollo') category = 'Apollo Prospecting';
      else if (id === 'linkedin') category = 'Marketplace RFP';
      else category = 'RSS / Webhook';

      list.push({
        id: provider.id,
        name: provider.name,
        category,
        status,
        health,
        // Not tracked: no invented sync time or counts.
        lastSync: isLive ? '' : 'Not connected',
        responseMs: provider.avgResponseTimeMs || 0,
        importedToday: 0,
        errorsCount: 0,
        apiKeyMasked: masked,
        capabilities: {
          search: isLive,
          liveSync: isLive,
          aiQualification: isLive,
          proposalGen: false,
          reviewQueue: isLive,
          crm: isLive,
          contactEnrichment: isLive,
          budgetDetection: id === 'crunchbase' ? isLive : false,
          techExtraction: id === 'github' ? isLive : false,
        },
      });
    }

    return list;
  } catch (err: unknown) {
    logger.error('Failed to fetch connector list', err);
    throw new AppError('Failed to fetch connector list.', 500);
  }
}

/**
 * Test Connection for a specific Connector.
 */
export async function testConnectorConnection(connectorId: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const startTime = Date.now();
  try {
    await AuthService.verifySession();
    logger.info(`Testing connection for Connector ID '${connectorId}'...`);

    const provider = providerRegistry.getProvider(connectorId);
    const result = await provider.health();
    return {
      success: result.ok,
      latencyMs: Date.now() - startTime,
      message: result.message,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection test failed.';
    return { success: false, latencyMs: 0, message: msg };
  }
}
