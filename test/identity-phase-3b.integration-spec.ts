import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  CredentialStatus,
  IdentityType,
  MembershipStatus,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import {
  asCredentialBody,
  asIdentityBody,
  asIdentityListBody,
  asMembershipBody,
  asOrganizationBody,
  asPersonBody,
  asRepresentativeAuthorityBody,
  asUserAccountBody,
} from './helpers/identity-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 3B Identity administration (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates person, account, and identity with linkage', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Alex', familyName: 'Rivera' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const accountRes = await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({
        loginIdentifier: 'alex.rivera@test.gov',
        personId: person.id,
        status: AccountStatus.PENDING,
      })
      .expect(201);
    const account = asUserAccountBody(accountRes.body);
    expect(account.status).toBe(AccountStatus.PENDING);

    const activatedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/user-accounts/${account.id}/activate`)
      .expect(200);
    expect(asUserAccountBody(activatedRes.body).status).toBe(AccountStatus.ACTIVE);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'Alex Rivera',
        userAccountId: account.id,
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/identity/identities?userAccountId=${account.id}`)
      .expect(200);

    const identities = asIdentityListBody(listRes.body);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.id).toBe(identity.id);
  });

  it('rejects duplicate user account login identifiers', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({ loginIdentifier: 'dup@test.gov' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({ loginIdentifier: 'dup@test.gov' })
      .expect(409);
  });

  it('manages organization membership lifecycle', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/identity/organizations')
      .send({ code: 'LIFECYCLE-ORG', name: 'Lifecycle Org' })
      .expect(201);
    const org = asOrganizationBody(orgRes.body);

    const activatedOrgRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/organizations/${org.id}/activate`)
      .expect(200);
    expect(asOrganizationBody(activatedOrgRes.body).status).toBe(OrganizationStatus.ACTIVE);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.ORGANIZATION,
        displayName: 'Lifecycle Org Identity',
        organizationId: org.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    const membershipRes = await request(app.getHttpServer())
      .post('/api/v1/identity/memberships')
      .send({
        organizationId: org.id,
        identityId: identity.id,
        roleLabel: 'admin',
      })
      .expect(201);
    const membership = asMembershipBody(membershipRes.body);

    const suspendedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/memberships/${membership.id}/suspend`)
      .expect(200);
    expect(asMembershipBody(suspendedRes.body).status).toBe(MembershipStatus.SUSPENDED);

    const reactivatedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/memberships/${membership.id}/activate`)
      .expect(200);
    expect(asMembershipBody(reactivatedRes.body).status).toBe(MembershipStatus.ACTIVE);

    const endedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/memberships/${membership.id}/end`)
      .expect(200);
    const ended = asMembershipBody(endedRes.body);
    expect(ended.status).toBe(MembershipStatus.REVOKED);
    expect(ended.effectiveUntil).toBeDefined();
  });

  it('manages representative authority lifecycle', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/identity/organizations')
      .send({ code: 'REP-ORG', name: 'Rep Org' })
      .expect(201);
    const org = asOrganizationBody(orgRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.ORGANIZATION,
        displayName: 'Rep Org Identity',
        organizationId: org.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    const repRes = await request(app.getHttpServer())
      .post('/api/v1/identity/representative-authorities')
      .send({
        organizationId: org.id,
        identityId: identity.id,
        scopeDescription: 'Submit filings',
        effectiveFrom: new Date().toISOString(),
      })
      .expect(201);
    const rep = asRepresentativeAuthorityBody(repRes.body);

    const endedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/representative-authorities/${rep.id}/end`)
      .expect(200);
    expect(asRepresentativeAuthorityBody(endedRes.body).status).toBe(
      RepresentativeAuthorityStatus.ENDED,
    );
  });

  it('creates credential metadata without exposing secrets', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'Cred', familyName: 'User' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'Credential User',
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: identity.id,
        type: 'PASSWORD',
        password: 'SecurePass123!',
        status: CredentialStatus.PENDING,
      })
      .expect(201);
    const credential = asCredentialBody(createRes.body);

    expect(credential).not.toHaveProperty('secretHash');
    expect(credential).not.toHaveProperty('password');

    const activatedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/credentials/${credential.id}/activate`)
      .expect(200);
    expect(asCredentialBody(activatedRes.body).status).toBe(CredentialStatus.ACTIVE);

    const suspendedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/credentials/${credential.id}/suspend`)
      .expect(200);
    expect(asCredentialBody(suspendedRes.body).status).toBe(CredentialStatus.PENDING);

    const revokedRes = await request(app.getHttpServer())
      .patch(`/api/v1/identity/credentials/${credential.id}/revoke`)
      .expect(200);
    expect(asCredentialBody(revokedRes.body).status).toBe(CredentialStatus.REVOKED);

    await request(app.getHttpServer())
      .patch(`/api/v1/identity/credentials/${credential.id}/revoke`)
      .expect(400);
  });

  it('returns validation failures for invalid identity type consistency', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.ORGANIZATION,
        displayName: 'Missing org ref',
      })
      .expect(400);
  });

  it('returns not found for missing records', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/identity/user-accounts/00000000-0000-4000-8000-000000000001')
      .expect(404);
  });

  it('does not create Appointment when creating OrganizationMembership', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/identity/organizations')
      .send({ code: 'BOUNDARY-ORG', name: 'Boundary Org' })
      .expect(201);
    const org = asOrganizationBody(orgRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.ORGANIZATION,
        displayName: 'Boundary Identity',
        organizationId: org.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/memberships')
      .send({ organizationId: org.id, identityId: identity.id })
      .expect(201);

    const appointmentCount = await prisma.appointment.count();
    expect(appointmentCount).toBe(0);
  });

  it('does not create Delegation when creating RepresentativeAuthority', async () => {
    const orgRes = await request(app.getHttpServer())
      .post('/api/v1/identity/organizations')
      .send({ code: 'REP-BOUNDARY', name: 'Rep Boundary Org' })
      .expect(201);
    const org = asOrganizationBody(orgRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.ORGANIZATION,
        displayName: 'Rep Boundary Identity',
        organizationId: org.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/representative-authorities')
      .send({
        organizationId: org.id,
        identityId: identity.id,
        scopeDescription: 'External representation only',
        effectiveFrom: new Date().toISOString(),
      })
      .expect(201);

    const delegationCount = await prisma.delegation.count();
    expect(delegationCount).toBe(0);
  });

  it('does not create Officeholder when creating UserAccount', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/identity/user-accounts')
      .send({ loginIdentifier: 'no-officeholder@test.gov', status: AccountStatus.ACTIVE })
      .expect(201);

    const officeholderCount = await prisma.officeholder.count();
    expect(officeholderCount).toBe(0);
  });

  it('does not create government Permission or Authority when creating Credential', async () => {
    const personRes = await request(app.getHttpServer())
      .post('/api/v1/identity/persons')
      .send({ givenName: 'No', familyName: 'Authority' })
      .expect(201);
    const person = asPersonBody(personRes.body);

    const identityRes = await request(app.getHttpServer())
      .post('/api/v1/identity/identities')
      .send({
        type: IdentityType.INDIVIDUAL,
        displayName: 'No Authority',
        personId: person.id,
      })
      .expect(201);
    const identity = asIdentityBody(identityRes.body);

    await request(app.getHttpServer())
      .post('/api/v1/identity/credentials')
      .send({
        identityId: identity.id,
        type: 'PASSWORD',
        password: 'SecurePass123!',
      })
      .expect(201);

    const appointmentCount = await prisma.appointment.count();
    const delegationCount = await prisma.delegation.count();
    expect(appointmentCount).toBe(0);
    expect(delegationCount).toBe(0);
  });
});
