import { type PrismaService } from '../../src/database/prisma.service';

/**
 * Deletes Phase 11 operational-support tables in dependency-safe order.
 * Call before government/identity teardown when tests seed Phase 11 data.
 */
export async function resetOperationalSupportData(prisma: PrismaService): Promise<void> {
  await prisma.refundTransaction.deleteMany();
  await prisma.refundAuthorization.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.paymentProviderWebhookEvent.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feeAssessment.deleteMany();
  await prisma.feeAdjustmentDecision.deleteMany();
  await prisma.feeAdjustmentRequest.deleteMany();
  await prisma.financialApprovalRecord.deleteMany();
  await prisma.reconciliationItem.deleteMany();
  await prisma.reconciliationBatch.deleteMany();
  await prisma.financialDispute.deleteMany();
  await prisma.arrearsRecord.deleteMany();
  await prisma.feeScheduleItem.deleteMany();
  await prisma.feeScheduleVersion.deleteMany();
  await prisma.feeSchedule.deleteMany();
  await prisma.paymentProviderConfiguration.deleteMany();
  await prisma.paymentChannelDefinition.deleteMany();
  await prisma.communicationDeliveryAttempt.deleteMany();
  await prisma.communicationDelivery.deleteMany();
  await prisma.communicationReceipt.deleteMany();
  await prisma.communicationRecipient.deleteMany();
  await prisma.communicationMessage.deleteMany();
  await prisma.communicationTemplateVersion.deleteMany();
  await prisma.communicationTemplate.deleteMany();
  await prisma.communicationPreference.deleteMany();
  await prisma.mandatoryCommunicationRule.deleteMany();
  await prisma.translationRecord.deleteMany();
  await prisma.accessibilityAccommodation.deleteMany();
  await prisma.integrationRecoveryEvent.deleteMany();
  await prisma.integrationFallbackActivation.deleteMany();
  await prisma.integrationOutage.deleteMany();
  await prisma.integrationDeadLetterRecord.deleteMany();
  await prisma.integrationReconciliationRecord.deleteMany();
  await prisma.sourceDiscrepancyResolution.deleteMany();
  await prisma.sourceDiscrepancy.deleteMany();
  await prisma.registrySynchronization.deleteMany();
  await prisma.registryQuery.deleteMany();
  await prisma.externalRecordReference.deleteMany();
  await prisma.integrationValidationResult.deleteMany();
  await prisma.integrationDataTransformation.deleteMany();
  await prisma.integrationWebhookEvent.deleteMany();
  await prisma.integrationMessage.deleteMany();
  await prisma.integrationExchange.deleteMany();
  await prisma.integrationRequest.deleteMany();
  await prisma.integrationAcceptanceRecord.deleteMany();
  await prisma.integrationCredentialReference.deleteMany();
  await prisma.fieldAuthorityMapping.deleteMany();
  await prisma.authoritativeSourceDesignation.deleteMany();
  await prisma.dataExchangeField.deleteMany();
  await prisma.dataExchangeContract.deleteMany();
  await prisma.integrationEndpoint.deleteMany();
  await prisma.integrationVersion.deleteMany();
  await prisma.integrationDefinition.deleteMany();
  await prisma.technologyDependency.deleteMany();
}
