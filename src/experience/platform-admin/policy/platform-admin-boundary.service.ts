import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  GovernmentDecisionStatus,
  GovernmentServiceMaturityStatus,
  LegalHoldStatus,
} from '@prisma/client';

import { PLATFORM_ADMIN_EXPLANATION_CODES } from '../platform-admin.constants';

@Injectable()
export class PlatformAdminBoundaryService {
  assertAdministrativeAccessDoesNotGrantAuthority(): void {
    // Explicit no-op marker for guardrails documentation and future enforcement hooks.
  }

  assertPlatformAdminCannotApproveCase(isPlatformAdministrator: boolean): void {
    if (isPlatformAdministrator) {
      throw new ForbiddenException({
        message: 'Platform administrators cannot approve or decide cases',
        code: PLATFORM_ADMIN_EXPLANATION_CODES.CANNOT_APPROVE_CASE,
      });
    }
  }

  assertPlatformAdminCannotCreateInstitutionalAuthority(
    isPlatformAdministrator: boolean,
    isCreatingAuthority: boolean,
  ): void {
    if (isPlatformAdministrator && isCreatingAuthority) {
      throw new ForbiddenException({
        message: 'Platform configuration cannot create institutional authority',
        code: PLATFORM_ADMIN_EXPLANATION_CODES.CANNOT_CREATE_INSTITUTIONAL_AUTHORITY,
      });
    }
  }

  assertNoDirectServiceActivation(
    requestedMaturityStatus: GovernmentServiceMaturityStatus | undefined,
  ): void {
    if (
      requestedMaturityStatus === GovernmentServiceMaturityStatus.ACTIVE ||
      requestedMaturityStatus === GovernmentServiceMaturityStatus.ACCEPTED
    ) {
      throw new ForbiddenException({
        message: 'Service activation cannot be bypassed through generic update',
        code: PLATFORM_ADMIN_EXPLANATION_CODES.CANNOT_BYPASS_SERVICE_ACTIVATION,
      });
    }
  }

  assertCannotAlterFinalDecision(decisionStatus: GovernmentDecisionStatus): void {
    if (
      decisionStatus === GovernmentDecisionStatus.FINALIZED ||
      decisionStatus === GovernmentDecisionStatus.RECORDED ||
      decisionStatus === GovernmentDecisionStatus.EFFECTIVE ||
      decisionStatus === GovernmentDecisionStatus.SET_ASIDE
    ) {
      throw new ForbiddenException({
        message: 'Final government decisions cannot be altered through platform administration',
        code: PLATFORM_ADMIN_EXPLANATION_CODES.CANNOT_ALTER_FINAL_DECISION,
      });
    }
  }

  assertLegalHoldBlocksMutation(legalHoldStatus: LegalHoldStatus): void {
    if (legalHoldStatus === LegalHoldStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Legal hold prevents administrative mutation of protected records',
        code: PLATFORM_ADMIN_EXPLANATION_CODES.CANNOT_BYPASS_LEGAL_HOLD,
      });
    }
  }

  assertAiActivationRequiresApprovedLifecycle(isDirectActivationAttempt: boolean): void {
    if (isDirectActivationAttempt) {
      throw new ForbiddenException({
        message: 'AI agents cannot be activated outside approved lifecycle governance',
        code: PLATFORM_ADMIN_EXPLANATION_CODES.CANNOT_ACTIVATE_AI_OUTSIDE_LIFECYCLE,
      });
    }
  }

  assertVisibilityNotSubstantiveAccess(): void {
    // Marker for projection services to include disclaimers on all responses.
  }
}
