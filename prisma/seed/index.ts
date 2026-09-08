import { PrismaClient } from '@prisma/client';

import { seedAntiguaBarbudaStructural } from './antigua-barbuda.structural';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedAntiguaBarbudaStructural(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
