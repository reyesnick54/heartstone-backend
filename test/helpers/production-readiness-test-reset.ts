import { type PrismaService } from '../../src/database/prisma.service';

export async function resetProductionReadinessData(prisma: PrismaService): Promise<void> {
  await prisma.rollbackExecution.deleteMany();
  await prisma.deploymentVerification.deleteMany();
  await prisma.deploymentRecord.deleteMany();
  await prisma.releaseApproval.deleteMany();
  await prisma.releaseRevalidationTrigger.deleteMany();
  await prisma.releaseArtifact.deleteMany();
  await prisma.rollbackPlan.deleteMany();
  await prisma.releaseDefinition.deleteMany();
  await prisma.changeAssessment.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.emergencyChange.deleteMany();
  await prisma.configurationChange.deleteMany();
  await prisma.configurationItem.deleteMany();
  await prisma.featureActivation.deleteMany();
  await prisma.dataTransferApproval.deleteMany();
  await prisma.environmentCredentialBinding.deleteMany();
  await prisma.environmentIntegrationEndpoint.deleteMany();
  await prisma.environmentConfigurationBaseline.deleteMany();
  await prisma.ciPipelineRun.deleteMany();
  await prisma.environmentDefinition.deleteMany();
}
