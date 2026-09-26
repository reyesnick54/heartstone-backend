import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AnalysisFunctionType,
  AppointmentStatus,
  AuthenticationMethodType,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  StructuralLifecycleStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { FunctionActivationService } from '../../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../../src/authority/governing-sources/governing-sources.service';
import { type PrismaService } from '../../src/database/prisma.service';
import { hashToken } from '../../src/identity/common/crypto.util';
import { INTELLIGENCE_CONSEQUENTIAL_REVIEW_FUNCTION_CODE } from '../../src/intelligence/intelligence.constants';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  ensureTechnicalPermissionsForIdentity,
  loginAndGetSessionToken,
} from './identity-provisioning.fixture';

export interface IntelligenceActorFixtureContext {
  institutionAId: string;
  institutionBId: string;
  departmentAId: string;
  departmentBId: string;
  officialSessionToken: string;
  otherOfficialSessionToken: string;
  aiSessionToken: string;
  suspendedAiSessionToken: string;
  officialIdentityId: string;
  otherOfficialIdentityId: string;
  institutionBFrameworkId: string;
  metricVersionId: string;
  calculationRunId: string;
  claimId: string;
  institutionBAnalysisRequestId: string;
  institutionBAnalysisRunId: string;
  twinVersionId: string;
  dashboardDefinitionId: string;
}

async function createPasswordSession(
  app: INestApplication<App>,
  prisma: PrismaService,
  marker: string,
  suffix: string,
): Promise<{ identityId: string; sessionToken: string; officeholderId: string }> {
  const loginIdentifier = `${marker}-${suffix}@test.gov`;
  const person = await prisma.person.create({
    data: { givenName: suffix, familyName: 'Actor' },
  });
  const account = await prisma.userAccount.create({
    data: {
      loginIdentifier,
      personId: person.id,
      status: AccountStatus.ACTIVE,
    },
  });
  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: `${suffix} actor`,
      userAccountId: account.id,
      personId: person.id,
    },
  });
  const officeholder = await prisma.officeholder.create({
    data: {
      code: `${marker}-${suffix}`,
      name: `${suffix} officeholder`,
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: identity.id,
      officeholderId: officeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  await createPasswordCredentialViaPrisma(prisma, identity.id, 'Phase8123!');
  await createPasswordAuthenticationMethodViaPrisma(prisma, identity.id);
  const sessionToken = await loginAndGetSessionToken(app, loginIdentifier, 'Phase8123!');

  await ensureTechnicalPermissionsForIdentity(prisma, identity.id);

  return {
    identityId: identity.id,
    sessionToken,
    officeholderId: officeholder.id,
  };
}

async function createServiceSession(
  prisma: PrismaService,
  marker: string,
  suffix: string,
  enabled: boolean,
): Promise<{ sessionToken: string }> {
  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.SERVICE,
      displayName: `${marker}-ai-${suffix}`,
    },
  });

  await prisma.authenticationMethod.create({
    data: {
      identityId: identity.id,
      type: AuthenticationMethodType.SERVICE_API_KEY,
      isEnabled: enabled,
    },
  });

  const sessionToken = `${marker}-ai-${suffix}-token`;
  await prisma.session.create({
    data: {
      identityId: identity.id,
      tokenHash: hashToken(sessionToken),
      status: 'ACTIVE',
      assuranceLevel: 'MEDIUM',
      expiresAt: new Date('2099-01-01'),
    },
  });

  return { sessionToken };
}

export async function seedIntelligenceActorFixture(
  app: INestApplication<App>,
  prisma: PrismaService,
  options: { seedConsequentialAuthority?: boolean } = {},
): Promise<IntelligenceActorFixtureContext> {
  const seedConsequentialAuthority = options.seedConsequentialAuthority ?? true;
  const marker = `INTACTOR-${randomUUID().slice(0, 8)}`;

  const jurisdiction = await prisma.jurisdiction.create({
    data: { code: `${marker}-JUR`, name: 'Intelligence Actor Jurisdiction', type: 'NATIONAL' },
  });

  const institutionA = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST-A`,
      name: 'Institution A',
      type: 'MINISTRY',
    },
  });

  const institutionB = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${marker}-INST-B`,
      name: 'Institution B',
      type: 'MINISTRY',
    },
  });

  const departmentA = await prisma.department.create({
    data: {
      institutionId: institutionA.id,
      code: `${marker}-DEPT-A`,
      name: 'Department A',
    },
  });

  const departmentB = await prisma.department.create({
    data: {
      institutionId: institutionB.id,
      code: `${marker}-DEPT-B`,
      name: 'Department B',
    },
  });

  const officeA = await prisma.office.create({
    data: {
      departmentId: departmentA.id,
      code: `${marker}-OFFICE-A`,
      name: 'Office A',
    },
  });

  const officeB = await prisma.office.create({
    data: {
      departmentId: departmentB.id,
      code: `${marker}-OFFICE-B`,
      name: 'Office B',
    },
  });

  const official = await createPasswordSession(app, prisma, marker, 'official-a');
  const otherOfficial = await createPasswordSession(app, prisma, marker, 'official-b');

  await prisma.appointment.create({
    data: {
      officeId: officeA.id,
      officeholderId: official.officeholderId,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.appointment.create({
    data: {
      officeId: officeB.id,
      officeholderId: otherOfficial.officeholderId,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const ai = await createServiceSession(prisma, marker, 'active', true);
  const suspendedAi = await createServiceSession(prisma, marker, 'suspended', false);

  if (seedConsequentialAuthority) {
    const governingSource = await app.get(GoverningSourcesService).create({
      code: `${marker}-GS`,
      title: 'Intelligence consequential review source',
      versionLabel: 'v1',
      content: 'intelligence consequential review',
      effectiveFrom: '2020-01-01T00:00:00.000Z',
    });

    await app.get(GoverningSourcesService).authenticate(governingSource.id, {
      authenticatedByIdentityId: official.identityId,
    });

    const functions = app.get(FunctionAuthorityRecordsService);
    const functionRecord = await functions.create({
      code: INTELLIGENCE_CONSEQUENTIAL_REVIEW_FUNCTION_CODE,
      name: 'Intelligence consequential review',
      description: 'Consequential intelligence review function',
      classification: 'ADMINISTRATIVE_SUPPORT',
      functionClass: 'ADVISORY',
      institutionId: institutionA.id,
      officeId: officeA.id,
      requiresDelegation: false,
    });

    await functions.linkGoverningSource({
      functionAuthorityRecordId: functionRecord.id,
      governingSourceId: governingSource.id,
    });

    await functions.createAssignment({
      functionAuthorityRecordId: functionRecord.id,
      officeholderId: official.officeholderId,
      officeId: officeA.id,
      institutionId: institutionA.id,
      effectiveFrom: new Date('2020-01-01'),
    });

    await functions.createActionRight({
      functionAuthorityRecordId: functionRecord.id,
      action: 'REVIEW',
      permitted: true,
      requiresHumanActor: true,
    });

    await app.get(FunctionActivationService).activate(functionRecord.id, {
      actorIdentityId: official.identityId,
    });
  }

  const frameworkA = await prisma.performanceFramework.create({
    data: {
      code: `${marker}-FW-A`,
      name: 'Framework A',
      institutionId: institutionA.id,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const frameworkB = await prisma.performanceFramework.create({
    data: {
      code: `${marker}-FW-B`,
      name: 'Framework B',
      institutionId: institutionB.id,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const metricDefinition = await prisma.metricDefinition.create({
    data: {
      frameworkId: frameworkA.id,
      code: `${marker}-METRIC`,
      name: 'Metric',
      purpose: 'test',
      ownerInstitutionId: institutionA.id,
      ownerDepartmentId: departmentA.id,
      metricCategory: 'SERVICE_TIMELINESS',
      unit: 'count',
      aggregationMethod: 'SUM',
      calculationMethod: 'DETERMINISTIC_RULE',
      sourceRequirements: [{ source: 'cases' }],
      scope: 'institution',
      reportingFrequency: 'MONTHLY',
      status: 'ACTIVE',
    },
  });

  const metricVersion = await prisma.metricDefinitionVersion.create({
    data: {
      metricDefinitionId: metricDefinition.id,
      versionNumber: 1,
      formulaSpecification: { type: 'count' },
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });

  const calculationRun = await prisma.metricCalculationRun.create({
    data: {
      metricVersionId: metricVersion.id,
      periodStart: new Date('2025-01-01'),
      periodEnd: new Date('2025-01-31'),
      inputCount: 1,
      calculationTrace: { method: 'count' },
      softwareVersion: 'v1',
      integrityHash: `${marker}-hash`,
    },
  });

  const claim = await prisma.measuredPerformanceClaim.create({
    data: {
      claimReference: `${marker}-CLAIM`,
      claimStatement: 'Measured claim',
      metricDefinitionVersionId: metricVersion.id,
      calculationRunId: calculationRun.id,
      ownerIdentityId: official.identityId,
      status: 'DRAFT',
      attributionClassification: 'NOT_ESTABLISHED',
    },
  });

  const twinDefinition = await prisma.digitalTwinDefinition.create({
    data: {
      twinCode: `${marker}-TWIN`,
      representedSubjectType: 'INSTITUTION',
      representedSubjectId: institutionA.id,
      representedSubjectReference: institutionA.code,
      institutionalOwnerId: institutionA.id,
      purpose: 'simulation',
      scope: 'institution',
      sourceRequirements: 'approved sources',
      status: 'ACTIVE',
    },
  });

  const twinVersion = await prisma.digitalTwinVersion.create({
    data: {
      definitionId: twinDefinition.id,
      versionNumber: 1,
      versionLabel: 'v1',
      isCurrent: true,
    },
  });

  const analysisRequestB = await prisma.analysisRequest.create({
    data: {
      requestNumber: `${marker}-ARQ-B`,
      question: 'Institution B question',
      functionType: AnalysisFunctionType.DECISION_SUPPORT_SUMMARY,
      institutionId: institutionB.id,
      requestedByIdentityId: otherOfficial.identityId,
      status: 'DRAFT',
    },
  });

  const analysisRunB = await prisma.analysisRun.create({
    data: {
      runNumber: `${marker}-ARN-B`,
      requestId: analysisRequestB.id,
      method: 'summary',
      assumptions: {},
      limitations: 'test',
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  const dashboardDefinition = await prisma.dashboardDefinition.create({
    data: {
      code: `${marker}-DASH`,
      name: 'Executive Dashboard',
      consoleType: 'EXECUTIVE_COMMAND',
      institutionId: institutionA.id,
      status: 'ACTIVE',
    },
  });

  return {
    institutionAId: institutionA.id,
    institutionBId: institutionB.id,
    departmentAId: departmentA.id,
    departmentBId: departmentB.id,
    officialSessionToken: official.sessionToken,
    otherOfficialSessionToken: otherOfficial.sessionToken,
    aiSessionToken: ai.sessionToken,
    suspendedAiSessionToken: suspendedAi.sessionToken,
    officialIdentityId: official.identityId,
    otherOfficialIdentityId: otherOfficial.identityId,
    institutionBFrameworkId: frameworkB.id,
    metricVersionId: metricVersion.id,
    calculationRunId: calculationRun.id,
    claimId: claim.id,
    institutionBAnalysisRequestId: analysisRequestB.id,
    institutionBAnalysisRunId: analysisRunB.id,
    twinVersionId: twinVersion.id,
    dashboardDefinitionId: dashboardDefinition.id,
  };
}
