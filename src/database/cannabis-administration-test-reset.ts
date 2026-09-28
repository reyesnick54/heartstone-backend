import { type PrismaService } from './prisma.service';

export async function resetCannabisAdministrationData(prisma: PrismaService): Promise<void> {
  await prisma.cannabisDataAccessAudit.deleteMany();
  await prisma.cannabisComplianceReference.deleteMany();
  await prisma.cannabisInspectionReference.deleteMany();
  await prisma.cannabisExternalDependency.deleteMany();
  await prisma.cannabisLicenceStatusHistory.deleteMany();
  await prisma.cannabisLicenceRecord.deleteMany();
  await prisma.cannabisOperatingStatusHistory.deleteMany();
  await prisma.cannabisConditionRecord.deleteMany();
  await prisma.cannabisBeneficialOwnershipReference.deleteMany();
  await prisma.cannabisResponsiblePartyReference.deleteMany();
  await prisma.cannabisFacilitySiteReference.deleteMany();
  await prisma.cannabisApplicationReference.deleteMany();
  await prisma.cannabisRegulatedEntityReference.deleteMany();
  await prisma.cannabisAdministrationConfiguration.deleteMany();
}
