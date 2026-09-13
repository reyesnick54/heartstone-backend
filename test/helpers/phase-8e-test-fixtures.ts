import {
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
  OfficialInstrumentKind,
} from '@prisma/client';

import { NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER } from '../../src/decisions-issuance/decisions-issuance.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import { seedPhase8bDecisionFixture } from '../../src/decisions/fixtures/phase-8b-test-fixtures';

export interface Phase8eFixtureContext {
  caseId: string;
  masterAdministrativeFileId: string;
  decisionTypeVersionId: string;
  instrumentTypeVersionId: string;
  templateVersionId: string;
  numberingRuleId: string;
  issueFunctionAuthorityRecordId: string;
  governmentDecisionId: string;
  officialIdentityId: string;
  officialOfficeholderId: string;
  officeId: string;
  appointmentId: string;
  institutionId: string;
  applicantIdentityId: string;
}

export async function seedPhase8eIssuanceFixture(
  prisma: PrismaService,
): Promise<Phase8eFixtureContext> {
  const marker = NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER;
  const base = await seedPhase8bDecisionFixture(prisma);

  const issueFunction = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-ISSUE-FUNC`,
      name: 'Phase 8E Issue Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: base.institutionId,
      requiresAppointment: true,
      actionRights: {
        create: [{ action: AuthorityActionType.ISSUE, permitted: true }],
      },
      assignments: {
        create: [
          {
            officeholderId: base.officeholderId,
            officeId: base.officeId,
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
      name: 'Phase 8E Numbering',
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
      sealRequired: false,
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
        await prisma.authorityEvaluationRecord.findFirst({
          orderBy: { evaluatedAt: 'desc' },
        })
      )?.id ?? (
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

  return {
    caseId: base.caseId,
    masterAdministrativeFileId: base.masterAdministrativeFileId,
    decisionTypeVersionId: base.decisionTypeVersionId,
    instrumentTypeVersionId: typeVersion.id,
    templateVersionId: templateVersion.id,
    numberingRuleId: numberingRule.id,
    issueFunctionAuthorityRecordId: issueFunction.id,
    governmentDecisionId: decision.id,
    officialIdentityId: base.decisionMakerIdentityId,
    officialOfficeholderId: base.officeholderId,
    officeId: base.officeId,
    appointmentId: base.appointmentId,
    institutionId: base.institutionId,
    applicantIdentityId: base.decisionMakerIdentityId,
  };
}

export async function seedSignedSealedDocuments(
  prisma: PrismaService,
  institutionId: string,
): Promise<{ signatureDocumentVersionId: string; sealDocumentVersionId: string }> {
  const marker = NON_PRODUCTION_DECISIONS_ISSUANCE_FIXTURE_MARKER;

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
