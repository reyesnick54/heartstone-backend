import { type PrismaService } from '../../src/database/prisma.service';

export async function resetServiceCatalogData(prisma: PrismaService): Promise<void> {
  await prisma.workflowTransitionDefinition.deleteMany();
  await prisma.workflowStepDefinition.deleteMany();
  await prisma.workflowStageDefinition.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.serviceActivationRecord.deleteMany();
  await prisma.governmentServiceRedressRoute.deleteMany();
  await prisma.governmentServiceOutputDefinition.deleteMany();
  await prisma.governmentServiceChecklistItem.deleteMany();
  await prisma.governmentServiceEligibilityRule.deleteMany();
  await prisma.governmentServiceFeeDefinition.deleteMany();
  await prisma.serviceFunctionMapping.deleteMany();
  await prisma.governmentServiceVersionApplicantCategory.deleteMany();
  await prisma.formFieldConditionalRule.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formSection.deleteMany();
  await prisma.formVersion.deleteMany();
  await prisma.formDefinition.deleteMany();
  await prisma.governmentServiceVersion.deleteMany();
  await prisma.governmentService.deleteMany();
  await prisma.serviceFamily.deleteMany();
}
