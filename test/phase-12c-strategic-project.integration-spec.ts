import { type INestApplication } from '@nestjs/common';
import {
  CapitalEvidenceClassification,
  EmploymentEvidenceClassification,
  InfrastructureDeliveryStage,
  PerformanceClaimCategory,
  PerformanceClaimReviewStatus,
  ProjectStatusProjectionAudience,
  StrategicProjectDependencyOwnerType,
  StrategicProjectDependencyType,
  StrategicProjectLifecycleStage,
  StrategicProjectMilestoneStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { PerformanceClaimService } from '../src/intelligence/performance-claims/performance-claim.service';
import { CapitalEvidenceService } from '../src/intelligence/strategic-projects/capital-evidence.service';
import { EmploymentEvidenceService } from '../src/intelligence/strategic-projects/employment-evidence.service';
import { InfrastructureDeliveryService } from '../src/intelligence/strategic-projects/infrastructure-delivery.service';
import { ProjectStatusProjectionService } from '../src/intelligence/strategic-projects/project-status-projection.service';
import { StrategicProjectDependencyService } from '../src/intelligence/strategic-projects/strategic-project-dependency.service';
import { StrategicProjectEconomicClaimService } from '../src/intelligence/strategic-projects/strategic-project-economic-claim.service';
import { StrategicProjectMilestoneService } from '../src/intelligence/strategic-projects/strategic-project-milestone.service';
import { StrategicProjectProfileService } from '../src/intelligence/strategic-projects/strategic-project-profile.service';
import { StrategicProjectRiskService } from '../src/intelligence/strategic-projects/strategic-project-risk.service';
import { StrategicProjectStageService } from '../src/intelligence/strategic-projects/strategic-project-stage.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type Phase8FixtureContext, seedPhase8Fixture } from './helpers/phase-8-test-fixtures';

describe('Phase 12C strategic project intelligence (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let profileService: StrategicProjectProfileService;
  let stageService: StrategicProjectStageService;
  let milestoneService: StrategicProjectMilestoneService;
  let dependencyService: StrategicProjectDependencyService;
  let riskService: StrategicProjectRiskService;
  let capitalService: CapitalEvidenceService;
  let employmentService: EmploymentEvidenceService;
  let infrastructureService: InfrastructureDeliveryService;
  let economicClaimService: StrategicProjectEconomicClaimService;
  let performanceClaimService: PerformanceClaimService;
  let projectionService: ProjectStatusProjectionService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    profileService = app.get(StrategicProjectProfileService);
    stageService = app.get(StrategicProjectStageService);
    milestoneService = app.get(StrategicProjectMilestoneService);
    dependencyService = app.get(StrategicProjectDependencyService);
    riskService = app.get(StrategicProjectRiskService);
    capitalService = app.get(CapitalEvidenceService);
    employmentService = app.get(EmploymentEvidenceService);
    infrastructureService = app.get(InfrastructureDeliveryService);
    economicClaimService = app.get(StrategicProjectEconomicClaimService);
    performanceClaimService = app.get(PerformanceClaimService);
    projectionService = app.get(ProjectStatusProjectionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates inquiry profile distinct from qualified application', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    expect(fixture.profile.currentStage).toBe(StrategicProjectLifecycleStage.INQUIRY);

    await expect(
      stageService.recordStage({
        profileId: fixture.profile.id,
        stage: StrategicProjectLifecycleStage.INQUIRY,
        institutionalStateReference: 'qualified-application-state',
        effectiveFrom: new Date(),
        recordedByIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow('Inquiry stage cannot be mapped');
  });

  it('records qualification stage only with configured institutional state', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    const stage = await stageService.recordStage({
      profileId: fixture.profile.id,
      stage: StrategicProjectLifecycleStage.QUALIFICATION,
      institutionalStateReference: 'svc-strategic-investment/qualification-v1',
      effectiveFrom: new Date(),
      recordedByIdentityId: fixture.officialIdentityId,
    });

    expect(stage.stage).toBe(StrategicProjectLifecycleStage.QUALIFICATION);
    expect(stage.institutionalStateReference).toContain('qualification');
  });

  it('preserves planned vs completed milestone distinction', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);
    const milestone = await milestoneService.createMilestone({
      profileId: fixture.profile.id,
      title: 'Site readiness',
    });

    expect(milestone.status).toBe(StrategicProjectMilestoneStatus.PLANNED);

    await expect(
      milestoneService.updateMilestoneStatus({
        milestoneId: milestone.id,
        status: StrategicProjectMilestoneStatus.COMPLETED,
      }),
    ).rejects.toThrow('Planned milestone cannot jump directly to completed');
  });

  it('requires review before verifying reported milestone', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);
    const milestone = await milestoneService.createMilestone({
      profileId: fixture.profile.id,
      title: 'Permit issuance',
    });

    await milestoneService.updateMilestoneStatus({
      milestoneId: milestone.id,
      status: StrategicProjectMilestoneStatus.REPORTED,
      reportedByIdentityId: fixture.applicantIdentityId,
    });

    await expect(
      milestoneService.updateMilestoneStatus({
        milestoneId: milestone.id,
        status: StrategicProjectMilestoneStatus.VERIFIED,
      }),
    ).rejects.toThrow('Reported milestone requires review');
  });

  it('rejects capital escalation without evidence and proposed-to-committed conflation', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    await expect(
      capitalService.recordCapitalEvidence({
        profileId: fixture.profile.id,
        classification: CapitalEvidenceClassification.INDICATED,
        amount: 1000000,
        evidenceRecordRefs: [],
        recordedByIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow('without supporting evidence');

    await capitalService.recordCapitalEvidence({
      profileId: fixture.profile.id,
      classification: CapitalEvidenceClassification.PROPOSED,
      amount: 1000000,
      evidenceRecordRefs: [{ type: 'EvidenceRecord', id: 'evidence-1' }],
      recordedByIdentityId: fixture.officialIdentityId,
    });

    await expect(
      capitalService.recordCapitalEvidence({
        profileId: fixture.profile.id,
        classification: CapitalEvidenceClassification.COMMITTED,
        amount: 1000000,
        evidenceRecordRefs: [{ type: 'EvidenceRecord', id: 'evidence-2' }],
        recordedByIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow('Capital classification cannot skip evidence-backed escalation levels');
  });

  it('does not count employment forecast as verified employment', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    await employmentService.recordEmploymentEvidence({
      profileId: fixture.profile.id,
      classification: EmploymentEvidenceClassification.FORECAST,
      headcount: 500,
      recordedByIdentityId: fixture.applicantIdentityId,
    });

    const forecastCount = await employmentService.getForecastHeadcount(fixture.profile.id);
    const verifiedCount = await employmentService.getVerifiedEmploymentHeadcount(
      fixture.profile.id,
    );

    expect(forecastCount).toBe(500);
    expect(verifiedCount).toBe(0);
  });

  it('rejects dashboard status as infrastructure completion proof', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    await expect(
      infrastructureService.recordInfrastructureDelivery({
        profileId: fixture.profile.id,
        stage: InfrastructureDeliveryStage.OPERATIONAL,
        digitalTwinStatus: 'complete',
        dashboardStatus: 'green',
        physicalCompletionVerified: false,
        recordedByIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow(
      'Digital twin or dashboard status cannot prove physical infrastructure completion',
    );
  });

  it('preserves government dependency owner explicitly', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    await expect(
      dependencyService.createDependency({
        profileId: fixture.profile.id,
        dependencyType: StrategicProjectDependencyType.GOVERNMENT,
        ownerType: StrategicProjectDependencyOwnerType.APPLICANT,
        ownerReference: 'dept-planning',
      }),
    ).rejects.toThrow('Government dependency owner must be preserved');

    const dependency = await dependencyService.createDependency({
      profileId: fixture.profile.id,
      dependencyType: StrategicProjectDependencyType.GOVERNMENT,
      ownerType: StrategicProjectDependencyOwnerType.GOVERNMENT,
      ownerReference: 'dept-planning',
    });

    expect(dependency.isGovernmentOwned).toBe(true);
  });

  it('records risk score without affecting approval', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);
    const profileBefore = await profileService.getProfile(fixture.profile.id);

    const risk = await riskService.createRisk({
      profileId: fixture.profile.id,
      title: 'Supply chain delay',
      riskScore: 78,
    });

    const profileAfter = await profileService.getProfile(fixture.profile.id);

    expect(risk.doesNotAffectApproval).toBe(true);
    expect(profileAfter.currentStage).toBe(profileBefore.currentStage);
  });

  it('requires governed PerformanceClaim for economic claims and public review', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    const draftClaim = await performanceClaimService.createClaim({
      claimReference: `${fixture.marker}-CLAIM-001`,
      category: PerformanceClaimCategory.INVESTMENT,
      assertedValue: { amount: 25000000, currency: 'USD' },
      assertedByIdentityId: fixture.applicantIdentityId,
      attributionMetadata: { externalFactors: ['commodity-prices'] },
      isApplicantAssertion: true,
    });

    await expect(
      economicClaimService.linkEconomicClaim({
        profileId: fixture.profile.id,
        performanceClaimId: draftClaim.id,
      }),
    ).rejects.toThrow('unreviewed claims cannot be linked');

    await expect(
      performanceClaimService.reviewClaim({
        claimId: draftClaim.id,
        reviewStatus: PerformanceClaimReviewStatus.VERIFIED,
        humanReviewedByIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow('Applicant assertion is not independent verification');

    const reviewedClaim = await performanceClaimService.reviewClaim({
      claimId: draftClaim.id,
      reviewStatus: PerformanceClaimReviewStatus.VERIFIED,
      humanReviewedByIdentityId: fixture.officialIdentityId,
      independentVerificationRefs: [{ type: 'AuditReport', id: 'audit-1' }],
    });

    const link = await economicClaimService.linkEconomicClaim({
      profileId: fixture.profile.id,
      performanceClaimId: reviewedClaim.id,
      claimSummary: 'Verified investment commitment',
    });

    expect(link.performanceClaim.reviewStatus).toBe(PerformanceClaimReviewStatus.VERIFIED);
  });

  it('derives project status projection with disclaimer and preserves adverse status', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);
    await profileService.preserveAdverseStatus(fixture.profile.id);

    const projection = await projectionService.deriveProjection({
      profileId: fixture.profile.id,
      audience: ProjectStatusProjectionAudience.OFFICIAL,
      derivedByIdentityId: fixture.officialIdentityId,
    });

    expect(projection.projectionDisclaimer).toContain('not an approval decision');
    expect(projection.adverseStatusPreserved).toBe(true);
    expect(projection.derivedStage).toBe(StrategicProjectLifecycleStage.INQUIRY);
  });

  it('rejects unauthenticated client attempts to create project profile via API', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);

    await request(app.getHttpServer())
      .post('/api/v1/intelligence/strategic-projects')
      .send({
        projectCode: `${fixture.marker}-API-001`,
        title: 'API test project',
        sponsoringInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        currentStage: StrategicProjectLifecycleStage.OPERATIONAL,
        attributionMetadata: { externalFactors: ['market-demand'] },
      })
      .expect(401);
  });

  it('blocks AI from promoting project stage', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);

    await expect(
      stageService.recordStage({
        profileId: fixture.profile.id,
        stage: StrategicProjectLifecycleStage.APPLICATION,
        institutionalStateReference: 'svc-strategic-investment/application-v1',
        effectiveFrom: new Date(),
        recordedByIdentityId: fixture.officialIdentityId,
        isAiActor: true,
      }),
    ).rejects.toThrow('AI assistance cannot perform strategic project action');
  });

  it('preserves adverse status and blocks approval advancement', async () => {
    const fixture = await seedStrategicProjectContext(app, prisma);
    await profileService.preserveAdverseStatus(fixture.profile.id);

    await expect(
      stageService.recordStage({
        profileId: fixture.profile.id,
        stage: StrategicProjectLifecycleStage.APPROVED,
        institutionalStateReference: 'svc-strategic-investment/approved-v1',
        effectiveFrom: new Date(),
        recordedByIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow('Adverse project status must be preserved');
  });
});

interface StrategicProjectFixtureContext extends Phase8FixtureContext {
  profile: {
    id: string;
    currentStage: StrategicProjectLifecycleStage;
  };
}

async function seedStrategicProjectContext(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<StrategicProjectFixtureContext> {
  const fixture = await seedPhase8Fixture(app, prisma);
  const profileService = app.get(StrategicProjectProfileService);

  const profile = await profileService.createProfile({
    projectCode: `${fixture.marker}-SP-CTX`,
    title: 'Strategic project context',
    sponsoringInstitutionId: fixture.institutionId,
    responsibleDepartmentId: fixture.departmentId,
    caseId: fixture.caseId,
    attributionMetadata: { externalFactors: ['regional-demand'], platformCausation: false },
  });

  return {
    ...fixture,
    profile: {
      id: profile.id,
      currentStage: profile.currentStage,
    },
  };
}
