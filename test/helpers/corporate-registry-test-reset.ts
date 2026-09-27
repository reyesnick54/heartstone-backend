import { type PrismaService } from '../../src/database/prisma.service';

export async function resetCorporateRegistryData(prisma: PrismaService): Promise<void> {
  await prisma.sezBusinessLicencePaymentEvent.deleteMany();
  await prisma.sezBusinessLicenceStatusHistory.deleteMany();
  await prisma.absezZoneEnterpriseStatusHistory.deleteMany();
  await prisma.absezZoneEnterpriseCondition.deleteMany();
  await prisma.sezBusinessLicenceRecord.deleteMany();
  await prisma.absezZoneEnterprise.deleteMany();
  await prisma.absezZoneEnterpriseConfiguration.deleteMany();
  await prisma.corporateBeneficialOwnershipChangeHistory.deleteMany();
  await prisma.corporateBeneficialOwnerRecord.deleteMany();
  await prisma.corporateRegistryStatusHistory.deleteMany();
  await prisma.corporateRegistryOfficialDecision.deleteMany();
  await prisma.corporateRegistryPaymentEvent.deleteMany();
  await prisma.corporateRegistryAction.deleteMany();
  await prisma.corporateCertificate.deleteMany();
  await prisma.corporateBeneficialOwnershipDeclaration.deleteMany();
  await prisma.corporateFiling.deleteMany();
  await prisma.corporateOfficerDisclosure.deleteMany();
  await prisma.corporateRegisteredOffice.deleteMany();
  await prisma.corporateRegistryProfile.deleteMany();
  await prisma.corporateRegistryConfiguration.deleteMany();
}
