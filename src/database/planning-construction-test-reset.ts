import { type PrismaService } from './prisma.service';

export async function resetPlanningConstructionData(prisma: PrismaService): Promise<void> {
  await prisma.developmentAccessAudit.deleteMany();
  await prisma.developmentPlanningAppeal.deleteMany();
  await prisma.developmentOccupancyCertificate.deleteMany();
  await prisma.developmentProjectFee.deleteMany();
  await prisma.developmentProjectProfessional.deleteMany();
  await prisma.developmentExternalDependency.deleteMany();
  await prisma.developmentCorrectiveAction.deleteMany();
  await prisma.developmentInspection.deleteMany();
  await prisma.developmentPermit.updateMany({ data: { currentVersionId: null } });
  await prisma.developmentPermitVersion.deleteMany();
  await prisma.developmentPermit.deleteMany();
  await prisma.developmentApplication.deleteMany();
  await prisma.developmentProjectSite.deleteMany();
  await prisma.developmentProject.deleteMany();
}
