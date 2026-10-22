const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const deals = await prisma.deal.findMany({ where: { ownerId: '872abbb6-6c36-40c8-a796-b0bd7ee81e59' } });
  console.log(`User khush@gmail.com has ${deals.length} deals.`);
  
  const allDeals = await prisma.deal.findMany();
  console.log(`Total deals in DB: ${allDeals.length}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
