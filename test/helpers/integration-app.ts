import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type App } from 'supertest/types';

import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/bootstrap/configure-application';
import { resetCustomsTradeData } from '../../src/database/customs-trade-test-reset';
import { resetEducationData } from '../../src/database/education-test-reset';
import { resetHealthcareFoundationData } from '../../src/database/healthcare-test-reset';
import { resetImmigrationData } from '../../src/database/immigration-test-reset';
import { resetLabourData } from '../../src/database/labour-test-reset';
import { resetPlanningConstructionData } from '../../src/database/planning-construction-test-reset';
import { PrismaService } from '../../src/database/prisma.service';
import { resetPropertyRegistryData } from '../../src/database/property-test-reset';
import { resetPublicSafetyData } from '../../src/database/public-safety-test-reset';
import { resetRevenueData } from '../../src/database/revenue-test-reset';
import { resetSocialProtectionData } from '../../src/database/social-protection-test-reset';
import { resetTransportationData } from '../../src/database/transportation-test-reset';
import { overrideRedisService } from '../redis-test-utils';
import { resetApplicationProcessingData } from './application-processing-test-reset';
import { resetAuthorityData } from './authority-test-reset';
import { resetCorporateRegistryData } from './corporate-registry-test-reset';
import { resetOperationalSupportData } from './operational-support-test-reset';
import { resetProductionReadinessData } from './production-readiness-test-reset';
import { resetServiceCatalogData } from './service-catalog-test-reset';

export async function createIntegrationApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  overrideRedisService(moduleBuilder);

  const moduleFixture: TestingModule = await moduleBuilder.compile();
  const app: INestApplication<App> = moduleFixture.createNestApplication({ bodyParser: false });
  configureApplication(app);
  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

export async function resetIdentityData(prisma: PrismaService): Promise<void> {
  await resetCorporateRegistryData(prisma);
  await prisma.technicalAccessAuditEvent.deleteMany();
  await prisma.technicalRoleAssignment.deleteMany();
  await prisma.platformAdministrativeAccessAudit.deleteMany();
  await prisma.platformAdministrativeAccessPolicy.deleteMany();
  await prisma.securityAuditEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.identityOfficeholderLink.deleteMany();
  await prisma.representativeAuthority.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.authenticationMethod.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.identity.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.person.deleteMany();
  await prisma.organization.deleteMany();
}

export async function resetIntelligenceData(prisma: PrismaService): Promise<void> {
  await prisma.intelligenceAlertDisposition.deleteMany();
  await prisma.intelligenceAlertVerification.deleteMany();
  await prisma.intelligenceMonitoringAlert.deleteMany();
  await prisma.intelligenceMonitoringObservation.deleteMany();
  await prisma.intelligenceMonitoringRule.deleteMany();
  await prisma.analysisHumanReview.deleteMany();
  await prisma.analysisUncertainty.deleteMany();
  await prisma.analysisOption.deleteMany();
  await prisma.analysisFinding.deleteMany();
  await prisma.analysisSource.deleteMany();
  await prisma.analysisRun.deleteMany();
  await prisma.analysisRequest.deleteMany();
  await prisma.riskReview.deleteMany();
  await prisma.riskMitigation.deleteMany();
  await prisma.riskFactor.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.riskDefinition.deleteMany();
  await prisma.simulationToLiveTransitionRecord.deleteMany();
  await prisma.consequentialUseReview.deleteMany();
  await prisma.simulationReview.deleteMany();
  await prisma.simulationUncertainty.deleteMany();
  await prisma.simulationAssumption.deleteMany();
  await prisma.simulationOutput.deleteMany();
  await prisma.simulationInput.deleteMany();
  await prisma.simulationRun.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.digitalTwinSnapshot.deleteMany();
  await prisma.digitalTwinModeRecord.deleteMany();
  await prisma.digitalTwinRelationship.deleteMany();
  await prisma.digitalTwinSource.deleteMany();
  await prisma.digitalTwinVersion.deleteMany();
  await prisma.digitalTwinDefinition.deleteMany();
  await prisma.measuredPerformanceClaimRevalidation.deleteMany();
  await prisma.measuredPerformanceClaimReview.deleteMany();
  await prisma.measuredPerformanceClaimEvidenceLink.deleteMany();
  await prisma.measuredPerformanceClaim.deleteMany();
  await prisma.metricDataQualityAssessment.deleteMany();
  await prisma.metricObservation.deleteMany();
  await prisma.metricCalculationRun.deleteMany();
  await prisma.metricDependencyClassification.deleteMany();
  await prisma.metricBaseline.deleteMany();
  await prisma.metricDefinitionVersion.deleteMany();
  await prisma.metricDefinition.deleteMany();
  await prisma.performanceFramework.deleteMany();
  await prisma.dashboardDrilldownReference.deleteMany();
  await prisma.dashboardIndicatorProjection.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.dashboardQueryAudit.deleteMany();
  await prisma.dashboardAccessPolicy.deleteMany();
  await prisma.dashboardWidgetDefinition.deleteMany();
  await prisma.dashboardIndicatorDefinition.deleteMany();
  await prisma.dashboardVersion.deleteMany();
  await prisma.dashboardDefinition.deleteMany();
  await prisma.dashboardStatusDictionaryEntry.deleteMany();
  await prisma.projectStatusProjection.deleteMany();
  await prisma.sectorDevelopmentObservation.deleteMany();
  await prisma.infrastructureDeliveryRecord.deleteMany();
  await prisma.employmentEvidenceRecord.deleteMany();
  await prisma.capitalEvidenceRecord.deleteMany();
  await prisma.strategicProjectEconomicClaim.deleteMany();
  await prisma.strategicProjectRisk.deleteMany();
  await prisma.strategicProjectDependency.deleteMany();
  await prisma.strategicProjectMilestone.deleteMany();
  await prisma.strategicProjectStage.deleteMany();
  await prisma.strategicProjectProfile.deleteMany();
  await prisma.performanceClaim.deleteMany();
}

export async function resetGovernmentData(prisma: PrismaService): Promise<void> {
  await resetOperationalSupportData(prisma);
  await resetIntelligenceData(prisma);
  await resetApplicationProcessingData(prisma);
  await resetServiceCatalogData(prisma);
  await resetAuthorityData(prisma);
  await prisma.delegationStructuredScope.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.institutionExternalAuthority.deleteMany();
  await prisma.office.deleteMany();
  await prisma.identityOfficeholderLink.deleteMany();
  await prisma.officeholder.deleteMany();
  await prisma.department.deleteMany();
  await prisma.governmentBody.deleteMany();
  await prisma.externalAuthority.deleteMany();
  await resetOperationalSupportData(prisma);
  await prisma.institution.deleteMany();
  await prisma.jurisdiction.deleteMany();
}

export async function resetSchedulingData(prisma: PrismaService): Promise<void> {
  await prisma.immigrationInterview.deleteMany();
  await prisma.biometricRequirement.deleteMany();
  await prisma.serviceAppointmentReminder.deleteMany();
  await prisma.serviceAppointmentAuditEvent.deleteMany();
  await prisma.appointmentOutcomeReference.deleteMany();
  await prisma.appointmentAttendance.deleteMany();
  await prisma.appointmentCancellation.deleteMany();
  await prisma.appointmentReschedule.deleteMany();
  await prisma.appointmentParticipant.deleteMany();
  await prisma.serviceAppointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.appointmentResource.deleteMany();
  await prisma.appointmentLocation.deleteMany();
  await prisma.appointmentReason.deleteMany();
}

export async function resetComplianceOversightData(prisma: PrismaService): Promise<void> {
  await prisma.complianceReviewItem.deleteMany();
  await prisma.complianceReview.deleteMany();
  await prisma.complianceSubmission.updateMany({ data: { currentVersionId: null } });
  await prisma.complianceSubmissionVersion.deleteMany();
  await prisma.complianceSubmission.deleteMany();
  await prisma.obligationStatusHistory.deleteMany();
  await prisma.obligationEvidenceLink.deleteMany();
  await prisma.obligationSchedule.deleteMany();
  await prisma.continuingObligation.updateMany({ data: { supersededByObligationId: null } });
  await prisma.continuingObligation.deleteMany();
  await prisma.complianceMatter.deleteMany();
  await prisma.complianceAlert.deleteMany();
  await prisma.complianceRevalidationRecord.deleteMany();
  await prisma.complianceMonitoringEvent.deleteMany();
  await prisma.complianceIndicator.deleteMany();
  await prisma.complianceStatusProjection.deleteMany();
  await prisma.monitoringRule.deleteMany();
}

export async function resetAllTestData(prisma: PrismaService): Promise<void> {
  await resetHealthcareFoundationData(prisma);
  await resetImmigrationData(prisma);
  await resetEducationData(prisma);
  await resetCustomsTradeData(prisma);
  await resetPropertyRegistryData(prisma);
  await resetPlanningConstructionData(prisma);
  await resetPublicSafetyData(prisma);
  await resetRevenueData(prisma);
  await resetTransportationData(prisma);
  await resetSchedulingData(prisma);
  await resetProductionReadinessData(prisma);
  await resetComplianceOversightData(prisma);
  await resetIntelligenceData(prisma);
  await resetOperationalSupportData(prisma);
  await resetGovernmentData(prisma);
  await resetLabourData(prisma);
  await resetSocialProtectionData(prisma);
  await resetIdentityData(prisma);
}
