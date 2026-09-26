import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  AuthorityConditionType,
  AuthorityEvaluationOutcome,
  ControlledFunctionClass,
  DecisionParticipantRole,
  DelegationStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  SodRuleType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../src/authority/authority.constants';
import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedPhase8Fixture } from './helpers/phase-8-test-fixtures';

describe('Remediation S1 — server-derived authority facts (must-fail e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedActorToken() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'S1-JUR', name: 'S1 Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'S1-INST',
        name: 'S1 Institution',
        type: 'AGENCY',
      },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'S1-DEPT', name: 'Dept' },
    });
    const office = await prisma.office.create({
      data: { departmentId: department.id, code: 'S1-OFF', name: 'Office' },
    });
    const officeholder = await prisma.officeholder.create({
      data: { code: 'S1-OH', name: 'Officeholder' },
    });
    const appointment = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    const person = await prisma.person.create({
      data: { givenName: 'S1', familyName: 'Actor' },
    });
    const account = await prisma.userAccount.create({
      data: { personId: person.id, loginIdentifier: 's1@test.local', status: 'ACTIVE' },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        userAccountId: account.id,
        personId: person.id,
        displayName: 'S1 Actor',
      },
    });
    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    await prisma.credential.create({
      data: {
        identityId: identity.id,
        type: 'PASSWORD',
        status: 'ACTIVE',
        secretHash: 'hash',
      },
    });
    await prisma.session.create({
      data: {
        identityId: identity.id,
        userAccountId: account.id,
        tokenHash: hashToken('s1-test-token'),
        status: 'ACTIVE',
        assuranceLevel: 'HIGH',
        expiresAt: new Date('2099-01-01'),
      },
    });

    const actorIdentity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Bootstrap' },
    });

    const source = await prisma.governingSource.create({
      data: {
        code: 'S1-SRC',
        title: 'Source',
        versionLabel: '1',
        status: GoverningSourceStatus.AUTHENTICATED,
        effectiveFrom: new Date('2020-01-01'),
        authenticatedAt: new Date('2020-01-01'),
        authenticatedByIdentityId: actorIdentity.id,
        contentHash: 'abc',
      },
    });

    const fn = await prisma.functionAuthorityRecord.create({
      data: {
        code: 'S1-FN',
        name: 'Function',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.APPROVAL,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: institution.id,
        officeId: office.id,
        activatedAt: new Date(),
        activatedByIdentityId: actorIdentity.id,
      },
    });

    await prisma.functionGoverningSource.create({
      data: { functionAuthorityRecordId: fn.id, governingSourceId: source.id },
    });
    await prisma.functionAuthorityAssignment.create({
      data: {
        functionAuthorityRecordId: fn.id,
        officeholderId: officeholder.id,
        officeId: office.id,
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    await prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: fn.id,
        action: AuthorityActionType.DECIDE,
        permitted: true,
      },
    });
    await prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: fn.id,
        action: AuthorityActionType.APPROVE,
        permitted: true,
      },
    });
    await prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: fn.id,
        action: AuthorityActionType.PREPARE,
        permitted: true,
      },
    });

    return { institution, office, officeholder, appointment, identity, fn };
  }

  async function evaluate(token: string, body: Record<string, unknown>) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    return response.body as {
      outcome: AuthorityEvaluationOutcome;
      explanationCodes: string[];
      evaluationId: string;
    };
  }

  it('1. rejects backdated evaluation timestamps (server time governs live authorization)', async () => {
    const base = await seedActorToken();
    const result = await evaluate('s1-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      at: '2020-03-01T00:00:00.000Z',
    });
    expect(result.explanationCodes).not.toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT,
    );
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
  });

  it('2. ignores claimed second approval without stored co-approver records', async () => {
    const base = await seedActorToken();
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        conditionType: AuthorityConditionType.SECOND_APPROVAL_REQUIRED,
      },
    });

    const denied = await evaluate('s1-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.APPROVE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      hasSecondApproval: true,
    });
    expect(denied.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SECOND_APPROVAL,
    );
  });

  it('3. cannot claim no conflict when server records show conflict', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        conditionType: AuthorityConditionType.CONFLICT_CHECK,
      },
    });

    const assessment = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: 'S1-CONFLICT-1',
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: fixture.officialIdentityId,
        proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'NOT_READY',
      },
    });

    await prisma.decisionParticipant.create({
      data: {
        readinessAssessmentId: assessment.id,
        identityId: fixture.officialIdentityId,
        officeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        role: DecisionParticipantRole.DECISION_MAKER,
        isConflicted: true,
      },
    });

    const result = await evaluate(fixture.officialSessionToken, {
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
      officeholderId: fixture.officialOfficeholderId,
      officeId: fixture.officeId,
      appointmentId: fixture.appointmentId,
      caseId: fixture.caseId,
      decisionReadinessAssessmentId: assessment.id,
      isConflicted: false,
    });
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.CONFLICT_DETECTED,
    );
  });

  it('4. cannot bypass recusal recorded server-side', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        conditionType: AuthorityConditionType.RECUSAL_CHECK,
      },
    });

    const assessment = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: 'S1-RECUSAL-1',
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: fixture.officialIdentityId,
        proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'NOT_READY',
      },
    });

    await prisma.decisionParticipant.create({
      data: {
        readinessAssessmentId: assessment.id,
        identityId: fixture.officialIdentityId,
        officeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        role: DecisionParticipantRole.DECISION_MAKER,
        isRecused: true,
      },
    });

    const result = await evaluate(fixture.officialSessionToken, {
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
      officeholderId: fixture.officialOfficeholderId,
      officeId: fixture.officeId,
      appointmentId: fixture.appointmentId,
      caseId: fixture.caseId,
      decisionReadinessAssessmentId: assessment.id,
      isRecused: false,
    });
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.RECUSAL_REQUIRED,
    );
  });

  it('5. ignores claimed evidence when no authoritative packet items exist', async () => {
    const base = await seedActorToken();
    await prisma.appointment.update({
      where: { id: base.appointment.id },
      data: { effectiveUntil: null },
    });
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        conditionType: AuthorityConditionType.EVIDENCE_REQUIRED,
        configuration: { requiredEvidence: ['DOC-A'] },
      },
    });

    const denied = await evaluate('s1-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      evidenceProvided: ['DOC-A'],
    });
    expect(denied.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_EVIDENCE,
    );
  });

  it('6. rejects expired delegation even when caller supplies delegation id manually', async () => {
    const base = await seedActorToken();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { requiresDelegation: true },
    });
    const delegation = await prisma.delegation.create({
      data: {
        institutionId: base.institution.id,
        delegatorOfficeId: base.office.id,
        recipientOfficeholderId: base.officeholder.id,
        scopeDescription: 'scope',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });

    const result = await evaluate('s1-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      delegationId: delegation.id,
    });
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION,
    );
  });

  it('7. cannot manipulate prior-action / SoD state via request body', async () => {
    const base = await seedActorToken();
    await prisma.appointment.update({
      where: { id: base.appointment.id },
      data: { effectiveUntil: null },
    });
    await prisma.segregationOfDutyRule.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        ruleType: SodRuleType.SEGREGATION_OF_DUTY,
        conflictingAction: AuthorityActionType.PREPARE,
      },
    });

    await prisma.authorityEvaluationRecord.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        identityId: base.identity.id,
        officeholderId: base.officeholder.id,
        appointmentId: base.appointment.id,
        action: AuthorityActionType.PREPARE,
        outcome: AuthorityEvaluationOutcome.ALLOW,
        evaluatedAt: new Date(),
        contextSnapshot: {},
        explanationCodes: ['ALLOW'],
        requestHash: 'hash-prior-prepare',
      },
    });

    const bypassAttempt = await evaluate('s1-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.APPROVE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      priorActions: [],
    });
    expect(bypassAttempt.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SOD_VIOLATION,
    );
  });

  it('8. positive path: server-derived evidence and co-approval allow when conditions satisfied', async () => {
    const fixture = await seedPhase8Fixture(app, prisma);

    let packetItems = await prisma.evidencePacketItem.findMany({
      where: { packetVersionId: fixture.evidencePacketVersionId },
      include: { evidenceRecord: true },
    });
    if (packetItems.length === 0) {
      const evidenceRecord = await prisma.evidenceRecord.create({
        data: {
          evidenceNumber: 'S1-EVID-001',
          caseId: fixture.caseId,
          masterAdministrativeFileId: fixture.masterAdministrativeFileId,
          evidenceType: 'DOCUMENT',
          source: 'APPLICANT',
          submittingParty: fixture.applicantIdentityId,
          dateReceived: new Date('2024-01-01'),
          confidentialityClassification: 'OFFICIAL',
          integrityReference: 's1-positive-path',
          title: 'S1 positive path evidence',
        },
      });
      if (!fixture.signatureDocumentVersionId) {
        throw new Error('Expected signature document version in Phase 8 fixture');
      }
      await prisma.evidencePacketItem.create({
        data: {
          packetVersionId: fixture.evidencePacketVersionId,
          evidenceRecordId: evidenceRecord.id,
          documentVersionId: fixture.signatureDocumentVersionId,
          evidenceStatusAtInclusion: evidenceRecord.status,
          inclusionOrder: 1,
        },
      });
      packetItems = await prisma.evidencePacketItem.findMany({
        where: { packetVersionId: fixture.evidencePacketVersionId },
        include: { evidenceRecord: true },
      });
    }
    const firstItem = packetItems[0];
    if (!firstItem) {
      throw new Error('Expected at least one evidence packet item in Phase 8 fixture');
    }
    const evidenceCode = firstItem.evidenceRecord.evidenceNumber;

    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        conditionType: AuthorityConditionType.EVIDENCE_REQUIRED,
        configuration: { requiredEvidence: [evidenceCode] },
      },
    });
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        conditionType: AuthorityConditionType.SECOND_APPROVAL_REQUIRED,
      },
    });

    const assessment = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: 'S1-POSITIVE-1',
        caseId: fixture.caseId,
        decisionTypeVersionId: fixture.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: fixture.officialIdentityId,
        proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'NOT_READY',
      },
    });

    await prisma.decisionParticipant.create({
      data: {
        readinessAssessmentId: assessment.id,
        identityId: fixture.officialIdentityId,
        officeholderId: fixture.officialOfficeholderId,
        appointmentId: fixture.appointmentId,
        role: DecisionParticipantRole.DECISION_MAKER,
      },
    });
    await prisma.decisionParticipant.create({
      data: {
        readinessAssessmentId: assessment.id,
        identityId: fixture.applicantIdentityId,
        role: DecisionParticipantRole.CO_APPROVER,
        hasApproved: true,
        approvedAt: new Date(),
      },
    });

    const allowed = await evaluate(fixture.officialSessionToken, {
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: fixture.officialOfficeholderId,
      officeId: fixture.officeId,
      appointmentId: fixture.appointmentId,
      caseId: fixture.caseId,
      decisionReadinessAssessmentId: assessment.id,
      evidencePacketVersionId: fixture.evidencePacketVersionId,
      hasSecondApproval: false,
      evidenceProvided: [],
    });

    expect(allowed.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(allowed.explanationCodes).toContain('ALLOW');

    const record = await prisma.authorityEvaluationRecord.findUnique({
      where: { id: allowed.evaluationId },
    });
    if (!record) {
      throw new Error('Expected authority evaluation record to exist');
    }
    const snapshot = record.contextSnapshot as {
      derivedFacts: { hasSecondApproval: boolean; evidenceProvided: string[] };
      authoritativeSourceRefs: { evidenceRecordIds: string[] };
    };
    expect(snapshot.derivedFacts.hasSecondApproval).toBe(true);
    expect(snapshot.derivedFacts.evidenceProvided).toContain(evidenceCode);
    expect(snapshot.authoritativeSourceRefs.evidenceRecordIds.length).toBeGreaterThan(0);
  });
});
