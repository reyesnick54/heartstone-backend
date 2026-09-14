import { type PrismaService } from '../../src/database/prisma.service';

export async function resetFinancialData(prisma: PrismaService): Promise<void> {
  await prisma.paymentTransactionEvent.deleteMany();
  await prisma.reconciliationException.deleteMany();
  await prisma.reconciliationItem.deleteMany();
  await prisma.reconciliationBatch.deleteMany();
  await prisma.refundTransaction.deleteMany();
  await prisma.refundAuthorization.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.feeAdjustmentDecision.deleteMany();
  await prisma.feeAdjustmentRequest.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.paymentProviderWebhookEvent.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.paymentProviderConfiguration.deleteMany();
  await prisma.paymentChannelDefinition.deleteMany();
  await prisma.arrearsRecord.deleteMany();
  await prisma.financialDispute.deleteMany();
  await prisma.financialApprovalRecord.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feeAssessment.deleteMany();
  await prisma.feeScheduleItem.deleteMany();
  await prisma.feeScheduleVersion.deleteMany();
  await prisma.feeSchedule.deleteMany();
}
