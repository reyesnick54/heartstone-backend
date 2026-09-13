import { Injectable } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseStatus,
  CatalogLifecycleStatus,
  DecisionConditionStatus,
  DecisionConditionType,
  DocumentSealStatus,
  DocumentSignatureStatus,
  GovernmentDecisionStatus,
  InstrumentIssuerSource,
  IssuanceReadinessOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ISSUANCE_APPROVING_OUTCOMES,
  ISSUANCE_READINESS_CHECK_CODES,
  ISSUANCE_READINESS_CHECK_ORDER,
} from '../decisions-issuance.constants';

export interface IssuanceReadinessInput {
  governmentDecisionId: string;
  instrumentTypeVersionId: string;
  caseId: string;
  issuerIdentityId: string;
  issuerOfficeholderId: string;
  issuerOfficeId: string;
  issuerAppointmentId?: string;
  issuerDelegationId?: string;
  holderIdentityId?: string;
  holderOrganizationId?: string;
  scope?: Record<string, unknown>;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  signatureDocumentVersionId?: string;
  sealDocumentVersionId?: string;
  issuerSource?: InstrumentIssuerSource;
  externalIssuerReference?: string;
  assessedByIdentityId?: string;
  officialInstrumentId?: string;
}

export interface ReadinessCheckResult {
  code: string;
  passed: boolean;
  detail?: string;
}

export interface IssuanceReadinessResult {
  outcome: IssuanceReadinessOutcome;
  checklistResults: ReadinessCheckResult[];
  authorityEvaluationRecordId?: string;
}

const BLOCKING_DECISION_STATUSES = new Set<GovernmentDecisionStatus>([
  GovernmentDecisionStatus.SUPERSEDED,
  GovernmentDecisionStatus.SET_ASIDE,
  GovernmentDecisionStatus.WITHDRAWN_BY_AUTHORIZED_PROCESS,
]);

const FORMALIZED_DECISION_STATUSES = new Set<GovernmentDecisionStatus>([
  GovernmentDecisionStatus.RECORDED,
  GovernmentDecisionStatus.EFFECTIVE,
]);

@Injectable()
export class IssuanceReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async assess(input: IssuanceReadinessInput): Promise<IssuanceReadinessResult> {
    const checklistResults = await this.runChecks(input);
    const blocked = checklistResults.some(
      (check) =>
        !check.passed &&
        (check.code === ISSUANCE_READINESS_CHECK_CODES.NO_RETAINED_NATIONAL_BLOCK ||
          check.code === ISSUANCE_READINESS_CHECK_CODES.ISSUE_AUTHORITY_ALLOW),
    );

    let authorityEvaluationRecordId: string | undefined;
    const authorityCheck = checklistResults.find(
      (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.ISSUE_AUTHORITY_ALLOW,
    );
    if (authorityCheck?.passed) {
      const typeVersion = await this.prisma.instrumentTypeVersion.findUnique({
        where: { id: input.instrumentTypeVersionId },
      });
      if (typeVersion) {
        const evaluation = await this.authorityEvaluation.evaluate({
          identityId: input.issuerIdentityId,
          functionAuthorityRecordId: typeVersion.issuanceFunctionAuthorityRecordId,
          action: AuthorityActionType.ISSUE,
          officeholderId: input.issuerOfficeholderId,
          officeId: input.issuerOfficeId,
          appointmentId: input.issuerAppointmentId,
          delegationId: input.issuerDelegationId,
        });
        authorityEvaluationRecordId = evaluation.evaluationId;
        if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
          const idx = checklistResults.findIndex(
            (c) => c.code === ISSUANCE_READINESS_CHECK_CODES.ISSUE_AUTHORITY_ALLOW,
          );
          if (idx >= 0) {
            checklistResults[idx] = {
              code: ISSUANCE_READINESS_CHECK_CODES.ISSUE_AUTHORITY_ALLOW,
              passed: false,
              detail: `Authority evaluation outcome: ${evaluation.outcome}`,
            };
          }
        }
      }
    }

    const finalPassed = checklistResults.every((check) => check.passed);
    const outcome = blocked
      ? IssuanceReadinessOutcome.BLOCKED
      : finalPassed
        ? IssuanceReadinessOutcome.READY
        : IssuanceReadinessOutcome.NOT_READY;

    await this.prisma.issuanceReadinessAssessment.create({
      data: {
        officialInstrumentId: input.officialInstrumentId,
        governmentDecisionId: input.governmentDecisionId,
        instrumentTypeVersionId: input.instrumentTypeVersionId,
        caseId: input.caseId,
        outcome,
        checklistResults: checklistResults as unknown as object,
        assessedByIdentityId: input.assessedByIdentityId,
        authorityEvaluationRecordId,
      },
    });

    return { outcome, checklistResults, authorityEvaluationRecordId };
  }

  private async runChecks(input: IssuanceReadinessInput): Promise<ReadinessCheckResult[]> {
    const results: ReadinessCheckResult[] = [];

    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: input.governmentDecisionId },
      include: { conditions: true },
    });

    const typeVersion = await this.prisma.instrumentTypeVersion.findUnique({
      where: { id: input.instrumentTypeVersionId },
      include: {
        requiredTemplateVersion: true,
        numberingRule: true,
        eligibleDecisionTypes: true,
        issuingInstitution: true,
      },
    });

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: { masterAdministrativeFile: true },
    });

    const check = (code: string, passed: boolean, detail?: string) => {
      results.push({ code, passed, detail });
    };

    check(ISSUANCE_READINESS_CHECK_CODES.DECISION_EXISTS, !!decision);
    check(
      ISSUANCE_READINESS_CHECK_CODES.DECISION_BELONGS_TO_CASE,
      !!decision && decision.caseId === input.caseId,
    );

    const eligible =
      !!decision &&
      !!typeVersion &&
      typeVersion.eligibleDecisionTypes.some(
        (entry) => entry.decisionTypeVersionId === decision.decisionTypeVersionId,
      );
    check(ISSUANCE_READINESS_CHECK_CODES.DECISION_TYPE_ALLOWS_INSTRUMENT, eligible);

    check(
      ISSUANCE_READINESS_CHECK_CODES.DECISION_FORMALIZED,
      !!decision && FORMALIZED_DECISION_STATUSES.has(decision.decisionStatus),
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.DECISION_HAS_REASONS,
      !!decision && decision.matterDecided.trim().length > 0,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.NOTICE_STATUS_SATISFIED,
      !!decision && decision.decisionStatus !== GovernmentDecisionStatus.NOTICE_PENDING,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.DECISION_NOT_SUPERSEDED,
      !!decision && !BLOCKING_DECISION_STATUSES.has(decision.decisionStatus),
    );

    check(ISSUANCE_READINESS_CHECK_CODES.ISSUE_AUTHORITY_ALLOW, !!typeVersion);

    check(
      ISSUANCE_READINESS_CHECK_CODES.ISSUER_AUTHORIZED,
      !!input.issuerOfficeholderId && !!input.issuerIdentityId,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.OUTCOME_PERMITS_ISSUANCE,
      !!decision &&
        ISSUANCE_APPROVING_OUTCOMES.includes(
          decision.outcome as (typeof ISSUANCE_APPROVING_OUTCOMES)[number],
        ),
    );

    const precedentConditions =
      decision?.conditions.filter(
        (c) => c.conditionType === DecisionConditionType.PRECEDENT_TO_ISSUANCE,
      ) ?? [];
    const precedentOk =
      precedentConditions.length === 0 ||
      precedentConditions.every((c) => c.status === DecisionConditionStatus.SATISFIED);
    check(ISSUANCE_READINESS_CHECK_CODES.PRECEDENT_CONDITIONS_SATISFIED, precedentOk);

    let signaturePresent = true;
    let signatureValid = true;
    if (typeVersion?.signatureRequired) {
      if (!input.signatureDocumentVersionId) {
        signaturePresent = false;
        signatureValid = false;
      } else {
        const signatureDoc = await this.prisma.documentVersion.findUnique({
          where: { id: input.signatureDocumentVersionId },
        });
        signaturePresent = !!signatureDoc;
        signatureValid = signatureDoc?.signatureStatus === DocumentSignatureStatus.SIGNED;
      }
    }
    check(ISSUANCE_READINESS_CHECK_CODES.SIGNATURE_PRESENT, signaturePresent);
    check(ISSUANCE_READINESS_CHECK_CODES.SIGNATURE_VALID, signatureValid);

    let sealPresent = true;
    let sealValid = true;
    if (typeVersion?.sealRequired) {
      if (!input.sealDocumentVersionId) {
        sealPresent = false;
        sealValid = false;
      } else {
        const sealDoc = await this.prisma.documentVersion.findUnique({
          where: { id: input.sealDocumentVersionId },
        });
        sealPresent = !!sealDoc;
        sealValid = sealDoc?.sealStatus === DocumentSealStatus.SEALED;
      }
    }
    check(ISSUANCE_READINESS_CHECK_CODES.SEAL_PRESENT, sealPresent);
    check(ISSUANCE_READINESS_CHECK_CODES.SEAL_VALID, sealValid);

    check(
      ISSUANCE_READINESS_CHECK_CODES.TEMPLATE_VERSION_ACTIVE,
      !!typeVersion?.requiredTemplateVersion &&
        typeVersion.requiredTemplateVersion.lifecycleStatus === CatalogLifecycleStatus.ACTIVE &&
        typeVersion.requiredTemplateVersionId === typeVersion.requiredTemplateVersion.id,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.NUMBERING_RULE_ACTIVE,
      !!typeVersion && typeVersion.numberingRule.lifecycleStatus === CatalogLifecycleStatus.ACTIVE,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.HOLDER_ESTABLISHED,
      !!(input.holderIdentityId ?? input.holderOrganizationId),
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.SCOPE_ESTABLISHED,
      !!input.scope && Object.keys(input.scope).length > 0,
    );

    check(ISSUANCE_READINESS_CHECK_CODES.EFFECTIVE_DATE_ESTABLISHED, !!input.effectiveFrom);

    const expiryRule = typeVersion?.durationExpiryRule as { required?: boolean } | null;
    const expiryRequired = expiryRule?.required === true;
    check(
      ISSUANCE_READINESS_CHECK_CODES.EXPIRY_DATE_ESTABLISHED,
      !expiryRequired || !!input.effectiveUntil,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.VERIFICATION_METHOD_AVAILABLE,
      !!typeVersion?.verificationMethod,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.RECORDS_INFRASTRUCTURE_AVAILABLE,
      !!caseRecord?.masterAdministrativeFile,
    );

    check(
      ISSUANCE_READINESS_CHECK_CODES.NO_SAFE_HALT,
      !!caseRecord &&
        caseRecord.status !== CaseStatus.SAFE_HALTED &&
        caseRecord.status !== CaseStatus.SAFE_HALT,
    );

    const retainedBlock =
      typeVersion?.retainedNationalBoundary === true &&
      input.issuerSource !== InstrumentIssuerSource.RETAINED_NATIONAL_COORDINATED &&
      input.issuerSource !== InstrumentIssuerSource.EXTERNAL_AUTHENTICATED;
    check(ISSUANCE_READINESS_CHECK_CODES.NO_RETAINED_NATIONAL_BLOCK, !retainedBlock);

    return ISSUANCE_READINESS_CHECK_ORDER.map((code) => {
      const found = results.find((r) => r.code === code);
      return found ?? { code, passed: false, detail: 'Check not evaluated' };
    });
  }
}
