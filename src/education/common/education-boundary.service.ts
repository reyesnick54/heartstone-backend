import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { EducationActorPersona } from '@prisma/client';

import {
  type EducationGuardianAccessScope,
  FORBIDDEN_AI_EDUCATION_ACTIONS,
  FORBIDDEN_INSTITUTION_SELF_ACCREDITATION_ACTIONS,
} from '../education.constants';

@Injectable()
export class EducationBoundaryService {
  assertApplicationDoesNotCreateEnrollment(input: {
    doesNotCreateEnrollment: boolean;
    enrollmentsCreated: number;
  }): void {
    if (input.enrollmentsCreated > 0) {
      throw new BadRequestException(
        'Linking an education application profile cannot create official enrollment',
      );
    }
    if (!input.doesNotCreateEnrollment && input.enrollmentsCreated > 0) {
      throw new BadRequestException('Application submission must remain distinct from enrollment');
    }
  }

  assertRegistrationDoesNotCreateAccreditation(input: {
    registrationDoesNotAccredit: boolean;
    accreditationsCreated: number;
  }): void {
    if (input.accreditationsCreated > 0) {
      throw new BadRequestException(
        'Institution registration must not create government accreditation',
      );
    }
    if (!input.registrationDoesNotAccredit && input.accreditationsCreated > 0) {
      throw new BadRequestException('Registration and accreditation remain separate lifecycles');
    }
  }

  assertInstitutionCannotSelfAccredit(actorPersona: EducationActorPersona, action: string): void {
    if (
      actorPersona === EducationActorPersona.INSTITUTION_ADMIN &&
      FORBIDDEN_INSTITUTION_SELF_ACCREDITATION_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`Institution cannot self-declare accreditation: ${action}`);
    }
  }

  assertScholarshipApplicationDoesNotCreateAward(input: {
    doesNotCreateAward: boolean;
    awardsCreated: number;
  }): void {
    if (input.awardsCreated > 0) {
      throw new BadRequestException(
        'Scholarship application profiles must not create scholarship awards',
      );
    }
    if (!input.doesNotCreateAward && input.awardsCreated > 0) {
      throw new BadRequestException('Scholarship application remains distinct from award decision');
    }
  }

  assertPaymentDoesNotCreateAdmission(actorPersona: EducationActorPersona): void {
    if (actorPersona === EducationActorPersona.PAYMENT_SYSTEM) {
      throw new ForbiddenException('Payment receipt does not create admission or enrollment');
    }
  }

  assertAiCannotApproveEducationDecision(
    actorPersona: EducationActorPersona,
    action: string,
  ): void {
    if (
      actorPersona === EducationActorPersona.AI_ASSISTANCE &&
      FORBIDDEN_AI_EDUCATION_ACTIONS.includes(action as never)
    ) {
      throw new ForbiddenException(`AI assistance cannot perform education action: ${action}`);
    }
  }

  assertTechnicalAdminCannotIssueAcademicCredential(actorPersona: EducationActorPersona): void {
    if (actorPersona === EducationActorPersona.TECHNICAL_ADMIN) {
      throw new ForbiddenException(
        'Technical administration cannot issue or alter authoritative academic credentials',
      );
    }
  }

  assertNoDestructiveTranscriptOverwrite(
    existingVersionCount: number,
    destructiveOverwriteRequested: boolean,
  ): void {
    if (destructiveOverwriteRequested && existingVersionCount > 0) {
      throw new BadRequestException(
        'Transcript corrections must preserve prior versions; destructive overwrite is forbidden',
      );
    }
  }

  assertCrossStudentAccessBlocked(requesterIdentityId: string, studentIdentityId: string): void {
    if (requesterIdentityId !== studentIdentityId) {
      throw new ForbiddenException('Cross-student education record access is not permitted');
    }
  }

  assertGuardianScope(
    scope: EducationGuardianAccessScope,
    requested: keyof EducationGuardianAccessScope,
  ): void {
    if (!scope[requested]) {
      throw new ForbiddenException(`Guardian education access denied for scope: ${requested}`);
    }
  }

  rejectClientForgedCredentialFields(payload: Record<string, unknown>): void {
    const forbidden = [
      'lifecycleStatus',
      'governmentDecisionId',
      'officialInstrumentId',
      'verificationStatus',
    ];
    for (const field of forbidden) {
      if (field in payload && payload[field] !== undefined) {
        throw new ForbiddenException(`Client may not set authoritative education field "${field}"`);
      }
    }
  }

  sanitizePublicVerificationPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const forbidden = [
      'grades',
      'transcript',
      'transcriptContent',
      'gpa',
      'assessmentResults',
      'disciplinaryRecords',
      'guardianIdentityId',
      'studentIdentityId',
      'fullAcademicRecord',
    ];
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (!forbidden.includes(key)) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
