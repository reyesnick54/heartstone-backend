import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  AuthorityActionType,
  AuthorityClassification,
  CatalogLifecycleStatus,
  ControlledFunctionClass,
  DecisionConditionStatus,
  DecisionConditionType,
  DocumentSealStatus,
  DocumentSignatureStatus,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentDecisionStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  OfficialInstrumentKind,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_DECISIONS_FIXTURE_MARKER } from '../../src/decisions/decisions.constants';
import { seedPhase8bDecisionFixture } from '../../src/decisions/fixtures/phase-8b-test-fixtures';
import { NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER } from '../../src/decisions-issuance/decisions-issuance.constants';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  loginAndGetSessionToken,
} from './identity-provisioning.fixture';
import { type Phase8SessionContext } from './phase-8-test-types';

export const NON_PRODUCTION_PHASE_8_FIXTURE_MARKER = NON_PRODUCTION_DECISIONS_FIXTURE_MARKER;

export interface Phase8FixtureContext extends Phase8SessionContext {
  marker: string;
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  officeId: string;
  officialOfficeholderId: string;
  appointmentId: string;
  approverAppointmentId: string;
  caseId: string;
  masterAdministrativeFileId: string;
  decisionTypeVersionId: string;
  instrumentTypeVersionId: string;
  templateVersionId: string;
  numberingRuleId: string;
  functionAuthorityRecordId: string;
  issueFunctionAuthorityRecordId: string;
  evidencePacketVersionId: string;
  permissibleOutcomes: string[];
  approverOfficeholderId: string;
  governmentDecisionId?: string;
  sealDefinitionId: string;
  signatureDocumentVersionId?: string;
  sealDocumentVersionId?: string;
}

async function provisionSessionForIdentity(
  app: INestApplication<App>,
  prisma: PrismaService,
  identityId: string,
  loginIdentifier: string,
): Promise<{ identityId: string; sessionToken: string }> {
  const identity = await prisma.identity.findUniqueOrThrow({
    where: { id: identityId },
    select: { id: true, personId: true, userAccountId: true },
  });

  if (!identity.userAccountId) {
    const account = await prisma.userAccount.create({
      data: {
        loginIdentifier,
        personId: identity.personId,
        status: AccountStatus.ACTIVE,
      },
    });
    await prisma.identity.update({
      where: { id: identity.id },
      data: { userAccountId: account.id },
    });
  }

  await createPasswordCredentialViaPrisma(prisma, identity.id, 'Phase8123!');
  await createPasswordAuthenticationMethodViaPrisma(prisma, identity.id);

  const sessionToken = await loginAndGetSessionToken(app, loginIdentifier, 'Phase8123!');

  return { identityId: identity.id, sessionToken };
}

async function createSessionIdentity(
  app: INestApplication<App>,
  marker: string,
  role: 'applicant' | 'official' | 'approver',
  prisma: PrismaService,
): Promise<{ identityId: string; sessionToken: string; officeholderId?: string }> {
  const loginIdentifier = `${marker}-${role}@test.gov`;
  const person = await prisma.person.create({
    data: { givenName: 'Phase8', familyName: role },
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
      displayName: `NON_PRODUCTION Phase 8 ${role}`,
      userAccountId: account.id,
      personId: person.id,
    },
  });

  let officeholderId: string | undefined;

  if (role !== 'applicant') {
    const officeholder = await prisma.officeholder.create({
      data: {
        code: `${marker}-${role.toUpperCase()}`,
        name: `Phase 8 ${role}`,
      },
    });
    officeholderId = officeholder.id;

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId: identity.id,
        officeholderId: officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
  }

  await createPasswordCredentialViaPrisma(prisma, identity.id, 'Phase8123!');
  await createPasswordAuthenticationMethodViaPrisma(prisma, identity.id);

  const sessionToken = await loginAndGetSessionToken(app, loginIdentifier, 'Phase8123!');

  return { identityId: identity.id, sessionToken, officeholderId };
}

async function setupIssuanceCatalog(
  prisma: PrismaService,
  base: Awaited<ReturnType<typeof seedPhase8bDecisionFixture>>,
  marker: string,
): Promise<{
  instrumentTypeVersionId: string;
  templateVersionId: string;
  numberingRuleId: string;
  issueFunctionAuthorityRecordId: string;
  sealDefinitionId: string;
}> {
  const decideFunction = await prisma.functionAuthorityRecord.findUniqueOrThrow({
    where: { id: base.functionAuthorityRecordId },
    include: { governingSources: true },
  });
  const governingSourceId = decideFunction.governingSources[0]?.governingSourceId;
  if (!governingSourceId) {
    throw new Error('Expected governing source on decision function in Phase 8 fixture');
  }

  const issueFunction = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-ISSUE-FUNC`,
      name: 'Phase 8 Issue Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: base.institutionId,
      officeId: base.officeId,
      activatedAt: new Date('2020-01-01'),
      requiresAppointment: true,
      governingSources: {
        create: { governingSourceId, isPrimary: true },
      },
      actionRights: {
        create: [{ action: AuthorityActionType.ISSUE, permitted: true, requiresHumanActor: true }],
      },
      assignments: {
        create: [
          {
            officeholderId: base.officeholderId,
            officeId: base.officeId,
            institutionId: base.institutionId,
            status: FunctionAssignmentStatus.ACTIVE,
            effectiveFrom: new Date('2020-01-01'),
          },
        ],
      },
    },
  });

  const numberingRule = await prisma.instrumentNumberingRule.create({
    data: {
      institutionId: base.institutionId,
      code: `${marker}-NUM`,
      name: 'Phase 8 Numbering',
      formatPattern: '{INST}-{YEAR}-{SEQ:6}',
      sequenceScope: 'YEARLY',
      lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
    },
  });

  const instrumentTypeDef = await prisma.instrumentTypeDefinition.create({
    data: {
      code: `${marker}-LICENSE`,
      name: 'Test License',
      kind: OfficialInstrumentKind.LICENSE,
      lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
    },
  });

  const typeVersion = await prisma.instrumentTypeVersion.create({
    data: {
      instrumentTypeDefinitionId: instrumentTypeDef.id,
      versionNumber: 1,
      lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
      issuingInstitutionId: base.institutionId,
      issuanceFunctionAuthorityRecordId: issueFunction.id,
      requiredAuthorityAction: AuthorityActionType.ISSUE,
      signatureRequired: false,
      sealRequired: true,
      numberingRuleId: numberingRule.id,
      effectiveDateRule: { source: 'ISSUANCE_DATE' },
      verificationMethod: 'CHECKSUM',
      publicationStatus: 'OFFICIAL',
      recordsClassification: 'OFFICIAL',
      retainedNationalBoundary: false,
    },
  });

  const template = await prisma.instrumentTemplate.create({
    data: {
      code: `${marker}-LICENSE-TEMPLATE`,
      name: 'License Template',
      instrumentTypeVersionId: typeVersion.id,
      lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
      versions: {
        create: {
          versionNumber: 1,
          lifecycleStatus: CatalogLifecycleStatus.ACTIVE,
          controlledFields: ['instrumentTypeName', 'decisionNumber', 'caseNumber'],
          computedFields: [],
          freeFormFields: ['holderName'],
          contentTemplate:
            'OFFICIAL LICENSE\nType: [[instrumentTypeName]]\nDecision: [[decisionNumber]]\nCase: [[caseNumber]]\nHolder: [[holderName]]',
          approvedAt: new Date(),
          approvedByIdentityId: base.decisionMakerIdentityId,
        },
      },
    },
    include: { versions: true },
  });

  const templateVersion = template.versions[0];
  if (!templateVersion) {
    throw new Error('Expected instrument template version in fixture');
  }

  await prisma.instrumentTypeVersion.update({
    where: { id: typeVersion.id },
    data: { requiredTemplateVersionId: templateVersion.id },
  });

  await prisma.instrumentTypeEligibleDecisionType.create({
    data: {
      instrumentTypeVersionId: typeVersion.id,
      decisionTypeVersionId: base.decisionTypeVersionId,
    },
  });

  const sealDefinition = await prisma.documentRecord.create({
    data: {
      documentNumber: `${marker}-SEAL-DEF`,
      title: 'Electronic Seal Definition (dual control)',
      documentType: 'SEAL_DEFINITION',
      sourceType: 'SYSTEM_GENERATED',
      owningInstitutionId: base.institutionId,
    },
  });

  return {
    instrumentTypeVersionId: typeVersion.id,
    templateVersionId: templateVersion.id,
    numberingRuleId: numberingRule.id,
    issueFunctionAuthorityRecordId: issueFunction.id,
    sealDefinitionId: sealDefinition.id,
  };
}

export async function seedSignedSealedDocuments(
  prisma: PrismaService,
  institutionId: string,
  marker = NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER,
): Promise<{ signatureDocumentVersionId: string; sealDocumentVersionId: string }> {
  const signatureRecord = await prisma.documentRecord.create({
    data: {
      documentNumber: `${marker}-SIG-DOC`,
      title: 'Signature Record',
      documentType: 'SIGNATURE',
      sourceType: 'SYSTEM_GENERATED',
      owningInstitutionId: institutionId,
      versions: {
        create: {
          versionNumber: 1,
          originalFilename: 'signature.txt',
          contentType: 'text/plain',
          sizeBytes: 10,
          storageProvider: 'inline',
          storageObjectKey: 'sig/key',
          sha256: 'abc123',
          signatureStatus: DocumentSignatureStatus.SIGNED,
        },
      },
    },
    include: { versions: true },
  });

  const sealRecord = await prisma.documentRecord.create({
    data: {
      documentNumber: `${marker}-SEAL-DOC`,
      title: 'Seal Record',
      documentType: 'SEAL',
      sourceType: 'SYSTEM_GENERATED',
      owningInstitutionId: institutionId,
      versions: {
        create: {
          versionNumber: 1,
          originalFilename: 'seal.txt',
          contentType: 'text/plain',
          sizeBytes: 10,
          storageProvider: 'inline',
          storageObjectKey: 'seal/key',
          sha256: 'def456',
          sealStatus: DocumentSealStatus.SEALED,
        },
      },
    },
    include: { versions: true },
  });

  const signatureVersion = signatureRecord.versions[0];
  const sealVersion = sealRecord.versions[0];
  if (!signatureVersion || !sealVersion) {
    throw new Error('Expected document versions in signed/sealed fixture');
  }

  return {
    signatureDocumentVersionId: signatureVersion.id,
    sealDocumentVersionId: sealVersion.id,
  };
}

export async function seedPhase8Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
  options?: { includePreRecordedDecision?: boolean },
): Promise<Phase8FixtureContext> {
  const marker = NON_PRODUCTION_PHASE_8_FIXTURE_MARKER;
  const base = await seedPhase8bDecisionFixture(prisma, {
    permissibleOutcomes: ['APPROVED', 'REFUSED', 'CONDITIONALLY_APPROVED'],
    packetFrozen: true,
    readyForDecisionReview: true,
  });

  const catalog = await setupIssuanceCatalog(prisma, base, marker);
  const docs = await seedSignedSealedDocuments(prisma, base.institutionId, marker);

  const actions = [
    AuthorityActionType.DECIDE,
    AuthorityActionType.SIGN,
    AuthorityActionType.ISSUE,
    AuthorityActionType.SUSPEND,
    AuthorityActionType.REVOKE,
    AuthorityActionType.HEAR_REVIEW,
  ];

  for (const functionAuthorityRecordId of [
    base.functionAuthorityRecordId,
    catalog.issueFunctionAuthorityRecordId,
  ]) {
    await prisma.authorityActionRight.deleteMany({ where: { functionAuthorityRecordId } });
    await prisma.authorityActionRight.createMany({
      data: actions.map((action) => ({
        functionAuthorityRecordId,
        action,
        permitted: true,
        requiresHumanActor: true,
      })),
    });
  }

  const applicant = await provisionSessionForIdentity(
    app,
    prisma,
    base.decisionMakerIdentityId,
    `${marker}-applicant@test.gov`,
  );
  const official = await createSessionIdentity(app, marker, 'official', prisma);
  const approver = await createSessionIdentity(app, marker, 'approver', prisma);

  const linkedCase = await prisma.case.findUniqueOrThrow({
    where: { id: base.caseId },
    select: { applicationId: true },
  });
  await prisma.case.update({
    where: { id: base.caseId },
    data: { applicantIdentityId: applicant.identityId },
  });
  await prisma.application.update({
    where: { id: linkedCase.applicationId },
    data: { applicantIdentityId: applicant.identityId },
  });

  let officialAppointmentId = base.appointmentId;
  let approverAppointmentId = base.appointmentId;

  if (official.officeholderId) {
    const officialAppointment = await prisma.appointment.create({
      data: {
        officeId: base.officeId,
        officeholderId: official.officeholderId,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    officialAppointmentId = officialAppointment.id;

    await prisma.functionAuthorityAssignment.createMany({
      data: [
        {
          functionAuthorityRecordId: base.functionAuthorityRecordId,
          officeholderId: official.officeholderId,
          officeId: base.officeId,
          institutionId: base.institutionId,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
        {
          functionAuthorityRecordId: catalog.issueFunctionAuthorityRecordId,
          officeholderId: official.officeholderId,
          officeId: base.officeId,
          institutionId: base.institutionId,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      ],
    });
  }

  if (approver.officeholderId) {
    const approverAppointment = await prisma.appointment.create({
      data: {
        officeId: base.officeId,
        officeholderId: approver.officeholderId,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
    approverAppointmentId = approverAppointment.id;

    await prisma.functionAuthorityAssignment.create({
      data: {
        functionAuthorityRecordId: base.functionAuthorityRecordId,
        officeholderId: approver.officeholderId,
        officeId: base.officeId,
        institutionId: base.institutionId,
        status: FunctionAssignmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
  }

  let governmentDecisionId: string | undefined;

  if (options?.includePreRecordedDecision) {
    const readiness = await prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber: `${marker}-DRA-001`,
        caseId: base.caseId,
        decisionTypeVersionId: base.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: base.decisionMakerIdentityId,
        proposedDecisionMakerOfficeholderId: base.officeholderId,
        requestedOutcome: 'APPROVED',
        outcome: 'READY',
        masterAdministrativeFileId: base.masterAdministrativeFileId,
        evidencePacketVersionId: base.evidencePacketVersionId,
      },
    });

    const decision = await prisma.governmentDecision.create({
      data: {
        decisionNumber: `${marker}-DEC-000001`,
        caseId: base.caseId,
        masterAdministrativeFileId: base.masterAdministrativeFileId,
        decisionTypeVersionId: base.decisionTypeVersionId,
        functionAuthorityRecordId: base.functionAuthorityRecordId,
        authorityEvaluationRecordId: (
          await prisma.authorityEvaluationRecord.create({
            data: {
              functionAuthorityRecordId: base.functionAuthorityRecordId,
              identityId: base.decisionMakerIdentityId,
              officeholderId: base.officeholderId,
              action: AuthorityActionType.DECIDE,
              outcome: 'ALLOW',
              requestHash: `${marker}-hash`,
              contextSnapshot: {},
            },
          })
        ).id,
        decisionReadinessAssessmentId: readiness.id,
        evidencePacketVersionId: base.evidencePacketVersionId,
        decisionMakerIdentityId: base.decisionMakerIdentityId,
        decisionMakerOfficeholderId: base.officeholderId,
        appointmentId: base.appointmentId,
        institutionId: base.institutionId,
        departmentId: base.departmentId,
        matterDecided: 'Application for license approved on substantive grounds',
        outcome: 'APPROVED',
        decisionStatus: GovernmentDecisionStatus.RECORDED,
        decidedAt: new Date(),
        integrityHash: `${marker}-integrity`,
        conditions: {
          create: [
            {
              conditionType: DecisionConditionType.PRECEDENT_TO_ISSUANCE,
              status: DecisionConditionStatus.SATISFIED,
              description: 'Fee payment confirmed',
              satisfiedAt: new Date(),
            },
          ],
        },
      },
    });
    governmentDecisionId = decision.id;
  }

  return {
    marker,
    jurisdictionId: base.jurisdictionId,
    institutionId: base.institutionId,
    departmentId: base.departmentId,
    officeId: base.officeId,
    officialOfficeholderId: official.officeholderId ?? base.officeholderId,
    appointmentId: officialAppointmentId,
    approverAppointmentId,
    caseId: base.caseId,
    masterAdministrativeFileId: base.masterAdministrativeFileId,
    decisionTypeVersionId: base.decisionTypeVersionId,
    instrumentTypeVersionId: catalog.instrumentTypeVersionId,
    templateVersionId: catalog.templateVersionId,
    numberingRuleId: catalog.numberingRuleId,
    functionAuthorityRecordId: base.functionAuthorityRecordId,
    issueFunctionAuthorityRecordId: catalog.issueFunctionAuthorityRecordId,
    evidencePacketVersionId: base.evidencePacketVersionId,
    permissibleOutcomes: base.permissibleOutcomes,
    approverOfficeholderId: approver.officeholderId ?? base.officeholderId,
    governmentDecisionId,
    sealDefinitionId: catalog.sealDefinitionId,
    signatureDocumentVersionId: docs.signatureDocumentVersionId,
    sealDocumentVersionId: docs.sealDocumentVersionId,
    applicantSessionToken: applicant.sessionToken,
    applicantIdentityId: applicant.identityId,
    officialSessionToken: official.sessionToken,
    officialIdentityId: official.identityId,
    approverSessionToken: approver.sessionToken,
    approverIdentityId: approver.identityId,
  };
}

export function requirePreRecordedDecision(fixture: Phase8FixtureContext): string {
  if (!fixture.governmentDecisionId) {
    throw new Error('Fixture requires includePreRecordedDecision: true');
  }
  return fixture.governmentDecisionId;
}

export async function assessDecisionReadiness(
  app: INestApplication<App>,
  fixture: Phase8FixtureContext,
  requestedOutcome = 'APPROVED',
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/decisions/readiness/assess')
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .send({
      caseId: fixture.caseId,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      proposedDecisionMakerIdentityId: fixture.officialIdentityId,
      proposedDecisionMakerOfficeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      requestedOutcome,
      evidencePacketVersionId: fixture.evidencePacketVersionId,
    })
    .expect(201);

  return response.body as { assessmentId: string; outcome: string };
}

export async function executeGovernmentDecision(
  app: INestApplication<App>,
  fixture: Phase8FixtureContext,
  outcome: string,
  options?: {
    matterDecided?: string;
    readinessAssessmentId?: string;
    isConflicted?: boolean;
    isRecused?: boolean;
    explicitIntentConfirmed?: boolean;
  },
) {
  const readiness =
    options?.readinessAssessmentId != null
      ? { assessmentId: options.readinessAssessmentId }
      : await assessDecisionReadiness(app, fixture, outcome);

  const response = await request(app.getHttpServer())
    .post('/api/v1/decisions/execute')
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .send({
      caseId: fixture.caseId,
      decisionTypeVersionId: fixture.decisionTypeVersionId,
      decisionReadinessAssessmentId: readiness.assessmentId,
      evidencePacketVersionId: fixture.evidencePacketVersionId,
      decisionMakerIdentityId: fixture.officialIdentityId,
      decisionMakerOfficeholderId: fixture.officialOfficeholderId,
      appointmentId: fixture.appointmentId,
      matterDecided: options?.matterDecided ?? `Institutional decision outcome: ${outcome}`,
      outcome,
      explicitIntentConfirmed: options?.explicitIntentConfirmed ?? true,
      isConflicted: options?.isConflicted,
      isRecused: options?.isRecused,
    })
    .expect(201);

  return response.body as { id: string; outcome: string; decisionStatus: GovernmentDecisionStatus };
}

export async function issueInstrumentForDecision(
  app: INestApplication<App>,
  fixture: Phase8FixtureContext,
  governmentDecisionId: string,
  options?: {
    signatureDocumentVersionId?: string;
    sealDocumentVersionId?: string;
    idempotencyKey?: string;
  },
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/decisions-issuance/issue')
    .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
    .send({
      governmentDecisionId,
      instrumentTypeVersionId: fixture.instrumentTypeVersionId,
      caseId: fixture.caseId,
      issuerOfficeholderId: fixture.officialOfficeholderId,
      issuerOfficeId: fixture.officeId,
      issuerAppointmentId: fixture.appointmentId,
      holderIdentityId: fixture.applicantIdentityId,
      scope: { activity: 'Import/export' },
      effectiveFrom: new Date('2026-01-01').toISOString(),
      signatureDocumentVersionId:
        options?.signatureDocumentVersionId ?? fixture.signatureDocumentVersionId,
      sealDocumentVersionId: options?.sealDocumentVersionId ?? fixture.sealDocumentVersionId,
      idempotencyKey: options?.idempotencyKey,
      freeFormFields: { holderName: 'Test Holder Ltd' },
    })
    .expect(201);

  return response.body as {
    instrument: { id: string; status: string; instrumentNumber: string | null };
  };
}
