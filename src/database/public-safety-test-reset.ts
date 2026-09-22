import { type PrismaService } from './prisma.service';

export async function resetPublicSafetyData(prisma: PrismaService): Promise<void> {
  await prisma.publicSafetyCommunicationDelivery.deleteMany();
  await prisma.publicSafetyExternalDependency.deleteMany();
  await prisma.publicSafetyInspectionRequest.deleteMany();
  await prisma.publicSafetyRecoveryAssistanceApplication.deleteMany();
  await prisma.publicSafetyIncidentReport.deleteMany();
  await prisma.publicSafetyServiceRequest.deleteMany();
  await prisma.publicSafetyOfficialNotice.deleteMany();
  await prisma.publicSafetyEmergencyEvent.deleteMany();
  await prisma.publicSafetyEngagement.deleteMany();
}
