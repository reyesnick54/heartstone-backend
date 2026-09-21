import { ForbiddenException } from '@nestjs/common';

export class ExecutiveExperienceAccessDeniedException extends ForbiddenException {
  constructor(reason: string) {
    super(`Executive experience access denied: ${reason}`);
  }
}

export class ExecutiveInstitutionScopeDeniedException extends ForbiddenException {
  constructor(institutionId: string) {
    super(
      `Institution "${institutionId}" is outside your executive briefing scope. Cross-institution executive access requires explicit policy entitlement.`,
    );
  }
}
