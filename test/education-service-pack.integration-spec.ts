import { type INestApplication } from '@nestjs/common';
import {
  EducationInstitutionKind,
  EnrollmentRecordStatus,
  GuardianEducationRelationshipKind,
  GuardianEducationRelationshipStatus,
  OrganizationStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { STUDENT_EDUCATION_PROFILE_PREFIX } from '../src/education/education.constants';
import { EducationInstitutionService } from '../src/education/institutions/education-institution.service';
import { StudentEducationProfileService } from '../src/education/students/student-education-profile.service';
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

    const profiles = app.get(StudentEducationProfileService);
    const { profile: studentProfile } = await profiles.createStudentEducationProfile({
      studentIdentityId: student.identityId,
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
    expect(studentProfile.profileReferenceNumber).toMatch(
      new RegExp(`^${STUDENT_EDUCATION_PROFILE_PREFIX}-`),
    );
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

    const profiles = app.get(StudentEducationProfileService);
    await profiles.createStudentEducationProfile({
      studentIdentityId: studentB.identityId,
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

    const institutions = app.get(EducationInstitutionService);
    const { institution } = await institutions.registerInstitution({
      organizationId: organization.id,
      jurisdictionId: jurisdiction.id,
      institutionKind: EducationInstitutionKind.PUBLIC_INSTITUTION,
    });

    const studentProfiles = app.get(StudentEducationProfileService);
    const { profile: studentProfile } = await studentProfiles.createStudentEducationProfile({
      studentIdentityId: student.identityId,
      jurisdictionId: jurisdiction.id,
    });

    await prisma.guardianEducationRelationship.create({
      data: {
        guardianIdentityId: guardian.identityId,
        studentEducationProfileId: studentProfile.id,
        relationshipKind: GuardianEducationRelationshipKind.PARENT,
        status: GuardianEducationRelationshipStatus.ACTIVE,
        authorizedAccessScopes: { viewEnrollmentSummary: true },
      },
    });

    await prisma.enrollmentRecord.create({
      data: {
        enrollmentReference: 'ENR-TEST-1',
        studentEducationProfileId: studentProfile.id,
        educationInstitutionId: institution.id,
        status: EnrollmentRecordStatus.ACTIVE,
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

    const institutions = app.get(EducationInstitutionService);
    await institutions.registerInstitution({
      organizationId: organization.id,
      institutionKind: EducationInstitutionKind.PRIVATE_INSTITUTION,
    });

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

    await app.get(EducationInstitutionService).registerInstitution({
      organizationId: organization.id,
      institutionKind: EducationInstitutionKind.PRIVATE_INSTITUTION,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${organization.id}/education`)
      .set('Authorization', `Bearer ${outsider.sessionToken}`)
      .expect(403);
  });
});
