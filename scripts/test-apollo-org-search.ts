import 'dotenv/config';

async function validateOrgContractDebug() {
  const apiKey = process.env.APOLLO_API_KEY;

  const payload = {
    api_key: apiKey,
    q_organization_keyword_tags: ['SaaS'],
    organization_num_employees_ranges: ['11,50'],
    page: 1,
    per_page: 5,
  };

  const res = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '',
    },
    body: JSON.stringify(payload),
  });

  console.log('HTTP Status:', res.status);
  const data = await res.json() as Record<string, unknown>;
  const pagination = data.pagination as Record<string, unknown> | undefined;
  console.log('Total entries:', pagination?.total_entries || data.num_fetch_result);
}

validateOrgContractDebug().catch(console.error);
