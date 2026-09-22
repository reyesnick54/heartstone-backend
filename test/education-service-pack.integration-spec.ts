import { type INestApplication } from '@nestjs/common';
import { EducationGuardianRelationshipStatus, OrganizationStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { EducationInstitutionRegistryService } from '../src/education/profiles/education-institution-registry.service';
import { EducationStudentProfileService } from '../src/education/profiles/education-student-profile.service';
import { EDUCATION_SERVICE_PACK_TEMPLATE } from '../src/service-catalog/service-packs/education-service-pack.template';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Education service pack and experience (integration)', () => {
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

  it('validates the education service pack manifest', () => {
    const result = validateServicePackManifest(EDUCATION_SERVICE_PACK_TEMPLATE);
    expect(result.valid).toBe(true);
    expect(EDUCATION_SERVICE_PACK_TEMPLATE.services).toHaveLength(16);
  });

  it('exposes citizen education home for registered student', async () => {
    const student = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'student@test.local',
      password: 'Student123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'JUR-EDU-TEST', name: 'Education Test', type: 'NATIONAL', status: 'ACTIVE' },
    });

    const profiles = app.get(EducationStudentProfileService);
    const studentProfile = await profiles.ensureStudentProfile({
      subjectIdentityId: student.identityId,
      jurisdictionId: jurisdiction.id,
    });

    const home = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/education')
        .set('Authorization', `Bearer ${student.sessionToken}`)
        .expect(200)
    ).body as { ruleEnvironment: string; accessibleStudentProfiles: number };

    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
    expect(home.accessibleStudentProfiles).toBeGreaterThanOrEqual(1);
    expect(studentProfile.profileNumber).toMatch(/^EDU-STU-/);
  });

  it('denies student access to another student profile via guardian scope without active relationship', async () => {
    const studentA = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'student-a@test.local',
      password: 'StudentA123!',
    });
    const studentB = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'student-b@test.local',
      password: 'StudentB123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: 'JUR-EDU-ISO',
        name: 'Education Isolation',
        type: 'NATIONAL',
        status: 'ACTIVE',
      },
    });

    const profiles = app.get(EducationStudentProfileService);
    await profiles.ensureStudentProfile({
      subjectIdentityId: studentB.identityId,
      jurisdictionId: jurisdiction.id,
    });

    const guardianView = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/education/enrollments')
      .set('Authorization', `Bearer ${studentA.sessionToken}`)
      .expect(200);

    expect(guardianView.body).toEqual([]);
  });

  it('allows guardian to view dependent enrollments with active scoped relationship', async () => {
    const student = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'dependent-student@test.local',
      password: 'Dependent123!',
    });
    const guardian = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'guardian@test.local',
      password: 'Guardian123!',
    });

    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'JUR-EDU-GUARD', name: 'Guardian Test', type: 'NATIONAL', status: 'ACTIVE' },
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-SCHOOL-1', name: 'Test School', status: OrganizationStatus.ACTIVE },
    });

    const studentProfiles = app.get(EducationStudentProfileService);
    const studentProfile = await studentProfiles.ensureStudentProfile({
      subjectIdentityId: student.identityId,
      jurisdictionId: jurisdiction.id,
    });

    await prisma.educationGuardianRelationship.create({
      data: {
        guardianIdentityId: guardian.identityId,
        studentProfileId: studentProfile.id,
        relationshipType: 'CHILD',
        status: EducationGuardianRelationshipStatus.ACTIVE,
        authorizedScope: { viewDependentEnrollments: true },
      },
    });

    await prisma.educationEnrollmentRecord.create({
      data: {
        enrollmentReference: 'ENR-TEST-1',
        studentProfileId: studentProfile.id,
        institutionOrganizationId: organization.id,
        status: 'ACTIVE',
      },
    });

    const enrollments = (
      await request(app.getHttpServer())
        .get('/api/v1/experience/citizen/education/enrollments')
        .set('Authorization', `Bearer ${guardian.sessionToken}`)
        .expect(200)
    ).body as { enrollmentReference: string }[];

    expect(enrollments.some((item) => item.enrollmentReference === 'ENR-TEST-1')).toBe(true);
  });

  it('exposes business education home for institution organization member', async () => {
    const member = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'school-admin@test.local',
      password: 'SchoolAdmin123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-SCHOOL-2', name: 'School Org', status: OrganizationStatus.ACTIVE },
    });

    await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        identityId: member.identityId,
        status: 'ACTIVE',
        roleLabel: 'Administrator',
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const registry = app.get(EducationInstitutionRegistryService);
    await registry.ensureInstitutionRegistry({ organizationId: organization.id });

    const home = (
      await request(app.getHttpServer())
        .get(`/api/v1/experience/business/organizations/${organization.id}/education`)
        .set('Authorization', `Bearer ${member.sessionToken}`)
        .expect(200)
    ).body as { ruleEnvironment: string };

    expect(home.ruleEnvironment).toBe('NON_PRODUCTION');
  });

  it('denies business education access without organization relationship', async () => {
    const outsider = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'edu-outsider@test.local',
      password: 'Outsider123!',
    });

    const organization = await prisma.organization.create({
      data: { code: 'ORG-SCHOOL-3', name: 'School Org 3', status: OrganizationStatus.ACTIVE },
    });

    await app.get(EducationInstitutionRegistryService).ensureInstitutionRegistry({
      organizationId: organization.id,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/education`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });
});
