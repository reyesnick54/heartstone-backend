import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  ContinuityDecision,
  ContinuityDecisionType,
  ContinuityEvent,
  ContinuityEventStatus,
  ContinuityOperatingMode,
  ContinuityScenarioType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { CONTINUITY_EVENT_PREFIX } from '../business-continuity.constants';
import { BusinessContinuityBoundaryService } from '../common/business-continuity-boundary.service';

export interface DeclareContinuityEventInput {
  scenarioType: ContinuityScenarioType;
  impactSummary?: string;
  detectedByIdentityId?: string;
}

export interface RecordContinuityDecisionInput {
  continuityEventId: string;
  decisionType: ContinuityDecisionType;
  decidedByOfficeholderId: string;
  decidedByIdentityId: string;
  functionAuthorityRecordId: string;
  appointmentId: string;
  delegationId?: string;
  decisionNotes: string;
  emergencyAuthorityExpiresAt?: Date;
  waiverMandatoryRequirement?: boolean;
}

@Injectable()
export class ContinuityEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: BusinessContinuityBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async declareEvent(input: DeclareContinuityEventInput): Promise<ContinuityEvent> {
    const count = await this.prisma.continuityEvent.count();
    const eventNumber = `${CONTINUITY_EVENT_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.continuityEvent.create({
      data: {
        eventNumber,
        scenarioType: input.scenarioType,
        impactSummary: input.impactSummary,
        detectedByIdentityId: input.detectedByIdentityId,
        status: ContinuityEventStatus.DETECTED,
        operatingMode: ContinuityOperatingMode.NORMAL,
      },
    });
  }

  async recordDecision(input: RecordContinuityDecisionInput): Promise<ContinuityDecision> {
    const event = await this.getEventOrThrow(input.continuityEventId);

    this.boundary.assertNamedInstitutionalActorPresent(
      input.decidedByOfficeholderId,
      input.decidedByIdentityId,
    );
    this.boundary.assertDisasterNotWaiverOfMandatoryRequirement(
      input.waiverMandatoryRequirement ?? false,
    );

    if (input.emergencyAuthorityExpiresAt) {
      this.boundary.assertEmergencyAuthorityIsTimeBounded(input.emergencyAuthorityExpiresAt);
      this.boundary.assertEmergencyAuthorityNotExpired(input.emergencyAuthorityExpiresAt);
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.decidedByIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.decidedByOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Continuity decision authority evaluation denied');
    }

    const decision = await this.prisma.continuityDecision.create({
      data: {
        continuityEventId: event.id,
        decisionType: input.decisionType,
        decidedByOfficeholderId: input.decidedByOfficeholderId,
        decidedByIdentityId: input.decidedByIdentityId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        appointmentId: input.appointmentId,
        delegationId: input.delegationId,
        decisionNotes: input.decisionNotes,
        emergencyAuthorityExpiresAt: input.emergencyAuthorityExpiresAt,
      },
    });

    const operatingMode = this.mapDecisionToOperatingMode(input.decisionType);
    const status = this.mapDecisionToStatus(input.decisionType);

    await this.prisma.continuityEvent.update({
      where: { id: event.id },
      data: {
        operatingMode,
        status,
        safeHaltScope:
          input.decisionType === ContinuityDecisionType.SAFE_HALT
            ? input.decisionNotes
            : event.safeHaltScope,
      },
    });

    return decision;
  }

  async completeTechnicalRecovery(
    continuityEventId: string,
    autoResumeRequested = false,
  ): Promise<ContinuityEvent> {
    this.boundary.assertTechnicalRecoveryCannotResumeAutomatically(autoResumeRequested);

    const event = await this.getEventOrThrow(continuityEventId);

    return this.prisma.continuityEvent.update({
      where: { id: event.id },
      data: {
        technicalRecoveryCompletedAt: new Date(),
        status: ContinuityEventStatus.RESUMPTION_PENDING,
      },
    });
  }

  async getEventOrThrow(id: string): Promise<ContinuityEvent> {
    const event = await this.prisma.continuityEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`ContinuityEvent ${id} not found`);
    }
    return event;
  }

  private mapDecisionToOperatingMode(
    decisionType: ContinuityDecisionType,
  ): ContinuityOperatingMode {
    switch (decisionType) {
      case ContinuityDecisionType.SAFE_HALT:
        return ContinuityOperatingMode.SAFE_HALT;
      case ContinuityDecisionType.ACTIVATE_MANUAL:
        return ContinuityOperatingMode.MANUAL;
      case ContinuityDecisionType.ACTIVATE_CONTINUITY_MODE:
      case ContinuityDecisionType.DECLARE_DISASTER:
        return ContinuityOperatingMode.CONTINUITY;
      case ContinuityDecisionType.CONTINUE_UNAFFECTED:
        return ContinuityOperatingMode.NORMAL;
      default:
        return ContinuityOperatingMode.CONTINUITY;
    }
  }

  private mapDecisionToStatus(decisionType: ContinuityDecisionType): ContinuityEventStatus {
    switch (decisionType) {
      case ContinuityDecisionType.SAFE_HALT:
        return ContinuityEventStatus.SAFE_HALTED;
      case ContinuityDecisionType.CONTINUE_UNAFFECTED:
        return ContinuityEventStatus.ASSESSED;
      default:
        return ContinuityEventStatus.CONTINUITY_MODE_ACTIVE;
    }
  }
}
