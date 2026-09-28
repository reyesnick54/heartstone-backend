import { ForbiddenException, Injectable } from '@nestjs/common';

import { S19_REASON_CODES } from '../s19.constants';

@Injectable()
export class ExecutiveReportScopeService {
  assertInstitutionScope(input: {
    targetInstitutionId: string;
    actorInstitutionIds: string[];
  }): void {
    if (input.actorInstitutionIds.length === 0) {
      throw new ForbiddenException(S19_REASON_CODES.EXECUTIVE_REPORT_INSTITUTION_SCOPE_REQUIRED);
    }

    if (!input.actorInstitutionIds.includes(input.targetInstitutionId)) {
      throw new ForbiddenException(S19_REASON_CODES.EXECUTIVE_REPORT_CROSS_INSTITUTION_DENIED);
    }
  }
}
