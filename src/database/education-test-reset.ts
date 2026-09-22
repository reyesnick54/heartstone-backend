import { type PrismaService } from './prisma.service';

export async function resetEducationData(prisma: PrismaService): Promise<void> {
  await prisma.educationRecordCorrectionHistory.deleteMany();
  await prisma.educationRecordCorrection.deleteMany();
  await prisma.educationInstitutionInspectionReference.deleteMany();
  await prisma.educationExternalDependency.deleteMany();
  await prisma.educationAcademicRecordReference.deleteMany();
  await prisma.educationCredentialReference.deleteMany();
  await prisma.scholarshipAwardRecord.deleteMany();
  await prisma.scholarshipApplicationProfile.deleteMany();
  await prisma.educationGrantApplicationProfile.deleteMany();
  await prisma.educationEnrollmentApplicationProfile.deleteMany();
  await prisma.educationEnrollmentRecord.deleteMany();
  await prisma.educationAccreditationRecord.deleteMany();
  await prisma.educationInstitutionLicenseRecord.deleteMany();
  await prisma.educatorLicenseRecord.deleteMany();
  await prisma.educationGuardianRelationship.deleteMany();
  await prisma.educationInstitutionRegistryRecord.deleteMany();
  await prisma.educationStudentProfile.deleteMany();
}
