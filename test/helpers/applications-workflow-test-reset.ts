import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationsWorkflowData(prisma: PrismaService): Promise<void> {
  await prisma.caseReferralResponse.deleteMany();
  await prisma.caseSlaPause.deleteMany();
  await prisma.caseIssue.updateMany({ data: { escalationId: null } });
  await prisma.caseEscalation.updateMany({ data: { relatedIssueId: null } });
  await prisma.caseEscalation.deleteMany();
  await prisma.caseIssue.deleteMany();
  await prisma.caseSlaClock.deleteMany();
  await prisma.caseReferral.deleteMany();
  await prisma.caseAssignment.deleteMany();
  await prisma.case.updateMany({ data: { currentWorkflowStepId: null } });
  await prisma.caseWorkflowStep.deleteMany();
}
