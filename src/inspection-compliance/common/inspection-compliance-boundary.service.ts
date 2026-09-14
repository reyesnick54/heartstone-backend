import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ComplianceImmediateActionRoute,
  ComplianceRiskLevel,
  CorrectiveActionPlanStatus,
} from '@prisma/client';

import {
  AI_ACTOR_ROLE_MARKER,
  HOLDER_ROLE_MARKER,
  IMMEDIATE_ACTION_ROUTES,
  TECHNICAL_ADMIN_ROLE_MARKER,
} from '../inspection-compliance.constants';

@Injectable()
export class InspectionComplianceBoundaryService {
  assertHolderCannotVerifyCorrectiveAction(input: {
    actorRoleMarker?: string;
    targetStatus?: CorrectiveActionPlanStatus;
  }): void {
    if (input.actorRoleMarker !== HOLDER_ROLE_MARKER) {
      return;
    }

    if (input.targetStatus === CorrectiveActionPlanStatus.VERIFIED_COMPLETE) {
      throw new ForbiddenException(
        'License or permit holder cannot mark corrective action as verified complete',
      );
    }
  }

  assertHolderCannotCloseFinding(input: { actorRoleMarker?: string }): void {
    if (input.actorRoleMarker === HOLDER_ROLE_MARKER) {
      throw new ForbiddenException(
        'License or permit holder cannot close an inspection compliance finding',
      );
    }
  }

  assertAiCannotCloseFinding(input: { actorRoleMarker?: string }): void {
    if (input.actorRoleMarker === AI_ACTOR_ROLE_MARKER) {
      throw new ForbiddenException(
        'AI assistance cannot close an inspection compliance finding or establish culpability',
      );
    }
  }

  assertTechnicalAdminCannotVerifySubstantiveRemediation(input: {
    actorRoleMarker?: string;
    hasOfficeholderAuthority?: boolean;
  }): void {
    if (
      input.actorRoleMarker === TECHNICAL_ADMIN_ROLE_MARKER &&
      input.hasOfficeholderAuthority !== true
    ) {
      throw new ForbiddenException(
        'Technical administrators cannot verify substantive corrective remediation by system role alone',
      );
    }
  }

  assertSubmissionIsNotVerification(input: {
    treatingSubmissionAsVerified?: boolean;
  }): void {
    if (input.treatingSubmissionAsVerified === true) {
      throw new BadRequestException(
        'Corrective action submission remains a claim pending independent verification',
      );
    }
  }

  assertPartialVerificationDoesNotCloseAllActions(input: {
    totalItems: number;
    verifiedItems: number;
    attemptingFullClosure: boolean;
  }): void {
    if (
      input.attemptingFullClosure &&
      input.totalItems > 0 &&
      input.verifiedItems < input.totalItems
    ) {
      throw new BadRequestException(
        'Partial verification cannot close all corrective action items or the finding',
      );
    }
  }

  assertReinspectionBlocksClosure(input: {
    pendingReinspectionCount: number;
  }): void {
    if (input.pendingReinspectionCount > 0) {
      throw new BadRequestException(
        'Finding cannot close until required reinspection is completed or waived by authorized review',
      );
    }
  }

  assertClosureRequiresAttribution(input: {
    reviewerOfficeholderId?: string;
    reviewerIdentityId?: string;
  }): void {
    if (!input.reviewerOfficeholderId || !input.reviewerIdentityId) {
      throw new BadRequestException(
        'Compliance finding closure must be attributable to an identified reviewer',
      );
    }
  }

  assertImmediateRiskRoutesOutsideCapa(input: {
    riskLevel: ComplianceRiskLevel;
    immediateActionRoute: ComplianceImmediateActionRoute;
    attemptingCorrectiveActionOnly: boolean;
  }): void {
    const requiresProtectiveRoute =
      input.riskLevel === ComplianceRiskLevel.CRITICAL &&
      input.immediateActionRoute !== ComplianceImmediateActionRoute.NONE;

    if (requiresProtectiveRoute && input.attemptingCorrectiveActionOnly) {
      throw new BadRequestException(
        `Critical risk requiring ${input.immediateActionRoute} must not be delayed by corrective-action workflow alone`,
      );
    }
  }

  assertCorrectiveActionNotUsedForImmediateRisk(input: {
    immediateActionRoute: ComplianceImmediateActionRoute;
    startingCorrectiveActionPlan: boolean;
  }): void {
    if (
      input.startingCorrectiveActionPlan &&
      input.immediateActionRoute !== ComplianceImmediateActionRoute.NONE
    ) {
      const route = input.immediateActionRoute;
      if ((IMMEDIATE_ACTION_ROUTES as readonly string[]).includes(route)) {
        throw new BadRequestException(
          `Corrective action workflow cannot substitute for mandatory protective route: ${route}`,
        );
      }
    }
  }

  assertOverdueDoesNotAutoRevoke(): void {
    // Explicit no-op guard documented for audit: overdue status never triggers revocation.
  }

  assertAiRootCauseIsNonCulpability(input: {
    actorRoleMarker?: string;
    assertingCulpability?: boolean;
  }): void {
    if (input.actorRoleMarker === AI_ACTOR_ROLE_MARKER && input.assertingCulpability === true) {
      throw new ForbiddenException(
        'AI may assist root-cause analysis but cannot establish culpability or legal liability',
      );
    }
  }
}
