import { PrismaClient, Priority, KeywordStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedKeyword() {
  const keywordText = '("custom software development" OR "software development company") AND ("looking for" OR "need help" OR "recommend")';
  
  console.log('Adding initial search keyword...');
  
  const created = await prisma.keyword.create({
    data: {
      keyword: keywordText,
      category: 'Software Development',
      priority: Priority.HIGH,
      status: KeywordStatus.ACTIVE,
      isFavorite: true,
    },
  });

  console.log(`✅ Search Keyword created: ID ${created.id}`);
  await prisma.$disconnect();
}

seedKeyword().catch((e) => {
  console.error('Error seeding keyword:', e);
  process.exit(1);
});
