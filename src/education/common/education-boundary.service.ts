import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { EducationActorPersona } from '@prisma/client';

import {
  FORBIDDEN_AI_EDUCATION_ACTIONS,
  GUARDIAN_ALLOWED_SCOPE_KEYS,
  type GuardianAuthorizedScope,
} from '../education.constants';

@Injectable()
export class EducationBoundaryService {
  assertCrossStudentAccessBlocked(requesterIdentityId: string, subjectIdentityId: string): void {
    if (requesterIdentityId !== subjectIdentityId) {
      throw new ForbiddenException('Cross-student education record access is not permitted');
    }
  }

  assertGuardianScope(
    scope: GuardianAuthorizedScope,
    requiredKey: (typeof GUARDIAN_ALLOWED_SCOPE_KEYS)[number],
  ): void {
    if (!scope[requiredKey]) {
      throw new ForbiddenException(`Guardian relationship lacks authorized scope: ${requiredKey}`);
    }
  }

  assertEnrollmentApplicationDoesNotGrantEnrollment(input: {
    doesNotGrantEnrollment: boolean;
    enrollmentsCreated: number;
  }): void {
    if (!input.doesNotGrantEnrollment || input.enrollmentsCreated > 0) {
      throw new BadRequestException(
        'Enrollment application submission must not create an active enrollment',
      );
    }
  }

  assertScholarshipApplicationDoesNotCreateAward(input: {
    doesNotCreateAward: boolean;
    awardsCreated: number;
  }): void {
    if (!input.doesNotCreateAward || input.awardsCreated > 0) {
      throw new BadRequestException(
        'Scholarship application submission must not create a scholarship award',
      );
    }
  }

  assertRecommendationIsNotAward(recommendationOnly: boolean, awardStatus: string): void {
    if (recommendationOnly && awardStatus === 'AWARDED') {
      throw new BadRequestException('Scholarship recommendation must not be treated as an award');
    }
  }

  assertScholarshipAwardRequiresDecisionWorkflow(input: {
    requiresDecisionWorkflow: boolean;
    governmentDecisionId?: string | null;
  }): void {
    if (input.requiresDecisionWorkflow && !input.governmentDecisionId) {
      throw new BadRequestException(
        'Scholarship award requires a configured decision workflow and government decision reference',
      );
    }
  }

  assertInstitutionCannotSelfAccredit(
    accreditingOrganizationId: string,
    subjectOrganizationId: string,
  ): void {
    if (accreditingOrganizationId === subjectOrganizationId) {
      throw new ForbiddenException('Education institutions cannot self-accredit');
    }
  }

  assertAiCannotGrantEducationAuthority(actorPersona: EducationActorPersona, action: string): void {
    if (
      actorPersona === EducationActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_EDUCATION_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`AI assistance cannot perform education action: ${action}`);
    }
  }

  assertPlatformAdminCannotCreateEducationalLegalStatus(actorPersona: EducationActorPersona): void {
    if (actorPersona === EducationActorPersona.PLATFORM_ADMINISTRATOR) {
      throw new ForbiddenException(
        'Platform administrators cannot create educational legal status or accreditation',
      );
    }
  }

  assertTechnicalAdminCannotGrantAccreditation(actorPersona: EducationActorPersona): void {
    if (actorPersona === EducationActorPersona.TECHNICAL_ADMIN) {
      throw new ForbiddenException(
        'Technical administration cannot grant accreditation or institution licensure',
      );
    }
  }

  assertOfficialWithoutAuthorityCannotGrantAccreditation(hasAuthority: boolean): void {
    if (!hasAuthority) {
      throw new ForbiddenException(
        'Accreditation requires configured official authority; access alone is insufficient',
      );
    }
  }

  assertCorrectionPreservesHistory(historyRowsAppended: number): void {
    if (historyRowsAppended < 1) {
      throw new BadRequestException(
        'Education record corrections must append history rather than overwrite prior facts',
      );
    }
  }
}
