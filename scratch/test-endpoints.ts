import * as dotenv from 'dotenv';
dotenv.config();

async function testEndpoints() {
  const apiKey = process.env.APOLLO_API_KEY;
  console.log('Testing Apollo Endpoints with Key:', apiKey ? `${apiKey.slice(0, 6)}...` : 'None');

  const endpoints = [
    { name: 'auth/health', url: 'https://api.apollo.io/api/v1/auth/health', method: 'GET' },
    { name: 'usage_stats', url: 'https://api.apollo.io/api/v1/usage_stats/api_usage_stats', method: 'GET' },
    { name: 'organizations/enrich (stripe.com)', url: 'https://api.apollo.io/api/v1/organizations/enrich?domain=stripe.com', method: 'GET' },
    { name: 'people/match', url: 'https://api.apollo.io/api/v1/people/match', method: 'POST', body: { first_name: 'Patrick', last_name: 'Collison', domain: 'stripe.com' } },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      const text = await res.text();
      console.log(`\n=== ${ep.name} (Status ${res.status}) ===`);
      console.log(text.slice(0, 300));
    } catch (e) {
      console.error(`Error on ${ep.name}:`, e);
    }
  }
}

testEndpoints().catch(console.error);
