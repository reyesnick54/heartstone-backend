import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseStatus,
  DecisionAssistanceStatus,
  DecisionConditionStatus,
  DecisionConditionType,
  DecisionNoticeEffectTiming,
  DecisionNoticeStatus,
  GovernmentDecisionOutcome,
  GovernmentDecisionStatus,
  type Prisma,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../database/prisma.service';
import { hashDecisionText } from './common/decision-text-hash.util';
import {
  parsePermittedOutcomes,
  resolveConfiguredNoticeRights,
} from './common/decision-type-config.util';
import { DecisionsBoundaryService } from './common/decisions-boundary.service';
import { DECISION_NOTICE_NUMBER_PREFIX, DECISION_NUMBER_PREFIX } from './decisions.constants';
import { AddDecisionConditionDto } from './dto/add-decision-condition.dto';
import { AddDecisionFindingDto } from './dto/add-decision-finding.dto';
import { AddDecisionReasonDto } from './dto/add-decision-reason.dto';
import { CreateGovernmentDecisionDto } from './dto/create-government-decision.dto';
import { PrepareDecisionNoticeDto } from './dto/prepare-decision-notice.dto';

const DECISION_DETAIL_INCLUDE = {
  findings: { orderBy: { sequence: 'asc' } },
  reasons: { orderBy: { sequence: 'asc' } },
  conditions: { orderBy: { conditionNumber: 'asc' } },
  notices: {
    include: { rights: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  },
  assistanceRecords: true,
  case: true,
} satisfies Prisma.GovernmentDecisionInclude;

@Injectable()
export class GovernmentDecisionsService {
  private readonly boundary = new DecisionsBoundaryService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createDecision(actorIdentityId: string, dto: CreateGovernmentDecisionDto) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: dto.caseId },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    if (caseRecord.status !== CaseStatus.DECISION_PENDING) {
      throw new BadRequestException(
        'Government decisions may only be opened from DECISION_PENDING cases',
      );
    }

    const typeDefinition = await this.getDecisionTypeDefinition(
      caseRecord.governmentServiceVersionId,
      dto.decisionTypeCode,
    );

    if (dto.outcome) {
      const permitted = parsePermittedOutcomes(typeDefinition);
      if (!permitted.includes(dto.outcome)) {
        throw new BadRequestException(
          `Outcome ${dto.outcome} is not permitted for this decision type`,
        );
      }
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: actorIdentityId,
      officeholderId: dto.decisionMakerOfficeholderId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Government decision creation requires explicit authority evaluation; case assignment is insufficient',
      );
    }

    const decisionNumber = await this.generateDecisionNumber();

    return this.prisma.governmentDecision.create({
      data: {
        decisionNumber,
        caseId: dto.caseId,
        governmentServiceVersionId: caseRecord.governmentServiceVersionId,
        decisionTypeCode: dto.decisionTypeCode,
        outcome: dto.outcome,
        decisionMakerIdentityId: actorIdentityId,
        decisionMakerOfficeholderId: dto.decisionMakerOfficeholderId,
        functionAuthorityRecordId: dto.functionAuthorityRecordId,
        configurationFingerprint: caseRecord.configurationFingerprint,
        isFinalAdverse: dto.outcome === GovernmentDecisionOutcome.REFUSED,
      },
      include: DECISION_DETAIL_INCLUDE,
    });
  }

  async getDecision(decisionId: string) {
    const decision = await this.prisma.governmentDecision.findUnique({
      where: { id: decisionId },
      include: DECISION_DETAIL_INCLUDE,
    });

    if (!decision) {
      throw new NotFoundException('Government decision not found');
    }

    return decision;
  }

  async addFinding(decisionId: string, dto: AddDecisionFindingDto) {
    const decision = await this.getMutableDecision(decisionId);

    const latest = await this.prisma.decisionFinding.findFirst({
      where: { governmentDecisionId: decision.id },
      orderBy: { sequence: 'desc' },
    });
    const sequence = (latest?.sequence ?? 0) + 1;

    const finding = await this.prisma.decisionFinding.create({
      data: {
        governmentDecisionId: decision.id,
        sequence,
        findingCode: dto.findingCode,
        findingText: dto.findingText,
        sourceCriterionReference: dto.sourceCriterionReference,
        evidenceReferences: dto.evidenceReferences ?? [],
        professionalReviewReferences: dto.professionalReviewReferences ?? [],
        governmentInputReferences: dto.governmentInputReferences ?? [],
      },
    });

    if (decision.status === GovernmentDecisionStatus.DRAFT) {
      await this.prisma.governmentDecision.update({
        where: { id: decision.id },
        data: { status: GovernmentDecisionStatus.FINDINGS_RECORDED },
      });
    }

    return finding;
  }

  async listFindings(decisionId: string) {
    await this.assertDecisionExists(decisionId);
    return this.prisma.decisionFinding.findMany({
      where: { governmentDecisionId: decisionId },
      orderBy: { sequence: 'asc' },
    });
  }

  async addReason(decisionId: string, dto: AddDecisionReasonDto) {
    const decision = await this.getMutableDecision(decisionId);
    const typeDefinition = await this.getDecisionTypeDefinition(
      decision.governmentServiceVersionId,
      decision.decisionTypeCode,
    );

    if (dto.decisionMakerOfficeholderId !== decision.decisionMakerOfficeholderId) {
      throw new ForbiddenException(
        'Decision reasons must remain attributable to the authorized decision-maker',
      );
    }

    let assistanceStatus: DecisionAssistanceStatus | null = null;
    if (dto.assistanceRecordId) {
      const assistance = await this.prisma.decisionAssistanceRecord.findUnique({
        where: { id: dto.assistanceRecordId },
      });

      if (assistance?.governmentDecisionId !== decision.id) {
        throw new NotFoundException('Decision assistance record not found for this decision');
      }

      assistanceStatus = assistance.status;
      this.boundary.assertAiDraftConfirmed(
        typeDefinition.requiresHumanConfirmationForAiDraft,
        assistanceStatus,
      );
    }

    const latest = await this.prisma.decisionReason.findFirst({
      where: { governmentDecisionId: decision.id },
      orderBy: { sequence: 'desc' },
    });
    const sequence = (latest?.sequence ?? 0) + 1;
    const approvedTextHash = hashDecisionText(dto.reasonText);

    const reason = await this.prisma.decisionReason.create({
      data: {
        governmentDecisionId: decision.id,
        sequence,
        reasonText: dto.reasonText,
        authorityReference: dto.authorityReference,
        findingReferences: dto.findingReferences ?? [],
        evidenceReferences: dto.evidenceReferences ?? [],
        limitationDisclosure: dto.limitationDisclosure,
        decisionMakerOfficeholderId: dto.decisionMakerOfficeholderId,
        approvedTextHash,
      },
    });

    if (
      decision.status === GovernmentDecisionStatus.DRAFT ||
      decision.status === GovernmentDecisionStatus.FINDINGS_RECORDED
    ) {
      await this.prisma.governmentDecision.update({
        where: { id: decision.id },
        data: { status: GovernmentDecisionStatus.REASONS_RECORDED },
      });
    }

    return reason;
  }

  async listReasons(decisionId: string) {
    await this.assertDecisionExists(decisionId);
    return this.prisma.decisionReason.findMany({
      where: { governmentDecisionId: decisionId },
      orderBy: { sequence: 'asc' },
    });
  }

  async addCondition(decisionId: string, dto: AddDecisionConditionDto) {
    const decision = await this.getMutableDecision(decisionId);

    const latest = await this.prisma.decisionCondition.findFirst({
      where: { governmentDecisionId: decision.id },
      orderBy: { conditionNumber: 'desc' },
    });
    const conditionNumber = (latest?.conditionNumber ?? 0) + 1;

    const condition = await this.prisma.decisionCondition.create({
      data: {
        governmentDecisionId: decision.id,
        conditionNumber,
        conditionType: dto.conditionType,
        sourceAuthority: dto.sourceAuthority,
        responsibleParty: dto.responsibleParty,
        requiredActionOrRestraint: dto.requiredActionOrRestraint,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        requiredEvidenceDescription: dto.requiredEvidenceDescription,
        monitoringMethod: dto.monitoringMethod,
        verifierOfficeAuthority: dto.verifierOfficeAuthority,
        consequenceOfNoncompliance: dto.consequenceOfNoncompliance,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        status:
          dto.conditionType === DecisionConditionType.PRECEDENT_TO_ISSUANCE
            ? DecisionConditionStatus.PENDING
            : DecisionConditionStatus.NOT_YET_EFFECTIVE,
      },
    });

    const conditionAttachableStatuses: GovernmentDecisionStatus[] = [
      GovernmentDecisionStatus.DRAFT,
      GovernmentDecisionStatus.FINDINGS_RECORDED,
      GovernmentDecisionStatus.REASONS_RECORDED,
    ];

    if (conditionAttachableStatuses.includes(decision.status)) {
      await this.prisma.governmentDecision.update({
        where: { id: decision.id },
        data: { status: GovernmentDecisionStatus.CONDITIONS_ATTACHED },
      });
    }

    return condition;
  }

  async listConditions(decisionId: string) {
    await this.assertDecisionExists(decisionId);
    return this.prisma.decisionCondition.findMany({
      where: { governmentDecisionId: decisionId },
      orderBy: { conditionNumber: 'asc' },
    });
  }

  async approveCondition(
    decisionId: string,
    conditionId: string,
    actorIdentityId: string,
    actorOfficeholderId: string,
  ) {
    const decision = await this.getMutableDecision(decisionId);
    const condition = await this.getConditionForDecision(decision.id, conditionId);

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: actorIdentityId,
      officeholderId: actorOfficeholderId,
      functionAuthorityRecordId: decision.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Condition approval requires explicit decision authority');
    }

    return this.prisma.decisionCondition.update({
      where: { id: condition.id },
      data: {
        approvedTextHash: hashDecisionText(condition.requiredActionOrRestraint),
        approvedAt: new Date(),
        status:
          condition.conditionType === DecisionConditionType.PRECEDENT_TO_ISSUANCE
            ? DecisionConditionStatus.PENDING
            : DecisionConditionStatus.NOT_YET_EFFECTIVE,
      },
    });
  }

  async attemptSilentConditionEdit(
    decisionId: string,
    conditionId: string,
    nextText: string,
  ): Promise<never> {
    const condition = await this.getConditionForDecision(decisionId, conditionId);
    this.boundary.assertConditionNotSilentlyAltered({
      approvedTextHash: condition.approvedTextHash,
      currentText: condition.requiredActionOrRestraint,
      nextText,
    });
    throw new ForbiddenException('Condition edit rejected');
  }

  async waiveCondition(
    decisionId: string,
    conditionId: string,
    waiverDecisionId: string,
    actorIdentityId: string,
    actorOfficeholderId: string,
  ) {
    const decision = await this.getMutableDecision(decisionId);
    const condition = await this.getConditionForDecision(decision.id, conditionId);
    const waiverDecision = await this.prisma.governmentDecision.findUnique({
      where: { id: waiverDecisionId },
    });

    if (waiverDecision?.caseId !== decision.caseId) {
      throw new NotFoundException('Authorized waiver decision not found for this case');
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: actorIdentityId,
      officeholderId: actorOfficeholderId,
      functionAuthorityRecordId: waiverDecision.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Condition waiver requires explicit authorized decision path');
    }

    return this.prisma.decisionCondition.update({
      where: { id: condition.id },
      data: {
        status: DecisionConditionStatus.WAIVED_BY_AUTHORIZED_DECISION,
        waiverDecisionId,
      },
    });
  }

  async assertIssuanceAllowed(decisionId: string) {
    const decision = await this.getDecision(decisionId);
    const typeDefinition = await this.getDecisionTypeDefinition(
      decision.governmentServiceVersionId,
      decision.decisionTypeCode,
    );

    const unsatisfied = decision.conditions.filter((condition) =>
      this.boundary.isUnsatisfiedPrecedentCondition(condition),
    );

    this.boundary.assertIssuanceNotBlocked({
      blocksIssuanceOnUnsatisfiedPrecedent: typeDefinition.blocksIssuanceOnUnsatisfiedPrecedent,
      permitsIssuanceDespiteUnsatisfiedPrecedent:
        typeDefinition.permitsIssuanceDespiteUnsatisfiedPrecedent,
      unsatisfiedPrecedentCount: unsatisfied.length,
    });

    return { allowed: true, unsatisfiedPrecedentCount: unsatisfied.length };
  }

  async prepareNotice(decisionId: string, dto: PrepareDecisionNoticeDto) {
    const decision = await this.getMutableDecision(decisionId);
    const typeDefinition = await this.getDecisionTypeDefinition(
      decision.governmentServiceVersionId,
      decision.decisionTypeCode,
    );
    const redressRoutes = await this.prisma.governmentServiceRedressRoute.findMany({
      where: { governmentServiceVersionId: decision.governmentServiceVersionId },
      orderBy: { sortOrder: 'asc' },
    });

    const configuredRights = resolveConfiguredNoticeRights(typeDefinition, redressRoutes);
    const principalReasons = decision.reasons.map((reason) => reason.reasonText).join('\n\n');

    if (
      decision.outcome === GovernmentDecisionOutcome.REFUSED &&
      principalReasons.trim().length === 0
    ) {
      throw new BadRequestException('Refusal notice requires principal reasons');
    }

    if (
      decision.outcome === GovernmentDecisionOutcome.CONDITIONAL_APPROVAL &&
      decision.conditions.length === 0 &&
      !dto.conditionsSummary
    ) {
      throw new BadRequestException('Conditional approval notice requires conditions summary');
    }

    const noticeNumber = await this.generateNoticeNumber();
    const conditionsSummary =
      dto.conditionsSummary ??
      decision.conditions
        .map((c) => `${String(c.conditionNumber)}. ${c.requiredActionOrRestraint}`)
        .join('\n');

    const notice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.decisionNotice.create({
        data: {
          governmentDecisionId: decision.id,
          noticeNumber,
          decisionSummary: dto.decisionSummary,
          principalReasons,
          materialRequirementsNotSatisfied: dto.materialRequirementsNotSatisfied,
          conditionsSummary,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : decision.effectiveFrom,
          correctionOpportunity: dto.correctionOpportunity,
          reviewOrAppealRightsSummary: dto.reviewOrAppealRightsSummary,
          filingMethod: dto.filingMethod,
          filingDeadline: dto.filingDeadline ? new Date(dto.filingDeadline) : null,
          competentReviewer: dto.competentReviewer,
          effectOfFiling: dto.effectOfFiling,
          confidentialityRedactions: (dto.confidentialityRedactions ?? []) as Prisma.InputJsonValue,
          noticeStatus: DecisionNoticeStatus.DRAFT,
          preparedAt: new Date(),
        },
      });

      for (const [index, right] of configuredRights.entries()) {
        await tx.decisionNoticeRight.create({
          data: {
            decisionNoticeId: created.id,
            rightType: right.rightType,
            routeCode: right.routeCode,
            label: right.label,
            description: right.description,
            filingMethod: right.contactReference,
            sortOrder: index,
          },
        });
      }

      return tx.decisionNotice.findUnique({
        where: { id: created.id },
        include: { rights: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    await this.prisma.governmentDecision.update({
      where: { id: decision.id },
      data: { status: GovernmentDecisionStatus.NOTICE_PREPARED },
    });

    return notice;
  }

  async finalizeNotice(
    decisionId: string,
    noticeId: string,
    actorIdentityId: string,
    actorOfficeholderId: string,
  ) {
    const decision = await this.getMutableDecision(decisionId);
    const notice = await this.prisma.decisionNotice.findUnique({
      where: { id: noticeId },
      include: { rights: true },
    });

    if (notice?.governmentDecisionId !== decision.id) {
      throw new NotFoundException('Decision notice not found for this decision');
    }

    const typeDefinition = await this.getDecisionTypeDefinition(
      decision.governmentServiceVersionId,
      decision.decisionTypeCode,
    );

    if (
      typeDefinition.noticeEffectTiming === DecisionNoticeEffectTiming.REQUIRED_BEFORE_EFFECTIVENESS
    ) {
      if (!notice.effectiveDate) {
        throw new BadRequestException(
          'Notice configured as required before effectiveness must include effective date',
        );
      }
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: actorIdentityId,
      officeholderId: actorOfficeholderId,
      functionAuthorityRecordId: decision.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Notice finalization requires explicit decision authority');
    }

    return this.prisma.decisionNotice.update({
      where: { id: notice.id },
      data: {
        noticeStatus: DecisionNoticeStatus.FINALIZED,
        finalizedAt: new Date(),
      },
      include: { rights: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async finalizeDecision(
    decisionId: string,
    actorIdentityId: string,
    actorOfficeholderId: string,
    outcome: GovernmentDecisionOutcome,
  ) {
    const decision = await this.getMutableDecision(decisionId);
    const typeDefinition = await this.getDecisionTypeDefinition(
      decision.governmentServiceVersionId,
      decision.decisionTypeCode,
    );

    const permitted = parsePermittedOutcomes(typeDefinition);
    if (!permitted.includes(outcome)) {
      throw new BadRequestException(`Outcome ${outcome} is not configured for this decision type`);
    }

    const reasons = await this.prisma.decisionReason.findMany({
      where: { governmentDecisionId: decision.id },
    });

    this.boundary.assertReasonsRequired(typeDefinition.requiresReasons, reasons.length);

    for (const reason of reasons) {
      const linkedAssistance = await this.prisma.decisionAssistanceRecord.findFirst({
        where: { decisionReasonId: reason.id },
        orderBy: { recordedAt: 'desc' },
      });

      this.boundary.assertAiDraftConfirmed(
        typeDefinition.requiresHumanConfirmationForAiDraft,
        linkedAssistance?.status,
      );
    }

    const isFinalAdverse = outcome === GovernmentDecisionOutcome.REFUSED;
    this.boundary.assertReturnForInfoNotMaskingRefusal({
      outcome,
      isFinalAdverse: isFinalAdverse || decision.isFinalAdverse,
    });

    if (outcome !== GovernmentDecisionOutcome.RETURN_FOR_INFORMATION) {
      await this.assertIssuanceAllowed(decisionId);
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: actorIdentityId,
      officeholderId: actorOfficeholderId,
      functionAuthorityRecordId: decision.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Decision finalization requires explicit authority evaluation');
    }

    return this.prisma.governmentDecision.update({
      where: { id: decision.id },
      data: {
        outcome,
        status: GovernmentDecisionStatus.FINALIZED,
        isFinalAdverse,
        finalizedAt: new Date(),
        effectiveFrom: decision.effectiveFrom ?? new Date(),
      },
      include: DECISION_DETAIL_INCLUDE,
    });
  }

  private async getDecisionTypeDefinition(serviceVersionId: string, decisionTypeCode: string) {
    const definition = await this.prisma.governmentServiceDecisionTypeDefinition.findUnique({
      where: {
        governmentServiceVersionId_decisionTypeCode: {
          governmentServiceVersionId: serviceVersionId,
          decisionTypeCode,
        },
      },
    });

    if (!definition) {
      throw new NotFoundException(
        `Decision type configuration ${decisionTypeCode} not found for service version`,
      );
    }

    return definition;
  }

  private async getMutableDecision(decisionId: string) {
    const decision = await this.getDecision(decisionId);
    this.boundary.assertDecisionMutable(decision.status);
    return decision;
  }

  private async assertDecisionExists(decisionId: string) {
    const decision = await this.prisma.governmentDecision.findUnique({ where: { id: decisionId } });
    if (!decision) {
      throw new NotFoundException('Government decision not found');
    }
  }

  private async getConditionForDecision(decisionId: string, conditionId: string) {
    const condition = await this.prisma.decisionCondition.findUnique({
      where: { id: conditionId },
    });
    if (condition?.governmentDecisionId !== decisionId) {
      throw new NotFoundException('Decision condition not found');
    }
    return condition;
  }

  private async generateDecisionNumber(): Promise<string> {
    const count = await this.prisma.governmentDecision.count();
    return `${DECISION_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }

  private async generateNoticeNumber(): Promise<string> {
    const count = await this.prisma.decisionNotice.count();
    return `${DECISION_NOTICE_NUMBER_PREFIX}-${String(count + 1).padStart(8, '0')}`;
  }
}
