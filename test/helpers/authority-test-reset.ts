import { type PrismaService } from '../../src/database/prisma.service';

export async function resetAuthorityData(prisma: PrismaService): Promise<void> {
  await prisma.delegationStructuredScope.deleteMany();
  await prisma.authorityEvaluationRecord.deleteMany();
  await prisma.functionActivationAudit.deleteMany();
  await prisma.retainedNationalDetermination.deleteMany();
  await prisma.segregationOfDutyRule.deleteMany();
  await prisma.authorityDependency.deleteMany();
  await prisma.authorityCondition.deleteMany();
  await prisma.authorityActionRight.deleteMany();
  await prisma.functionAuthorityAssignment.deleteMany();
  await prisma.functionGoverningSource.deleteMany();
  await prisma.governingSourceRelationship.deleteMany();
  await prisma.governingSourceVersion.deleteMany();
  await prisma.governingSource.deleteMany();
  await prisma.functionAuthorityRecord.deleteMany();
}
