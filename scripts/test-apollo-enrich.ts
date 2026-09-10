import 'dotenv/config';

async function testEnrich() {
  const apiKey = process.env.APOLLO_API_KEY;

  const searchRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '',
    },
    body: JSON.stringify({
      api_key: apiKey,
      person_titles: ['Director'],
      q_keywords: 'SaaS',
      page: 1,
      per_page: 5,
    }),
  });

  const searchData = await searchRes.json() as Record<string, unknown>;
  const people = searchData.people as Array<Record<string, unknown>> | undefined;
  const person = people?.[0];

  if (person && typeof person.id === 'string') {
    const matchRes = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
      },
      body: JSON.stringify({
        api_key: apiKey,
        id: person.id,
        first_name: person.first_name,
        reveal_personal_emails: true,
      }),
    });

    console.log('Enrich status:', matchRes.status);
    const matchData = await matchRes.json() as Record<string, unknown>;
    console.log('Enriched Person result:', matchData.person ? 'Found' : 'Not found');
  }
}

testEnrich().catch(console.error);
