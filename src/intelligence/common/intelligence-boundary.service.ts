import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ConsequentialUseReviewDecision,
  DigitalTwinMode,
  DigitalTwinType,
  IdentityType,
} from '@prisma/client';

import {
  AI_ACTOR_ROLE_MARKER,
  FORBIDDEN_AI_TWIN_FINAL_ACTIONS,
  FORBIDDEN_CLIENT_TWIN_FIELDS,
  FORBIDDEN_SIMULATION_LIVE_ACTIONS,
  FORBIDDEN_SIMULATION_LIVE_MUTATIONS,
  INTELLIGENCE_REASON_CODES,
} from '../intelligence.constants';

export interface TwinIntegrityState {
  isStale: boolean;
  isIncomplete: boolean;
  isInconsistent: boolean;
  isCompromised: boolean;
  outsideApprovedUse: boolean;
  isAuthoritativeRecord: boolean;
}

export interface TwinSourceDisclosureState {
  sources: { isDisclosed: boolean; sourceStatus: string }[];
}

@Injectable()
export class IntelligenceBoundaryService {
  assertTwinIsNotAuthoritativeRecord(twin: { isAuthoritativeRecord: boolean }): void {
    if (twin.isAuthoritativeRecord) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.TWIN_NOT_AUTHORITATIVE);
    }
  }

  assertTwinOwnerIsNotSelf(ownerId: string, representedSubjectId: string): void {
    if (ownerId === representedSubjectId) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.TWIN_CANNOT_OWN_ITSELF);
    }
  }

  assertCaseTwinPreventsProfileExpansion(
    representedSubjectType: DigitalTwinType,
    preventsPersonalProfileExpansion: boolean,
  ): void {
    if (
      (representedSubjectType === DigitalTwinType.CASE ||
        representedSubjectType === DigitalTwinType.APPLICATION) &&
      !preventsPersonalProfileExpansion
    ) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.CASE_TWIN_PROFILE_EXPANSION);
    }
  }

  assertModeIsNotOperationalControl(mode: DigitalTwinMode, isOperationalControl = false): void {
    if (isOperationalControl) {
      throw new ForbiddenException(
        mode === DigitalTwinMode.APPROVED_LIVE_REFERENCE
          ? 'APPROVED_LIVE_REFERENCE is not operational control authority'
          : INTELLIGENCE_REASON_CODES.OPERATIONAL_CONTROL_FORBIDDEN,
      );
    }
  }

  assertRelationshipIsModeledOnly(isModeledOnly: boolean): void {
    if (!isModeledOnly) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.MODELED_NOT_OBSERVED);
    }
  }

  assertScenarioNotPrediction(isPrediction: boolean): void {
    if (isPrediction) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SCENARIO_NOT_PREDICTION);
    }
  }

  assertOutputNotPresentedAsPrediction(presentedAsPrediction: boolean): void {
    if (presentedAsPrediction) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SCENARIO_NOT_PREDICTION);
    }
  }

  assertSimulationCannotMutateLive(target: string): void {
    if (
      FORBIDDEN_SIMULATION_LIVE_MUTATIONS.includes(
        target as (typeof FORBIDDEN_SIMULATION_LIVE_MUTATIONS)[number],
      )
    ) {
      throw new ForbiddenException(
        `${INTELLIGENCE_REASON_CODES.SIMULATION_CANNOT_MUTATE_LIVE}: ${target}`,
      );
    }
  }

  assertSimulationActionForbidden(action: string): void {
    if (
      FORBIDDEN_SIMULATION_LIVE_ACTIONS.includes(
        action as (typeof FORBIDDEN_SIMULATION_LIVE_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(
        `${INTELLIGENCE_REASON_CODES.SIMULATION_CANNOT_MUTATE_LIVE}: ${action}`,
      );
    }
  }

  assertTwinIntegrityForConsequentialUse(twin: TwinIntegrityState): void {
    if (twin.isAuthoritativeRecord) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.TWIN_NOT_AUTHORITATIVE);
    }

    if (
      twin.isStale ||
      twin.isIncomplete ||
      twin.isInconsistent ||
      twin.isCompromised ||
      twin.outsideApprovedUse
    ) {
      throw new ForbiddenException(
        twin.isStale
          ? INTELLIGENCE_REASON_CODES.STALE_TWIN_BLOCKS_USE
          : INTELLIGENCE_REASON_CODES.INCOMPLETE_TWIN_BLOCKS_USE,
      );
    }
  }

  assertSourcesDisclosedForConsequentialUse(state: TwinSourceDisclosureState): void {
    const undisclosed = state.sources.filter((source) => !source.isDisclosed);

    if (undisclosed.length > 0) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.MISSING_SOURCE_UNDISCLOSED);
    }
  }

  assertHumanReviewerForConsequentialUse(
    actorIdentityType: IdentityType,
    actorRoleMarker?: string,
  ): void {
    if (actorIdentityType === IdentityType.SERVICE || actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_FINAL_DECIDE);
    }
  }

  assertAiCannotFinalDecide(action: string, isAiActor: boolean): void {
    if (
      isAiActor &&
      FORBIDDEN_AI_TWIN_FINAL_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_TWIN_FINAL_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.AI_CANNOT_FINAL_DECIDE);
    }
  }

  assertConsequentialReviewApproved(decision: ConsequentialUseReviewDecision): void {
    if (
      decision !== ConsequentialUseReviewDecision.APPROVED &&
      decision !== ConsequentialUseReviewDecision.CONDITIONAL
    ) {
      throw new ForbiddenException(INTELLIGENCE_REASON_CODES.CONSEQUENTIAL_REVIEW_REQUIRED);
    }
  }

  assertSnapshotImmutable(isImmutable: boolean): void {
    if (!isImmutable) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.SNAPSHOT_IMMUTABLE);
    }
  }

  assertLiveTransitionRequiresAcceptance(input: {
    institutionalAcceptanceReference: string;
    rollbackPlanReference: string;
    securityReviewCompleted: boolean;
    testingCompleted: boolean;
    trainingCompleted: boolean;
    liveActivationAuthorized: boolean;
    technicalSuccessAcknowledged: boolean;
  }): void {
    if (!input.rollbackPlanReference.trim()) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.ROLLBACK_REQUIRED);
    }

    if (!input.institutionalAcceptanceReference.trim()) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.LIVE_TRANSITION_REQUIRES_ACCEPTANCE);
    }

    if (
      input.technicalSuccessAcknowledged &&
      !input.liveActivationAuthorized &&
      !input.securityReviewCompleted
    ) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.TECHNICAL_SUCCESS_NOT_ACTIVATION);
    }

    if (
      input.liveActivationAuthorized &&
      (!input.testingCompleted || !input.securityReviewCompleted || !input.trainingCompleted)
    ) {
      throw new BadRequestException(INTELLIGENCE_REASON_CODES.LIVE_TRANSITION_REQUIRES_ACCEPTANCE);
    }
  }

  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_TWIN_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set protected field "${field}"`);
      }
    }
  }
}
