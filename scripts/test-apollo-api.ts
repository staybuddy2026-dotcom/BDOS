import 'dotenv/config';
import { DefaultApolloProvider } from '../src/features/apollo/provider';

async function testQueryVariations() {
  const provider = new DefaultApolloProvider();

  console.log('--- Test A: Job Title = Founder, Location = United States ---');
  const resA = await provider.searchPeopleAdvanced({
    jobTitle: 'Founder',
    personLocation: 'United States',
  });
  console.log('Results A count:', resA.people.length);
  resA.people.slice(0, 3).forEach(p => console.log(' ->', p.personName, '|', p.jobTitle, '|', p.organizationName));

  console.log('\n--- Test B: Job Title = Founder, Keywords = software development ---');
  const resB = await provider.searchPeopleAdvanced({
    jobTitle: 'Founder',
    keywords: 'software development',
  });
  console.log('Results B count:', resB.people.length);
  resB.people.slice(0, 3).forEach(p => console.log(' ->', p.personName, '|', p.jobTitle, '|', p.organizationName));

  console.log('\n--- Test C: Keywords = React ---');
  const resC = await provider.searchPeopleAdvanced({
    keywords: 'React',
  });
  console.log('Results C count:', resC.people.length);
  resC.people.slice(0, 3).forEach(p => console.log(' ->', p.personName, '|', p.jobTitle, '|', p.organizationName));
}

testQueryVariations().catch(console.error);
