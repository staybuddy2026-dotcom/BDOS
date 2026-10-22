import { linkedinProvider } from '../src/features/linkedin/provider';

/**
 * Live check of the LinkedIn (Apify) connection. Run after adding LINKEDIN_SCRAPER_API_KEY:
 *   npx tsx --env-file=.env scripts/test-linkedin-api.ts
 * The account check is free; the post search (5 posts) and company lookup cost a fraction of a cent.
 */
async function main() {
  console.log('--- Account ---');
  const account = await linkedinProvider.checkAccount();
  console.log(account.ok ? 'OK' : 'FAILED', '|', account.message);
  if (account.monthlyLimitUsd !== undefined) console.log(`Usage this month: $${(account.monthlyUsageUsd ?? 0).toFixed(2)} of $${account.monthlyLimitUsd.toFixed(2)}`);
  if (!account.ok) return;

  console.log('\n--- Post search: "looking for a development agency" (last week, 5 posts) ---');
  const posts = await linkedinProvider.searchPosts({ query: 'looking for a development agency', postedLimit: 'week', maxPosts: 5 });
  if (posts.error) console.log('FAILED |', posts.error.code, posts.error.message);
  posts.items.forEach((p) => console.log(' ->', p.authorName, '|', p.authorCompany || p.authorHeadline || '-', '|', p.url));

  console.log('\n--- Company lookup: linkedin.com/company/microsoft ---');
  const { company, error } = await linkedinProvider.getCompany({ url: 'https://www.linkedin.com/company/microsoft' });
  if (error) console.log('FAILED |', error.code, error.message);
  if (company) console.log(' ->', company.name, '|', company.domain, '|', company.employeeCount, 'employees |', company.headquarters);
}

main().catch(console.error);
