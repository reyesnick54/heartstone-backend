import { type PrismaService } from './prisma.service';

export async function resetFinancialServicesData(prisma: PrismaService): Promise<void> {
  await prisma.financialRegulatoryAccessAudit.deleteMany();
  await prisma.financialServicesOperationalSnapshot.deleteMany();
  await prisma.financialReportingRequirementReference.deleteMany();
  await prisma.financialComplianceMatterReference.deleteMany();
  await prisma.financialInspectionReference.deleteMany();
  await prisma.financialExternalRegulatoryDependency.deleteMany();
  await prisma.financialBeneficialOwnershipLinkage.deleteMany();
  await prisma.financialResponsiblePersonReference.deleteMany();
  await prisma.financialLicenceStatusHistory.deleteMany();
  await prisma.financialLicenceCondition.deleteMany();
  await prisma.financialLicenceRecord.deleteMany();
  await prisma.financialLicenceApplicationProfile.deleteMany();
  await prisma.financialRegulatedEntityProfile.deleteMany();
}
