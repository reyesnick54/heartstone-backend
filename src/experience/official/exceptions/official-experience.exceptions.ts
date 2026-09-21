import { ForbiddenException } from '@nestjs/common';

export class OfficialExperienceAccessDeniedException extends ForbiddenException {
  constructor(reason: string) {
    super(`Official experience access denied: ${reason}`);
  }
}

export class OfficialCaseAccessDeniedException extends ForbiddenException {
  constructor(caseId: string) {
    super(`Case "${caseId}" is outside your institutional scope or assignment`);
  }
}

export class OfficialSubstantiveAccessDeniedException extends ForbiddenException {
  constructor() {
    super(
      'Substantive official workspace access requires an active officeholder link and current appointment',
    );
  }
}
