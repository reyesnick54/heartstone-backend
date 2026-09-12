import {
  ApplicationStatus,
  AuthorityClassification,
  AuthorityDependencyType,
  CaseLegalStatus,
  CaseStatus,
  ControlledFunctionClass,
  ExternalAuthorityType,
  FormVersionStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
  SubmissionChannel,
  SubmittedCapacity,
} from '@prisma/client';

import { NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER } from '../../src/applications-workflow/applications-workflow.constants';
import { NON_PRODUCTION_FIXTURE_MARKER } from '../../src/authority/authority.constants';
import { type PrismaService } from '../../src/database/prisma.service';

export interface Phase6fFixtureContext {
  institutionId: string;
  departmentId: string;
  officeId: string;
  officeholderId: string;
  actorIdentityId: string;
  applicantIdentityId: string;
  externalAuthorityId: string;
  wrongExternalAuthorityId: string;
  receivingInstitutionId: string;
  functionAuthorityRecordId: string;
  authorityDependencyId: string;
  governmentServiceVersionId: string;
  applicationId: string;
  caseId: string;
  workflowStepId: string;
}

export async function seedPhase6fFixture(prisma: PrismaService): Promise<Phase6fFixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-JUR`,
      name: 'NON_PRODUCTION Phase 6F Jurisdiction',
      type: JurisdictionType.SPECIAL_ECONOMIC_ZONE,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-ABSEZ`,
      name: 'NON_PRODUCTION ABSEZ Authority',
      type: InstitutionType.SPECIAL_ECONOMIC_ZONE_AUTHORITY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const receivingInstitution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-NATIONAL`,
      name: 'NON_PRODUCTION National Authority',
      type: InstitutionType.GOVERNMENT,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-DEPT`,
      name: 'NON_PRODUCTION Case Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const office = await prisma.office.create({
    data: {
      departmentId: department.id,
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-OFFICE`,
      name: 'NON_PRODUCTION Case Office',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const officeholder = await prisma.officeholder.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-OH`,
      name: 'NON_PRODUCTION Case Manager',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  await prisma.appointment.create({
    data: {
      officeId: office.id,
      officeholderId: officeholder.id,
      status: 'ACTIVE',
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const actorIdentity = await prisma.identity.create({
    data: {
      type: 'INDIVIDUAL',
      displayName: 'NON_PRODUCTION Case Actor',
    },
  });

  const applicantIdentity = await prisma.identity.create({
    data: {
      type: 'INDIVIDUAL',
      displayName: 'NON_PRODUCTION Applicant',
    },
  });

  const externalAuthority = await prisma.externalAuthority.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-EXT`,
      name: 'NON_PRODUCTION Competent External Authority',
      type: ExternalAuthorityType.REGULATORY,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const wrongExternalAuthority = await prisma.externalAuthority.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-WRONG-EXT`,
      name: 'NON_PRODUCTION Wrong External Authority',
      type: ExternalAuthorityType.OTHER,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${NON_PRODUCTION_FIXTURE_MARKER}-6F-SRC`,
      title: 'NON_PRODUCTION Phase 6F Source',
      versionLabel: '1.0.0',
      effectiveFrom: new Date('2020-01-01'),
      contentHash: 'non-production-hash',
    },
  });

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-FN`,
      name: 'NON_PRODUCTION Approval Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
      lifecycleStatus: 'ACTIVE',
      institutionId: institution.id,
      officeId: office.id,
      governingSources: {
        create: {
          governingSourceId: governingSource.id,
          isPrimary: true,
        },
      },
      actionRights: {
        create: {
          action: 'APPROVE',
          permitted: true,
          requiresHumanActor: true,
        },
      },
      assignments: {
        create: {
          officeholderId: officeholder.id,
          officeId: office.id,
          institutionId: institution.id,
          status: 'ACTIVE',
          effectiveFrom: new Date('2020-01-01'),
        },
      },
    },
  });

  const authorityDependency = await prisma.authorityDependency.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      dependencyType: AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION,
      externalAuthorityId: externalAuthority.id,
      competentAuthorityLabel: 'National regulator',
      blockingStatus: 'BLOCKING',
      status: 'ACTIVE',
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-FAMILY`,
      name: 'NON_PRODUCTION Service Family',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const governmentService = await prisma.governmentService.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-SVC`,
      slug: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-svc`,
      officialName: 'NON_PRODUCTION Service',
      publicName: 'NON_PRODUCTION Service',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
    },
  });

  const governmentServiceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: governmentService.id,
      version: '1.0.0',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
    },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      governmentServiceVersionId: governmentServiceVersion.id,
      code: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-FORM`,
      name: 'NON_PRODUCTION Form',
    },
  });

  const formVersion = await prisma.formVersion.create({
    data: {
      formDefinitionId: formDefinition.id,
      version: 1,
      title: { en: 'NON_PRODUCTION Form' },
      status: FormVersionStatus.PUBLISHED,
    },
  });

  const application = await prisma.application.create({
    data: {
      applicationNumber: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-APP-001`,
      governmentServiceId: governmentService.id,
      governmentServiceVersionId: governmentServiceVersion.id,
      applicantIdentityId: applicantIdentity.id,
      currentStatus: ApplicationStatus.TRANSFERRED_TO_CASE,
    },
  });

  const submission = await prisma.applicationSubmission.create({
    data: {
      applicationId: application.id,
      submissionSequence: 1,
      serviceVersionId: governmentServiceVersion.id,
      formVersionId: formVersion.id,
      configurationFingerprint: 'phase-6f-fixture-fingerprint',
      pinnedConfiguration: {},
      answersPayload: {},
      submittedByIdentityId: applicantIdentity.id,
      submittedCapacity: SubmittedCapacity.SELF,
      submissionChannel: SubmissionChannel.WEB_PORTAL,
      submittedAt: new Date(),
      payloadHash: 'phase-6f-fixture-hash',
      acknowledgmentReference: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-ACK-001`,
    },
  });

  const caseRecord = await prisma.case.create({
    data: {
      caseNumber: `${NON_PRODUCTION_PHASE_6F_FIXTURE_MARKER}-CASE-001`,
      applicationId: application.id,
      applicationSubmissionId: submission.id,
      governmentServiceId: governmentService.id,
      governmentServiceVersionId: governmentServiceVersion.id,
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      applicantIdentityId: applicantIdentity.id,
      caseStatus: CaseStatus.SUBSTANTIVE_REVIEW,
      legalStatus: CaseLegalStatus.NONE,
    },
  });

  const workflowStep = await prisma.caseWorkflowStep.create({
    data: {
      caseId: caseRecord.id,
      stepKey: 'external-review',
      label: 'External review',
      sequenceOrder: 1,
      status: 'ACTIVE',
      blocksOnUnresolvedIssues: true,
      enteredAt: new Date(),
    },
  });

  await prisma.case.update({
    where: { id: caseRecord.id },
    data: { currentWorkflowStepId: workflowStep.id },
  });

  return {
    institutionId: institution.id,
    departmentId: department.id,
    officeId: office.id,
    officeholderId: officeholder.id,
    actorIdentityId: actorIdentity.id,
    applicantIdentityId: applicantIdentity.id,
    externalAuthorityId: externalAuthority.id,
    wrongExternalAuthorityId: wrongExternalAuthority.id,
    receivingInstitutionId: receivingInstitution.id,
    functionAuthorityRecordId: functionRecord.id,
    authorityDependencyId: authorityDependency.id,
    governmentServiceVersionId: governmentServiceVersion.id,
    applicationId: application.id,
    caseId: caseRecord.id,
    workflowStepId: workflowStep.id,
  };
}
