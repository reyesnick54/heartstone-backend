import {
  ApplicationSubmissionStatus,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  DecisionNoticeEffectTiming,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  GovernmentDecisionOutcome,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER } from '../../src/application-processing/application-processing.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import { seedPhase6Fixture } from './phase-6-test-fixtures';

export interface Phase8FixtureContext {
  phase6: Awaited<ReturnType<typeof seedPhase6Fixture>>;
  decisionFunctionAuthorityRecordId: string;
  decisionTypeCode: string;
  caseId: string;
}

export async function seedPhase8DecisionFixture(
  prisma: PrismaService,
  app: { getHttpServer: () => App },
): Promise<Phase8FixtureContext> {
  const phase6 = await seedPhase6Fixture(app, prisma);
  const marker = NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER;

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${marker}-DEC-SRC`,
      title: 'Phase 8 Decision Source',
      versionLabel: '1.0',
      status: GoverningSourceStatus.AUTHENTICATED,
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      contentHash: 'phase8-decision-hash',
    },
  });

  const decisionFunction = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-DECIDE`,
      name: 'Phase 8 Decision Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: phase6.institutionId,
      officeId: phase6.officeId,
      activatedAt: new Date('2020-01-01'),
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
      assignments: {
        create: {
          officeholderId: phase6.officialOfficeholderId,
          officeId: phase6.officeId,
          institutionId: phase6.institutionId,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      },
      actionRights: {
        create: [{ action: AuthorityActionType.DECIDE, permitted: true, requiresHumanActor: true }],
      },
    },
  });

  await prisma.governmentServiceDecisionTypeDefinition.create({
    data: {
      governmentServiceVersionId: phase6.governmentServiceVersionId,
      decisionTypeCode: 'PERMIT_DECISION',
      label: 'Permit Decision',
      permittedOutcomes: [
        GovernmentDecisionOutcome.APPROVED,
        GovernmentDecisionOutcome.REFUSED,
        GovernmentDecisionOutcome.CONDITIONAL_APPROVAL,
        GovernmentDecisionOutcome.RETURN_FOR_INFORMATION,
      ],
      requiresFindings: true,
      requiresReasons: true,
      requiresHumanConfirmationForAiDraft: true,
      noticeEffectTiming: DecisionNoticeEffectTiming.REQUIRED_AFTER_DECISION,
      supportedNoticeRightCodes: ['INTERNAL_REVIEW', 'STATUTORY_APPEAL'],
      blocksIssuanceOnUnsatisfiedPrecedent: true,
      permitsIssuanceDespiteUnsatisfiedPrecedent: false,
    },
  });

  await prisma.governmentServiceRedressRoute.createMany({
    data: [
      {
        governmentServiceVersionId: phase6.governmentServiceVersionId,
        routeCode: 'INTERNAL_REVIEW',
        label: 'Internal Review',
        description: 'Request internal review of the decision',
        contactReference: 'review@institution.gov',
        sortOrder: 1,
      },
      {
        governmentServiceVersionId: phase6.governmentServiceVersionId,
        routeCode: 'STATUTORY_APPEAL',
        label: 'Statutory Appeal',
        description: 'Appeal under applicable statute',
        contactReference: 'appeals@institution.gov',
        sortOrder: 2,
      },
    ],
  });

  const application = await prisma.application.create({
    data: {
      applicationNumber: `${marker}-APP-8`,
      applicantIdentityId: phase6.applicantIdentityId,
      governmentServiceId: phase6.governmentServiceId,
      governmentServiceVersionId: phase6.governmentServiceVersionId,
      formDefinitionId: phase6.formDefinitionId,
      formVersionId: phase6.formVersionId,
      configurationFingerprint: phase6.configurationFingerprint,
      applicantCategory: 'INDIVIDUAL',
      status: 'SUBMITTED',
    },
  });

  await prisma.applicationSubmission.create({
    data: {
      applicationId: application.id,
      submissionNumber: `${marker}-SUB-8`,
      sequenceNumber: 1,
      governmentServiceVersionId: phase6.governmentServiceVersionId,
      formVersionId: phase6.formVersionId,
      configurationFingerprint: phase6.configurationFingerprint,
      answersSnapshot: { businessName: 'Test Co', businessAddress: '1 Main St' },
      contentHash: 'phase8-submission-hash',
      status: ApplicationSubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  const caseRecord = await prisma.case.create({
    data: {
      caseNumber: `${marker}-CASE-8`,
      applicationId: application.id,
      applicantIdentityId: phase6.applicantIdentityId,
      governmentServiceId: phase6.governmentServiceId,
      governmentServiceVersionId: phase6.governmentServiceVersionId,
      responsibleInstitutionId: phase6.institutionId,
      responsibleDepartmentId: phase6.departmentId,
      workflowVersionId: phase6.workflowVersionId,
      configurationFingerprint: phase6.configurationFingerprint,
      status: 'DECISION_PENDING',
      currentCaseManagerOfficeholderId: phase6.officialOfficeholderId,
    },
  });

  return {
    phase6,
    decisionFunctionAuthorityRecordId: decisionFunction.id,
    decisionTypeCode: 'PERMIT_DECISION',
    caseId: caseRecord.id,
  };
}
