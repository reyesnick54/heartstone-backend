import { type PrismaService } from './prisma.service';

export async function resetEducationData(prisma: PrismaService): Promise<void> {
  await prisma.transcriptRecordCorrectionHistory.deleteMany();
  await prisma.transcriptRecord.deleteMany();
  await prisma.certificateRecord.deleteMany();
  await prisma.academicRecord.deleteMany();
  await prisma.enrollmentHistory.deleteMany();
  await prisma.enrollmentRecord.deleteMany();
  await prisma.educationAdmissionApplicationProfile.deleteMany();
  await prisma.scholarshipApplicationProfile.deleteMany();
  await prisma.academicCredential.deleteMany();
  await prisma.educationComplianceReference.deleteMany();
  await prisma.educationExternalDependency.deleteMany();
  await prisma.educationInspectionReference.deleteMany();
  await prisma.professionalEducationQualificationReference.deleteMany();
  await prisma.educatorLicenseRecord.deleteMany();
  await prisma.educatorProfileReference.deleteMany();
  await prisma.studentInstitutionRelationship.deleteMany();
  await prisma.guardianEducationRelationship.deleteMany();
  await prisma.studentEducationProfile.deleteMany();
  await prisma.courseReference.deleteMany();
  await prisma.educationProgramVersion.deleteMany();
  await prisma.educationProgram.deleteMany();
  await prisma.educationInstitutionStatusHistory.deleteMany();
  await prisma.educationInstitutionAccreditation.deleteMany();
  await prisma.educationInstitutionLicense.deleteMany();
  await prisma.educationInstitutionRegistration.deleteMany();
  await prisma.educationInstitution.deleteMany();
  await prisma.qualificationReference.deleteMany();
  await prisma.scholarshipProgramReference.deleteMany();
  await prisma.educationGrantReference.deleteMany();
  await prisma.studentSupportProgramReference.deleteMany();
  await prisma.educationConfiguration.deleteMany();
}
