import { BadRequestException, Injectable } from '@nestjs/common';

import { S16_BOUNDARY_DISCLAIMERS } from '../../../operational-lifecycle/operational-lifecycle.constants';

@Injectable()
export class CaseManagerBoundaryService {
  assertCaseManagerIsNotDecisionAuthority(input: {
    isCaseManager: boolean;
    isProposedDecisionMaker: boolean;
  }): void {
    if (input.isCaseManager && input.isProposedDecisionMaker) {
      throw new BadRequestException(S16_BOUNDARY_DISCLAIMERS.caseManagerNotDecisionAuthority);
    }
  }

  operationalDisclaimer(): string {
    return S16_BOUNDARY_DISCLAIMERS.caseManagerNotDecisionAuthority;
  }
}
