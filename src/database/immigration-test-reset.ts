import { type PrismaService } from './prisma.service';

export async function resetImmigrationData(prisma: PrismaService): Promise<void> {
  await prisma.immigrationCaseProjection.deleteMany();
  await prisma.immigrationStatusHistory.deleteMany();
  await prisma.immigrationExternalCheck.deleteMany();
  await prisma.immigrationInterview.deleteMany();
  await prisma.biometricRequirement.deleteMany();
  await prisma.immigrationRequirementAssessment.deleteMany();
  await prisma.dependentRelationship.deleteMany();
  await prisma.immigrationSponsorship.deleteMany();
  await prisma.visaPermissionRecord.deleteMany();
  await prisma.residencyPermitRecord.updateMany({ data: { renewalOfPermitId: null } });
  await prisma.residencyPermitRecord.deleteMany();
  await prisma.residencyStatusRecord.deleteMany();
  await prisma.citizenshipStatusRecord.deleteMany();
  await prisma.visaApplicationProfile.deleteMany();
  await prisma.residencyApplicationProfile.deleteMany();
  await prisma.citizenshipApplicationProfile.deleteMany();
  await prisma.travelDocumentReference.deleteMany();
  await prisma.immigrationRestriction.deleteMany();
  await prisma.immigrationProfile.updateMany({ data: { currentStatusRecordId: null } });
  await prisma.immigrationStatusRecord.deleteMany();
  await prisma.immigrationProfile.deleteMany();
}
