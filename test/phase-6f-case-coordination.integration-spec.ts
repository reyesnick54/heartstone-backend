import { type INestApplication } from '@nestjs/common';
import {
  AuthorityDependencyType,
  CaseAssignmentType,
  CaseEscalationRoute,
  CaseIssueType,
  CaseReferralResponseAuthStatus,
  CaseReferralType,
  CaseSlaClockType,
  InstitutionalActType,
} from '@prisma/client';

import { CASE_COORDINATION_EXPLANATION_CODES } from '../src/applications-workflow/applications-workflow.constants';
import { NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER } from '../src/applications-workflow/applications-workflow.constants';
import { CaseAssignmentsService } from '../src/applications-workflow/case-assignments/case-assignments.service';
import { CaseEscalationsService } from '../src/applications-workflow/case-escalations/case-escalations.service';
import { CaseIssuesService } from '../src/applications-workflow/case-issues/case-issues.service';
import { CaseReferralResponsesService } from '../src/applications-workflow/case-referrals/case-referral-responses.service';
import { CaseReferralsService } from '../src/applications-workflow/case-referrals/case-referrals.service';
import { CaseSlaClocksService } from '../src/applications-workflow/case-sla/case-sla-clocks.service';
import { PrismaService } from '../src/database/prisma.service';
import { seedPhase6fFixture } from './helpers/applications-workflow-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 6F case coordination (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('proves assignment does not create authority', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const assignments = app.get(CaseAssignmentsService);

    await assignments.createAssignment({
      caseId: fixture.caseId,
      assignmentType: CaseAssignmentType.CASE_MANAGER,
      assignedOfficeholderId: fixture.officeholderId,
      assignedOfficeId: fixture.officeId,
      assignedDepartmentId: fixture.departmentId,
      assignedByIdentityId: fixture.actorIdentityId,
      effectiveFrom: new Date(),
      purpose: 'Coordinate case progress',
    });

    const authorityCheck = assignments.assignmentDoesNotCreateAuthority();
    expect(authorityCheck.createsAuthority).toBe(false);
    expect(authorityCheck.canApproveByAssignment).toBe(false);
  });

  it('proves case manager cannot approve by assignment alone', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const assignments = app.get(CaseAssignmentsService);

    await assignments.createAssignment({
      caseId: fixture.caseId,
      assignmentType: CaseAssignmentType.CASE_MANAGER,
      assignedOfficeholderId: fixture.officeholderId,
      assignedByIdentityId: fixture.actorIdentityId,
      effectiveFrom: new Date(),
    });

    const result = await assignments.canApproveByAssignment(
      fixture.caseId,
      fixture.officeholderId,
      fixture.functionAuthorityRecordId,
      fixture.actorIdentityId,
    );

    expect(result.permitted).toBe(false);
    expect(result.reason).toContain(
      CASE_COORDINATION_EXPLANATION_CODES.CASE_MANAGER_NOT_DECISION_MAKER,
    );
  });

  it('preserves institutional attribution on referrals and referral history', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const referrals = app.get(CaseReferralsService);

    const referral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-001`,
      referralType: CaseReferralType.GOVERNMENT_AUTHORITY,
      referringInstitutionId: fixture.institutionId,
      referringDepartmentId: fixture.departmentId,
      receivingInstitutionId: fixture.receivingInstitutionId,
      workflowStepId: fixture.workflowStepId,
      authorityDependencyId: fixture.authorityDependencyId,
      purpose: 'Seek national concurrence',
      createdByIdentityId: fixture.actorIdentityId,
    });

    await referrals.sendReferral(referral.id);

    const secondReferral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-002`,
      referralType: CaseReferralType.INTERNAL_DEPARTMENT,
      referringInstitutionId: fixture.institutionId,
      receivingInstitutionId: fixture.receivingInstitutionId,
      purpose: 'Internal coordination',
      createdByIdentityId: fixture.actorIdentityId,
    });

    await referrals.sendReferral(secondReferral.id);

    const history = await referrals.getReferralHistory(fixture.caseId);
    expect(history).toHaveLength(2);
    expect(history[0]?.referringInstitutionId).toBe(fixture.institutionId);
    expect(history[1]?.referringInstitutionId).toBe(fixture.institutionId);
  });

  it('proves external response cannot masquerade as ABSEZ decision', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const referrals = app.get(CaseReferralsService);
    const responses = app.get(CaseReferralResponsesService);

    const referral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-EXT`,
      referralType: CaseReferralType.GOVERNMENT_AUTHORITY,
      referringInstitutionId: fixture.institutionId,
      receivingExternalAuthorityId: fixture.externalAuthorityId,
      authorityDependencyId: fixture.authorityDependencyId,
      purpose: 'External determination',
      createdByIdentityId: fixture.actorIdentityId,
    });

    const response = await responses.recordResponse({
      referralId: referral.id,
      responseReference: 'EXT-RESP-001',
      receivedAt: new Date(),
      sourceExternalAuthorityId: fixture.externalAuthorityId,
      authenticatedStatus: CaseReferralResponseAuthStatus.VERIFIED,
      summary: 'External authority response',
    });

    expect(responses.responseIsAbsezDecision(response)).toBe(false);
  });

  it('proves consultation does not satisfy concurrence', () => {
    const responses = app.get(CaseReferralResponsesService);

    expect(
      responses.consultationSatisfiesConcurrence(
        AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
        InstitutionalActType.CONSULTATION,
      ),
    ).toBe(false);

    expect(() => {
      responses.validateInstitutionalActForDependency(
        AuthorityDependencyType.GOVERNMENT_CONCURRENCE,
        InstitutionalActType.CONSULTATION,
      );
    }).toThrow(CASE_COORDINATION_EXPLANATION_CODES.CONSULTATION_NOT_CONCURRENCE);
  });

  it('pauses configured ABSEZ processing SLA when referral is sent', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const referrals = app.get(CaseReferralsService);
    const slaClocks = app.get(CaseSlaClocksService);

    const clock = await slaClocks.startClock({
      caseId: fixture.caseId,
      clockType: CaseSlaClockType.ABSEZ_PROCESSING_TIME,
      targetDurationDays: 10,
      serviceLevelTargetLabel: 'Initial review',
    });

    const referral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-SLA`,
      referralType: CaseReferralType.PROFESSIONAL,
      referringInstitutionId: fixture.institutionId,
      receivingExternalAuthorityId: fixture.externalAuthorityId,
      purpose: 'Professional review',
      createdByIdentityId: fixture.actorIdentityId,
    });

    const pauseResult = await referrals.pauseConfiguredSlaForReferral(
      referral.id,
      clock.id,
      fixture.actorIdentityId,
    );

    expect(pauseResult.paused).toBe(true);

    const updatedClock = await prisma.caseSlaClock.findUnique({ where: { id: clock.id } });
    expect(updatedClock?.status).toBe('PAUSED');
  });

  it('tracks applicant and external dependency delays separately', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const slaClocks = app.get(CaseSlaClocksService);

    await slaClocks.recordApplicantDelay(fixture.caseId, 3 * 24 * 60 * 60 * 1000);
    await slaClocks.recordExternalDependencyDelay(fixture.caseId, 5 * 24 * 60 * 60 * 1000);

    const clocks = await slaClocks.getClocksByCase(fixture.caseId);
    const applicantClock = clocks.find((clock) => clock.clockType === CaseSlaClockType.APPLICANT_TIME);
    const externalClock = clocks.find(
      (clock) => clock.clockType === CaseSlaClockType.EXTERNAL_DEPENDENCY_TIME,
    );

    expect(applicantClock).toBeDefined();
    expect(externalClock).toBeDefined();
    expect(applicantClock?.clockType).not.toBe(externalClock?.clockType);
  });

  it('proves SLA breach does not approve application', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const slaClocks = app.get(CaseSlaClocksService);

    const startedAt = new Date('2026-01-01T00:00:00.000Z');
    const clock = await slaClocks.startClock({
      caseId: fixture.caseId,
      clockType: CaseSlaClockType.ABSEZ_PROCESSING_TIME,
      targetDurationDays: 1,
      startedAt,
    });

    const breachResult = await slaClocks.evaluateBreach(
      clock.id,
      new Date('2026-01-05T00:00:00.000Z'),
    );

    expect(breachResult.breached).toBe(true);
    expect(breachResult.approvesApplication).toBe(false);
    expect(breachResult.explanationCode).toBe(
      CASE_COORDINATION_EXPLANATION_CODES.SLA_BREACH_NOT_APPROVAL,
    );

    const application = await prisma.application.findUnique({
      where: { id: fixture.applicationId },
    });
    expect(application?.currentStatus).not.toBe('CANCELLED');
  });

  it('preserves authority boundary on escalation', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const escalations = app.get(CaseEscalationsService);

    const escalation = await escalations.escalate({
      caseId: fixture.caseId,
      escalationRoute: CaseEscalationRoute.SENIOR_ADMINISTRATIVE,
      triggeredByIdentityId: fixture.actorIdentityId,
      triggeredByOfficeholderId: fixture.officeholderId,
      reason: 'SLA at risk',
    });

    const boundary = escalations.escalationPreservesAuthorityBoundary();
    expect(boundary.bypassesAuthority).toBe(false);
    expect(escalation.preservesAuthorityBoundary).toBe(true);
  });

  it('rejects expired external determination for Phase 4 dependency satisfaction', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const referrals = app.get(CaseReferralsService);
    const responses = app.get(CaseReferralResponsesService);

    const referral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-EXP`,
      referralType: CaseReferralType.GOVERNMENT_AUTHORITY,
      referringInstitutionId: fixture.institutionId,
      receivingExternalAuthorityId: fixture.externalAuthorityId,
      authorityDependencyId: fixture.authorityDependencyId,
      purpose: 'Expired determination test',
      createdByIdentityId: fixture.actorIdentityId,
    });

    const response = await responses.recordResponse({
      referralId: referral.id,
      responseReference: 'EXP-001',
      receivedAt: new Date('2025-01-01'),
      sourceExternalAuthorityId: fixture.externalAuthorityId,
      authenticatedStatus: CaseReferralResponseAuthStatus.VERIFIED,
      effectiveDate: new Date('2025-01-01'),
      expiryDate: new Date('2025-06-01'),
    });

    const result = await responses.processResponseForDependency(response.id);
    expect(result.satisfied).toBe(false);
    expect(result.explanationCode).toBe(
      CASE_COORDINATION_EXPLANATION_CODES.EXPIRED_DETERMINATION_UNSATISFIED,
    );
  });

  it('rejects wrong external authority response for dependency satisfaction', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const referrals = app.get(CaseReferralsService);
    const responses = app.get(CaseReferralResponsesService);

    const referral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-WRONG`,
      referralType: CaseReferralType.GOVERNMENT_AUTHORITY,
      referringInstitutionId: fixture.institutionId,
      receivingExternalAuthorityId: fixture.externalAuthorityId,
      authorityDependencyId: fixture.authorityDependencyId,
      purpose: 'Wrong authority test',
      createdByIdentityId: fixture.actorIdentityId,
    });

    const response = await responses.recordResponse({
      referralId: referral.id,
      responseReference: 'WRONG-001',
      receivedAt: new Date(),
      sourceExternalAuthorityId: fixture.wrongExternalAuthorityId,
      authenticatedStatus: CaseReferralResponseAuthStatus.VERIFIED,
      effectiveDate: new Date(),
      expiryDate: new Date('2030-01-01'),
    });

    const result = await responses.processResponseForDependency(response.id);
    expect(result.satisfied).toBe(false);
    expect(result.explanationCode).toBe(
      CASE_COORDINATION_EXPLANATION_CODES.WRONG_EXTERNAL_AUTHORITY_UNSATISFIED,
    );
  });

  it('blocks workflow when configured unresolved issue exists', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const issues = app.get(CaseIssuesService);

    await issues.openIssue({
      caseId: fixture.caseId,
      issueType: CaseIssueType.UNRESOLVED_REQUIREMENT,
      description: 'Missing certified document reference',
      blocksWorkflow: true,
    });

    const gate = await issues.canAdvanceWorkflow(fixture.caseId);
    expect(gate.canAdvance).toBe(false);
    expect(gate.explanationCode).toBe(
      CASE_COORDINATION_EXPLANATION_CODES.BLOCKING_ISSUE_PREVENTS_ADVANCE,
    );
  });

  it('registers verified dependency fact through Phase 4 when response is valid', async () => {
    const prisma = app.get(PrismaService);
    const fixture = await seedPhase6fFixture(prisma);
    const referrals = app.get(CaseReferralsService);
    const responses = app.get(CaseReferralResponsesService);

    const referral = await referrals.createReferral({
      caseId: fixture.caseId,
      referralReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-REF-OK`,
      referralType: CaseReferralType.GOVERNMENT_AUTHORITY,
      referringInstitutionId: fixture.institutionId,
      receivingExternalAuthorityId: fixture.externalAuthorityId,
      authorityDependencyId: fixture.authorityDependencyId,
      purpose: 'Valid determination test',
      createdByIdentityId: fixture.actorIdentityId,
    });

    const response = await responses.recordResponse({
      referralId: referral.id,
      responseReference: 'OK-001',
      receivedAt: new Date(),
      sourceExternalAuthorityId: fixture.externalAuthorityId,
      authenticatedStatus: CaseReferralResponseAuthStatus.VERIFIED,
      determinationReference: 'NAT-DET-001',
      effectiveDate: new Date(),
      expiryDate: new Date('2030-01-01'),
    });

    const result = await responses.processResponseForDependency(response.id);
    expect(result.satisfied).toBe(true);
    expect(result.externalDependencyDeterminationId).toBeDefined();

    const determinationCount = await prisma.externalDependencyDetermination.count({
      where: { authorityDependencyId: fixture.authorityDependencyId },
    });
    expect(determinationCount).toBe(1);
  });
});
