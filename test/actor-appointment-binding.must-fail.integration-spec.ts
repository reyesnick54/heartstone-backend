import { ForbiddenException, type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  AuthorityEvaluationOutcome,
  ControlledFunctionClass,
  DelegationStatus,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../src/authority/authority.constants';
import { ConsequentialActionService } from '../src/authority/consequential-action/consequential-action.service';
import { InstitutionalActorResolver } from '../src/authority/institutional-actor/institutional-actor-resolver.service';
import { type PrismaService } from '../src/database/prisma.service';
import { ActorContextService } from '../src/identity/auth/context/actor-context.service';
import { ACTOR_BINDING_FAILURE_CODES } from '../src/identity/auth/context/actor-context.types';
import { hashToken } from '../src/identity/common/crypto.util';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Actor appointment binding must-fail invariants (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let actorContextService: ActorContextService;
  let consequentialActionService: ConsequentialActionService;

  const at = new Date('2026-06-01T12:00:00.000Z');

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    actorContextService = app.get(ActorContextService);
    consequentialActionService = app.get(ConsequentialActionService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedUsersWithAppointments() {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'S2-JUR', name: 'S2 Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'S2-INST',
        name: 'S2 Institution',
        type: 'AGENCY',
      },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'S2-DEPT', name: 'Dept' },
    });
    const office = await prisma.office.create({
      data: { departmentId: department.id, code: 'S2-OFF', name: 'Office' },
    });

    const officeholderA = await prisma.officeholder.create({
      data: { code: 'S2-OH-A', name: 'Officeholder A' },
    });
    const officeholderB = await prisma.officeholder.create({
      data: { code: 'S2-OH-B', name: 'Officeholder B' },
    });

    const appointmentA = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholderA.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });
    const appointmentB = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholderB.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });
    const expiredAppointmentA = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholderA.id,
        status: AppointmentStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2020-12-31'),
      },
    });
    const futureAppointmentA = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholderA.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2027-01-01'),
        effectiveUntil: new Date('2027-12-31'),
      },
    });
    const suspendedAppointmentA = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholderA.id,
        status: AppointmentStatus.SUSPENDED,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });

    async function provisionIdentity(loginIdentifier: string, officeholderId: string) {
      const person = await prisma.person.create({
        data: { givenName: loginIdentifier, familyName: 'User' },
      });
      const account = await prisma.userAccount.create({
        data: { personId: person.id, loginIdentifier, status: 'ACTIVE' },
      });
      const identity = await prisma.identity.create({
        data: {
          type: IdentityType.INDIVIDUAL,
          userAccountId: account.id,
          personId: person.id,
          displayName: loginIdentifier,
        },
      });
      await prisma.identityOfficeholderLink.create({
        data: {
          identityId: identity.id,
          officeholderId,
          status: IdentityOfficeholderLinkStatus.ACTIVE,
        },
      });
      const session = await prisma.session.create({
        data: {
          identityId: identity.id,
          userAccountId: account.id,
          tokenHash: hashToken(`${loginIdentifier}-token`),
          status: 'ACTIVE',
          assuranceLevel: 'HIGH',
          issuedAt: new Date('2026-01-01'),
          expiresAt: new Date('2026-12-31'),
        },
      });

      return { identity, session };
    }

    const userA = await provisionIdentity('user.a@s2.test', officeholderA.id);
    const userB = await provisionIdentity('user.b@s2.test', officeholderB.id);

    const seedActorIdentity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'S2 Seed Actor' },
    });
    const governingSource = await prisma.governingSource.create({
      data: {
        code: 'S2-SRC',
        title: 'S2 Source',
        versionLabel: '1',
        status: GoverningSourceStatus.AUTHENTICATED,
        effectiveFrom: new Date('2020-01-01'),
        authenticatedAt: new Date('2020-01-01'),
        authenticatedByIdentityId: seedActorIdentity.id,
        contentHash: 's2-test-hash',
      },
    });

    const fn = await prisma.functionAuthorityRecord.create({
      data: {
        code: 'S2-FN',
        name: 'S2 Function',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.APPROVAL,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: institution.id,
        officeId: office.id,
        activatedAt: new Date('2020-01-01'),
        activatedByIdentityId: seedActorIdentity.id,
      },
    });
    await prisma.functionGoverningSource.create({
      data: {
        functionAuthorityRecordId: fn.id,
        governingSourceId: governingSource.id,
      },
    });
    await prisma.functionAuthorityAssignment.create({
      data: {
        functionAuthorityRecordId: fn.id,
        officeholderId: officeholderA.id,
        officeId: office.id,
        status: FunctionAssignmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });
    await prisma.authorityActionRight.create({
      data: {
        functionAuthorityRecordId: fn.id,
        action: AuthorityActionType.APPROVE,
        permitted: true,
      },
    });

    const delegationForB = await prisma.delegation.create({
      data: {
        institutionId: institution.id,
        recipientOfficeholderId: officeholderB.id,
        scopeDescription: 'B only',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });

    return {
      institution,
      office,
      officeholderA,
      officeholderB,
      appointmentA,
      appointmentB,
      expiredAppointmentA,
      futureAppointmentA,
      suspendedAppointmentA,
      userA,
      userB,
      fn,
      delegationForB,
    };
  }

  function sessionDto(session: { id: string; identityId: string; userAccountId: string | null }) {
    return {
      sessionId: session.id,
      identityId: session.identityId,
      userAccountId: session.userAccountId ?? undefined,
      assuranceLevel: 'HIGH' as const,
    };
  }

  async function expectBindingBlocked(
    session: { id: string; identityId: string; userAccountId: string | null },
    body: Record<string, unknown>,
    code: string,
  ) {
    try {
      await consequentialActionService.assertConsequentialActionAllowed(
        sessionDto(session),
        {
          action: AuthorityActionType.APPROVE,
          functionAuthorityRecordId: body.functionAuthorityRecordId as string,
          requireHumanActor: true,
        },
        { body },
      );
      throw new Error('Expected actor binding to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const response = (error as ForbiddenException).getResponse() as { code?: string };
      expect(response.code).toBe(code);
    }
  }

  it('1. User A cannot use User B appointment', async () => {
    const fixture = await seedUsersWithAppointments();
    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
        appointmentId: fixture.appointmentB.id,
      },
      ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_NOT_OWNED,
    );
  });

  it('2. User A cannot use officeholder record linked to User B', async () => {
    const fixture = await seedUsersWithAppointments();
    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderB.id,
        appointmentId: fixture.appointmentB.id,
      },
      ACTOR_BINDING_FAILURE_CODES.OFFICEHOLDER_NOT_LINKED,
    );
  });

  it('3. expired appointment fails', async () => {
    const fixture = await seedUsersWithAppointments();
    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
        appointmentId: fixture.expiredAppointmentA.id,
      },
      ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_REVOKED,
    );
  });

  it('4. future appointment fails', async () => {
    const fixture = await seedUsersWithAppointments();
    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
        appointmentId: fixture.futureAppointmentA.id,
      },
      ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_FUTURE,
    );
  });

  it('5. suspended appointment fails', async () => {
    const fixture = await seedUsersWithAppointments();
    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
        appointmentId: fixture.suspendedAppointmentA.id,
      },
      ACTOR_BINDING_FAILURE_CODES.APPOINTMENT_SUSPENDED,
    );
  });

  it('6. invalid delegation fails', async () => {
    const fixture = await seedUsersWithAppointments();
    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
        appointmentId: fixture.appointmentA.id,
        delegationId: fixture.delegationForB.id,
      },
      ACTOR_BINDING_FAILURE_CODES.DELEGATION_NOT_OWNED,
    );
  });

  it('7. subject identity in body cannot replace actor identity for authority evaluation', async () => {
    const fixture = await seedUsersWithAppointments();
    const actor = await actorContextService.resolveFromSessionContext({
      session: sessionDto(fixture.userA.session),
      at,
    });

    expect(() => {
      actorContextService.assertNoClientIdentitySubstitution(actor, {
        identityId: fixture.userB.identity.id,
      });
    }).toThrow('Client-supplied identityId does not match authenticated actor context');
  });

  it('8. multiple appointments require explicit appointmentId when configured', async () => {
    const fixture = await seedUsersWithAppointments();
    const secondOffice = await prisma.office.create({
      data: {
        departmentId: (
          await prisma.department.findFirstOrThrow({
            where: { institutionId: fixture.institution.id },
          })
        ).id,
        code: 'S2-OFF-2',
        name: 'Office 2',
      },
    });
    await prisma.appointment.create({
      data: {
        officeId: secondOffice.id,
        officeholderId: fixture.officeholderA.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });

    const actor = await actorContextService.resolveFromSessionContext({
      session: sessionDto(fixture.userA.session),
      at,
    });

    await expect(
      actorContextService.resolveBoundAppointment(actor, {
        officeholderId: fixture.officeholderA.id,
        requireExplicitAppointment: true,
      }),
    ).rejects.toMatchObject({ code: ACTOR_BINDING_FAILURE_CODES.AMBIGUOUS_APPOINTMENT });
  });

  it('9. no appointment means no institutional authority binding', async () => {
    const fixture = await seedUsersWithAppointments();
    await prisma.appointment.deleteMany({ where: { officeholderId: fixture.officeholderA.id } });

    await expectBindingBlocked(
      fixture.userA.session,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
      },
      ACTOR_BINDING_FAILURE_CODES.NO_CURRENT_APPOINTMENT,
    );
  });

  it('10. service identity cannot impersonate human officeholders', async () => {
    const fixture = await seedUsersWithAppointments();
    const serviceIdentity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'Service Actor' },
    });
    const serviceSession = await prisma.session.create({
      data: {
        identityId: serviceIdentity.id,
        tokenHash: hashToken('service-token'),
        status: 'ACTIVE',
        assuranceLevel: 'LOW',
        issuedAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
      },
    });

    await expectBindingBlocked(
      serviceSession,
      {
        functionAuthorityRecordId: fixture.fn.id,
        officeholderId: fixture.officeholderA.id,
        appointmentId: fixture.appointmentA.id,
      },
      ACTOR_BINDING_FAILURE_CODES.SERVICE_CANNOT_IMPERSONATE,
    );
  });

  it('positive: valid authenticated officeholder binding produces audit snapshot', async () => {
    const fixture = await seedUsersWithAppointments();
    const { evaluation, actorResolutionAudit } =
      await consequentialActionService.assertConsequentialActionAllowedWithAudit(
        sessionDto(fixture.userA.session),
        {
          action: AuthorityActionType.APPROVE,
          functionAuthorityRecordId: fixture.fn.id,
          requireHumanActor: true,
        },
        {
          body: {
            functionAuthorityRecordId: fixture.fn.id,
            officeholderId: fixture.officeholderA.id,
            appointmentId: fixture.appointmentA.id,
            at: at.toISOString(),
          },
        },
      );

    expect(evaluation.outcome).toBe(AuthorityEvaluationOutcome.ALLOW);
    expect(actorResolutionAudit).toEqual(
      expect.objectContaining({
        identityId: fixture.userA.identity.id,
        appointmentId: fixture.appointmentA.id,
        officeholderId: fixture.officeholderA.id,
        institutionId: fixture.institution.id,
      }),
    );
  });

  it('institutional actor resolver rejects cross-officeholder appointment ids', async () => {
    const fixture = await seedUsersWithAppointments();
    const resolver = app.get(InstitutionalActorResolver);

    const result = await resolver.resolve({
      identityId: fixture.userA.identity.id,
      officeholderId: fixture.officeholderA.id,
      appointmentId: fixture.appointmentB.id,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK,
      );
    }
  });
});
