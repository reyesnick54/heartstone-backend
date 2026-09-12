import {
  AccountStatus,
  ApplicantCategory,
  AppointmentStatus,
  AuthenticationMethodType,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  FormDefinitionStatus,
  FormFieldType,
  FormVersionStatus,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  InstitutionType,
  JurisdictionType,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
  WorkflowTransitionJoinType,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER } from '../../src/application-processing/application-processing.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import { buildServiceConfigurationFingerprint } from '../../src/service-catalog/common/service-configuration-hash.util';
import { asLoginResponseBody } from './identity-test-types';

export interface Phase6FixtureContext {
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  officeId: string;
  officeholderId: string;
  appointmentId: string;
  functionAuthorityRecordId: string;
  externalAuthorityId: string;
  authorityDependencyId: string;
  serviceFamilyId: string;
  governmentServiceId: string;
  governmentServiceVersionId: string;
  serviceSlug: string;
  formDefinitionId: string;
  formVersionId: string;
  configurationFingerprint: string;
  workflowDefinitionId: string;
  workflowVersionId: string;
  applicantSessionToken: string;
  applicantIdentityId: string;
  officialSessionToken: string;
  officialIdentityId: string;
  officialOfficeholderId: string;
  checklistItemCodes: string[];
}

export async function seedPhase6Fixture(
  app: { getHttpServer: () => App },
  prisma: PrismaService,
): Promise<Phase6FixtureContext> {
  const marker = NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER;

  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${marker}-JUR`,
      name: 'Phase 6 Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST`,
      name: 'Phase 6 Test Institution',
      type: InstitutionType.AGENCY,
    },
  });

  const department = await prisma.department.create({
    data: { institutionId: institution.id, code: `${marker}-DEPT`, name: 'Phase 6 Department' },
  });

  const office = await prisma.office.create({
    data: { departmentId: department.id, code: `${marker}-OFF`, name: 'Phase 6 Office' },
  });

  const officeholder = await prisma.officeholder.create({
    data: { code: `${marker}-OH`, name: 'Phase 6 Official' },
  });

  const appointment = await prisma.appointment.create({
    data: {
      officeId: office.id,
      officeholderId: officeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${marker}-SRC`,
      title: 'Phase 6 Governing Source',
      versionLabel: '1.0',
      status: GoverningSourceStatus.AUTHENTICATED,
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      contentHash: 'phase6-test-hash',
    },
  });

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-FUNC`,
      name: 'Phase 6 Review Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: institution.id,
      officeId: office.id,
      activatedAt: new Date('2020-01-01'),
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
      assignments: {
        create: {
          officeholderId: officeholder.id,
          officeId: office.id,
          institutionId: institution.id,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      },
      actionRights: {
        create: [{ action: AuthorityActionType.REVIEW, permitted: true, requiresHumanActor: true }],
      },
    },
  });

  const externalAuthority = await prisma.externalAuthority.create({
    data: {
      code: `${marker}-EXT`,
      name: 'Phase 6 External Authority',
      type: 'REGULATORY',
    },
  });

  const referralFunctionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-REF-FUNC`,
      name: 'Phase 6 External Referral Function',
      classification: AuthorityClassification.SHARED_OR_COORDINATED,
      functionClass: ControlledFunctionClass.ADMINISTRATIVE,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: institution.id,
      activatedAt: new Date('2020-01-01'),
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
    },
  });

  const authorityDependency = await prisma.authorityDependency.create({
    data: {
      functionAuthorityRecordId: referralFunctionRecord.id,
      dependencyType: 'GOVERNMENT_CONCURRENCE',
      externalAuthorityId: externalAuthority.id,
      competentAuthorityLabel: 'External Regulator',
      requiredOutcome: 'CONCURRENCE',
      blockingStatus: 'BLOCKING',
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: { code: `${marker}-FAMILY`, name: 'Phase 6 Service Family' },
  });

  const service = await prisma.governmentService.create({
    data: {
      code: `${marker}-SERVICE`,
      slug: `${marker.toLowerCase()}-business-permit`,
      officialName: 'Phase 6 Business Permit',
      publicName: 'Apply for Business Permit',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
      catalogServiceType: 'PERMIT',
    },
  });

  const serviceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      purpose: 'Business permit application',
      publicDescription: 'Apply for a business permit',
      maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      institutionallyAccepted: true,
      applicantCategories: {
        create: [{ category: ApplicantCategory.INDIVIDUAL }],
      },
    },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      code: `${marker}-FORM`,
      name: 'Business Permit Form',
      governmentServiceVersionId: serviceVersion.id,
      status: FormDefinitionStatus.ACTIVE,
    },
  });

  const formVersion = await prisma.formVersion.create({
    data: {
      formDefinitionId: formDefinition.id,
      version: 1,
      title: { en: 'Business Permit Application' },
      status: FormVersionStatus.PUBLISHED,
      publishedAt: new Date(),
      sections: {
        create: {
          sectionKey: 'applicant',
          title: { en: 'Applicant Details' },
          displayOrder: 1,
          fields: {
            create: [
              {
                fieldKey: 'businessName',
                label: { en: 'Business Name' },
                fieldType: FormFieldType.TEXT,
                required: true,
                displayOrder: 1,
              },
              {
                fieldKey: 'businessAddress',
                label: { en: 'Business Address' },
                fieldType: FormFieldType.TEXT,
                required: true,
                displayOrder: 2,
              },
            ],
          },
        },
      },
    },
  });

  await prisma.governmentServiceVersion.update({
    where: { id: serviceVersion.id },
    data: { formDefinitionId: formDefinition.id, formVersionId: formVersion.id },
  });

  const checklistItems = await Promise.all(
    ['BUSINESS_PLAN', 'IDENTITY_PROOF'].map((itemCode, index) =>
      prisma.governmentServiceChecklistItem.create({
        data: {
          governmentServiceVersionId: serviceVersion.id,
          itemCode,
          label: itemCode.replace('_', ' '),
          isRequired: true,
          sortOrder: index,
        },
      }),
    ),
  );

  const configurationFingerprint = buildServiceConfigurationFingerprint({
    serviceVersionId: serviceVersion.id,
    formVersionId: formVersion.id,
    feeDefinitionIds: [],
    eligibilityRuleIds: [],
    checklistItemIds: checklistItems.map((item) => item.id),
  });

  const workflowDefinition = await prisma.workflowDefinition.create({
    data: {
      code: `${marker}-WF`,
      name: 'Phase 6 Business Permit Workflow',
      governmentServiceId: service.id,
      status: 'APPROVED',
    },
  });

  const workflowVersion = await prisma.workflowVersion.create({
    data: {
      workflowDefinitionId: workflowDefinition.id,
      version: '1.0.0',
      status: 'APPROVED',
      approvedAt: new Date(),
      stages: {
        create: [
          { stageKey: 'intake', label: 'Intake', displayOrder: 1 },
          { stageKey: 'review', label: 'Review', displayOrder: 2 },
        ],
      },
    },
  });

  const intakeStep = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'intake',
      label: 'Intake',
      stepType: WorkflowStepType.INTAKE,
      consequenceLevel: WorkflowStepConsequenceLevel.INFORMATIONAL,
      displayOrder: 1,
    },
  });

  const completenessStep = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'completeness-review',
      label: 'Completeness Review',
      stepType: WorkflowStepType.COMPLETENESS_REVIEW,
      consequenceLevel: WorkflowStepConsequenceLevel.ADMINISTRATIVE,
      displayOrder: 2,
    },
  });

  const substantiveStep = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'substantive-review',
      label: 'Substantive Review',
      stepType: WorkflowStepType.SUBSTANTIVE_REVIEW,
      consequenceLevel: WorkflowStepConsequenceLevel.CONSEQUENTIAL,
      functionAuthorityRecordId: functionRecord.id,
      authorityActionType: AuthorityActionType.REVIEW,
      displayOrder: 3,
    },
  });

  const parallelA = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'parallel-review-a',
      label: 'Parallel Review A',
      stepType: WorkflowStepType.INTERNAL_COORDINATION,
      consequenceLevel: WorkflowStepConsequenceLevel.ADMINISTRATIVE,
      displayOrder: 4,
      isParallel: true,
      parallelGroupKey: 'parallel-group-1',
    },
  });

  const parallelB = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'parallel-review-b',
      label: 'Parallel Review B',
      stepType: WorkflowStepType.PROFESSIONAL_REVIEW,
      consequenceLevel: WorkflowStepConsequenceLevel.ADMINISTRATIVE,
      displayOrder: 5,
      isParallel: true,
      parallelGroupKey: 'parallel-group-1',
    },
  });

  const parallelJoin = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'parallel-join',
      label: 'Parallel Join',
      stepType: WorkflowStepType.PARALLEL_JOIN,
      consequenceLevel: WorkflowStepConsequenceLevel.INFORMATIONAL,
      displayOrder: 6,
      joinType: WorkflowTransitionJoinType.ALL_REQUIRED,
    },
  });

  const externalStep = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'external-referral',
      label: 'External Referral',
      stepType: WorkflowStepType.EXTERNAL_REFERRAL,
      consequenceLevel: WorkflowStepConsequenceLevel.ADMINISTRATIVE,
      displayOrder: 7,
    },
  });

  const decisionGate = await prisma.workflowStepDefinition.create({
    data: {
      workflowVersionId: workflowVersion.id,
      stepKey: 'decision-gate',
      label: 'Decision Gate',
      stepType: WorkflowStepType.DECISION_GATE,
      consequenceLevel: WorkflowStepConsequenceLevel.CONSEQUENTIAL,
      displayOrder: 8,
    },
  });

  const transitions = [
    [intakeStep.id, completenessStep.id, 'intake-to-completeness'],
    [completenessStep.id, substantiveStep.id, 'completeness-to-substantive'],
    [substantiveStep.id, parallelA.id, 'substantive-to-parallel-a'],
    [substantiveStep.id, parallelB.id, 'substantive-to-parallel-b'],
    [parallelA.id, parallelJoin.id, 'parallel-a-to-join', WorkflowTransitionJoinType.ALL_REQUIRED],
    [parallelB.id, parallelJoin.id, 'parallel-b-to-join', WorkflowTransitionJoinType.ALL_REQUIRED],
    [parallelJoin.id, externalStep.id, 'join-to-external'],
    [externalStep.id, decisionGate.id, 'external-to-decision'],
  ] as const;

  for (const [fromStepId, toStepId, key, joinType] of transitions) {
    await prisma.workflowTransitionDefinition.create({
      data: {
        workflowVersionId: workflowVersion.id,
        fromStepId,
        toStepId,
        transitionKey: key,
        joinType: joinType ?? WorkflowTransitionJoinType.ALL_REQUIRED,
      },
    });
  }

  const applicantPerson = await prisma.person.create({
    data: { givenName: 'Phase6', familyName: 'Applicant' },
  });

  const applicantAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-applicant@test.gov`,
      personId: applicantPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const applicantIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Phase 6 Applicant',
      userAccountId: applicantAccount.id,
      personId: applicantPerson.id,
    },
  });

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: applicantIdentity.id, type: 'PASSWORD', password: 'Applicant123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: applicantIdentity.id, type: AuthenticationMethodType.PASSWORD })
    .expect(201);

  const applicantLogin = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({
          loginIdentifier: `${marker}-applicant@test.gov`,
          password: 'Applicant123!',
        })
        .expect(201)
    ).body,
  );

  const officialPerson = await prisma.person.create({
    data: { givenName: 'Phase6', familyName: 'Official' },
  });

  const officialAccount = await prisma.userAccount.create({
    data: {
      loginIdentifier: `${marker}-official@test.gov`,
      personId: officialPerson.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const officialIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'Phase 6 Official',
      userAccountId: officialAccount.id,
      personId: officialPerson.id,
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: officialIdentity.id,
      officeholderId: officeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: officialIdentity.id, type: 'PASSWORD', password: 'Official123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: officialIdentity.id, type: AuthenticationMethodType.PASSWORD })
    .expect(201);

  const officialLogin = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({
          loginIdentifier: `${marker}-official@test.gov`,
          password: 'Official123!',
        })
        .expect(201)
    ).body,
  );

  return {
    jurisdictionId: jurisdiction.id,
    institutionId: institution.id,
    departmentId: department.id,
    officeId: office.id,
    officeholderId: officeholder.id,
    appointmentId: appointment.id,
    functionAuthorityRecordId: functionRecord.id,
    externalAuthorityId: externalAuthority.id,
    authorityDependencyId: authorityDependency.id,
    serviceFamilyId: serviceFamily.id,
    governmentServiceId: service.id,
    governmentServiceVersionId: serviceVersion.id,
    serviceSlug: service.slug,
    formDefinitionId: formDefinition.id,
    formVersionId: formVersion.id,
    configurationFingerprint,
    workflowDefinitionId: workflowDefinition.id,
    workflowVersionId: workflowVersion.id,
    applicantSessionToken: applicantLogin.sessionToken,
    applicantIdentityId: applicantIdentity.id,
    officialSessionToken: officialLogin.sessionToken,
    officialIdentityId: officialIdentity.id,
    officialOfficeholderId: officeholder.id,
    checklistItemCodes: checklistItems.map((item) => item.itemCode),
  };
}

export const VALID_FORM_ANSWERS = {
  businessName: 'Test Business Ltd',
  businessAddress: '123 Main Street',
};
