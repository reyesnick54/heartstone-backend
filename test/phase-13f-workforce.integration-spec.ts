import { type INestApplication } from '@nestjs/common';
import {
  CompetencyAssessmentOutcome,
  OperatorAccessReviewTrigger,
  OperatorQualificationStatus,
  SupportTier,
  TrainingCompletionStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { OperatorAccessAlignmentService } from '../src/production-readiness/access/operator-access-alignment.service';
import { OperatorFunctionAccessService } from '../src/production-readiness/access/operator-function-access.service';
import { DepartmentReadinessService } from '../src/production-readiness/readiness/department-readiness.service';
import { SupportCoverageService } from '../src/production-readiness/support/support-coverage.service';
import { OperationalRoleRequirementService } from '../src/production-readiness/workforce/operational-role-requirement.service';
import { OperatorCompetencyAssessmentService } from '../src/production-readiness/workforce/operator-competency-assessment.service';
import { OperatorQualificationService } from '../src/production-readiness/workforce/operator-qualification.service';
import { OperatorReadinessProfileService } from '../src/production-readiness/workforce/operator-readiness-profile.service';
import { TrainingService } from '../src/production-readiness/workforce/training.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type Phase8FixtureContext, seedPhase8Fixture } from './helpers/phase-8-test-fixtures';

describe('Phase 13F workforce and operational readiness (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleRequirementService: OperationalRoleRequirementService;
  let profileService: OperatorReadinessProfileService;
  let qualificationService: OperatorQualificationService;
  let competencyService: OperatorCompetencyAssessmentService;
  let trainingService: TrainingService;
  let supportService: SupportCoverageService;
  let departmentReadinessService: DepartmentReadinessService;
  let accessAlignmentService: OperatorAccessAlignmentService;
  let functionAccessService: OperatorFunctionAccessService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    roleRequirementService = app.get(OperationalRoleRequirementService);
    profileService = app.get(OperatorReadinessProfileService);
    qualificationService = app.get(OperatorQualificationService);
    competencyService = app.get(OperatorCompetencyAssessmentService);
    trainingService = app.get(TrainingService);
    supportService = app.get(SupportCoverageService);
    departmentReadinessService = app.get(DepartmentReadinessService);
    accessAlignmentService = app.get(OperatorAccessAlignmentService);
    functionAccessService = app.get(OperatorFunctionAccessService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function seedContext(): Promise<Phase8FixtureContext & { assessorIdentityId: string }> {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessor = await prisma.identity.findFirst({
      where: { displayName: { contains: 'official' } },
    });
    return {
      ...fixture,
      assessorIdentityId: assessor?.id ?? fixture.officialIdentityId,
    };
  }

  it('creates operational role requirement with competency gates', async () => {
    const fixture = await seedContext();

    const training = await trainingService.createRequirement({
      code: 'SEC-101',
      name: 'Security Fundamentals',
      validityPeriodDays: 365,
    });

    const requirement = await roleRequirementService.create({
      code: 'OPS-SECURITY-OFFICER',
      name: 'Security Operations Officer',
      institutionId: fixture.institutionId,
      departmentId: fixture.departmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      appointmentRequired: true,
      isHighConsequence: true,
      trainingRequirementId: training.id,
    });

    const activated = await roleRequirementService.activate(requirement.id);
    expect(activated.status).toBe('ACTIVE');
  });

  it('blocks qualification from attendance-only training', async () => {
    const fixture = await seedContext();
    const training = await trainingService.createRequirement({
      code: 'ATT-ONLY',
      name: 'Attendance Only Course',
    });

    const requirement = await roleRequirementService.create({
      code: 'OPS-ROLE-ATT',
      name: 'Attendance Test Role',
      institutionId: fixture.institutionId,
      departmentId: fixture.departmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      trainingRequirementId: training.id,
    });
    await roleRequirementService.activate(requirement.id);

    const profile = await profileService.create({
      identityId: fixture.officialIdentityId,
      officeholderId: fixture.officialOfficeholderId,
      departmentId: fixture.departmentId,
    });

    const qualification = await qualificationService.create({
      qualificationNumber: 'QUAL-ATT-001',
      operatorReadinessProfileId: profile.id,
      operationalRoleRequirementId: requirement.id,
      identityId: fixture.officialIdentityId,
      officeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      scope: 'OPS-ROLE-ATT',
    });

    await expect(
      trainingService.recordCompletion({
        operatorQualificationId: qualification.id,
        trainingRequirementId: training.id,
        recordedByIdentityId: fixture.assessorIdentityId,
        status: TrainingCompletionStatus.COMPLETED,
        isAttendanceOnly: true,
      }),
    ).rejects.toThrow('Attendance');
  });

  it('records competency assessment and determines qualification with gates', async () => {
    const fixture = await seedContext();
    const requirement = await roleRequirementService.create({
      code: 'OPS-QUALIFIED',
      name: 'Qualified Operator Role',
      institutionId: fixture.institutionId,
      departmentId: fixture.departmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requiresAuthorityBoundaryAssessment: false,
      requiresSecurityPrivacyAssessment: false,
      requiresContinuityAssessment: false,
    });
    await roleRequirementService.activate(requirement.id);

    const profile = await profileService.create({
      identityId: fixture.officialIdentityId,
      officeholderId: fixture.officialOfficeholderId,
      departmentId: fixture.departmentId,
    });

    const qualification = await qualificationService.create({
      qualificationNumber: 'QUAL-001',
      operatorReadinessProfileId: profile.id,
      operationalRoleRequirementId: requirement.id,
      identityId: fixture.officialIdentityId,
      officeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      scope: 'OPS-QUALIFIED',
    });

    await competencyService.recordAssessment({
      operatorReadinessProfileId: profile.id,
      operatorQualificationId: qualification.id,
      assessorIdentityId: fixture.assessorIdentityId,
      assessorOfficeholderId: fixture.approverOfficeholderId,
      assessmentType: 'KNOWLEDGE',
      outcome: CompetencyAssessmentOutcome.PASSED,
    });

    await competencyService.recordPracticalAssessment({
      operatorReadinessProfileId: profile.id,
      operatorQualificationId: qualification.id,
      assessorIdentityId: fixture.assessorIdentityId,
      assessorOfficeholderId: fixture.approverOfficeholderId,
      outcome: CompetencyAssessmentOutcome.PASSED,
    });

    const qualified = await qualificationService.determineQualificationStatus({
      operatorQualificationId: qualification.id,
      proposedStatus: OperatorQualificationStatus.QUALIFIED,
    });

    expect(qualified.status).toBe(OperatorQualificationStatus.QUALIFIED);
  });

  it('triggers access review when delegation is revoked', async () => {
    const fixture = await seedContext();
    const requirement = await roleRequirementService.create({
      code: 'OPS-DELEG',
      name: 'Delegated Role',
      institutionId: fixture.institutionId,
      departmentId: fixture.departmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      delegationRequired: true,
      requiresKnowledgeAssessment: false,
      requiresPracticalAssessment: false,
    });
    await roleRequirementService.activate(requirement.id);

    const profile = await profileService.create({
      identityId: fixture.officialIdentityId,
      departmentId: fixture.departmentId,
    });

    const qualification = await qualificationService.create({
      qualificationNumber: 'QUAL-DELEG-001',
      operatorReadinessProfileId: profile.id,
      operationalRoleRequirementId: requirement.id,
      identityId: fixture.officialIdentityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      scope: 'OPS-DELEG',
    });

    const review = await accessAlignmentService.onDelegationRevoked(
      qualification.id,
      'delegation-test-id',
      fixture.assessorIdentityId,
    );

    expect(review.trigger).toBe(OperatorAccessReviewTrigger.DELEGATION_REVOKED);
    expect(review.accessRetained).toBe(false);
  });

  it('detects support coverage gap and restricts contact exposure', async () => {
    const fixture = await seedContext();

    const plan = await supportService.createPlan({
      planCode: 'SUP-001',
      name: 'Business Hours Support',
      institutionId: fixture.institutionId,
      departmentId: fixture.departmentId,
      serviceHours: 'Mon-Fri 08:00-17:00',
    });
    await supportService.activatePlan(plan.id);

    const gap = await supportService.detectCoverageGap(plan.id);
    expect(gap).toBe(true);

    const contacts = await supportService.getPlanContacts(plan.id);
    expect(contacts.contactsRestricted).toBe(true);
    expect(contacts).not.toHaveProperty('incidentContacts');
  });

  it('distinguishes named owner from operational coverage', async () => {
    const fixture = await seedContext();
    const plan = await supportService.createPlan({
      planCode: 'SUP-OWNER',
      name: 'Owner Only Plan',
      institutionId: fixture.institutionId,
    });
    await supportService.activatePlan(plan.id);

    await expect(
      supportService.assignSupport({
        supportCoveragePlanId: plan.id,
        identityId: fixture.officialIdentityId,
        supportTier: SupportTier.TIER_1,
        effectiveFrom: new Date(),
        isNamedOwner: true,
        isOperationalCoverage: false,
      }),
    ).rejects.toThrow('Named owner');
  });

  it('assesses department readiness without institutional acceptance', async () => {
    const fixture = await seedContext();

    const assessment = await departmentReadinessService.assessDepartment({
      assessmentNumber: 'DRA-13F-001',
      departmentId: fixture.departmentId,
      assessorIdentityId: fixture.assessorIdentityId,
      mandateAssessed: true,
      headAssessed: true,
      officeholdersAssessed: true,
      staffingAssessed: true,
      qualificationsAssessed: true,
      proceduresAssessed: true,
      recordsAssessed: true,
      technologyAssessed: true,
      securityAssessed: true,
      trainingAssessed: true,
      dependenciesAssessed: true,
      supportAssessed: true,
      continuityAssessed: true,
      testsAssessed: true,
      acceptanceAssessed: true,
      activationAuthorityAssessed: true,
    });

    expect(assessment.isInstitutionalAcceptance).toBe(false);
    expect(assessment.selfActivated).toBe(false);
    departmentReadinessService.assertNotInstitutionalAcceptance(assessment);
  });

  it('blocks high-consequence function access when qualification scope mismatches', async () => {
    const fixture = await seedContext();
    const requirement = await roleRequirementService.create({
      code: 'OPS-HC',
      name: 'High Consequence Role',
      institutionId: fixture.institutionId,
      departmentId: fixture.departmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      isHighConsequence: true,
      requiresKnowledgeAssessment: false,
      requiresPracticalAssessment: false,
    });
    await roleRequirementService.activate(requirement.id);

    const profile = await profileService.create({
      identityId: fixture.officialIdentityId,
      departmentId: fixture.departmentId,
    });

    const qualification = await qualificationService.create({
      qualificationNumber: 'QUAL-HC-001',
      operatorReadinessProfileId: profile.id,
      operationalRoleRequirementId: requirement.id,
      identityId: fixture.officialIdentityId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      scope: 'OPS-HC',
    });

    await prisma.operatorQualification.update({
      where: { id: qualification.id },
      data: { status: OperatorQualificationStatus.QUALIFIED },
    });

    await expect(
      functionAccessService.assertHighConsequenceAccess({
        operatorQualificationId: qualification.id,
        requiredScope: 'DIFFERENT-SCOPE',
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      }),
    ).rejects.toThrow('scope');
  });
});
