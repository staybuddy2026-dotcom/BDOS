import 'dotenv/config';

async function inspectApolloKeys() {
  const apiKey = process.env.APOLLO_API_KEY;

  const res = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '',
    },
    body: JSON.stringify({
      api_key: apiKey,
      person_titles: ['CTO'],
      page: 2,
      per_page: 10,
    }),
  });

  const data = await res.json() as Record<string, unknown>;
  console.log('Root JSON Keys:', Object.keys(data));
  console.log('total_entries:', data.total_entries);
}

inspectApolloKeys().catch(console.error);
