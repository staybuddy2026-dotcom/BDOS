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

  // Paid APIs are never called from tests, even when a real key is in .env or saved in Settings.
  // Tests that need Apify/Apollo answers install their own fetch mock on top of this one.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (/api\.apify\.com|api\.apollo\.io/i.test(url)) {
      return new Response(JSON.stringify({ error: { type: 'blocked-in-tests', message: 'Paid APIs are blocked in tests.' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input, init);
  }) as typeof fetch;

  logger.info('Test environment safety checks passed. Running isolated test suite...');
}
