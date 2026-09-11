import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  DelegationStatus,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';

import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../src/authority/authority.constants';
import { InstitutionalActorResolver } from '../src/authority/institutional-actor/institutional-actor-resolver.service';
import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 4C institutional actor resolution (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let resolver: InstitutionalActorResolver;

  const at = new Date('2026-06-01T12:00:00.000Z');

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    resolver = app.get(InstitutionalActorResolver);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedFixture(options?: {
    requiresDelegation?: boolean;
    permittedActions?: AuthorityActionType[];
  }) {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'AG', name: 'Antigua', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'FIN',
        name: 'Finance Ministry',
        type: 'MINISTRY',
      },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'LIC', name: 'Licensing' },
    });
    const office = await prisma.office.create({
      data: { departmentId: department.id, code: 'DIR', name: 'Director' },
    });
    const officeholder = await prisma.officeholder.create({
      data: { code: 'OH-001', name: 'Jane Director' },
    });
    const appointment = await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });
    const person = await prisma.person.create({
      data: { givenName: 'Jane', familyName: 'Director' },
    });
    const account = await prisma.userAccount.create({
      data: {
        personId: person.id,
        loginIdentifier: 'jane@test.gov',
        status: 'ACTIVE',
      },
    });
    const identity = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        userAccountId: account.id,
        personId: person.id,
        displayName: 'Jane Director',
      },
    });
    const officeholderLink = await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    const functionRecord = await prisma.functionAuthorityRecord.create({
      data: {
        code: 'LICENSE.ISSUE',
        name: 'Issue License',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.LICENSING,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: institution.id,
        officeId: office.id,
        requiresDelegation: options?.requiresDelegation ?? false,
      },
    });
    const permitted = options?.permittedActions ?? [AuthorityActionType.DECIDE];
    for (const action of permitted) {
      await prisma.authorityActionRight.create({
        data: {
          functionAuthorityRecordId: functionRecord.id,
          action,
          permitted: true,
        },
      });
    }
    const assignment = await prisma.functionAuthorityAssignment.create({
      data: {
        functionAuthorityRecordId: functionRecord.id,
        officeId: office.id,
        status: FunctionAssignmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    });

    return {
      identityId: identity.id,
      officeholderLinkId: officeholderLink.id,
      officeholderId: officeholder.id,
      appointmentId: appointment.id,
      officeId: office.id,
      departmentId: department.id,
      institutionId: institution.id,
      functionAuthorityRecordId: functionRecord.id,
      assignmentId: assignment.id,
    };
  }

  async function seedDelegation(
    fixture: Awaited<ReturnType<typeof seedFixture>>,
    options?: {
      status?: DelegationStatus;
      effectiveUntil?: Date | null;
      recipientOfficeholderId?: string | null;
      allowedActionTypes?: AuthorityActionType[];
      includeStructuredScope?: boolean;
    },
  ) {
    const delegation = await prisma.delegation.create({
      data: {
        institutionId: fixture.institutionId,
        delegatorOfficeId: fixture.officeId,
        recipientOfficeholderId:
          options?.recipientOfficeholderId === undefined
            ? fixture.officeholderId
            : options.recipientOfficeholderId,
        scopeDescription: 'Delegated licensing authority',
        status: options?.status ?? DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil:
          options?.effectiveUntil === undefined
            ? new Date('2026-12-31')
            : options.effectiveUntil,
      },
    });

    if (options?.includeStructuredScope !== false) {
      await prisma.delegationStructuredScope.create({
        data: {
          delegationId: delegation.id,
          functionAuthorityRecordId: fixture.functionAuthorityRecordId,
          allowedActionTypes: options?.allowedActionTypes ?? [AuthorityActionType.DECIDE],
        },
      });
    }

    return delegation.id;
  }

  it('fails when authenticated user has no officeholder link', async () => {
    const fixture = await seedFixture();
    await prisma.identityOfficeholderLink.deleteMany();

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK,
    );
  });

  it('fails when officeholder link exists without appointment', async () => {
    const fixture = await seedFixture();
    await prisma.appointment.deleteMany();

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_APPOINTMENT,
    );
  });

  it('fails for expired appointments', async () => {
    const fixture = await seedFixture();
    await prisma.appointment.update({
      where: { id: fixture.appointmentId },
      data: { effectiveUntil: new Date('2026-01-01') },
    });

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_APPOINTMENT,
    );
  });

  it('fails for suspended appointments', async () => {
    const fixture = await seedFixture();
    await prisma.appointment.update({
      where: { id: fixture.appointmentId },
      data: { status: AppointmentStatus.SUSPENDED },
    });

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.SUSPENDED_APPOINTMENT,
    );
  });

  it('fails when institutional context office does not match', async () => {
    const fixture = await seedFixture();

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      officeId: '00000000-0000-4000-8000-000000000099',
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_OFFICE);
    }
  });

  it('fails when institutional context department does not match', async () => {
    const fixture = await seedFixture();

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      departmentId: '00000000-0000-4000-8000-000000000099',
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.WRONG_DEPARTMENT);
    }
  });

  it('resolves a correct current appointment chain', async () => {
    const fixture = await seedFixture();

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      officeId: fixture.officeId,
      departmentId: fixture.departmentId,
      institutionId: fixture.institutionId,
      at,
    });

    expect(result.resolved).toBe(true);
    expect(result.officeholderId).toBe(fixture.officeholderId);
    expect(result.assignmentId).toBe(fixture.assignmentId);
    expect(result.grantedActionTypes).toContain(AuthorityActionType.DECIDE);
  });

  it('fails delegated function without delegation', async () => {
    const fixture = await seedFixture({ requiresDelegation: true });

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      requiresDelegation: true,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION);
    }
  });

  it('fails for expired delegations', async () => {
    const fixture = await seedFixture({ requiresDelegation: true });
    await seedDelegation(fixture, { effectiveUntil: new Date('2026-01-01') });

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      requiresDelegation: true,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.EXPIRED_DELEGATION);
    }
  });

  it('fails for revoked delegations', async () => {
    const fixture = await seedFixture({ requiresDelegation: true });
    await seedDelegation(fixture, { status: DelegationStatus.REVOKED });

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      requiresDelegation: true,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.REVOKED_DELEGATION);
    }
  });

  it('fails for wrong delegation recipient', async () => {
    const fixture = await seedFixture({ requiresDelegation: true });
    const other = await prisma.officeholder.create({
      data: { code: 'OH-OTHER', name: 'Other' },
    });
    await seedDelegation(fixture, { recipientOfficeholderId: other.id });

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      requiresDelegation: true,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_DELEGATION);
    }
  });

  it('fails when delegation scope does not include requested action', async () => {
    const fixture = await seedFixture({ requiresDelegation: true });
    await seedDelegation(fixture, { allowedActionTypes: [AuthorityActionType.SIGN] });

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      requiresDelegation: true,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_MISMATCH,
      );
    }
  });

  it('fails when delegation lacks structured scope', async () => {
    const fixture = await seedFixture({ requiresDelegation: true });
    await seedDelegation(fixture, { includeStructuredScope: false });

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      requiresDelegation: true,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.DELEGATION_SCOPE_UNRESOLVED,
      );
    }
  });

  it('does not allow OIDC admin claims to bypass the institutional chain', async () => {
    const fixture = await seedFixture();
    await prisma.identityOfficeholderLink.deleteMany();

    const result = await resolver.resolve({
      identityId: fixture.identityId,
      externalClaims: { roles: ['admin'] },
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_OFFICEHOLDER_LINK,
      );
    }
  });

  it('does not allow service identities to impersonate officeholders', async () => {
    await seedFixture();
    const serviceIdentity = await prisma.identity.create({
      data: { type: IdentityType.SERVICE, displayName: 'Batch Service' },
    });

    const result = await resolver.resolve({
      identityId: serviceIdentity.id,
      at,
    });

    expect(result).toHaveProperty('failure');
    if ('failure' in result) {
      expect(result.failure.code).toBe(
        AUTHORITY_EVALUATION_EXPLANATION_CODES.SERVICE_IDENTITY_NOT_HUMAN,
      );
    }
  });

  it('fails when assignment lacks requested DECIDE right', async () => {
    const fixture = await seedFixture({ permittedActions: [AuthorityActionType.REVIEW] });

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ACTION_RIGHT,
    );
  });

  it('does not treat SIGN right as DECIDE', async () => {
    const fixture = await seedFixture({ permittedActions: [AuthorityActionType.SIGN] });

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.DECIDE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ACTION_RIGHT,
    );
  });

  it('does not treat DECIDE right as ISSUE', async () => {
    const fixture = await seedFixture({ permittedActions: [AuthorityActionType.DECIDE] });

    const result = await resolver.resolveActorAuthority({
      identityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      requestedAction: AuthorityActionType.ISSUE,
      at,
    });

    expect(result.resolved).toBe(false);
    expect(result.failureReasons).toContain(
      AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_ACTION_RIGHT,
    );
  });
});
