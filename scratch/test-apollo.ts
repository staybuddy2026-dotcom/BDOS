import * as dotenv from 'dotenv';
dotenv.config();

import { apolloProvider } from '@/features/apollo/provider';

async function test() {
  console.log('ENV Key:', process.env.APOLLO_API_KEY ? `${process.env.APOLLO_API_KEY.slice(0, 5)}...` : 'NONE');
  console.log('Mock Mode:', process.env.APOLLO_MOCK_MODE);
  
  const health = await apolloProvider.checkHealth();
  console.log('Health:', health);

  const usage = await apolloProvider.getUsage();
  console.log('Usage:', usage);

  const peopleRes = await apolloProvider.searchPeopleAdvanced({
    jobTitle: 'CEO',
    perPage: 3,
  });
  console.log('People Search Response:');
  console.log('  totalCount:', peopleRes.totalCount);
  console.log('  returned count:', peopleRes.people.length);
  console.log('  error:', peopleRes.error);
  if (peopleRes.people.length > 0) {
    console.log('  sample person:', {
      name: peopleRes.people[0].personName,
      title: peopleRes.people[0].jobTitle,
      company: peopleRes.people[0].organizationName,
      email: peopleRes.people[0].workEmail,
    });
  }

  const orgRes = await apolloProvider.searchOrganizationsAdvanced({
    name: 'Tech',
    perPage: 3,
  });
  console.log('Org Search Response:');
  console.log('  totalCount:', orgRes.totalCount);
  console.log('  returned count:', orgRes.organizations.length);
  console.log('  error:', orgRes.error);
  if (orgRes.organizations.length > 0) {
    console.log('  sample org:', {
      name: orgRes.organizations[0].name,
      domain: orgRes.organizations[0].domain,
      industry: orgRes.organizations[0].industry,
    });
  }
}

test().catch(console.error);
