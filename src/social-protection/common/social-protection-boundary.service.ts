import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ExternalDeterminationStatus, SocialProtectionActorPersona } from '@prisma/client';

import {
  FORBIDDEN_AI_SOCIAL_PROTECTION_ACTIONS,
  PLATFORM_ADMIN_SOCIAL_PROTECTION_ROLE_MARKER,
  type RepresentativeBenefitScope,
} from '../social-protection.constants';

@Injectable()
export class SocialProtectionBoundaryService {
  assertApplicationDoesNotCreateBenefitAward(input: {
    doesNotCreateBenefitAward: boolean;
    awardsCreated: number;
  }): void {
    if (input.awardsCreated > 0) {
      throw new BadRequestException(
        'Benefit application profile linkage must not create a benefit award',
      );
    }
    if (!input.doesNotCreateBenefitAward && input.awardsCreated > 0) {
      throw new BadRequestException('Application submission is distinct from benefit award');
    }
  }

  assertEligibilityDoesNotAutoCreateAward(input: {
    doesNotCreateBenefitAward: boolean;
    workflowPermitsAutoAward: boolean;
    awardsCreated: number;
  }): void {
    if (input.awardsCreated > 0 && !input.workflowPermitsAutoAward) {
      throw new BadRequestException(
        'Eligibility assessment must not create a benefit award unless an explicit workflow permits it',
      );
    }
    if (input.awardsCreated > 0 && input.doesNotCreateBenefitAward) {
      throw new BadRequestException(
        'Eligibility calculation recorded doesNotCreateBenefitAward; award creation blocked',
      );
    }
  }

  assertHumanDecisionRequiredBeforeFinalAward(input: {
    requiresHumanDecision: boolean;
    humanDecisionRecorded: boolean;
    creatingAward: boolean;
  }): void {
    if (input.creatingAward && input.requiresHumanDecision && !input.humanDecisionRecorded) {
      throw new BadRequestException(
        'Configured human decision is required before an authoritative benefit award',
      );
    }
  }

  assertPaymentDoesNotDetermineEligibility(
    actorPersona: SocialProtectionActorPersona,
    impliesEligibility?: boolean,
  ): void {
    if (actorPersona === SocialProtectionActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException('Payment activity does not determine benefit eligibility');
    }
    if (impliesEligibility) {
      throw new BadRequestException('Payment receipt must not be treated as eligibility proof');
    }
  }

  assertAiCannotTerminateBenefit(
    actorPersona: SocialProtectionActorPersona,
    action: string,
    riskScoreTriggered?: boolean,
  ): void {
    if (
      actorPersona === SocialProtectionActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_SOCIAL_PROTECTION_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(
        `AI assistance cannot perform social protection action: ${action}`,
      );
    }
    if (riskScoreTriggered) {
      throw new ForbiddenException(
        'Risk or anomaly scores must not automatically terminate benefit awards',
      );
    }
  }

  assertRiskScoreIsNotFraudFinding(isFraudFinding: boolean): void {
    if (isFraudFinding) {
      throw new BadRequestException('Risk analysis records scores separately from fraud findings');
    }
  }

  assertPlatformAdminCannotCreateAward(actorRoleMarker?: string | null): void {
    if (actorRoleMarker === PLATFORM_ADMIN_SOCIAL_PROTECTION_ROLE_MARKER) {
      throw new ForbiddenException(
        'Platform technical administration cannot create authoritative benefit awards',
      );
    }
  }

  assertSuspensionRequiresConfiguredAuthority(input: {
    functionAuthorityRecordId?: string | null;
    authorityEvaluationRecordId?: string | null;
    governmentDecisionId?: string | null;
  }): void {
    const hasAuthority =
      Boolean(input.functionAuthorityRecordId) ||
      Boolean(input.authorityEvaluationRecordId) ||
      Boolean(input.governmentDecisionId);
    if (!hasAuthority) {
      throw new ForbiddenException(
        'Benefit suspension requires configured institutional authority evidence',
      );
    }
  }

  assertNoDestructiveAwardVersionOverwrite(
    existingVersionCount: number,
    destructiveOverwriteRequested: boolean,
  ): void {
    if (destructiveOverwriteRequested && existingVersionCount > 0) {
      throw new BadRequestException(
        'Benefit award versions must be preserved; destructive overwrite is forbidden',
      );
    }
  }

  assertCrossHouseholdAccessBlocked(
    requesterIdentityId: string,
    householdPrimaryIdentityId: string,
  ): void {
    if (requesterIdentityId !== householdPrimaryIdentityId) {
      throw new ForbiddenException('Cross-household social protection access is not permitted');
    }
  }

  assertRepresentativeScope(
    scope: RepresentativeBenefitScope,
    requested: keyof RepresentativeBenefitScope,
  ): void {
    if (!scope[requested]) {
      throw new ForbiddenException(`Representative benefit access denied for scope: ${requested}`);
    }
  }

  assertCrossProgramAccessBlocked(authorizedProgramId: string, requestedProgramId: string): void {
    if (authorizedProgramId !== requestedProgramId) {
      throw new ForbiddenException(
        'Sensitive household data cannot be accessed across benefit programs without authorization',
      );
    }
  }

  rejectApplicantForgedExternalDetermination(
    input: {
      isAuthenticated: boolean;
      determinationStatus: ExternalDeterminationStatus;
      recordedBy?: string;
    },
    actorPersona: SocialProtectionActorPersona,
  ): void {
    if (actorPersona === SocialProtectionActorPersona.APPLICANT) {
      throw new ForbiddenException(
        'Applicants cannot record authenticated external eligibility determinations',
      );
    }
    if (
      input.isAuthenticated &&
      input.determinationStatus !== ExternalDeterminationStatus.PENDING &&
      actorPersona === SocialProtectionActorPersona.HOUSEHOLD_MEMBER
    ) {
      throw new ForbiddenException('Household members cannot forge external eligibility outcomes');
    }
  }

  assertAppealPreservesOriginalDecision(preservesOriginalDecision: boolean): void {
    if (!preservesOriginalDecision) {
      throw new BadRequestException(
        'Social protection appeals must preserve the original decision record until lawfully superseded',
      );
    }
  }

  rejectClientForgedAwardFields(payload: Record<string, unknown>): void {
    const forbidden = [
      'lifecycleStatus',
      'governmentDecisionId',
      'currentBenefitAwardVersionId',
      'isVerifiedGovernmentFact',
    ];
    for (const field of forbidden) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(
          `Client may not set authoritative social protection field "${field}"`,
        );
      }
    }
  }
}
