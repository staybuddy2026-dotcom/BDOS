import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('Clearing database records...');

  await prisma.reEngagementEvent.deleteMany({});
  await prisma.followUp.deleteMany({});
  await prisma.outreachHistory.deleteMany({});
  await prisma.outreachDraft.deleteMany({});
  await prisma.outreachStep.deleteMany({});
  await prisma.outreachPlaybook.deleteMany({});
  await prisma.postAnalysis.deleteMany({});
  await prisma.apolloEnrichment.deleteMany({});
  await prisma.linkedInPost.deleteMany({});
  await prisma.keyword.deleteMany({});
  await prisma.aILearningData.deleteMany({});
  await prisma.applicationSettings.deleteMany({});

  console.log('✅ Database successfully cleared of all records!');
  await prisma.$disconnect();
}

clearDatabase().catch((e) => {
  console.error('Error clearing database:', e);
  process.exit(1);
});
