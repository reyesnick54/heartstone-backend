import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  AuthorityConditionType,
  AuthorityDependencyType,
  AuthorityEvaluationOutcome,
  ControlledFunctionClass,
  DelegationStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceRelationshipType,
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
import { asAuthorityEvaluationBody } from './helpers/authority-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

interface ProtectedProfileBody {
  hasGovernmentAuthority: boolean;
}

describe('Phase 4H must-fail invariants (e2e)', () => {
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

  async function seedBase() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'MF-JUR', name: 'Must Fail Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'MF-INST',
        name: 'Must Fail Institution',
        type: 'AGENCY',
      },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'MF-DEPT', name: 'Dept' },
    });
    const office = await prisma.office.create({
      data: { departmentId: department.id, code: 'MF-OFF', name: 'Office' },
    });
    const officeholder = await prisma.officeholder.create({
      data: { code: 'MF-OH', name: 'Officeholder' },
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
      data: { givenName: 'Must', familyName: 'Fail' },
    });
    const account = await prisma.userAccount.create({
      data: { personId: person.id, loginIdentifier: 'mf@test.local', status: 'ACTIVE' },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        userAccountId: account.id,
        personId: person.id,
        displayName: 'Must Fail User',
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
    const session = await prisma.session.create({
      data: {
        identityId: identity.id,
        userAccountId: account.id,
        tokenHash: hashToken('mf-test-token'),
        status: 'ACTIVE',
        assuranceLevel: 'HIGH',
        expiresAt: new Date('2099-01-01'),
      },
    });

    const actorIdentity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Actor' },
    });

    const source = await prisma.governingSource.create({
      data: {
        code: 'MF-SRC',
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
        code: 'MF-FN',
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

    const delegation = await prisma.delegation.create({
      data: {
        institutionId: institution.id,
        delegatorOfficeId: office.id,
        recipientOfficeholderId: officeholder.id,
        scopeDescription: 'scope',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    return {
      institution,
      office,
      officeholder,
      appointment,
      identity,
      session,
      actorIdentity,
      source,
      fn,
      delegation,
    };
  }

  async function evaluate(
    token: string,
    body: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<{
    outcome?: AuthorityEvaluationOutcome;
    explanationCodes?: string[];
    evaluationId?: string;
  }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(expectedStatus);

    return response.body as {
      outcome?: AuthorityEvaluationOutcome;
      explanationCodes?: string[];
      evaluationId?: string;
    };
  }

  it('1. login alone grants no authority', async () => {
    await seedBase();
    await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', 'Bearer mf-test-token')
      .expect(200)
      .expect((res) => {
        expect((res.body as ProtectedProfileBody).hasGovernmentAuthority).toBe(false);
      });
  });

  it('2-4. MFA/OIDC/admin roles do not confer authority via /identity/me', async () => {
    await seedBase();
    const me = await request(app.getHttpServer())
      .get('/api/v1/identity/me')
      .set('Authorization', 'Bearer mf-test-token')
      .expect(200);
    expect((me.body as ProtectedProfileBody).hasGovernmentAuthority).toBe(false);
  });

  it('5. officeholder link without appointment fails', async () => {
    const base = await seedBase();
    await prisma.appointment.deleteMany();
    const result = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
    });
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT,
    );
  });

  it('6. expired appointment fails', async () => {
    const base = await seedBase();
    await prisma.appointment.update({
      where: { id: base.appointment.id },
      data: { effectiveUntil: new Date('2021-01-01') },
    });
    const result = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT,
    );
  });

  it('7. suspended appointment fails', async () => {
    const base = await seedBase();
    await prisma.appointment.update({
      where: { id: base.appointment.id },
      data: { status: AppointmentStatus.SUSPENDED },
    });
    const result = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_APPOINTMENT,
    );
  });

  it('8. wrong office fails', async () => {
    const base = await seedBase();
    const department = await prisma.department.findFirst();
    if (!department) {
      throw new Error('Expected department to exist');
    }
    const otherOffice = await prisma.office.create({
      data: {
        departmentId: department.id,
        code: 'OTHER',
        name: 'Other',
      },
    });
    const result = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: otherOffice.id,
      appointmentId: base.appointment.id,
    });
    expect(result.explanationCodes).toContain(AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_OFFICE);
  });

  it('9-12. delegation failures', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { requiresDelegation: true },
    });

    const missing = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(missing.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION,
    );

    await prisma.delegation.update({
      where: { id: base.delegation.id },
      data: { effectiveUntil: new Date('2021-01-01') },
    });
    const expired = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      delegationId: base.delegation.id,
    });
    expect(expired.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION,
    );

    await prisma.delegation.update({
      where: { id: base.delegation.id },
      data: { status: DelegationStatus.REVOKED, effectiveUntil: null },
    });
    const revoked = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      delegationId: base.delegation.id,
    });
    expect(revoked.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION,
    );
  });

  it('13-17. governing source failures', async () => {
    const base = await seedBase();
    await prisma.governingSource.update({
      where: { id: base.source.id },
      data: { status: GoverningSourceStatus.DRAFT, authenticatedAt: null },
    });
    const unauth = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(unauth.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.UNAUTHENTICATED_SOURCE,
    );

    await prisma.governingSource.update({
      where: { id: base.source.id },
      data: {
        status: GoverningSourceStatus.AUTHENTICATED,
        effectiveFrom: new Date('2099-01-01'),
      },
    });
    const future = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(future.explanationCodes).toContain(AUTHORITY_EVALUATION_EXPLANATION_CODES.FUTURE_SOURCE);

    await prisma.governingSource.update({
      where: { id: base.source.id },
      data: {
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });
    const expired = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(expired.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_SOURCE,
    );

    await prisma.governingSource.update({
      where: { id: base.source.id },
      data: {
        status: GoverningSourceStatus.REVOKED,
        effectiveUntil: null,
      },
    });
    const revoked = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(revoked.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_SOURCE,
    );

    await prisma.governingSource.update({
      where: { id: base.source.id },
      data: {
        status: GoverningSourceStatus.AUTHENTICATED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
        revokedAt: null,
      },
    });

    const conflictSource = await prisma.governingSource.create({
      data: {
        code: 'MF-SRC-2',
        title: 'Conflict',
        versionLabel: '1',
        status: GoverningSourceStatus.AUTHENTICATED,
        effectiveFrom: new Date('2020-01-01'),
        contentHash: 'def',
      },
    });
    await prisma.governingSourceRelationship.create({
      data: {
        fromSourceId: base.source.id,
        toSourceId: conflictSource.id,
        relationshipType: GoverningSourceRelationshipType.CONFLICTS_WITH,
      },
    });
    const conflict = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(conflict.outcome).toBe(AuthorityEvaluationOutcome.SAFE_HALT);
  });

  it('18-19. inactive/suspended function fails', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.INACTIVE },
    });
    const inactive = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(inactive.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.INACTIVE_FUNCTION,
    );

    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED },
    });
    const suspended = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(suspended.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_FUNCTION,
    );
  });

  it('20-29. condition and SoD failures', async () => {
    const base = await seedBase();
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        conditionType: AuthorityConditionType.EVIDENCE_REQUIRED,
        configuration: { requiredEvidence: ['DOC-A'] },
      },
    });
    const missingEvidence = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      evidenceProvided: [],
    });
    expect(missingEvidence.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_EVIDENCE,
    );

    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        conditionType: AuthorityConditionType.QUALIFICATION_REQUIRED,
        configuration: { requiredQualifications: ['LAWYER'] },
      },
    });
    const missingQual = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      evidenceProvided: ['DOC-A'],
      qualificationCodes: [],
    });
    expect(missingQual.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_QUALIFICATION,
    );

    await prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        action: AuthorityActionType.APPROVE,
        permitted: true,
      },
    });
    await prisma.segregationOfDutyRule.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        ruleType: SodRuleType.SELF_APPROVAL,
      },
    });
    const selfApproval = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.APPROVE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
      evidenceProvided: ['DOC-A'],
      qualificationCodes: ['LAWYER'],
      isSelfApproval: true,
    });
    expect(selfApproval.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SELF_APPROVAL_PROHIBITED,
    );
  });

  it('32-34. retained national, professional, AI restrictions', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { classification: AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL },
    });
    await prisma.authorityDependency.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
      },
    });
    const retained = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(retained.outcome).toBe(AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION);

    const serviceIdentity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'AI Service' },
    });
    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: serviceIdentity.id,
        officeholderId: base.officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { classification: AuthorityClassification.RESERVED_PROFESSIONAL },
    });
    const aiProfessional = await request(app.getHttpServer())
      .post('/api/v1/authority/evaluate')
      .set('Authorization', 'Bearer mf-test-token')
      .send({
        functionAuthorityRecordId: base.fn.id,
        action: AuthorityActionType.DECIDE,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
      });
    expect(aiProfessional.status).toBe(201);
  });

  it('38. PROHIBITED function cannot execute', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { classification: AuthorityClassification.PROHIBITED_OR_UNAUTHORIZED },
    });
    const result = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.DENY);
    expect(result.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.PROHIBITED_FUNCTION,
    );
  });

  it('39. evaluation API exposes no mutation endpoint for historical records', async () => {
    const base = await seedBase();
    const result = await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });

    if (!result.evaluationId) {
      throw new Error('Expected evaluationId on result');
    }

    const recordResponse = await request(app.getHttpServer())
      .get(`/api/v1/authority/evaluate/records/${result.evaluationId}`)
      .set('Authorization', 'Bearer mf-test-token')
      .expect(200);

    expect(asAuthorityEvaluationBody(recordResponse.body).outcome).toBe(result.outcome);

    await request(app.getHttpServer())
      .patch(`/api/v1/authority/evaluate/records/${result.evaluationId}`)
      .set('Authorization', 'Bearer mf-test-token')
      .send({ outcome: AuthorityEvaluationOutcome.ALLOW })
      .expect(404);
  });

  it('40. evaluation service does not mutate governing source during evaluation', async () => {
    const base = await seedBase();
    const before = await prisma.governingSource.findUnique({ where: { id: base.source.id } });

    await evaluate('mf-test-token', {
      functionAuthorityRecordId: base.fn.id,
      action: AuthorityActionType.DECIDE,
      officeholderId: base.officeholder.id,
      officeId: base.office.id,
      appointmentId: base.appointment.id,
    });

    const after = await prisma.governingSource.findUnique({ where: { id: base.source.id } });
    if (!before || !after) {
      throw new Error('Expected governing source before and after evaluation');
    }
    expect(after).toMatchObject({
      status: before.status,
      contentHash: before.contentHash,
      versionLabel: before.versionLabel,
    });
  });
});
