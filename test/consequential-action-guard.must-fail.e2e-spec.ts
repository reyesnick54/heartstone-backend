import { ForbiddenException, type INestApplication, UnauthorizedException } from '@nestjs/common';
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
  GoverningSourceStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  SodRuleType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../src/authority/authority.constants';
import { ConsequentialActionService } from '../src/authority/consequential-action/consequential-action.service';
import { type ConsequentialActionDenial } from '../src/authority/consequential-action/consequential-action.types';
import { PrismaService } from '../src/database/prisma.service';
import { seedPhase8bDecisionFixture } from '../src/decisions/fixtures/phase-8b-test-fixtures';
import { hashToken } from '../src/identity/common/crypto.util';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { grantAuthorityFunctionLifecycleOperator } from './helpers/technical-access.fixture';

describe('Consequential Action Guard must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let consequentialActionService: ConsequentialActionService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    consequentialActionService = app.get(ConsequentialActionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedBase() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'CAG-JUR', name: 'CAG Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'CAG-INST',
        name: 'CAG Institution',
        type: 'AGENCY',
      },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'CAG-DEPT', name: 'Dept' },
    });
    const office = await prisma.office.create({
      data: { departmentId: department.id, code: 'CAG-OFF', name: 'Office' },
    });
    const officeholder = await prisma.officeholder.create({
      data: { code: 'CAG-OH', name: 'Authorized Officeholder' },
    });
    const wrongOfficeholder = await prisma.officeholder.create({
      data: { code: 'CAG-WRONG', name: 'Wrong Officeholder' },
    });
    const appointment = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    const wrongAppointment = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: wrongOfficeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    const person = await prisma.person.create({
      data: { givenName: 'CAG', familyName: 'Official' },
    });
    const account = await prisma.userAccount.create({
      data: { personId: person.id, loginIdentifier: 'cag@test.local', status: 'ACTIVE' },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        userAccountId: account.id,
        personId: person.id,
        displayName: 'CAG Official',
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
        tokenHash: hashToken('cag-test-token'),
        status: 'ACTIVE',
        assuranceLevel: 'HIGH',
        expiresAt: new Date('2099-01-01'),
      },
    });

    const serviceIdentity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'Service Bot' },
    });
    const aiIdentity = await prisma.identity.create({
      data: { type: IdentityType.ORGANIZATION, displayName: 'AI Agent Proxy' },
    });

    const actorIdentity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Actor' },
    });

    const source = await prisma.governingSource.create({
      data: {
        code: 'CAG-SRC',
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
        code: 'CAG-FN',
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
        action: AuthorityActionType.APPROVE,
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
      wrongOfficeholder,
      appointment,
      wrongAppointment,
      identity,
      session,
      serviceIdentity,
      aiIdentity,
      fn,
      delegation,
    };
  }

  async function sessionContext(identityId: string, userAccountId?: string | null) {
    const existing = await prisma.session.findFirst({
      where: { identityId, status: 'ACTIVE' },
      orderBy: { issuedAt: 'desc' },
    });
    const session =
      existing ??
      (await prisma.session.create({
        data: {
          identityId,
          userAccountId: userAccountId ?? null,
          tokenHash: hashToken(`cag-session-${identityId}-${String(Date.now())}`),
          status: 'ACTIVE',
          assuranceLevel: 'HIGH',
          expiresAt: new Date('2099-01-01'),
        },
      }));

    return {
      sessionId: session.id,
      identityId: session.identityId,
      userAccountId: session.userAccountId,
      assuranceLevel: session.assuranceLevel,
    };
  }

  async function assertBlocked(
    identityId: string,
    body: Record<string, unknown>,
    expectedCodes: string[],
  ) {
    try {
      await consequentialActionService.assertConsequentialActionAllowed(
        await sessionContext(identityId),
        {
          action: AuthorityActionType.APPROVE,
          functionAuthorityRecordId: body.functionAuthorityRecordId as string,
          requireHumanActor: true,
        },
        { body },
      );
      throw new Error('Expected consequential action to be blocked');
    } catch (error) {
      const blocked = error instanceof ForbiddenException || error instanceof UnauthorizedException;
      expect(blocked).toBe(true);
      if (error instanceof UnauthorizedException) {
        return;
      }
      const response = (error as ForbiddenException).getResponse() as ConsequentialActionDenial;
      for (const code of expectedCodes) {
        expect(response.explanationCodes).toContain(code);
      }
      expect(response.outcome).not.toBe(AuthorityEvaluationOutcome.ALLOW);
      expect(response.evaluationId).toBeDefined();
    }
  }

  it('authenticated official with no authority cannot approve', async () => {
    const base = await seedBase();
    const unassignedPerson = await prisma.person.create({
      data: { givenName: 'Unassigned', familyName: 'Official' },
    });
    const unassignedAccount = await prisma.userAccount.create({
      data: {
        personId: unassignedPerson.id,
        loginIdentifier: 'unassigned@test.local',
        status: 'ACTIVE',
      },
    });
    const unassignedIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        userAccountId: unassignedAccount.id,
        personId: unassignedPerson.id,
        displayName: 'Unassigned Official',
      },
    });
    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: unassignedIdentity.id,
        officeholderId: base.wrongOfficeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });

    await assertBlocked(
      unassignedIdentity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.wrongOfficeholder.id,
        officeId: base.office.id,
        appointmentId: base.wrongAppointment.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ASSIGNMENT],
    );
  });

  it('correct department but wrong officeholder cannot approve', async () => {
    const base = await seedBase();
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.wrongOfficeholder.id,
        officeId: base.office.id,
        appointmentId: base.wrongAppointment.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK],
    );
  });

  it('expired appointment cannot approve', async () => {
    const base = await seedBase();
    await prisma.appointment.update({
      where: { id: base.appointment.id },
      data: { effectiveUntil: new Date('2021-01-01') },
    });
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT],
    );
  });

  it('expired delegation cannot approve', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { requiresDelegation: true },
    });
    await prisma.delegationStructuredScope.create({
      data: {
        delegationId: base.delegation.id,
        functionAuthorityRecordId: base.fn.id,
        allowedActionTypes: [AuthorityActionType.APPROVE],
      },
    });
    await prisma.delegation.update({
      where: { id: base.delegation.id },
      data: { effectiveUntil: new Date('2021-01-01') },
    });
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
        delegationId: base.delegation.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION],
    );
  });

  it('SoD/self-approval rule blocks', async () => {
    const base = await seedBase();
    await prisma.segregationOfDutyRule.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        ruleType: SodRuleType.SELF_APPROVAL,
      },
    });
    const phase8Case = await seedPhase8bDecisionFixture(prisma);
    await prisma.case.update({
      where: { id: phase8Case.caseId },
      data: { applicantIdentityId: base.identity.id },
    });
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
        caseId: phase8Case.caseId,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.SELF_APPROVAL_PROHIBITED],
    );
  });

  it('missing dependency blocks', async () => {
    const base = await seedBase();
    await prisma.authorityDependency.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        dependencyType: AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION,
      },
    });
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION],
    );
  });

  it('external determination requirement returns appropriate non-ALLOW result', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { classification: AuthorityClassification.EXPRESSLY_RETAINED_NATIONAL },
    });
    const result = await consequentialActionService.evaluateConsequentialAction(
      await sessionContext(base.identity.id, base.session.userAccountId),
      {
        action: AuthorityActionType.APPROVE,
        functionAuthorityRecordId: base.fn.id,
      },
      {
        body: {
          officeholderId: base.officeholder.id,
          officeId: base.office.id,
          appointmentId: base.appointment.id,
        },
      },
    );
    expect(result.outcome).toBe(AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION);
    expect(result.outcome).not.toBe(AuthorityEvaluationOutcome.ALLOW);
  });

  it('service identity cannot make final decision', async () => {
    const base = await seedBase();
    await expect(
      consequentialActionService.assertConsequentialActionAllowed(
        await sessionContext(base.serviceIdentity.id),
        {
          action: AuthorityActionType.APPROVE,
          functionAuthorityRecordId: base.fn.id,
        },
        { body: {} },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('AI agent cannot make final decision', async () => {
    const base = await seedBase();
    await expect(
      consequentialActionService.assertConsequentialActionAllowed(
        await sessionContext(base.aiIdentity.id),
        {
          action: AuthorityActionType.APPROVE,
          functionAuthorityRecordId: base.fn.id,
        },
        { body: {} },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('authority function suspension immediately blocks action', async () => {
    const base = await seedBase();
    await prisma.functionAuthorityRecord.update({
      where: { id: base.fn.id },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED },
    });
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_FUNCTION],
    );

    await prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        action: AuthorityActionType.SUSPEND,
        permitted: true,
      },
    });

    await grantAuthorityFunctionLifecycleOperator(prisma, base.identity.id);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/authority/functions/${base.fn.id}/suspend`)
      .set('Authorization', 'Bearer cag-test-token')
      .send({
        actorIdentityId: base.identity.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
        reason: 'Guard test',
      })
      .expect(403);

    const body = response.body as ConsequentialActionDenial;
    expect(body.explanationCodes).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_FUNCTION,
    );
  });

  it('technical permission cannot substitute for authority', async () => {
    const base = await seedBase();
    const loginAccount = await prisma.userAccount.findUnique({
      where: { id: base.session.userAccountId ?? undefined },
    });
    if (!loginAccount) {
      throw new Error('Expected user account for login-only test');
    }
    const loginOnly = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'Login Only',
        userAccountId: loginAccount.id,
        personId: loginAccount.personId,
      },
    });
    await prisma.session.create({
      data: {
        identityId: loginOnly.id,
        tokenHash: hashToken('login-only-token'),
        status: 'ACTIVE',
        assuranceLevel: 'HIGH',
        expiresAt: new Date('2099-01-01'),
      },
    });

    await assertBlocked(
      loginOnly.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK],
    );
  });

  it('missing function authority mapping fails closed at guard', async () => {
    const base = await seedBase();
    await expect(
      consequentialActionService.assertConsequentialActionAllowed(
        await sessionContext(base.identity.id, base.session.userAccountId),
        {
          action: AuthorityActionType.APPROVE,
          functionResolver: () => Promise.resolve(null),
        },
        { body: {} },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('unmet evidence condition blocks approval', async () => {
    const base = await seedBase();
    await prisma.authorityCondition.create({
      data: {
        functionAuthorityRecordId: base.fn.id,
        conditionType: AuthorityConditionType.EVIDENCE_REQUIRED,
        configuration: { requiredEvidence: ['DOC-A'] },
      },
    });
    await assertBlocked(
      base.identity.id,
      {
        functionAuthorityRecordId: base.fn.id,
        officeholderId: base.officeholder.id,
        officeId: base.office.id,
        appointmentId: base.appointment.id,
        evidenceProvided: [],
      },
      [AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_EVIDENCE],
    );
  });
});
