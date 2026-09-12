import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  InstitutionType,
  JurisdictionType,
} from '@prisma/client';

import { NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER } from '../../src/applications/applications.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER } from '../../src/service-catalog/service-catalog.constants';

export interface ApplicationsCompletenessFixture {
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  serviceFamilyId: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  checklistItemIds: string[];
  applicantIdentityId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  functionAuthorityRecordId: string;
  unauthorizedReviewerIdentityId: string;
  aiAssistedIdentityId: string;
}

export async function seedApplicationsCompletenessFixture(
  prisma: PrismaService,
): Promise<ApplicationsCompletenessFixture> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-JUR`,
      name: 'Applications Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-INST`,
      name: 'Applications Test Institution',
      type: InstitutionType.AGENCY,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-DEPT`,
      name: 'Applications Test Department',
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-FAMILY`,
      name: 'Applications Test Family',
    },
  });

  const service = await prisma.governmentService.create({
    data: {
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-SERVICE`,
      slug: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-service`,
      officialName: 'Business Registration',
      publicName: 'Business Registration',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
    },
  });

  const version = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      institutionallyAccepted: true,
    },
  });

  const checklistItems = await Promise.all(
    ['IDENTITY_DOCUMENT', 'BUSINESS_PLAN', 'FEE_RECEIPT'].map((itemCode, index) =>
      prisma.governmentServiceChecklistItem.create({
        data: {
          governmentServiceVersionId: version.id,
          itemCode,
          label: itemCode.replace(/_/g, ' '),
          sortOrder: index,
          isRequired: true,
        },
      }),
    ),
  );

  const office = await prisma.office.create({
    data: {
      departmentId: department.id,
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-OFFICE`,
      name: 'Review Office',
    },
  });

  const reviewerOfficeholder = await prisma.officeholder.create({
    data: {
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-REVIEWER`,
      name: 'Completeness Reviewer',
    },
  });

  await prisma.appointment.create({
    data: {
      officeId: office.id,
      officeholderId: reviewerOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const reviewerPerson = await prisma.person.create({
    data: { givenName: 'Review', familyName: 'Officer' },
  });

  const reviewerAccount = await prisma.userAccount.create({
    data: {
      personId: reviewerPerson.id,
      loginIdentifier: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-reviewer@test.gov`,
      status: 'ACTIVE',
    },
  });

  const reviewerIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      userAccountId: reviewerAccount.id,
      personId: reviewerPerson.id,
      displayName: 'Completeness Reviewer',
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: reviewerIdentity.id,
      officeholderId: reviewerOfficeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  const applicantPerson = await prisma.person.create({
    data: { givenName: 'Applicant', familyName: 'Citizen' },
  });

  const applicantAccount = await prisma.userAccount.create({
    data: {
      personId: applicantPerson.id,
      loginIdentifier: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-applicant@test.gov`,
      status: 'ACTIVE',
    },
  });

  const applicantIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      userAccountId: applicantAccount.id,
      personId: applicantPerson.id,
      displayName: 'Applicant Citizen',
    },
  });

  const unauthorizedReviewer = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Unauthorized Reviewer',
    },
  });

  const aiAssistedIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.SERVICE,
      displayName: 'AI Completeness Assistant',
    },
  });

  const actorIdentity = await prisma.identity.create({
    data: { type: IdentityType.INDIVIDUAL, displayName: 'Authority Actor' },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${NON_PRODUCTION_SERVICE_CATALOG_FIXTURE_MARKER}-APP-SRC`,
      title: 'Applications Review Source',
      versionLabel: '1.0.0',
      status: 'AUTHENTICATED',
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      authenticatedByIdentityId: actorIdentity.id,
      contentHash: 'applications-review-source',
    },
  });

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER}-REVIEW-FN`,
      name: 'Completeness Review Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.OTHER,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: institution.id,
      officeId: office.id,
      activatedAt: new Date('2020-01-01'),
      activatedByIdentityId: actorIdentity.id,
    },
  });

  await prisma.functionGoverningSource.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      governingSourceId: governingSource.id,
    },
  });

  await prisma.functionAuthorityAssignment.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      officeholderId: reviewerOfficeholder.id,
      officeId: office.id,
      status: FunctionAssignmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.authorityActionRight.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      action: AuthorityActionType.REVIEW,
      permitted: true,
    },
  });

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    departmentId: department.id,
    serviceFamilyId: serviceFamily.id,
    governmentServiceId: service.id,
    governmentServiceVersionId: version.id,
    checklistItemIds: checklistItems.map((item) => item.id),
    applicantIdentityId: applicantIdentity.id,
    reviewerIdentityId: reviewerIdentity.id,
    reviewerOfficeholderId: reviewerOfficeholder.id,
    functionAuthorityRecordId: functionRecord.id,
    unauthorizedReviewerIdentityId: unauthorizedReviewer.id,
    aiAssistedIdentityId: aiAssistedIdentity.id,
  };
}
