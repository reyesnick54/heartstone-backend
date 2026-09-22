import { type PrismaService } from './prisma.service';

export async function resetLabourData(prisma: PrismaService): Promise<void> {
  await prisma.workPermitStatusHistory.deleteMany();
  await prisma.workPermitCondition.deleteMany();
  await prisma.employmentRelationshipHistory.deleteMany();
  await prisma.employmentContractReference.deleteMany();
  await prisma.employmentDeclaration.deleteMany();
  await prisma.employmentSponsorship.deleteMany();
  await prisma.employmentTerminationNotification.deleteMany();
  await prisma.labourExternalDependency.deleteMany();
  await prisma.labourMarketDeterminationReference.deleteMany();
  await prisma.employmentComplaint.deleteMany();
  await prisma.employmentDispute.deleteMany();
  await prisma.labourComplianceMatterReference.deleteMany();
  await prisma.labourInspectionReference.deleteMany();
  await prisma.employerWorkforceDeclaration.deleteMany();
  await prisma.employerWorkforceProfile.deleteMany();
  await prisma.professionalQualificationReference.deleteMany();
  await prisma.employmentRelationship.updateMany({ data: { currentWorkPermitRecordId: null } });
  await prisma.employmentRelationship.deleteMany();
  await prisma.workPermitRecord.deleteMany();
  await prisma.workPermitApplicationProfile.deleteMany();
  await prisma.workerProfileReference.deleteMany();
  await prisma.employerRegistryRecord.deleteMany();
}
