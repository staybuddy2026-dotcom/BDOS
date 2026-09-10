import { logger } from '../src/lib/logger';

export function setupTestEnvironment() {
  if (process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  }
  const dbUrl = process.env.DATABASE_URL || '';

  // Safety Rule Requirement 5 & 6: Refuse execution if configured DB appears to be a production environment
  if (dbUrl.includes('prod') || dbUrl.includes('production') || dbUrl.includes('rds.amazonaws.com') || dbUrl.includes('neon.tech/production')) {
    console.error('\n❌ SAFETY GUARD REJECTION: Smoke tests refused to execute on a production database!');
    console.error(`Configured DATABASE_URL (${dbUrl}) contains production identifiers.\n`);
    process.exit(1);
  }

  // Set safe test environment variables
  (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
  process.env.APOLLO_MOCK_MODE = 'true';
  process.env.AI_MOCK_MODE = 'true';

  logger.info('Test environment safety checks passed. Running isolated test suite...');
}
