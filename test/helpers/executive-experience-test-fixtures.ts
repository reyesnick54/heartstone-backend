import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import {
  CapitalEvidenceClassification,
  DashboardDataQuality,
  DashboardDrilldownReferenceType,
  DashboardIndicatorCategory,
  DashboardStalenessState,
  EmploymentEvidenceClassification,
  IntelligenceAlertStatus,
  StrategicProjectLifecycleStage,
  StrategicProjectMilestoneStatus,
  StrategicProjectRiskLevel,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
} from './identity-provisioning.fixture';
import { type Phase12BFixtureContext, seedPhase12BFixture } from './phase-12b-test-fixtures';

export interface ExecutiveExperienceFixtureContext extends Phase12BFixtureContext {
  citizenSessionToken: string;
  citizenIdentityId: string;
  strategicProjectProfileId: string;
  reportedMilestoneId: string;
  verifiedMilestoneId: string;
  intelligenceAlertId: string;
}

export async function seedExecutiveExperienceFixture(
  prisma: PrismaService,
  app?: INestApplication<App>,
): Promise<ExecutiveExperienceFixtureContext> {
  const base = await seedPhase12BFixture(prisma, app);

  const citizenPerson = await prisma.person.create({
    data: { givenName: 'Citizen', familyName: 'ExecutiveTest' },
  });
  const citizenAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: 'citizen-exec-test@phase12b.test',
      personId: citizenPerson.id,
      status: 'ACTIVE',
    },
  });
  const citizenIdentity = await prisma.identity.create({
    data: {
      type: 'INDIVIDUAL',
      displayName: 'Citizen Executive Test',
      userAccountId: citizenAccount.id,
      personId: citizenPerson.id,
    },
  });

  let citizenSessionToken = '';
  if (app) {
    const password = 'Phase12B123!';
    await createPasswordCredentialViaPrisma(prisma, citizenIdentity.id, password);
    await createPasswordAuthenticationMethodViaPrisma(prisma, citizenIdentity.id);
    citizenSessionToken = await loginAndGetSessionToken(
      app,
      'citizen-exec-test@phase12b.test',
      password,
    );
  }

  await prisma.dashboardIndicatorProjection.create({
    data: {
      indicatorDefinitionId: base.indicatorDefinitionId,
      dashboardVersionId: base.executiveVersionId,
      statusDictionaryEntryId: base.statusEntryId,
      institutionId: base.institutionId,
      countValue: 5,
      displayLabel: 'Pending Decisions',
      dataQuality: DashboardDataQuality.VERIFIED,
      calculatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      sourceFreshness: new Date(Date.now() - 3 * 60 * 60 * 1000),
      staleAfter: new Date(Date.now() - 60 * 60 * 1000),
      currentStaleness: DashboardStalenessState.STALE,
      drilldownReferences: {
        create: {
          referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
          referenceId: base.authoritativeRecordId,
          referenceLabel: 'Stale Pending Decisions',
          sourceStatus: 'ACTIVE',
          ownerReference: 'dept-a',
        },
      },
    },
  });

  const strategicIndicator = await prisma.dashboardIndicatorDefinition.create({
    data: {
      code: 'EXEC_STRATEGIC_PROJECTS',
      label: 'Strategic Projects',
      category: DashboardIndicatorCategory.STRATEGIC_PROJECTS,
      statusDictionaryEntryId: base.statusEntryId,
      calculationRuleRef: 'strategic.projects.count',
      requiresEvidencePacket: false,
    },
  });

  await prisma.dashboardIndicatorProjection.create({
    data: {
      indicatorDefinitionId: strategicIndicator.id,
      dashboardVersionId: base.executiveVersionId,
      statusDictionaryEntryId: base.statusEntryId,
      institutionId: base.institutionId,
      countValue: 1,
      displayLabel: 'Strategic Projects',
      dataQuality: DashboardDataQuality.VERIFIED,
    },
  });

  const profile = await prisma.strategicProjectProfile.create({
    data: {
      projectCode: 'EXEC-PROJ-001',
      title: 'Executive Test Strategic Project',
      sponsoringInstitutionId: base.institutionId,
      responsibleDepartmentId: base.departmentAId,
      currentStage: StrategicProjectLifecycleStage.IMPLEMENTATION,
      attributionMetadata: { source: 'executive-test' },
    },
  });

  const reportedMilestone = await prisma.strategicProjectMilestone.create({
    data: {
      profileId: profile.id,
      title: 'Reported Milestone',
      status: StrategicProjectMilestoneStatus.REPORTED,
      reportedDate: new Date(),
    },
  });

  const verifiedMilestone = await prisma.strategicProjectMilestone.create({
    data: {
      profileId: profile.id,
      title: 'Verified Milestone',
      status: StrategicProjectMilestoneStatus.VERIFIED,
      verifiedDate: new Date(),
    },
  });

  await prisma.capitalEvidenceRecord.create({
    data: {
      profileId: profile.id,
      classification: CapitalEvidenceClassification.INDICATED,
      amount: 1000000,
      currency: 'USD',
      recordedByIdentityId: base.executiveIdentityId,
    },
  });

  await prisma.employmentEvidenceRecord.create({
    data: {
      profileId: profile.id,
      classification: EmploymentEvidenceClassification.ACTIVE_VERIFIED,
      headcount: 25,
      recordedByIdentityId: base.executiveIdentityId,
    },
  });

  await prisma.strategicProjectRisk.create({
    data: {
      profileId: profile.id,
      title: 'Schedule risk',
      riskLevel: StrategicProjectRiskLevel.HIGH,
      doesNotAffectApproval: true,
    },
  });

  const monitoringRule = await prisma.intelligenceMonitoringRule.create({
    data: {
      code: 'EXEC-ALERT-RULE',
      name: 'Executive Test Alert Rule',
      objectType: 'INSTITUTIONAL_PROCESS',
      objectReference: base.institutionId,
      approvedSourceReference: 'test-source',
      approvedSourceLabel: 'Test Source',
      conditionDescription: 'Test condition',
      detectionRule: { threshold: 1 },
      thresholdConfig: { limit: 1 },
      ownerIdentityId: base.executiveIdentityId,
      purpose: 'Executive oversight test',
      reviewerIdentityId: base.executiveIdentityId,
      frequency: 'DAILY',
      effectiveFrom: new Date('2020-01-01'),
      institutionId: base.institutionId,
    },
  });

  const alert = await prisma.intelligenceMonitoringAlert.create({
    data: {
      alertNumber: `ALERT-${randomUUID().slice(0, 8)}`,
      ruleId: monitoringRule.id,
      monitoredObjectType: 'INSTITUTIONAL_PROCESS',
      monitoredObjectReference: base.institutionId,
      sourceReference: 'test-source-ref',
      observedCondition: 'Potential anomaly detected by monitoring rule',
      observedAt: new Date(),
      recommendedReview: 'Review underlying records',
      responsibleRecipientIdentityId: base.executiveIdentityId,
      status: IntelligenceAlertStatus.GENERATED,
      isViolation: false,
    },
  });

  return {
    ...base,
    citizenSessionToken,
    citizenIdentityId: citizenIdentity.id,
    strategicProjectProfileId: profile.id,
    reportedMilestoneId: reportedMilestone.id,
    verifiedMilestoneId: verifiedMilestone.id,
    intelligenceAlertId: alert.id,
  };
}
