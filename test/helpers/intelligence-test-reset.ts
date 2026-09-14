import { type PrismaService } from '../../src/database/prisma.service';

/**
 * Deletes Phase 12 intelligence tables in dependency-safe order.
 * Call before government/identity teardown when tests seed intelligence data.
 */
export async function resetIntelligenceData(prisma: PrismaService): Promise<void> {
  await prisma.evidenceDashboardDecisionTrace.deleteMany();
  await prisma.reportCorrection.deleteMany();
  await prisma.reportPublication.deleteMany();
  await prisma.reportApproval.deleteMany();
  await prisma.reportReview.deleteMany();
  await prisma.reportClaim.deleteMany();
  await prisma.reportGenerationRun.deleteMany();
  await prisma.reportDefinition.deleteMany();
  await prisma.simulationToLiveTransitionRecord.deleteMany();
  await prisma.consequentialUseReview.deleteMany();
  await prisma.simulationOutput.deleteMany();
  await prisma.simulationRun.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.digitalTwinSnapshot.deleteMany();
  await prisma.digitalTwinVersion.deleteMany();
  await prisma.digitalTwinDefinition.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.alertVerification.deleteMany();
  await prisma.monitoringAlert.deleteMany();
  await prisma.monitoringObservation.deleteMany();
  await prisma.complianceAlert.deleteMany();
  await prisma.complianceMonitoringEvent.deleteMany();
  await prisma.monitoringRule.deleteMany();
  await prisma.analysisOption.deleteMany();
  await prisma.analysisFinding.deleteMany();
  await prisma.analysisRun.deleteMany();
  await prisma.analysisRequest.deleteMany();
  await prisma.aIHumanDisposition.deleteMany();
  await prisma.aIIncident.deleteMany();
  await prisma.aISuspensionRecord.deleteMany();
  await prisma.aIExecutionRecord.deleteMany();
  await prisma.aIEvaluation.deleteMany();
  await prisma.aIToolEntitlement.deleteMany();
  await prisma.aIDataEntitlement.deleteMany();
  await prisma.aIAgentVersion.deleteMany();
  await prisma.aIAgentDefinition.deleteMany();
  await prisma.aIUseCaseVersion.deleteMany();
  await prisma.aIUseCase.deleteMany();
  await prisma.aIModelVersion.deleteMany();
  await prisma.aIModelDefinition.deleteMany();
  await prisma.projectStatusProjection.deleteMany();
  await prisma.infrastructureDeliveryRecord.deleteMany();
  await prisma.employmentEvidenceRecord.deleteMany();
  await prisma.capitalEvidenceRecord.deleteMany();
  await prisma.strategicProjectMilestone.deleteMany();
  await prisma.strategicProjectProfile.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.dashboardIndicatorProjection.deleteMany();
  await prisma.dashboardIndicatorDefinition.deleteMany();
  await prisma.dashboardWidgetDefinition.deleteMany();
  await prisma.dashboardVersion.deleteMany();
  await prisma.dashboardDefinition.deleteMany();
  await prisma.performanceClaimRevalidation.deleteMany();
  await prisma.performanceClaimReview.deleteMany();
  await prisma.performanceClaim.deleteMany();
  await prisma.metricDataQualityAssessment.deleteMany();
  await prisma.metricObservation.deleteMany();
  await prisma.metricCalculationRun.deleteMany();
  await prisma.metricBaseline.deleteMany();
  await prisma.metricDefinition.updateMany({ data: { currentVersionId: null } });
  await prisma.metricDefinitionVersion.deleteMany();
  await prisma.metricDefinition.deleteMany();
  await prisma.performanceFramework.deleteMany();
  await prisma.dashboardStatusDictionaryEntry.deleteMany();
}
