import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ClinicalResearchActorPersona } from '@prisma/client';

import {
  FORBIDDEN_AI_CLINICAL_RESEARCH_ACTIONS,
  FORBIDDEN_SPONSOR_ETHICS_SELF_APPROVAL_ACTIONS,
} from '../clinical-research.constants';

@Injectable()
export class ClinicalResearchBoundaryService {
  assertAiCannotFinalizeEligibility(action: string): void {
    if (FORBIDDEN_AI_CLINICAL_RESEARCH_ACTIONS.includes(action as never)) {
      throw new ForbiddenException(
        `AI assistance cannot perform clinical research action: ${action}`,
      );
    }
  }

  assertAiCannotRecordProfessionalScreening(actorPersona: ClinicalResearchActorPersona): void {
    if (actorPersona === ClinicalResearchActorPersona.AI_ASSISTANCE) {
      throw new ForbiddenException(
        'AI cannot record professional screening or eligibility determinations',
      );
    }
  }

  assertSponsorCannotSelfApproveEthics(
    actorPersona: ClinicalResearchActorPersona,
    action: string,
  ): void {
    if (
      actorPersona === ClinicalResearchActorPersona.TRIAL_SPONSOR &&
      FORBIDDEN_SPONSOR_ETHICS_SELF_APPROVAL_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(
        'Trial sponsors cannot self-approve or attest research ethics committee decisions',
      );
    }
  }

  assertCrossParticipantBlocked(subjectIdentityId: string, requesterIdentityId: string): void {
    if (subjectIdentityId !== requesterIdentityId) {
      throw new ForbiddenException('Cross-participant clinical research access denied');
    }
  }

  assertConsentAloneDoesNotEnroll(input: {
    hasActiveConsentSignature: boolean;
    hasProfessionalEligibility: boolean;
    enrollmentAttempt: boolean;
  }): void {
    if (
      input.enrollmentAttempt &&
      input.hasActiveConsentSignature &&
      !input.hasProfessionalEligibility
    ) {
      throw new BadRequestException(
        'Signed consent alone does not enroll a participant; professional eligibility is required',
      );
    }
  }

  assertEligibilityAloneDoesNotBypassConsent(input: {
    hasProfessionalEligibility: boolean;
    hasActiveConsentSignature: boolean;
    enrollmentAttempt: boolean;
  }): void {
    if (
      input.enrollmentAttempt &&
      input.hasProfessionalEligibility &&
      !input.hasActiveConsentSignature
    ) {
      throw new BadRequestException(
        'Professional eligibility alone does not bypass informed consent for enrollment',
      );
    }
  }
}
