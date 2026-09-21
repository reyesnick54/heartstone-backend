import {
  AppointmentStatus,
  AssuranceLevel,
  DelegationStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  MembershipStatus,
  RepresentativeAuthorityStatus,
  SessionStatus,
} from '@prisma/client';

import { ActorContextService } from './actor-context.service';
import { FORBIDDEN_ACTOR_CONTEXT_AUTHORITY_FIELDS } from './actor-context.types';

describe('ActorContextService', () => {
  const at = new Date('2026-06-01T12:00:00.000Z');

  const prisma = {
    session: { findUnique: jest.fn() },
    identity: { findUnique: jest.fn() },
    organizationMembership: { findMany: jest.fn() },
    representativeAuthority: { findMany: jest.fn() },
    identityOfficeholderLink: { findMany: jest.fn() },
    appointment: { findMany: jest.fn() },
    delegation: { findMany: jest.fn() },
  };

  const service = new ActorContextService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockSession(overrides: Record<string, unknown> = {}) {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      identityId: 'identity-1',
      userAccountId: 'account-1',
      status: SessionStatus.ACTIVE,
      assuranceLevel: AssuranceLevel.LOW,
      issuedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-12-31'),
      lastUsedAt: null,
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      userAccount: { status: 'ACTIVE' },
      ...overrides,
    });
  }

  function mockIdentity(overrides: Record<string, unknown> = {}) {
    prisma.identity.findUnique.mockResolvedValue({
      id: 'identity-1',
      type: IdentityType.INDIVIDUAL,
      userAccountId: 'account-1',
      personId: 'person-1',
      ...overrides,
    });
  }

  it('resolves actor context from server session without authority fields', async () => {
    mockSession();
    mockIdentity();
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    prisma.representativeAuthority.findMany.mockResolvedValue([]);
    prisma.identityOfficeholderLink.findMany.mockResolvedValue([]);

    const actor = await service.resolveFromSessionContext({
      session: {
        sessionId: 'session-1',
        identityId: 'identity-1',
        userAccountId: 'account-1',
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.identityId).toBe('identity-1');
    expect(actor.sessionId).toBe('session-1');
    expect(actor.hasInstitutionalRelationships).toBe(false);

    for (const field of FORBIDDEN_ACTOR_CONTEXT_AUTHORITY_FIELDS) {
      expect(actor).not.toHaveProperty(field);
    }
  });

  it('rejects actor context construction without server session identifiers', async () => {
    await expect(
      service.resolveFromSessionContext({
        session: {
          sessionId: '',
          identityId: 'identity-1',
          assuranceLevel: AssuranceLevel.LOW,
        },
      }),
    ).rejects.toThrow('Actor context requires server-derived session identity');
  });

  it('rejects revoked sessions', async () => {
    mockSession({ status: SessionStatus.REVOKED });

    await expect(
      service.resolveFromSessionContext({
        session: {
          sessionId: 'session-1',
          identityId: 'identity-1',
          assuranceLevel: AssuranceLevel.LOW,
        },
      }),
    ).rejects.toThrow('Session has been revoked');
  });

  it('rejects expired sessions', async () => {
    mockSession({ expiresAt: new Date('2020-01-01') });

    await expect(
      service.resolveFromSessionContext({
        session: {
          sessionId: 'session-1',
          identityId: 'identity-1',
          assuranceLevel: AssuranceLevel.LOW,
        },
        at,
      }),
    ).rejects.toThrow('Session has expired');
  });

  it('rejects suspended accounts', async () => {
    mockSession({ userAccount: { status: 'SUSPENDED' } });

    await expect(
      service.resolveFromSessionContext({
        session: {
          sessionId: 'session-1',
          identityId: 'identity-1',
          assuranceLevel: AssuranceLevel.LOW,
        },
      }),
    ).rejects.toThrow('Account is not active');
  });

  it('excludes revoked officeholder links and expired appointments', async () => {
    mockSession();
    mockIdentity();
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    prisma.representativeAuthority.findMany.mockResolvedValue([]);
    prisma.identityOfficeholderLink.findMany.mockResolvedValue([
      {
        id: 'link-active',
        officeholderId: 'oh-active',
        status: IdentityOfficeholderLinkStatus.ACTIVE,
        linkedAt: new Date('2026-01-01'),
      },
    ]);
    prisma.appointment.findMany.mockResolvedValue([
      {
        id: 'appt-expired',
        officeholderId: 'oh-active',
        officeId: 'office-1',
        status: AppointmentStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2020-12-31'),
        office: { departmentId: 'dept-1', department: { institutionId: 'inst-1' } },
      },
      {
        id: 'appt-active',
        officeholderId: 'oh-active',
        officeId: 'office-2',
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
        office: { departmentId: 'dept-2', department: { institutionId: 'inst-1' } },
      },
    ]);
    prisma.delegation.findMany.mockResolvedValue([
      {
        id: 'deleg-expired',
        institutionId: 'inst-1',
        recipientOfficeholderId: 'oh-active',
        recipientOfficeId: null,
        status: DelegationStatus.ENDED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2020-12-31'),
      },
      {
        id: 'deleg-active',
        institutionId: 'inst-1',
        recipientOfficeholderId: 'oh-active',
        recipientOfficeId: null,
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: new Date('2026-12-31'),
      },
    ]);

    const actor = await service.resolveFromSessionContext({
      session: {
        sessionId: 'session-1',
        identityId: 'identity-1',
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.officeholderLinks).toHaveLength(1);
    expect(actor.activeAppointments).toHaveLength(1);
    expect(actor.activeAppointments[0]?.appointmentId).toBe('appt-active');
    expect(actor.activeDelegations).toHaveLength(1);
    expect(actor.activeDelegations[0]?.delegationId).toBe('deleg-active');
    expect(actor.hasInstitutionalRelationships).toBe(true);
  });

  it('does not attach officeholder context to service identities', async () => {
    mockSession();
    mockIdentity({ type: IdentityType.SERVICE, personId: null, userAccountId: null });
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    prisma.representativeAuthority.findMany.mockResolvedValue([]);

    const actor = await service.resolveFromSessionContext({
      session: {
        sessionId: 'session-1',
        identityId: 'identity-1',
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(prisma.identityOfficeholderLink.findMany).not.toHaveBeenCalled();
    expect(actor.officeholderLinks).toEqual([]);
    expect(actor.activeAppointments).toEqual([]);
    expect(actor.hasInstitutionalRelationships).toBe(false);
  });

  it('returns no institutional context when identity lacks officeholder linkage', async () => {
    mockSession();
    mockIdentity();
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    prisma.representativeAuthority.findMany.mockResolvedValue([]);
    prisma.identityOfficeholderLink.findMany.mockResolvedValue([]);

    const actor = await service.resolveFromSessionContext({
      session: {
        sessionId: 'session-1',
        identityId: 'identity-1',
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.hasInstitutionalRelationships).toBe(false);
    expect(actor.institutionContexts).toEqual([]);
  });

  it('includes active organization memberships and representative authorities', async () => {
    mockSession();
    mockIdentity();
    prisma.organizationMembership.findMany.mockResolvedValue([
      {
        id: 'mem-1',
        organizationId: 'org-1',
        roleLabel: 'Member',
        status: MembershipStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);
    prisma.representativeAuthority.findMany.mockResolvedValue([
      {
        id: 'rep-1',
        organizationId: 'org-1',
        scopeDescription: 'Submit applications',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
      },
    ]);
    prisma.identityOfficeholderLink.findMany.mockResolvedValue([]);

    const actor = await service.resolveFromSessionContext({
      session: {
        sessionId: 'session-1',
        identityId: 'identity-1',
        assuranceLevel: AssuranceLevel.LOW,
      },
      at,
    });

    expect(actor.organizationMemberships).toHaveLength(1);
    expect(actor.representativeAuthorities).toHaveLength(1);
  });

  it('rejects client identity substitution attempts', () => {
    const actor = {
      identityId: 'identity-1',
      userAccountId: 'account-1',
      personId: 'person-1',
      sessionId: 'session-1',
    } as never;

    expect(() => {
      service.assertNoClientIdentitySubstitution(actor, { identityId: 'identity-2' });
    }).toThrow('Client-supplied identityId does not match authenticated actor context');
  });

  it('assertServerDerivedSession rejects body-only identifiers', () => {
    expect(() => {
      service.assertServerDerivedSession(null);
    }).toThrow('Actor context requires authenticated server-derived session context');
  });
});
