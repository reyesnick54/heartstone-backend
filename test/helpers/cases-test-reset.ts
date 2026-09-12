import { type PrismaService } from '../../src/database/prisma.service';
import { resetApplicationsWorkflowData } from './applications-workflow-test-reset';

export async function resetCasesData(prisma: PrismaService): Promise<void> {
  await resetApplicationsWorkflowData(prisma);
  await prisma.caseRelationship.deleteMany();
  await prisma.caseStatusHistory.deleteMany();
  await prisma.case.deleteMany();
}
