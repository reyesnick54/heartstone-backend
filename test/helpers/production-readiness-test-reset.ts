import { type PrismaService } from '../../src/database/prisma.service';

export async function resetProductionReadinessData(prisma: PrismaService): Promise<void> {
  await prisma.exitAcceptanceRecord.deleteMany();
  await prisma.integrationShutdownRecord.deleteMany();
  await prisma.credentialShutdownRecord.deleteMany();
  await prisma.recordsPreservationManifest.deleteMany();
  await prisma.dataExportManifest.deleteMany();
  await prisma.decommissioningExecution.deleteMany();
  await prisma.decommissioningPlan.deleteMany();
  await prisma.capabilityReplacement.deleteMany();
  await prisma.capabilityRetirement.deleteMany();
  await prisma.operationalRevalidation.deleteMany();
  await prisma.operationalSuspension.deleteMany();
  await prisma.productionCorrectiveAction.deleteMany();
  await prisma.productionDefect.deleteMany();
  await prisma.stabilizationObservation.deleteMany();
  await prisma.stabilizationPeriod.deleteMany();
  await prisma.productionMonitoringPlan.deleteMany();
  await prisma.launchEvent.deleteMany();
  await prisma.operationalActivationRecord.deleteMany();
  await prisma.launchReadinessSnapshot.deleteMany();
}
