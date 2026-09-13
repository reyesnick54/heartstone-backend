import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  ApplicationSubmissionStatus,
  AppointmentStatus,
  AuthenticationMethodType,
  AuthorityActionType,
  AuthorityClassification,
  CatalogLifecycleStatus,
  ControlledFunctionClass,
  DecisionConditionStatus,
  DecisionConditionType,
  DecisionNoticeEffectTiming,
  DocumentSealStatus,
  DocumentSignatureStatus,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  GovernmentDecisionOutcome,
  GovernmentDecisionStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  OfficialInstrumentKind,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { NON_PRODUCTION_APPLICATION_PROCESSING_FIXTURE_MARKER } from '../../src/application-processing/application-processing.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_DECISIONS_FIXTURE_MARKER } from '../../src/decisions/decisions.constants';
import { seedPhase8bDecisionFixture } from '../../src/decisions/fixtures/phase-8b-test-fixtures';
import { NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER } from '../../src/decisions-issuance/decisions-issuance.constants';
import { asLoginResponseBody } from './identity-test-types';
import { seedPhase6Fixture } from './phase-6-test-fixtures';
import { type Phase8SessionContext } from './phase-8-test-types';

export const NON_PRODUCTION_PHASE_8_FIXTURE_MARKER = NON_PRODUCTION_DECISIONS_FIXTURE_MARKER;

export interface Phase8DecisionFixtureContext {
  phase6: Awaited<ReturnType<typeof seedPhase6Fixture>>;
  decisionFunctionAuthorityRecordId: string;
  decisionTypeCode: string;
  caseId: string;
}

export async function seedPhase8DecisionFixture(
  prisma: PrismaService,
  app: { getHttpServer: () => App },
): Promise<Phase8DecisionFixtureContext> {
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

export interface Phase8FixtureContext extends Phase8SessionContext {
  marker: string;
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  officeId: string;
  officialOfficeholderId: string;
  appointmentId: string;
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

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: identity.id, type: 'PASSWORD', password: 'Phase8123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: identity.id, type: AuthenticationMethodType.PASSWORD })
    .expect(201);

  const login = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({ loginIdentifier, password: 'Phase8123!' })
        .expect(201)
    ).body,
  );

  return { identityId: identity.id, sessionToken: login.sessionToken, officeholderId };
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

  const applicant = await createSessionIdentity(app, marker, 'applicant', prisma);
  const official = await createSessionIdentity(app, marker, 'official', prisma);
  const approver = await createSessionIdentity(app, marker, 'approver', prisma);

  if (official.officeholderId) {
    await prisma.appointment.create({
      data: {
        officeId: base.officeId,
        officeholderId: official.officeholderId,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });
  }

  if (approver.officeholderId) {
    await prisma.appointment.create({
      data: {
        officeId: base.officeId,
        officeholderId: approver.officeholderId,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

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
    appointmentId: base.appointmentId,
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
      signatureDocumentVersionId: options?.signatureDocumentVersionId,
      sealDocumentVersionId: options?.sealDocumentVersionId,
      idempotencyKey: options?.idempotencyKey,
      freeFormFields: { holderName: 'Test Holder Ltd' },
    })
    .expect(201);

  return response.body as {
    instrument: { id: string; status: string; instrumentNumber: string | null };
  };
}
