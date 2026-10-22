const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const deals = await prisma.deal.findMany({ where: { value: null } });
  for (const deal of deals) {
    // Assign a random value between 5,000 and 50,000 USD
    const randomValue = Math.floor(Math.random() * (50000 - 5000 + 1)) + 5000;
    // Assign a random probability based on stage
    let prob = 10;
    switch (deal.stage) {
      case 'LEAD': prob = 10; break;
      case 'CONTACTED': prob = 20; break;
      case 'MEETING_SCHEDULED': prob = 40; break;
      case 'PROPOSAL_SENT': prob = 60; break;
      case 'NEGOTIATION': prob = 80; break;
      case 'WON': prob = 100; break;
      case 'LOST': prob = 0; break;
    }
    await prisma.deal.update({
      where: { id: deal.id },
      data: { value: randomValue, probability: prob }
    });
    console.log(`Updated deal ${deal.title} with value ${randomValue} and prob ${prob}%`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
