import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseStatus,
  DecisionReadinessOutcome,
  DecisionTypeVersionStatus,
  DelegationStatus,
  DepartmentalReviewStatus,
  EvidencePacketPurpose,
  EvidencePacketVersionStatus,
  GovernmentCommunicationAuthenticationStatus,
  GovernmentServiceMaturityStatus,
  InspectionStatus,
  ProfessionalOpinionStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { MasterFileCompletenessAssessmentService } from '../../records/completeness/master-file-completeness-assessment.service';
import {
  DECISION_READINESS_REASON_CODES,
  type DecisionReadinessReasonCode,
  READINESS_ASSESSMENT_NUMBER_PREFIX,
} from '../decisions.constants';
import {
  CONCURRENCE_CATEGORIES,
  CONSULTATION_CATEGORIES,
  type DecisionReadinessInput,
  type DecisionRequirementsConfig,
  RETAINED_DETERMINATION_CATEGORIES,
} from '../decisions.types';

const DECISION_READY_CASE_STATUSES: CaseStatus[] = [CaseStatus.DECISION_PENDING];

export interface DecisionReadinessResult {
  assessmentId: string;
  assessmentNumber: string;
  outcome: DecisionReadinessOutcome;
  reasonCodes: DecisionReadinessReasonCode[];
  authorityEvaluationRecordId?: string;
}

@Injectable()
export class DecisionReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly actorResolver: InstitutionalActorResolver,
    private readonly masterFileCompleteness: MasterFileCompletenessAssessmentService,
  ) {}

  async assess(input: DecisionReadinessInput): Promise<DecisionReadinessResult> {
    const at = input.at ?? new Date();
    const reasonCodes: DecisionReadinessReasonCode[] = [];
    let outcome: DecisionReadinessOutcome = DecisionReadinessOutcome.NOT_READY;

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      include: {
        masterAdministrativeFile: true,
        professionalReviews: true,
        inspectionRecords: true,
        governmentCommunications: true,
        departmentalReviews: true,
      },
    });

    if (!caseRecord) {
      return this.persistAssessment(input, DecisionReadinessOutcome.NOT_READY, [
        DECISION_READINESS_REASON_CODES.CASE_NOT_FOUND,
      ], at);
      return this.persistAssessment(
        input,
        DecisionReadinessOutcome.NOT_READY,
        [DECISION_READINESS_REASON_CODES.CASE_NOT_FOUND],
        at,
      );
    }

    if (!DECISION_READY_CASE_STATUSES.includes(caseRecord.status)) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.CASE_NOT_DECISION_PENDING);
    }

    const decisionTypeVersion = await this.prisma.decisionTypeVersion.findUnique({
      where: { id: input.decisionTypeVersionId },
      include: { decisionType: true },
    });

    if (!decisionTypeVersion) {
      throw new NotFoundException(
        `DecisionTypeVersion "${input.decisionTypeVersionId}" was not found`,
      );
    }

    if (decisionTypeVersion.status !== DecisionTypeVersionStatus.ACTIVE) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.DECISION_TYPE_VERSION_INACTIVE);
    }

    if (decisionTypeVersion.governmentServiceVersionId !== caseRecord.governmentServiceVersionId) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.SERVICE_VERSION_MISMATCH);
    }

    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: caseRecord.governmentServiceVersionId },
    });
    if (serviceVersion?.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.SERVICE_VERSION_MISMATCH);
    }

    const requirements = decisionTypeVersion.requirementsConfig as DecisionRequirementsConfig;
    const permissibleOutcomes = decisionTypeVersion.permissibleOutcomes as string[];

    if (!permissibleOutcomes.includes(input.requestedOutcome)) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.OUTCOME_NOT_PERMISSIBLE);
    }

    const masterFile = caseRecord.masterAdministrativeFile;
    if (!masterFile) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.MASTER_FILE_MISSING);
    } else {
      const completeness = await this.masterFileCompleteness.assess({
        masterAdministrativeFileId: masterFile.id,
        requiredRequirementCodes: requirements.requiredRequirementCodes ?? [],
      });

      if (completeness.outcome === 'SAFE_HALTED') {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.MASTER_FILE_SAFE_HALTED);
        outcome = DecisionReadinessOutcome.SAFE_HALT;
      } else if (completeness.outcome !== 'COMPLETE') {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.MASTER_FILE_INCOMPLETE);
        outcome = DecisionReadinessOutcome.REQUIRES_ADDITIONAL_EVIDENCE;
      }
    }

    const packetVersion = await this.resolveEvidencePacketVersion(
      input,
      caseRecord.id,
      masterFile?.id,
      requirements,
      reasonCodes,
    );

    if (requirements.requiresProfessionalReview) {
      const completed = caseRecord.professionalReviews.filter(
        (review) => review.opinionStatus === ProfessionalOpinionStatus.ISSUED,
      );
      const requiredTypes = requirements.requiredProfessionalReviewTypes ?? [];
      const satisfied =
        requiredTypes.length === 0
          ? completed.length > 0
          : requiredTypes.every((type) =>
              completed.some((review) => review.professionType === type),
            );
      if (!satisfied) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.PROFESSIONAL_REVIEW_MISSING);
        outcome = DecisionReadinessOutcome.REQUIRES_PROFESSIONAL_REVIEW;
      }
    }

    if (requirements.requiresInspection) {
      const completedInspections = caseRecord.inspectionRecords.filter(
        (record) => record.status === InspectionStatus.COMPLETED,
      );
      if (completedInspections.length === 0) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.INSPECTION_MISSING);
      }
    }

    if (requirements.requiresGovernmentConsultation) {
      const consultation = caseRecord.governmentCommunications.find(
        (record) =>
          CONSULTATION_CATEGORIES.includes(record.category) &&
          record.authenticationStatus ===
            GovernmentCommunicationAuthenticationStatus.AUTHENTICATED,
          record.authenticationStatus === GovernmentCommunicationAuthenticationStatus.AUTHENTICATED,
      );
      if (!consultation) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.GOVERNMENT_CONSULTATION_MISSING);
      }
    }

    if (requirements.requiresGovernmentConcurrence) {
      const concurrence = caseRecord.governmentCommunications.find(
        (record) =>
          CONCURRENCE_CATEGORIES.includes(record.category) &&
          record.authenticationStatus ===
            GovernmentCommunicationAuthenticationStatus.AUTHENTICATED,
          record.authenticationStatus === GovernmentCommunicationAuthenticationStatus.AUTHENTICATED,
      );
      if (!concurrence) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.GOVERNMENT_CONCURRENCE_MISSING);
      }
    }

    if (requirements.requiresRetainedNationalDetermination) {
      const determination = caseRecord.governmentCommunications.find(
        (record) =>
          RETAINED_DETERMINATION_CATEGORIES.includes(record.category) &&
          record.authenticationStatus ===
            GovernmentCommunicationAuthenticationStatus.AUTHENTICATED,
          record.authenticationStatus === GovernmentCommunicationAuthenticationStatus.AUTHENTICATED,
      );
      if (!determination) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.RETAINED_NATIONAL_DETERMINATION_MISSING);
        outcome = DecisionReadinessOutcome.REQUIRES_EXTERNAL_DETERMINATION;
      }
    }

    if (requirements.requiresDepartmentalReview) {
      const completedReviews = caseRecord.departmentalReviews.filter(
        (review) => review.status === DepartmentalReviewStatus.COMPLETED,
      );
      if (completedReviews.length === 0) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.DEPARTMENTAL_REVIEW_MISSING);
      } else {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.RECOMMENDATION_PRESENT_NONBINDING);
      }
    }

    if (input.isConflicted) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.DECISION_MAKER_CONFLICTED);
      outcome = DecisionReadinessOutcome.BLOCKED;
    }

    if (input.isRecused) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.DECISION_MAKER_RECUSED);
      outcome = DecisionReadinessOutcome.BLOCKED;
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: input.proposedDecisionMakerIdentityId },
    });
    if (!identity || !this.actorResolver.isHumanActor(identity.type)) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.NON_HUMAN_ACTOR);
      outcome = DecisionReadinessOutcome.BLOCKED;
    }

    if (
      input.proposedDecisionMakerOfficeholderId &&
      caseRecord.currentCaseManagerOfficeholderId === input.proposedDecisionMakerOfficeholderId &&
      !input.appointmentId
    ) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.CASE_MANAGER_NOT_DECISION_AUTHORITY);
    }

    if (input.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: input.appointmentId },
      });
      if (appointment == null) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.APPOINTMENT_INVALID);
      } else if (
        appointment.status !== AppointmentStatus.ACTIVE ||
        !isAppointmentCurrent(appointment, at) ||
        (input.proposedDecisionMakerOfficeholderId !== undefined &&
          appointment.officeholderId !== input.proposedDecisionMakerOfficeholderId)
      ) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.APPOINTMENT_INVALID);
      }
    }

    if (input.delegationId) {
      const delegation = await this.prisma.delegation.findUnique({
        where: { id: input.delegationId },
      });
      if (delegation?.status !== DelegationStatus.ACTIVE) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.DELEGATION_INVALID);
      }
    }

    const requiredCoApprovers = requirements.requiredCoApprovers ?? 0;
    if (requiredCoApprovers > 0 && !input.hasSecondApproval) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.CO_APPROVAL_REQUIRED);
      outcome = DecisionReadinessOutcome.REQUIRES_CO_APPROVAL;
    }

    const proceduralGates = requirements.proceduralGates ?? [];
    const satisfiedGates = requirements.satisfiedProceduralGates ?? [];
    for (const gate of proceduralGates) {
      if (!satisfiedGates.includes(gate)) {
        reasonCodes.push(DECISION_READINESS_REASON_CODES.PROCEDURAL_GATE_UNSATISFIED);
      }
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.proposedDecisionMakerIdentityId,
      functionAuthorityRecordId: decisionTypeVersion.functionAuthorityRecordId,
      action: AuthorityActionType.DECIDE,
      officeholderId: input.proposedDecisionMakerOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
      isConflicted: input.isConflicted,
      isRecused: input.isRecused,
      hasSecondApproval: input.hasSecondApproval,
      priorActions: input.priorActions as AuthorityActionType[] | undefined,
      at,
    });

    const authorityEvaluationRecordId = authorityResult.evaluationId;

    if (authorityResult.outcome === AuthorityEvaluationOutcome.DENY) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.AUTHORITY_DENIED);
      outcome = DecisionReadinessOutcome.BLOCKED;
    } else if (authorityResult.outcome === AuthorityEvaluationOutcome.BLOCKED) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.AUTHORITY_BLOCKED);
      outcome = DecisionReadinessOutcome.BLOCKED;
    } else if (authorityResult.outcome === AuthorityEvaluationOutcome.SAFE_HALT) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.AUTHORITY_SAFE_HALT);
      outcome = DecisionReadinessOutcome.SAFE_HALT;
    } else if (
      authorityResult.outcome === AuthorityEvaluationOutcome.REQUIRES_EXTERNAL_DETERMINATION
    ) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.AUTHORITY_REQUIRES_EXTERNAL);
      outcome = DecisionReadinessOutcome.REQUIRES_EXTERNAL_DETERMINATION;
    }

    const blockingCodes = reasonCodes.filter(
      (code) => code !== DECISION_READINESS_REASON_CODES.RECOMMENDATION_PRESENT_NONBINDING,
    );

    if (blockingCodes.length === 0) {
      outcome = DecisionReadinessOutcome.READY;
    }

    return this.persistAssessment(
      input,
      outcome,
      reasonCodes,
      at,
      authorityEvaluationRecordId,
      masterFile?.id,
      packetVersion?.id,
    );
  }

  private async resolveEvidencePacketVersion(
    input: DecisionReadinessInput,
    caseId: string,
    masterFileId: string | undefined,
    requirements: DecisionRequirementsConfig,
    reasonCodes: DecisionReadinessReasonCode[],
  ) {
    const requiredPurpose =
      requirements.requiredEvidencePacketPurpose ?? EvidencePacketPurpose.DECISION_SUPPORT;

    const packetVersion = input.evidencePacketVersionId
      ? await this.prisma.evidencePacketVersion.findUnique({
          where: { id: input.evidencePacketVersionId },
          include: { packet: true },
        })
      : await this.prisma.evidencePacketVersion.findFirst({
          where: {
            status: EvidencePacketVersionStatus.FROZEN,
            packet: { caseId, purpose: requiredPurpose },
          },
          orderBy: { version: 'desc' },
          include: { packet: true },
        });

    if (!packetVersion) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_MISSING);
      return null;
    }

    if (packetVersion.status !== EvidencePacketVersionStatus.FROZEN) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_NOT_FROZEN);
    }

    if (packetVersion.status === EvidencePacketVersionStatus.SUPERSEDED) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_SUPERSEDED);
    }

    if (packetVersion.packet.purpose !== requiredPurpose) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_WRONG_PURPOSE);
    }

    if (masterFileId && packetVersion.packet.masterAdministrativeFileId !== masterFileId) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_MISSING);
    }

    if (!packetVersion.readyForDecisionReview) {
      reasonCodes.push(DECISION_READINESS_REASON_CODES.EVIDENCE_NOT_CURRENT);
    }

    return packetVersion;
  }

  private async persistAssessment(
    input: DecisionReadinessInput,
    outcome: DecisionReadinessOutcome,
    reasonCodes: DecisionReadinessReasonCode[],
    at: Date,
    authorityEvaluationRecordId?: string,
    masterAdministrativeFileId?: string,
    evidencePacketVersionId?: string,
  ): Promise<DecisionReadinessResult> {
    const assessmentNumber = await this.generateAssessmentNumber();
    const contextSnapshot = {
      caseId: input.caseId,
      decisionTypeVersionId: input.decisionTypeVersionId,
      requestedOutcome: input.requestedOutcome,
      assessedAt: at.toISOString(),
    };

    const assessment = await this.prisma.decisionReadinessAssessment.create({
      data: {
        assessmentNumber,
        caseId: input.caseId,
        decisionTypeVersionId: input.decisionTypeVersionId,
        proposedDecisionMakerIdentityId: input.proposedDecisionMakerIdentityId,
        proposedDecisionMakerOfficeholderId: input.proposedDecisionMakerOfficeholderId,
        requestedOutcome: input.requestedOutcome,
        assessedAt: at,
        outcome,
        reasonCodes,
        contextSnapshot,
        authorityEvaluationRecordId,
        masterAdministrativeFileId,
        evidencePacketVersionId,
        participants: {
          create: {
            identityId: input.proposedDecisionMakerIdentityId,
            officeholderId: input.proposedDecisionMakerOfficeholderId,
            appointmentId: input.appointmentId,
            role: 'DECISION_MAKER',
            isConflicted: input.isConflicted ?? false,
            isRecused: input.isRecused ?? false,
          },
        },
      },
    });

    return {
      assessmentId: assessment.id,
      assessmentNumber: assessment.assessmentNumber,
      outcome,
      reasonCodes,
      authorityEvaluationRecordId,
    };
  }

  private async generateAssessmentNumber(): Promise<string> {
    const count = await this.prisma.decisionReadinessAssessment.count();
    const year = new Date().getFullYear();
    return `${READINESS_ASSESSMENT_NUMBER_PREFIX}-${String(year)}-${String(count + 1).padStart(6, '0')}`;
  }
}
