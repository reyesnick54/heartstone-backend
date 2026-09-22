import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  AuthorityDependencyBlockingStatus,
  CaseStatus,
  ControlledFunctionClass,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  IdentityOfficeholderLinkStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER } from '../../src/application-processing/application-processing.constants';
import { CaseFoundationService } from '../../src/application-processing/cases/case-foundation.service';
import { type PrismaService } from '../../src/database/prisma.service';
import {
  IMMIGRATION_SERVICE_CODE_PREFIX,
  IMMIGRATION_SERVICE_FAMILY_CODE,
} from '../../src/immigration/immigration.constants';
import { provisionAuthenticatedIdentity } from './identity-provisioning.fixture';
import { type Phase6FixtureContext, seedPhase6Fixture } from './phase-6-test-fixtures';

export interface ImmigrationFixtureContext extends Phase6FixtureContext {
  immigrationServiceFamilyId: string;
  immigrationDecideFunctionId: string;
  immigrationReviewFunctionId: string;
  immigrationBlockingDependencyId: string;
  reviewOnlyOfficialSessionToken: string;
  reviewOnlyOfficialIdentityId: string;
  immigrationCaseId: string;
}

export async function seedImmigrationFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
): Promise<ImmigrationFixtureContext> {
  const base = await seedPhase6Fixture(app, prisma);

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: IMMIGRATION_SERVICE_FAMILY_CODE,
      name: 'Immigration Services',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  await prisma.governmentService.update({
    where: { id: base.governmentServiceId },
    data: {
      serviceFamilyId: serviceFamily.id,
      code: `${IMMIGRATION_SERVICE_CODE_PREFIX}RESIDENCY-APPLICATION`,
      slug: 'non-production-imm-residency-application',
      publicName: 'Residency Application',
    },
  });

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${IMMIGRATION_SERVICE_FAMILY_CODE}-SRC`,
      title: 'Immigration Template Source',
      versionLabel: '1.0',
      status: GoverningSourceStatus.AUTHENTICATED,
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      contentHash: 'immigration-template-hash',
    },
  });

  const decideFunction = await prisma.functionAuthorityRecord.create({
    data: {
      code: 'TEMPLATE-AUTH-IMMIGRATION-DECIDE',
      name: 'Template immigration decision',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.APPROVAL,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: base.institutionId,
      officeId: base.officeId,
      activatedAt: new Date('2020-01-01'),
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
      actionRights: {
        create: [{ action: AuthorityActionType.DECIDE, permitted: true, requiresHumanActor: true }],
      },
      assignments: {
        create: {
          officeholderId: base.officeholderId,
          officeId: base.officeId,
          institutionId: base.institutionId,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      },
    },
  });

  const reviewOfficeholder = await prisma.officeholder.create({
    data: {
      code: `${IMMIGRATION_SERVICE_FAMILY_CODE}-REVIEW-OH`,
      name: 'Immigration Review Officer',
    },
  });

  await prisma.appointment.create({
    data: {
      officeId: base.officeId,
      officeholderId: reviewOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const reviewFunction = await prisma.functionAuthorityRecord.create({
    data: {
      code: 'TEMPLATE-AUTH-IMMIGRATION-REVIEW',
      name: 'Template immigration review',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.ADMINISTRATIVE,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: base.institutionId,
      officeId: base.officeId,
      activatedAt: new Date('2020-01-01'),
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
      actionRights: {
        create: [{ action: AuthorityActionType.REVIEW, permitted: true, requiresHumanActor: true }],
      },
      assignments: {
        create: {
          officeholderId: reviewOfficeholder.id,
          officeId: base.officeId,
          institutionId: base.institutionId,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      },
    },
  });

  const blockingDependency = await prisma.authorityDependency.create({
    data: {
      functionAuthorityRecordId: decideFunction.id,
      dependencyType: 'RETAINED_NATIONAL_DETERMINATION',
      blockingStatus: AuthorityDependencyBlockingStatus.BLOCKING,
      competentAuthorityLabel: 'External security authority',
      requiredOutcome: 'DETERMINATION',
    },
  });

  const reviewOfficial = await provisionAuthenticatedIdentity(app, prisma, {
    loginIdentifier: 'imm-review-only@test.gov',
    password: 'ImmTest123!',
    displayName: 'Immigration Review-only Official',
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: reviewOfficial.identityId,
      officeholderId: reviewOfficeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  const foundation = app.get(CaseFoundationService);
  const application = await foundation.createApplication({
    applicationNumber: `${NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER}-IMM-APP-001`,
    applicantIdentityId: base.applicantIdentityId,
    governmentServiceId: base.governmentServiceId,
    governmentServiceVersionId: base.governmentServiceVersionId,
    formDefinitionId: base.formDefinitionId,
    formVersionId: base.formVersionId,
    configurationFingerprint: base.configurationFingerprint,
  });

  const caseRecord = await foundation.openCaseFromApplication({
    applicationId: application.id,
    actorIdentityId: base.officialIdentityId,
  });

  await prisma.casePublicStatusProjection.upsert({
    where: { caseId: caseRecord.id },
    create: {
      caseId: caseRecord.id,
      publicStatusLabel: 'Under review',
      publicStageLabel: 'Document review',
      publicMessage: 'Your application is being reviewed.',
      applicantDisclaimer:
        'This status is informational only and does not constitute a government decision.',
      sourceCaseStatus: CaseStatus.IN_PROGRESS,
    },
    update: {
      publicStatusLabel: 'Under review',
      publicStageLabel: 'Document review',
    },
  });

  return {
    ...base,
    immigrationServiceFamilyId: serviceFamily.id,
    immigrationDecideFunctionId: decideFunction.id,
    immigrationReviewFunctionId: reviewFunction.id,
    immigrationBlockingDependencyId: blockingDependency.id,
    reviewOnlyOfficialSessionToken: reviewOfficial.sessionToken,
    reviewOnlyOfficialIdentityId: reviewOfficial.identityId,
    immigrationCaseId: caseRecord.id,
  };
}
