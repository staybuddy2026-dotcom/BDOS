import * as dotenv from 'dotenv';
dotenv.config();

async function checkRawApollo() {
  const apiKey = process.env.APOLLO_API_KEY;
  console.log('Testing with API key:', apiKey);

  // 1. Check auth/health
  const healthRes = await fetch('https://api.apollo.io/api/v1/auth/health', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! },
  });
  console.log('--- auth/health ---');
  console.log('Status:', healthRes.status);
  console.log('Body:', await healthRes.text());

  // 2. Check mixed_people/api_search
  const peopleRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! },
    body: JSON.stringify({
      person_titles: ['CEO'],
      page: 1,
      per_page: 2,
    }),
  });
  console.log('--- mixed_people/api_search ---');
  console.log('Status:', peopleRes.status);
  console.log('Body:', await peopleRes.text());

  // 3. Check organizations/search
  const orgRes = await fetch('https://api.apollo.io/api/v1/organizations/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! },
    body: JSON.stringify({
      q_organization_name: 'Stripe',
      page: 1,
      per_page: 2,
    }),
  });
  console.log('--- organizations/search ---');
  console.log('Status:', orgRes.status);
  console.log('Body:', await orgRes.text());

  // 4. Also check people/search (v1/people/search or mixed_people/search)
  const pSearch = await fetch('https://api.apollo.io/api/v1/people/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! },
    body: JSON.stringify({
      q_keywords: 'CEO',
      page: 1,
      per_page: 2,
    }),
  });
  console.log('--- people/search ---');
  console.log('Status:', pSearch.status);
  console.log('Body:', await pSearch.text());
}

checkRawApollo().catch(console.error);
