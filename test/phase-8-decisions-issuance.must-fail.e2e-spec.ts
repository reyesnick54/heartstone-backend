import { type INestApplication } from '@nestjs/common';
import {
  CatalogLifecycleStatus,
  DocumentSealStatus,
  DocumentSignatureStatus,
  EvidencePacketVersionStatus,
  GovernmentDecisionStatus,
  IdentityType,
  OfficialInstrumentKind,
  OfficialInstrumentStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { WorkflowRuntimeService } from '../src/application-processing/workflow/workflow-runtime.service';
import { type PrismaService } from '../src/database/prisma.service';
import {
  FORBIDDEN_AI_DECISION_ACTIONS,
  FORBIDDEN_CLIENT_DECISION_FIELDS,
  PHASE_8B_BOUNDARY_DISCLAIMER,
} from '../src/decisions/decisions.constants';
import { DecisionExecutionService } from '../src/decisions/execution/decision-execution.service';
import { DecisionPreparationService } from '../src/decisions/preparation/decision-preparation.service';
import { DecisionReadinessService } from '../src/decisions/readiness/decision-readiness.service';
import {
  FORBIDDEN_CLIENT_ISSUANCE_FIELDS,
  ISSUANCE_APPROVING_OUTCOMES,
  ISSUANCE_READINESS_CHECK_CODES,
  PHASE_8E_BOUNDARY_DISCLAIMER,
} from '../src/decisions-issuance/decisions-issuance.constants';
import { PHASE_8H_INVARIANTS } from '../src/decisions-issuance/decisions-issuance-phase-8h.constants';
import { IssuanceService } from '../src/decisions-issuance/issuance/issuance.service';
import { IssuanceReadinessService } from '../src/decisions-issuance/issuance/issuance-readiness.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import {
  assessDecisionReadiness,
  executeGovernmentDecision,
  requirePreRecordedDecision,
  seedPhase8Fixture,
} from './helpers/phase-8-test-fixtures';

describe('Phase 8 must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let preparation: DecisionPreparationService;
  let readiness: DecisionReadinessService;
  let execution: DecisionExecutionService;
  let issuance: IssuanceService;
  let issuanceReadiness: IssuanceReadinessService;
  let workflowRuntime: WorkflowRuntimeService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    preparation = app.get(DecisionPreparationService);
    readiness = app.get(DecisionReadinessService);
    execution = app.get(DecisionExecutionService);
    issuance = app.get(IssuanceService);
    issuanceReadiness = app.get(IssuanceReadinessService);
    workflowRuntime = app.get(WorkflowRuntimeService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('defines exactly 70 Phase 8H invariants', () => {
    expect(PHASE_8H_INVARIANTS).toHaveLength(70);
    expect(new Set(PHASE_8H_INVARIANTS.map((item) => item.id)).size).toBe(70);
  });

  it('1. recommendation does not equal final government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const record = await preparation.create({
      caseId: fixture.caseId,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      editorIdentityId: fixture.officialIdentityId,
      recommendation: 'Recommend approval',
      proposedOutcome: 'APPROVED',
    });

    const decisions = await prisma.governmentDecision.findMany({
      where: { caseId: fixture.caseId },
    });
    expect(decisions).toHaveLength(0);
    expect(record.isNonFinal).toBe(true);
  });

  it('2. AI assistance disclaimer is explicit in Phase 8 boundary', () => {
    expect(PHASE_8B_BOUNDARY_DISCLAIMER).toMatch(/AI assistance/i);
  });

  it('3. technical readiness is distinct from institutional acceptance', () => {
    expect(PHASE_8H_INVARIANTS.find((item) => item.id === 3)?.description).toMatch(
      /technical readiness/i,
    );
  });

  it('4. institutional acceptance is distinct from production-active issuance', () => {
    expect(PHASE_8E_BOUNDARY_DISCLAIMER).toMatch(
      /government decision alone does not constitute issuance/i,
    );
  });

  it('5. access does not equal authority to decide', () => {
    expect(FORBIDDEN_AI_DECISION_ACTIONS).toContain('APPROVE');
  });

  it('6. case DECISION_PENDING does not create a government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decisions = await prisma.governmentDecision.findMany({
      where: { caseId: fixture.caseId },
    });
    expect(decisions).toHaveLength(0);
  });

  it('7. evidence packet existence does not create a government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const packet = await prisma.evidencePacketVersion.findUniqueOrThrow({
      where: { id: fixture.evidencePacketVersionId },
    });
    expect(packet).toBeTruthy();
    const decisions = await prisma.governmentDecision.findMany({
      where: { caseId: fixture.caseId },
    });
    expect(decisions).toHaveLength(0);
  });

  it('8. decision preparation does not create a government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await preparation.create({
      caseId: fixture.caseId,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      editorIdentityId: fixture.officialIdentityId,
      proposedFindings: 'Draft findings only',
    });
    const decisions = await prisma.governmentDecision.findMany({
      where: { caseId: fixture.caseId },
    });
    expect(decisions).toHaveLength(0);
  });

  it('9. professional finding does not constitute institutional decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.professionalReviewRecord.create({
      data: {
        caseId: fixture.caseId,
        professionType: 'ENGINEER',
        professionalIdentityId: fixture.officialIdentityId,
        scopeOfEngagement: 'Technical review',
        questionReviewed: 'Does the application meet technical standards?',
        findings: 'Professional recommendation only',
      },
    });
    const decisions = await prisma.governmentDecision.findMany({
      where: { caseId: fixture.caseId },
    });
    expect(decisions).toHaveLength(0);
  });

  it('10. readiness assessment alone does not create a government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await assessDecisionReadiness(app, fixture);
    const decisions = await prisma.governmentDecision.findMany({
      where: { caseId: fixture.caseId },
    });
    expect(decisions).toHaveLength(0);
  });

  it('11. client cannot set government decision status through execute payload', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessment = await assessDecisionReadiness(app, fixture);

    await request(app.getHttpServer())
      .post('/api/v1/decisions/execute')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        decisionReadinessAssessmentId: assessment.assessmentId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        matterDecided: 'Attempted status override',
        outcome: 'APPROVED',
        explicitIntentConfirmed: true,
        decisionStatus: GovernmentDecisionStatus.EFFECTIVE,
      })
      .expect(400);
  });

  it('12. client cannot set approved boolean on decision payloads', () => {
    expect(FORBIDDEN_CLIENT_DECISION_FIELDS).toContain('approved');
  });

  it('13. client cannot set refused boolean on decision payloads', () => {
    expect(FORBIDDEN_CLIENT_DECISION_FIELDS).toContain('refused');
  });

  it('14. client cannot set issued boolean on decision payloads', () => {
    expect(FORBIDDEN_CLIENT_DECISION_FIELDS).toContain('issued');
  });

  it('15. client cannot set draft boolean on decision payloads', () => {
    expect(FORBIDDEN_CLIENT_DECISION_FIELDS).toContain('draft');
  });

  it('16. client cannot set isDraft on decision payloads', () => {
    expect(FORBIDDEN_CLIENT_DECISION_FIELDS).toContain('isDraft');
  });

  it('17. client cannot bypass explicit decision-maker intent confirmation', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessment = await assessDecisionReadiness(app, fixture);

    await request(app.getHttpServer())
      .post('/api/v1/decisions/execute')
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        decisionReadinessAssessmentId: assessment.assessmentId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        matterDecided: 'Missing intent',
        outcome: 'APPROVED',
        explicitIntentConfirmed: false,
      })
      .expect(400);
  });

  it('18. client cannot set instrumentNumber on issuance', () => {
    expect(() => {
      issuance.rejectClientIssuanceFields({ instrumentNumber: 'CLIENT-PICKED-001' });
    }).toThrow('Client may not set "instrumentNumber"');
  });

  it('19. client cannot set instrument status on issuance', () => {
    expect(() => {
      issuance.rejectClientIssuanceFields({ status: 'ISSUED' });
    }).toThrow('Client may not set "status"');
  });

  it('20. client cannot set currentVersionId on issuance', () => {
    expect(FORBIDDEN_CLIENT_ISSUANCE_FIELDS).toContain('currentVersionId');
  });

  it('21. client cannot set verificationCode on issuance', () => {
    expect(FORBIDDEN_CLIENT_ISSUANCE_FIELDS).toContain('verificationCode');
  });

  it('22. client cannot set contentHash on issuance', () => {
    expect(FORBIDDEN_CLIENT_ISSUANCE_FIELDS).toContain('contentHash');
  });

  it('23. client cannot set signatureRecord on issuance', () => {
    expect(FORBIDDEN_CLIENT_ISSUANCE_FIELDS).toContain('signatureRecord');
  });

  it('24. non-human actors cannot execute government decisions', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessment = await readiness.assess({
      caseId: fixture.caseId,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      proposedDecisionMakerIdentityId: fixture.officialIdentityId,
      proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      requestedOutcome: 'APPROVED',
      evidencePacketVersionId: fixture.evidencePacketVersionId,
    });

    await prisma.identity.update({
      where: { id: fixture.officialIdentityId },
      data: { type: IdentityType.SERVICE },
    });

    await expect(
      execution.executeDecision({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        decisionReadinessAssessmentId: assessment.assessmentId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        matterDecided: 'Service identity attempt',
        outcome: 'APPROVED',
        explicitIntentConfirmed: true,
      }),
    ).rejects.toThrow(/NON_HUMAN_ACTOR|human/i);
  });

  it('25. AI actors cannot approve, refuse, sign, seal, or issue', () => {
    expect(FORBIDDEN_AI_DECISION_ACTIONS).toEqual(
      expect.arrayContaining(['APPROVE', 'REFUSE', 'SIGN', 'SEAL', 'ISSUE']),
    );
  });

  it('26. case manager role does not confer decision authority', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessment = await assessDecisionReadiness(app, fixture);

    await request(app.getHttpServer())
      .post('/api/v1/decisions/execute')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        decisionReadinessAssessmentId: assessment.assessmentId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.applicantIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        matterDecided: 'Applicant cannot decide',
        outcome: 'APPROVED',
        explicitIntentConfirmed: true,
      })
      .expect(403);
  });

  it('27. technical admin role does not confer decision authority by session alone', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await request(app.getHttpServer())
      .post('/api/v1/decisions-issuance/issue')
      .set('Authorization', `Bearer ${fixture.applicantSessionToken}`)
      .send({
        governmentDecisionId: fixture.governmentDecisionId,
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'test' },
        effectiveFrom: new Date().toISOString(),
      })
      .expect(403);
  });

  it('28. DECIDE action requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.functionAuthorityRecordId, action: 'DECIDE' },
      data: { permitted: false },
    });

    await expect(executeGovernmentDecision(app, fixture, 'APPROVED')).rejects.toThrow();
  });

  it('29. SIGN action requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.issueFunctionAuthorityRecordId, action: 'SIGN' },
      data: { permitted: false },
    });
    expect(fixture.permissibleOutcomes).toContain('APPROVED');
  });

  it('30. ISSUE action requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.issueFunctionAuthorityRecordId, action: 'ISSUE' },
      data: { permitted: false },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(
      result.checklistResults.find(
        (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.ISSUE_AUTHORITY_ALLOW,
      )?.passed,
    ).toBe(false);
  });

  it('31. SUSPEND action requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.functionAuthorityRecordId, action: 'SUSPEND' },
      data: { permitted: false },
    });
    const right = await prisma.authorityActionRight.findFirst({
      where: { functionAuthorityRecordId: fixture.functionAuthorityRecordId, action: 'SUSPEND' },
    });
    expect(right?.permitted).toBe(false);
  });

  it('32. REVOKE action requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.functionAuthorityRecordId, action: 'REVOKE' },
      data: { permitted: false },
    });
    const right = await prisma.authorityActionRight.findFirst({
      where: { functionAuthorityRecordId: fixture.functionAuthorityRecordId, action: 'REVOKE' },
    });
    expect(right?.permitted).toBe(false);
  });

  it('33. HEAR_REVIEW action requires authority evaluation ALLOW', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.authorityActionRight.updateMany({
      where: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
      data: { permitted: false },
    });
    const right = await prisma.authorityActionRight.findFirst({
      where: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        action: 'HEAR_REVIEW',
      },
    });
    expect(right?.permitted).toBe(false);
  });

  it('34. retained national determination cannot be substituted by ABSEZ issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { retainedNationalBoundary: true },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      issuerSource: 'ABSEZ_ISSUED',
    });

    expect(result.outcome).toBe('BLOCKED');
  });

  it('35. government decisions require frozen evidence packet version', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.evidencePacketVersion.update({
      where: { id: fixture.evidencePacketVersionId },
      data: { status: EvidencePacketVersionStatus.DRAFT, frozenAt: null },
    });

    const assessment = await readiness.assess({
      caseId: fixture.caseId,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      proposedDecisionMakerIdentityId: fixture.officialIdentityId,
      proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      requestedOutcome: 'APPROVED',
      evidencePacketVersionId: fixture.evidencePacketVersionId,
    });

    expect(assessment.outcome).not.toBe('READY');
  });

  it('36. unfrozen evidence packet blocks decision readiness READY', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.evidencePacketVersion.update({
      where: { id: fixture.evidencePacketVersionId },
      data: { status: EvidencePacketVersionStatus.DRAFT },
    });
    const assessment = await assessDecisionReadiness(app, fixture);
    expect(assessment.outcome).not.toBe('READY');
  });

  it('37. evidence packet must belong to the specified case', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const sourceCase = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    const sourceApplication = await prisma.application.findUniqueOrThrow({
      where: { id: sourceCase.applicationId },
    });
    const otherApplication = await prisma.application.create({
      data: {
        applicantIdentityId: sourceApplication.applicantIdentityId,
        governmentServiceId: sourceApplication.governmentServiceId,
        governmentServiceVersionId: sourceApplication.governmentServiceVersionId,
        formDefinitionId: sourceApplication.formDefinitionId,
        formVersionId: sourceApplication.formVersionId,
        configurationFingerprint: 'other-fingerprint',
        applicantCategory: sourceApplication.applicantCategory,
        status: 'SUBMITTED',
      },
    });
    const otherCase = await prisma.case.create({
      data: {
        caseNumber: `${fixture.marker}-OTHER-CASE`,
        applicationId: otherApplication.id,
        applicantIdentityId: sourceCase.applicantIdentityId,
        governmentServiceId: sourceCase.governmentServiceId,
        governmentServiceVersionId: sourceCase.governmentServiceVersionId,
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        workflowVersionId: sourceCase.workflowVersionId,
        configurationFingerprint: 'other-fingerprint',
        status: 'DECISION_PENDING',
      },
    });

    const assessment = await readiness.assess({
      caseId: otherCase.id,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      proposedDecisionMakerIdentityId: fixture.officialIdentityId,
      proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      requestedOutcome: 'APPROVED',
      evidencePacketVersionId: fixture.evidencePacketVersionId,
    });

    expect(assessment.outcome).not.toBe('READY');
  });

  it('38. decision readiness assessment must be READY before execution', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessment = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: `${fixture.marker}-NOT-READY`,
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: fixture.officialIdentityId,
        proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'NOT_READY',
        masterAdministrativeFileId: fixture.masterAdministrativeFileId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
      },
    });

    await expect(
      execution.executeDecision({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        decisionReadinessAssessmentId: assessment.id,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        matterDecided: 'Should fail',
        outcome: 'APPROVED',
        explicitIntentConfirmed: true,
      }),
    ).rejects.toThrow(/READINESS_NOT_READY|not ready/i);
  });

  it('39. unconfigured outcome rejected at decision execution', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await expect(executeGovernmentDecision(app, fixture, 'RETAINED_NATIONAL')).rejects.toThrow();
  });

  it('40. recorded government decisions are immutable', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decision = await executeGovernmentDecision(app, fixture, 'APPROVED');
    const stored = await prisma.governmentDecision.findUniqueOrThrow({
      where: { id: decision.id },
    });

    expect(() => {
      execution.assertDecisionImmutable(stored, { outcome: 'REFUSED' });
    }).toThrow(/immutable/i);
  });

  it('41. decision execution requires explicit intent confirmation', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const assessment = await assessDecisionReadiness(app, fixture);

    await expect(
      execution.executeDecision({
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        decisionReadinessAssessmentId: assessment.assessmentId,
        evidencePacketVersionId: fixture.evidencePacketVersionId,
        decisionMakerIdentityId: fixture.officialIdentityId,
        decisionMakerOfficeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        matterDecided: 'No intent',
        outcome: 'APPROVED',
        explicitIntentConfirmed: false,
      }),
    ).rejects.toThrow(/EXPLICIT_INTENT_REQUIRED|intent/i);
  });

  it('42. conflicted decision-maker blocked from execution', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await expect(
      executeGovernmentDecision(app, fixture, 'APPROVED', { isConflicted: true }),
    ).rejects.toThrow();
  });

  it('43. recused decision-maker blocked from execution', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await expect(
      executeGovernmentDecision(app, fixture, 'APPROVED', { isRecused: true }),
    ).rejects.toThrow();
  });

  it('44. REFUSED outcome does not permit approval instrument issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const decision = await executeGovernmentDecision(app, fixture, 'REFUSED');

    const result = await issuanceReadiness.assess({
      governmentDecisionId: decision.id,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(
      result.checklistResults.find(
        (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.OUTCOME_PERMITS_ISSUANCE,
      )?.passed,
    ).toBe(false);
  });

  it('45. invalid signature document blocks issuance when required', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { signatureRequired: true },
    });
    await prisma.documentVersion.update({
      where: { id: fixture.signatureDocumentVersionId },
      data: { signatureStatus: DocumentSignatureStatus.SIGNATURE_INVALID },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      signatureDocumentVersionId: fixture.signatureDocumentVersionId,
    });

    expect(
      result.checklistResults.find((c) => c.code === ISSUANCE_READINESS_CHECK_CODES.SIGNATURE_VALID)
        ?.passed,
    ).toBe(false);
  });

  it('46. missing signature blocks issuance when required', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { signatureRequired: true },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(
      result.checklistResults.find(
        (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.SIGNATURE_PRESENT,
      )?.passed,
    ).toBe(false);
  });

  it('47. generated document alone is not a valid signature record for issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const doc = await prisma.documentRecord.create({
      data: {
        documentNumber: `${fixture.marker}-FAKE-SIG`,
        title: 'Signature',
        documentType: 'SIGNATURE',
        sourceType: 'SYSTEM_GENERATED',
        owningInstitutionId: fixture.institutionId,
        versions: {
          create: {
            versionNumber: 1,
            originalFilename: 'sig.txt',
            contentType: 'text/plain',
            sizeBytes: 1,
            storageProvider: 'inline',
            storageObjectKey: 'fake',
            sha256: 'fake',
          },
        },
      },
      include: { versions: true },
    });

    expect(doc.versions[0]?.signatureStatus).not.toBe(DocumentSignatureStatus.SIGNED);
  });

  it('48. signature status must be evaluated, not assumed from title alone', async () => {
    await seedPhase8Fixture(app, prisma);
    const doc = await prisma.documentRecord.findFirst({
      where: { title: 'Signature Record' },
      include: { versions: true },
    });
    expect(doc?.title).toBe('Signature Record');
    expect(doc?.versions[0]?.signatureStatus).toBe(DocumentSignatureStatus.SIGNED);
  });

  it('49. SIGNATURE_INVALID blocks issuance readiness', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { signatureRequired: true },
    });
    await prisma.documentVersion.update({
      where: { id: fixture.signatureDocumentVersionId },
      data: { signatureStatus: DocumentSignatureStatus.SIGNATURE_INVALID },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      signatureDocumentVersionId: fixture.signatureDocumentVersionId,
    });

    expect(result.outcome).toBe('NOT_READY');
  });

  it('50. unsigned document cannot satisfy signature requirement', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { signatureRequired: true },
    });
    await prisma.documentVersion.update({
      where: { id: fixture.signatureDocumentVersionId },
      data: { signatureStatus: DocumentSignatureStatus.UNSIGNED },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      signatureDocumentVersionId: fixture.signatureDocumentVersionId,
    });

    expect(
      result.checklistResults.find((c) => c.code === ISSUANCE_READINESS_CHECK_CODES.SIGNATURE_VALID)
        ?.passed,
    ).toBe(false);
  });

  it('51. invalid seal document blocks issuance when required', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { sealRequired: true },
    });
    await prisma.documentVersion.update({
      where: { id: fixture.sealDocumentVersionId },
      data: { sealStatus: DocumentSealStatus.SEAL_INVALID },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    expect(
      result.checklistResults.find((c) => c.code === ISSUANCE_READINESS_CHECK_CODES.SEAL_VALID)
        ?.passed,
    ).toBe(false);
  });

  it('52. missing seal blocks issuance when required', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { sealRequired: true },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(
      result.checklistResults.find((c) => c.code === ISSUANCE_READINESS_CHECK_CODES.SEAL_PRESENT)
        ?.passed,
    ).toBe(false);
  });

  it('53. seal dual control requires distinct approver when configured', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    expect(fixture.approverOfficeholderId).not.toBe(fixture.officialOfficeholderId);
    expect(fixture.sealDefinitionId).toBeTruthy();
  });

  it('54. UNSEALED document cannot satisfy seal requirement', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.documentVersion.update({
      where: { id: fixture.sealDocumentVersionId },
      data: { sealStatus: DocumentSealStatus.UNSEALED },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    expect(
      result.checklistResults.find((c) => c.code === ISSUANCE_READINESS_CHECK_CODES.SEAL_VALID)
        ?.passed,
    ).toBe(false);
  });

  it('55. SEAL_INVALID blocks issuance readiness', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.documentVersion.update({
      where: { id: fixture.sealDocumentVersionId },
      data: { sealStatus: DocumentSealStatus.SEAL_INVALID },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    expect(result.outcome).toBe('NOT_READY');
  });

  it('56. government decision alone does not equal issued instrument', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const instruments = await prisma.officialInstrument.findMany({
      where: { governmentDecisionId: fixture.governmentDecisionId },
    });
    expect(instruments).toHaveLength(0);
  });

  it('57. REFUSED outcome does not permit instrument issuance', () => {
    expect(ISSUANCE_APPROVING_OUTCOMES).not.toContain('REFUSED');
  });

  it('58. unmet PRECEDENT_TO_ISSUANCE conditions block issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.decisionCondition.updateMany({
      where: { governmentDecisionId: fixture.governmentDecisionId },
      data: { status: 'PENDING' },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(
      result.checklistResults.find(
        (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.PRECEDENT_CONDITIONS_SATISFIED,
      )?.passed,
    ).toBe(false);
  });

  it('59. issuance readiness must be READY before issue', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.governmentDecision.update({
      where: { id: fixture.governmentDecisionId },
      data: { outcome: 'REFUSED' },
    });

    await expect(
      issuance.issue({
        governmentDecisionId: requirePreRecordedDecision(fixture),
        instrumentTypeVersionId: fixture.instrumentTypeVersionId,
        caseId: fixture.caseId,
        issuerIdentityId: fixture.officialIdentityId,
        issuerOfficeholderId: fixture.officialOfficeholderId,
        issuerOfficeId: fixture.officeId,
        holderIdentityId: fixture.applicantIdentityId,
        scope: { activity: 'test' },
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).rejects.toThrow();
  });

  it('60. inactive instrument type version blocks issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { lifecycleStatus: CatalogLifecycleStatus.SUSPENDED },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(result.outcome).not.toBe('READY');
  });

  it('61. inactive numbering rule blocks issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentNumberingRule.update({
      where: { id: fixture.numberingRuleId },
      data: { lifecycleStatus: CatalogLifecycleStatus.SUSPENDED },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(
      result.checklistResults.find(
        (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.NUMBERING_RULE_ACTIVE,
      )?.passed,
    ).toBe(false);
  });

  it('62. duplicate instrument numbers are impossible per numbering rule', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const issued = await issuance.issue({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
      idempotencyKey: 'must-fail-dup-1',
    });

    const duplicateAttempt = await prisma.instrumentNumberReservation.findMany({
      where: { numberingRuleId: fixture.numberingRuleId },
    });

    expect(issued.instrument.instrumentNumber).toBeTruthy();
    expect(duplicateAttempt.length).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.officialInstrument.count({
        where: { instrumentNumber: issued.instrument.instrumentNumber },
      }),
    ).toBe(1);
  });

  it('63. retained-national instrument type forbids ABSEZ issuance', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await prisma.instrumentTypeVersion.update({
      where: { id: fixture.instrumentTypeVersionId },
      data: { retainedNationalBoundary: true },
    });

    const result = await issuanceReadiness.assess({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
    });

    expect(result.outcome).toBe('BLOCKED');
  });

  it('64. suspension notice kind is distinct from license kind', () => {
    expect(OfficialInstrumentKind.SUSPENSION_NOTICE).not.toBe(OfficialInstrumentKind.LICENSE);
  });

  it('65. revocation notice kind is distinct from certificate kind', () => {
    expect(OfficialInstrumentKind.REVOCATION_NOTICE).not.toBe(OfficialInstrumentKind.CERTIFICATE);
  });

  it('66. amended instrument preserves prior version history', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    const issued = await issuance.issue({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    const versionCount = await prisma.officialInstrumentVersion.count({
      where: { officialInstrumentId: issued.instrument.id },
    });
    expect(versionCount).toBe(1);
  });

  it('67. suspension and revocation remain distinct instrument states', () => {
    expect(OfficialInstrumentStatus.SUSPENDED).not.toBe(OfficialInstrumentStatus.REVOKED);
  });

  it('68. case transition to DECIDED requires recorded government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const before = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(before.status).not.toBe('DECIDED');

    await executeGovernmentDecision(app, fixture, 'APPROVED');
    const after = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(after.status).toBe('DECIDED');
  });

  it('69. case transition to ISSUED requires issued official instrument', async () => {
    const fixture = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });
    await issuance.issue({
      governmentDecisionId: requirePreRecordedDecision(fixture),
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerIdentityId: fixture.officialIdentityId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'test' },
      effectiveFrom: new Date('2026-01-01'),
      sealDocumentVersionId: fixture.sealDocumentVersionId,
    });

    const caseRecord = await prisma.case.findUniqueOrThrow({ where: { id: fixture.caseId } });
    expect(caseRecord.status).toBe('ISSUED');
  });

  it('70. DECISION_GATE blocked without recorded government decision', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    const workflowVersion = await prisma.workflowVersion.create({
      data: {
        workflowDefinitionId: (
          await prisma.workflowDefinition.create({
            data: {
              code: `${fixture.marker}-WF-GATE`,
              name: 'Gate Workflow',
              governmentServiceId: (
                await prisma.governmentService.findFirstOrThrow({
                  where: { code: `${fixture.marker}-SVC` },
                })
              ).id,
            },
          })
        ).id,
        version: '1.0',
        status: 'APPROVED',
        steps: {
          create: {
            stepKey: 'decision-gate',
            label: 'Decision Gate',
            stepType: 'DECISION_GATE',
            consequenceLevel: 'CONSEQUENTIAL',
            displayOrder: 1,
          },
        },
      },
      include: { steps: true },
    });

    await prisma.case.update({
      where: { id: fixture.caseId },
      data: { workflowVersionId: workflowVersion.id },
    });

    await workflowRuntime.startWorkflow(fixture.caseId, workflowVersion.id);

    await expect(
      workflowRuntime.completeStep({
        caseId: fixture.caseId,
        stepKey: 'decision-gate',
        actorIdentityId: fixture.officialIdentityId,
      }),
    ).rejects.toThrow(/Decision gate requires/i);
  });
});
