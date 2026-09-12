import { type PrismaService } from '../../src/database/prisma.service';

export async function resetApplicationProcessingData(prisma: PrismaService): Promise<void> {
  await prisma.evidenceCustodyEvent.deleteMany();
  await prisma.inspectionEvidenceItem.deleteMany();
  await prisma.inspectionInspector.deleteMany();
  await prisma.inspectionRecord.deleteMany();
  await prisma.professionalReviewEvidence.deleteMany();
  await prisma.professionalReviewRecord.deleteMany();
  await prisma.governmentCommunicationEvidence.deleteMany();
  await prisma.governmentCommunicationDocument.deleteMany();
  await prisma.governmentCommunicationRecord.deleteMany();
  await prisma.departmentalReviewEvidence.deleteMany();
  await prisma.departmentalReviewRecord.deleteMany();
  await prisma.evidenceRecord.deleteMany();
  await prisma.documentRecord.deleteMany();
  await prisma.caseCommunicationOutbox.deleteMany();
  await prisma.casePublicStatusProjection.deleteMany();
  await prisma.caseCommunication.deleteMany();
  await prisma.caseMilestone.deleteMany();
  await prisma.caseEvent.deleteMany();
  await prisma.caseWorkflowStepInstance.deleteMany();
  await prisma.caseWorkflowInstance.deleteMany();
  await prisma.caseTimelineWorkflowStepInstance.deleteMany();
  await prisma.caseTimelineWorkflowInstance.deleteMany();
  await prisma.case.deleteMany();
  await prisma.application.deleteMany();
}
