import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  ApplicationStatus,
  MembershipStatus,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
  StrategicProjectMilestoneStatus,
  WorkflowDefinitionStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { CaseFoundationService } from '../../src/application-processing/cases/case-foundation.service';
import { type PrismaService } from '../../src/database/prisma.service';
import { StrategicProjectProfileService } from '../../src/intelligence/strategic-projects/strategic-project-profile.service';
import { provisionAuthenticatedIdentity } from './identity-provisioning.fixture';
import { executeGovernmentDecision } from './phase-8-test-fixtures';
import { type Phase11FixtureContext, seedPhase11Fixture } from './phase-11-test-fixtures';

export const NON_PRODUCTION_BUSINESS_EXPERIENCE_MARKER = 'NON_PRODUCTION_BUSINESS_EXPERIENCE';

export interface BusinessExperienceFixtureContext {
  organizationId: string;
  memberIdentityId: string;
  memberSessionToken: string;
  representativeIdentityId: string;
  representativeSessionToken: string;
  outsiderIdentityId: string;
  outsiderSessionToken: string;
  applicationId: string;
  caseId: string;
  phase11Base: Phase11FixtureContext;
  otherOrganizationId: string;
  otherProjectId: string;
  institutionId: string;
  departmentId: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  configurationFingerprint: string;
  formDefinitionId: string;
  formVersionId: string;
  officialSessionToken: string;
  masterAdministrativeFileId: string;
  governmentDecisionId: string;
}

export async function seedBusinessExperienceFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<BusinessExperienceFixtureContext> {
  const marker = NON_PRODUCTION_BUSINESS_EXPERIENCE_MARKER;
  const base = await seedPhase11Fixture(app, prisma);

  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: base.caseId },
    select: { applicationId: true },
  });

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: caseRecord.applicationId },
    select: {
      formDefinitionId: true,
      formVersionId: true,
      configurationFingerprint: true,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      code: `${marker}-ORG`,
      name: 'Acme Business Ltd',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const otherOrganization = await prisma.organization.create({
    data: {
      code: `${marker}-OTHER-ORG`,
      name: 'Other Investor Corp',
      status: OrganizationStatus.ACTIVE,
    },
  });

  const member = await provisionAuthenticatedIdentity(app, prisma, {
    loginIdentifier: `${marker}-member@test.gov`,
    password: 'BusinessTest123!',
    givenName: 'Business',
    familyName: 'Member',
    displayName: 'Business Member',
  });

  const representative = await provisionAuthenticatedIdentity(app, prisma, {
    loginIdentifier: `${marker}-rep@test.gov`,
    password: 'BusinessTest123!',
    givenName: 'Business',
    familyName: 'Representative',
    displayName: 'Business Representative',
  });

  const outsider = await provisionAuthenticatedIdentity(app, prisma, {
    loginIdentifier: `${marker}-outsider@test.gov`,
    password: 'BusinessTest123!',
    givenName: 'Outside',
    familyName: 'Actor',
    displayName: 'Outside Actor',
  });

  await prisma.organizationMembership.create({
    data: {
      organizationId: organization.id,
      identityId: member.identityId,
      roleLabel: 'Director',
      status: MembershipStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const representativeAuthority = await prisma.representativeAuthority.create({
    data: {
      organizationId: organization.id,
      identityId: representative.identityId,
      scopeDescription: 'Licensing and compliance filings',
      status: RepresentativeAuthorityStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.application.update({
    where: { id: caseRecord.applicationId },
    data: {
      organizationId: organization.id,
      representativeAuthorityId: representativeAuthority.id,
      applicantCategory: ApplicantCategory.BUSINESS,
      applicantIdentityId: representative.identityId,
    },
  });

  await prisma.case.update({
    where: { id: base.caseId },
    data: { applicantIdentityId: representative.identityId },
  });

  const governmentDecision = await executeGovernmentDecision(app, base, 'APPROVED', {
    matterDecided: 'Business experience fixture decision',
  });

  const foundation = app.get(CaseFoundationService);

  const otherApplication = await prisma.application.create({
    data: {
      applicantIdentityId: member.identityId,
      organizationId: otherOrganization.id,
      governmentServiceId: base.governmentServiceId,
      governmentServiceVersionId: base.governmentServiceVersionId,
      formDefinitionId: application.formDefinitionId,
      formVersionId: application.formVersionId,
      configurationFingerprint: application.configurationFingerprint,
      applicantCategory: ApplicantCategory.INVESTOR,
      status: ApplicationStatus.SUBMITTED,
    },
  });

  await prisma.workflowDefinition.updateMany({
    where: { governmentServiceId: base.governmentServiceId },
    data: { status: WorkflowDefinitionStatus.APPROVED },
  });

  const otherCase = await foundation.openCaseFromApplication({
    applicationId: otherApplication.id,
    actorIdentityId: base.officialIdentityId,
  });

  const profileService = app.get(StrategicProjectProfileService);
  const otherProject = await profileService.createProfile({
    projectCode: `${marker}-OTHER-PROJECT`,
    title: 'Other investor project',
    sponsoringInstitutionId: base.institutionId,
    responsibleDepartmentId: base.departmentId,
    caseId: otherCase.id,
    attributionMetadata: { platformCausation: false },
  });

  await prisma.strategicProjectMilestone.create({
    data: {
      profileId: otherProject.id,
      title: 'Reported milestone',
      status: StrategicProjectMilestoneStatus.REPORTED,
      reportedDate: new Date(),
    },
  });

  return {
    organizationId: organization.id,
    memberIdentityId: member.identityId,
    memberSessionToken: member.sessionToken,
    representativeIdentityId: representative.identityId,
    representativeSessionToken: representative.sessionToken,
    outsiderIdentityId: outsider.identityId,
    outsiderSessionToken: outsider.sessionToken,
    applicationId: caseRecord.applicationId,
    caseId: base.caseId,
    phase11Base: base,
    otherOrganizationId: otherOrganization.id,
    otherProjectId: otherProject.id,
    institutionId: base.institutionId,
    departmentId: base.departmentId,
    governmentServiceId: base.governmentServiceId,
    governmentServiceVersionId: base.governmentServiceVersionId,
    configurationFingerprint: application.configurationFingerprint,
    formDefinitionId: application.formDefinitionId,
    formVersionId: application.formVersionId,
    officialSessionToken: base.officialSessionToken,
    masterAdministrativeFileId: base.masterAdministrativeFileId,
    governmentDecisionId: governmentDecision.id,
  };
}
