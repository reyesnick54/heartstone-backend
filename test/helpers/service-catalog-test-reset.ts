import { type PrismaService } from '../../src/database/prisma.service';

export async function resetServiceCatalogData(prisma: PrismaService): Promise<void> {
  await prisma.serviceRedressRoute.deleteMany();
  await prisma.serviceOutputDefinition.deleteMany();
  await prisma.serviceDependencyDefinition.deleteMany();
  await prisma.serviceLevelTarget.deleteMany();
  await prisma.serviceFeeDefinition.deleteMany();
  await prisma.serviceVersion.deleteMany();
  await prisma.governmentService.deleteMany();
}
