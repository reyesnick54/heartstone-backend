import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseStatus,
  DecisionReadinessOutcome,
  DecisionTypeVersionStatus,
  DelegationStatus,
  EvidencePacketVersionStatus,
  type GovernmentDecision,
  GovernmentDecisionStatus,
} from '@prisma/client';

import { CaseStatusService } from '../../application-processing/cases/case-status.service';
import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { hashGovernmentDecisionSnapshot } from '../common/decision-hash.util';
import {
  DECISION_NUMBER_PREFIX,
  DECISION_READINESS_REASON_CODES,
  PHASE_8B_BOUNDARY_DISCLAIMER,
} from '../decisions.constants';
import { type DecisionExecutionInput } from '../decisions.types';

const IMMUTABLE_DECISION_UPDATE_FIELDS = [
  'outcome',
  'decisionMakerIdentityId',
  'decisionMakerOfficeholderId',
  'evidencePacketVersionId',
  'authorityEvaluationRecordId',
  'decisionTypeVersionId',
  'decidedAt',
] as const;

@Injectable()
export class DecisionExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly caseStatus: CaseStatusService,
  ) {}

  async executeDecision(input: DecisionExecutionInput): Promise<GovernmentDecision> {
    if (!input.explicitIntentConfirmed) {
      throw new BadRequestException(DECISION_READINESS_REASON_CODES.EXPLICIT_INTENT_REQUIRED);
    }

    const at = input.at ?? new Date();

    const readiness = await this.prisma.decisionReadinessAssessment.findUnique({
      where: { id: input.decisionReadinessAssessmentId },
      include: { decisionTypeVersion: true },
    });

    if (!readiness) {
      throw new NotFoundException(
        `DecisionReadinessAssessment "${input.decisionReadinessAssessmentId}" was not found`,
      );
    }

    if (readiness.outcome !== DecisionReadinessOutcome.READY) {
      throw new ConflictException(DECISION_READINESS_REASON_CODES.READINESS_NOT_READY);
    }

    if (readiness.caseId !== input.caseId) {
      throw new BadRequestException('Readiness assessment does not match the requested case');
    }

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: { masterAdministrativeFile: true },
    });

    if (caseRecord?.status !== CaseStatus.DECISION_PENDING) {
      throw new ConflictException(DECISION_READINESS_REASON_CODES.CASE_NOT_DECISION_PENDING);
    }

    const decisionTypeVersion = readiness.decisionTypeVersion;
    if (decisionTypeVersion.status !== DecisionTypeVersionStatus.ACTIVE) {
      throw new ConflictException(DECISION_READINESS_REASON_CODES.DECISION_TYPE_VERSION_INACTIVE);
    }

    const permissibleOutcomes = decisionTypeVersion.permissibleOutcomes as string[];
    if (!permissibleOutcomes.includes(input.outcome)) {
      throw new BadRequestException(DECISION_READINESS_REASON_CODES.OUTCOME_NOT_PERMISSIBLE);
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.decisionMakerIdentityId },
    });
    if (!identity?.type || !this.actorResolver.isHumanActor(identity.type)) {
      throw new ForbiddenException(DECISION_READINESS_REASON_CODES.NON_HUMAN_ACTOR);
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
    });
    if (appointment == null) {
      throw new ForbiddenException(DECISION_READINESS_REASON_CODES.APPOINTMENT_INVALID);
    }
    if (
      appointment.status !== AppointmentStatus.ACTIVE ||
      !isAppointmentCurrent(appointment, at) ||
      appointment.officeholderId !== input.decisionMakerOfficeholderId
    ) {
      throw new ForbiddenException(DECISION_READINESS_REASON_CODES.APPOINTMENT_INVALID);
    }

    if (input.delegationId) {
      const delegation = await this.prisma.delegation.findUnique({
        where: { id: input.delegationId },
      });
      if (delegation?.status !== DelegationStatus.ACTIVE) {
        throw new ForbiddenException(DECISION_READINESS_REASON_CODES.DELEGATION_INVALID);
      }
    }

    if (input.isConflicted) {
      throw new ForbiddenException(DECISION_READINESS_REASON_CODES.DECISION_MAKER_CONFLICTED);
    }

    if (input.isRecused) {
      throw new ForbiddenException(DECISION_READINESS_REASON_CODES.DECISION_MAKER_RECUSED);
    }

    const packetVersion = await this.prisma.evidencePacketVersion.findUnique({
      where: { id: input.evidencePacketVersionId },
    });
    if (packetVersion?.status !== EvidencePacketVersionStatus.FROZEN) {
      throw new ConflictException(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_NOT_FROZEN);
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.decisionMakerIdentityId,
      functionAuthorityRecordId: decisionTypeVersion.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
      officeholderId: input.decisionMakerOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
      isConflicted: input.isConflicted,
      isRecused: input.isRecused,
      hasSecondApproval: input.hasSecondApproval,
      priorActions: input.priorActions as AuthorityActionType[] | undefined,
      at,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        authorityResult.outcome === AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION
          ? DECISION_READINESS_REASON_CODES.AUTHORITY_REQUIRES_EXTERNAL
          : DECISION_READINESS_REASON_CODES.AUTHORITY_DENIED,
      );
    }

    const masterFile = caseRecord.masterAdministrativeFile;
    if (!masterFile) {
      throw new ConflictException(DECISION_READINESS_REASON_CODES.MASTER_FILE_MISSING);
    }

    const decisionNumber = await this.generateDecisionNumber();
    const decidedAt = at;

    const snapshot = {
      caseId: input.caseId,
      decisionTypeVersionId: input.decisionTypeVersionId,
      evidencePacketVersionId: input.evidencePacketVersionId,
      authorityEvaluationRecordId: authorityResult.evaluationId,
      decisionMakerIdentityId: input.decisionMakerIdentityId,
      decisionMakerOfficeholderId: input.decisionMakerOfficeholderId,
      outcome: input.outcome,
      matterDecided: input.matterDecided,
      decidedAt: decidedAt.toISOString(),
    };

    const integrityHash = hashGovernmentDecisionSnapshot(snapshot);

    const decision = await this.prisma.$transaction(async (tx) => {
      const created = await tx.governmentDecision.create({
        data: {
          decisionNumber,
          caseId: input.caseId,
          masterAdministrativeFileId: masterFile.id,
          decisionTypeVersionId: input.decisionTypeVersionId,
          functionAuthorityRecordId: decisionTypeVersion.functionAuthorityRecordId,
          authorityEvaluationRecordId: authorityResult.evaluationId,
          decisionReadinessAssessmentId: input.decisionReadinessAssessmentId,
          evidencePacketVersionId: input.evidencePacketVersionId,
          decisionMakerIdentityId: input.decisionMakerIdentityId,
          decisionMakerOfficeholderId: input.decisionMakerOfficeholderId,
          appointmentId: input.appointmentId,
          delegationId: input.delegationId,
          institutionId: caseRecord.responsibleInstitutionId,
          departmentId: caseRecord.responsibleDepartmentId,
          matterDecided: input.matterDecided,
          outcome: input.outcome,
          decisionStatus: GovernmentDecisionStatus.RECORDED,
          decidedAt,
          integrityHash,
          explicitIntentConfirmed: true,
        },
      });

      return created;
    });

    await this.caseStatus.transition(
      input.caseId,
      CaseStatus.DECIDED,
      `Government decision ${decisionNumber} recorded`,
      input.decisionMakerIdentityId,
    );

    return Object.assign(decision, { boundaryDisclaimer: PHASE_8B_BOUNDARY_DISCLAIMER });
  }

  assertDecisionImmutable(
    existing: GovernmentDecision,
    update: Record<string, unknown>,
  ): void {
  assertDecisionImmutable(existing: GovernmentDecision, update: Record<string, unknown>): void {
    for (const field of IMMUTABLE_DECISION_UPDATE_FIELDS) {
      if (update[field] !== undefined) {
        throw new ConflictException(
          `GovernmentDecision field "${field}" is immutable after recording`,
        );
      }
    }
  }

  private async generateDecisionNumber(): Promise<string> {
    const count = await this.prisma.governmentDecision.count();
    const year = new Date().getFullYear();
    return `${DECISION_NUMBER_PREFIX}-${String(year)}-${String(count + 1).padStart(6, '0')}`;
  }
}
