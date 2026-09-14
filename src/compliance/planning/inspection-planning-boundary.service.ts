import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType, InspectorIndependenceStatus } from '@prisma/client';

import {
  FORBIDDEN_AI_INSPECTION_ACTIONS,
  INSPECTION_COMPLIANCE_REASON_CODES,
} from '../compliance.constants';

export interface RiskFactorRecord {
  code: string;
  description: string;
  weight?: number;
}

@Injectable()
export class InspectionPlanningBoundaryService {
  assertSchedulingDoesNotEstablishViolation(): void {
    // Scheduling is planning-only; violation outcomes belong to later compliance phases.
  }

  assertAssignmentDoesNotCreateAuthority(): void {
    // Assignment records operational responsibility only; INSPECT authority is evaluated separately.
  }

  assertAiCannotOrderInspection(actorIdentityType: IdentityType): void {
    if (actorIdentityType === IdentityType.SERVICE) {
      throw new ForbiddenException(
        `${INSPECTION_COMPLIANCE_REASON_CODES.AI_CANNOT_ORDER_INSPECTION}: ${FORBIDDEN_AI_INSPECTION_ACTIONS.join(', ')}`,
      );
    }
  }

  assertRiskScoreNotSoleBasis(riskFactors: RiskFactorRecord[], riskScore?: number | null): void {
    if (riskScore === undefined || riskScore === null) {
      return;
    }

    const explainedFactors = riskFactors.filter(
      (factor) => factor.code.trim().length > 0 && factor.description.trim().length > 0,
    );

    if (explainedFactors.length === 0) {
      throw new BadRequestException(
        INSPECTION_COMPLIANCE_REASON_CODES.RISK_SCORE_ALONE_INSUFFICIENT,
      );
    }
  }

  assertScopeNotSilentlyExpanded(previousScope: string, nextScope: string): void {
    const previous = previousScope.trim().toLowerCase();
    const next = nextScope.trim().toLowerCase();

    if (previous.length === 0 || previous === next) {
      return;
    }

    if (!next.includes(previous)) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.SCOPE_SILENT_EXPANSION);
    }
  }

  assertJurisdictionMatches(expectedJurisdictionId: string, actualJurisdictionId: string): void {
    if (expectedJurisdictionId !== actualJurisdictionId) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.WRONG_JURISDICTION);
    }
  }

  assertInspectorNotConflicted(independenceStatus: InspectorIndependenceStatus): void {
    if (
      independenceStatus === InspectorIndependenceStatus.DECLARED_CONFLICT ||
      independenceStatus === InspectorIndependenceStatus.BLOCKED
    ) {
      throw new ForbiddenException(INSPECTION_COMPLIANCE_REASON_CODES.CONFLICTED_INSPECTOR);
    }
  }

  assertUnannouncedAllowed(unannouncedAllowed: boolean, isUnannounced: boolean): void {
    if (isUnannounced && !unannouncedAllowed) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.UNANNOUNCED_NOT_CONFIGURED);
    }
  }

  assertTriggerReferenceProvided(triggerReference: string): void {
    if (triggerReference.trim().length === 0) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.TRIGGER_REFERENCE_REQUIRED);
    }
  }

  assertTechnicalAdminCannotSelfAssignSovereignAuthority(
    assignerIdentityType: IdentityType,
    assignerOfficeholderId: string | undefined,
    inspectorOfficeholderId: string,
  ): void {
    if (
      assignerIdentityType === IdentityType.SERVICE &&
      assignerOfficeholderId === inspectorOfficeholderId
    ) {
      throw new ForbiddenException(INSPECTION_COMPLIANCE_REASON_CODES.TECHNICAL_ADMIN_SELF_ASSIGN);
    }
  }
}
