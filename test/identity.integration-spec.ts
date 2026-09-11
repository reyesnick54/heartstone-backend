import { type INestApplication } from '@nestjs/common';
import {
  AuthenticationMethodStatus,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityVerificationStatus,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  OrganizationStatus,
  OrganizationType,
  PersonStatus,
  RepresentativeAuthorityStatus,
  SessionStatus,
  UserAccountStatus,
} from '@prisma/client';

import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp } from './helpers/integration-app';

async function resetIdentityData(prisma: PrismaService): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.authenticationMethod.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.identity.deleteMany();
  await prisma.representativeAuthority.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.person.deleteMany();
}

describe('Identity & Access data model (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetIdentityData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('persists core identity relations across person, account, identity, and credential', async () => {
    const person = await prisma.person.create({
      data: {
        displayName: 'Jane Applicant',
        status: PersonStatus.ACTIVE,
      },
    });

    const userAccount = await prisma.userAccount.create({
      data: {
        personId: person.id,
        username: 'jane.applicant',
        status: UserAccountStatus.ACTIVE,
      },
    });

    const identity = await prisma.identity.create({
      data: {
        userAccountId: userAccount.id,
        providerCode: 'oidc-google',
        subjectId: 'google-subject-123',
        verificationStatus: IdentityVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    const credential = await prisma.credential.create({
      data: {
        userAccountId: userAccount.id,
        type: CredentialType.PASSWORD_HASH,
        credentialFingerprint: 'sha256:example-fingerprint',
        secretReference: 'vault:credentials/jane-applicant/password',
        status: CredentialStatus.ACTIVE,
      },
    });

    const loaded = await prisma.userAccount.findUnique({
      where: { id: userAccount.id },
      include: {
        person: true,
        identities: true,
        credentials: true,
      },
    });

    expect(loaded).toMatchObject({
      username: 'jane.applicant',
      person: { id: person.id, displayName: 'Jane Applicant' },
      identities: [{ id: identity.id, providerCode: 'oidc-google' }],
      credentials: [{ id: credential.id, credentialFingerprint: 'sha256:example-fingerprint' }],
    });
  });

  it('keeps Organization distinct from Institution at the database layer', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'ACME-CORP',
        name: 'Acme Corporation',
        type: OrganizationType.COMPANY,
        status: OrganizationStatus.ACTIVE,
      },
    });

    const institutionCount = await prisma.institution.count({
      where: { code: organization.code },
    });

    expect(institutionCount).toBe(0);
    expect(organization.code).toBe('ACME-CORP');
  });

  it('keeps UserAccount distinct from Officeholder at the database layer', async () => {
    const person = await prisma.person.create({
      data: { displayName: 'Separate Actor' },
    });

    const userAccount = await prisma.userAccount.create({
      data: {
        personId: person.id,
        username: 'separate.actor',
        status: UserAccountStatus.ACTIVE,
      },
    });

    const officeholder = await prisma.officeholder.create({
      data: {
        code: 'OH-SEPARATE',
        name: 'Separate Officeholder',
      },
    });

    expect(userAccount.personId).toBe(person.id);
    expect(officeholder.code).toBe('OH-SEPARATE');

    const linkedAppointmentCount = await prisma.appointment.count({
      where: { officeholderId: officeholder.id },
    });
    expect(linkedAppointmentCount).toBe(0);
  });

  it('creates RepresentativeAuthority without creating Appointment or Delegation records', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'PARTNER-ORG',
        name: 'Partner Organization',
        type: OrganizationType.IMPLEMENTATION_PARTNER,
      },
    });

    const person = await prisma.person.create({
      data: { displayName: 'Authorized Representative' },
    });

    const representativeAuthority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        personId: person.id,
        mandateReference: 'MANDATE-2026-001',
        scopeDescription: 'Submit applications on behalf of partner organization',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const appointmentCount = await prisma.appointment.count();
    const delegationCount = await prisma.delegation.count();

    expect(representativeAuthority.mandateReference).toBe('MANDATE-2026-001');
    expect(appointmentCount).toBe(0);
    expect(delegationCount).toBe(0);
  });

  it('supports session lifecycle states for active, expired, and revoked sessions', async () => {
    const person = await prisma.person.create({
      data: { displayName: 'Session User' },
    });

    const userAccount = await prisma.userAccount.create({
      data: {
        personId: person.id,
        username: 'session.user',
        status: UserAccountStatus.ACTIVE,
      },
    });

    const activeSession = await prisma.session.create({
      data: {
        userAccountId: userAccount.id,
        status: SessionStatus.ACTIVE,
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        ipAddress: '127.0.0.1',
        userAgent: 'integration-test',
      },
    });

    const expiredSession = await prisma.session.create({
      data: {
        userAccountId: userAccount.id,
        status: SessionStatus.EXPIRED,
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    });

    const revokedSession = await prisma.session.create({
      data: {
        userAccountId: userAccount.id,
        status: SessionStatus.REVOKED,
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        revokedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    const sessions = await prisma.session.findMany({
      where: { userAccountId: userAccount.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(sessions).toHaveLength(3);
    expect(sessions.map((session) => session.status)).toEqual([
      SessionStatus.ACTIVE,
      SessionStatus.EXPIRED,
      SessionStatus.REVOKED,
    ]);
    expect(activeSession.status).toBe(SessionStatus.ACTIVE);
    expect(expiredSession.status).toBe(SessionStatus.EXPIRED);
    expect(revokedSession.revokedAt).not.toBeNull();
  });

  it('supports organization membership and authentication method records', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'MEMBER-ORG',
        name: 'Member Organization',
        type: OrganizationType.APPLICANT_ORGANIZATION,
      },
    });

    const person = await prisma.person.create({
      data: { displayName: 'Member Person' },
    });

    const userAccount = await prisma.userAccount.create({
      data: {
        personId: person.id,
        username: 'member.person',
        status: UserAccountStatus.ACTIVE,
      },
    });

    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        personId: person.id,
        userAccountId: userAccount.id,
        role: OrganizationMembershipRole.ADMINISTRATOR,
        status: OrganizationMembershipStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const authenticationMethod = await prisma.authenticationMethod.create({
      data: {
        userAccountId: userAccount.id,
        type: AuthenticationMethodType.OIDC,
        providerCode: 'oidc-azure',
        status: AuthenticationMethodStatus.ACTIVE,
      },
    });

    expect(membership.organizationId).toBe(organization.id);
    expect(authenticationMethod.providerCode).toBe('oidc-azure');
  });
});
