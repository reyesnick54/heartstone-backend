import { type PrismaService } from '../../src/database/prisma.service';

export async function resetEvidenceRecordsData(prisma: PrismaService): Promise<void> {
  await prisma.recordDispositionRecord.deleteMany();
  await prisma.recordDispositionRequest.deleteMany();
  await prisma.archivalTransfer.deleteMany();
  await prisma.preservationCollection.deleteMany();
  await prisma.legalHoldTarget.deleteMany();
  await prisma.legalHold.deleteMany();
  await prisma.recordRetentionAssignment.deleteMany();
  await prisma.retentionRule.deleteMany();
  await prisma.retentionSchedule.deleteMany();
  await prisma.recordAccessEvent.deleteMany();
  await prisma.recordIntegrityEvent.deleteMany();
  await prisma.recordCorrection.deleteMany();
  await prisma.evidencePacketManifest.deleteMany();
  await prisma.evidencePacketItem.deleteMany();
  await prisma.evidencePacketVersion.deleteMany();
  await prisma.evidencePacket.deleteMany();
  await prisma.evidenceCustodyEvent.deleteMany();
  await prisma.inspectionEvidenceItem.deleteMany();
  await prisma.inspectionRecord.deleteMany();
  await prisma.professionalReviewRecord.deleteMany();
  await prisma.governmentCommunicationRecord.deleteMany();
  await prisma.departmentalReviewRecord.deleteMany();
  await prisma.evidenceQualityAssessment.deleteMany();
  await prisma.evidencePurposeAcceptance.deleteMany();
  await prisma.evidenceRequirementLink.deleteMany();
  await prisma.evidenceVerification.deleteMany();
  await prisma.evidenceRecord.deleteMany();
  await prisma.documentAssociation.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.documentRecord.deleteMany();
  await prisma.masterAdministrativeFileSection.deleteMany();
  await prisma.masterAdministrativeFile.deleteMany();
}
