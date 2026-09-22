import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  DevelopmentAccessActorKind,
  DevelopmentExternalDependencyStatus,
  DevelopmentInspectionOutcome,
} from '@prisma/client';

import {
  FORBIDDEN_AI_PLANNING_ACTIONS,
  PLANNING_REASON_CODES,
} from '../planning-construction.constants';
import {
  FORBIDDEN_CLIENT_INSPECTION_OUTCOME_FIELDS,
  FORBIDDEN_CLIENT_OCCUPANCY_FIELDS,
  FORBIDDEN_CLIENT_PERMIT_ISSUANCE_FIELDS,
} from '../planning-construction-schema.constants';

@Injectable()
export class PlanningConstructionBoundaryService {
  rejectClientPermitIssuanceFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_PERMIT_ISSUANCE_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PLANNING_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE_PERMIT}: ${field}`,
        );
      }
    }
  }

  rejectClientOccupancyFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_OCCUPANCY_FIELDS) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `${PLANNING_REASON_CODES.OCCUPANCY_REQUIRES_DECISION}: ${field}`,
        );
      }
    }
  }

  assertApplicantCannotSelfIssuePermit(actorKind: DevelopmentAccessActorKind): void {
    if (actorKind === DevelopmentAccessActorKind.APPLICANT) {
      throw new ForbiddenException(PLANNING_REASON_CODES.APPLICANT_CANNOT_SELF_ISSUE_PERMIT);
    }
  }

  assertProfessionalCannotSelfApprovePermit(actorKind: DevelopmentAccessActorKind): void {
    if (actorKind === DevelopmentAccessActorKind.PROFESSIONAL) {
      throw new ForbiddenException(PLANNING_REASON_CODES.PROFESSIONAL_CANNOT_SELF_APPROVE);
    }
  }

  assertPaymentDoesNotApprovePermit(context?: string): void {
    if (context?.toLowerCase().includes('permit approved')) {
      throw new BadRequestException(PLANNING_REASON_CODES.PAYMENT_DOES_NOT_APPROVE);
    }
  }

  assertAiCannotIssuePermit(action: string): void {
    if (
      FORBIDDEN_AI_PLANNING_ACTIONS.includes(
        action as (typeof FORBIDDEN_AI_PLANNING_ACTIONS)[number],
      )
    ) {
      throw new ForbiddenException(`${PLANNING_REASON_CODES.AI_CANNOT_ISSUE_PERMIT}: ${action}`);
    }
  }

  assertExternalDependenciesResolved(
    dependencies: {
      blocksPermitDecision: boolean;
      status: DevelopmentExternalDependencyStatus;
    }[],
  ): void {
    const blocking = dependencies.filter(
      (dependency) =>
        dependency.blocksPermitDecision &&
        dependency.status !== DevelopmentExternalDependencyStatus.RESOLVED,
    );
    if (blocking.length > 0) {
      throw new BadRequestException(PLANNING_REASON_CODES.EXTERNAL_DEPENDENCY_BLOCKS);
    }
  }

  assertInspectionFailurePreserved(
    currentOutcome: DevelopmentInspectionOutcome | null | undefined,
    requestedOutcome: DevelopmentInspectionOutcome,
    reinspectionRequested: boolean,
  ): void {
    if (
      currentOutcome === DevelopmentInspectionOutcome.FAIL &&
      requestedOutcome === DevelopmentInspectionOutcome.PASS &&
      !reinspectionRequested
    ) {
      throw new ForbiddenException(PLANNING_REASON_CODES.INSPECTION_FAILURE_LOCKED);
    }
  }

  rejectApplicantForgedInspectionOutcome(
    payload: Record<string, unknown>,
    actorKind: DevelopmentAccessActorKind,
  ): void {
    if (actorKind === DevelopmentAccessActorKind.APPLICANT) {
      for (const field of FORBIDDEN_CLIENT_INSPECTION_OUTCOME_FIELDS) {
        if (field in payload && payload[field] !== undefined) {
          throw new ForbiddenException(PLANNING_REASON_CODES.INSPECTION_FAILURE_LOCKED);
        }
      }
    }
  }

  assertOccupancyRequiresGovernedDecision(input: {
    governmentDecisionId?: string | null;
    issuedByOfficeholderId?: string | null;
  }): void {
    if (!input.governmentDecisionId || !input.issuedByOfficeholderId) {
      throw new BadRequestException(PLANNING_REASON_CODES.OCCUPANCY_REQUIRES_DECISION);
    }
  }
}
