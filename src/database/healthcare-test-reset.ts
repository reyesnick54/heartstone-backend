import { type PrismaService } from './prisma.service';

export async function resetHealthcareTreatmentData(prisma: PrismaService): Promise<void> {
  await prisma.healthcareDataAccessPolicy.deleteMany();
  await prisma.patientTreatmentStatusProjection.deleteMany();
  await prisma.treatmentAppointmentReference.deleteMany();
  await prisma.treatmentCareTeamReference.deleteMany();
  await prisma.treatmentEnrollmentStatusHistory.deleteMany();
  await prisma.treatmentEnrollment.deleteMany();
  await prisma.treatmentEligibilityReview.deleteMany();
  await prisma.treatmentScreening.deleteMany();
  await prisma.treatmentReferral.deleteMany();
  await prisma.treatmentApplication.deleteMany();
  await prisma.treatmentReferralSource.deleteMany();
  await prisma.treatmentProgramExternalDependency.deleteMany();
  await prisma.treatmentProgramAuthorization.deleteMany();
  await prisma.treatmentProgramEligibilityCriterion.deleteMany();
  await prisma.treatmentProgramConditionReference.deleteMany();
  await prisma.treatmentProgramSite.deleteMany();
  await prisma.treatmentProgramProvider.deleteMany();
  await prisma.treatmentProgramVersion.deleteMany();
  await prisma.treatmentProgram.deleteMany();
  await prisma.patientHealthcareProfile.deleteMany();
}
