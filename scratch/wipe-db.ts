import { db } from '../src/lib/db';

async function wipeDatabase() {
  console.log('Cleaning database records...');
  
  await db.reEngagementEvent.deleteMany({});
  await db.followUp.deleteMany({});
  await db.outreachHistory.deleteMany({});
  await db.outreachDraft.deleteMany({});
  await db.postAnalysis.deleteMany({});
  await db.apolloEnrichment.deleteMany({});
  await db.linkedInPost.deleteMany({});
  await db.applicationSettings.deleteMany({});
  
  console.log('Database successfully cleaned! All records removed.');
  await db.$disconnect();
}

wipeDatabase().catch((err) => {
  console.error('Database clean error:', err);
  process.exit(1);
});
