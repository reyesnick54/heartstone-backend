import { type PrismaService } from './prisma.service';

export async function resetDecisionsData(prisma: PrismaService): Promise<void> {
  await prisma.electronicSignatureValidationRecord.deleteMany();
  await prisma.electronicSealUseRecord.deleteMany();
  await prisma.electronicSealUseAuthorization.deleteMany();
  await prisma.electronicSealCustodyAssignment.deleteMany();
  await prisma.electronicSealDefinition.deleteMany();
  await prisma.electronicSignatureRecord.deleteMany();
  await prisma.signableInstrumentBinding.deleteMany();
  await prisma.electronicSignatureAuthorization.deleteMany();
  await prisma.electronicSignatureCredentialReference.deleteMany();
  await prisma.decisionTypeLifecycleTransition.deleteMany();
  await prisma.decisionTypeRequirementElement.deleteMany();
  await prisma.decisionTypePermissibleOutcome.deleteMany();
  await prisma.decisionTypeVersion.deleteMany();
  await prisma.decisionTypeDefinition.deleteMany();
}
