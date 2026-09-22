import { Injectable } from '@nestjs/common';

import {
  FORBIDDEN_AI_TAX_ACTIONS,
  REVENUE_BOUNDARY_DISCLAIMER,
  REVENUE_PAYMENT_BOUNDARY_DISCLAIMER,
} from '../revenue.constants';

@Injectable()
export class RevenueExperienceBoundaryService {
  readonly rulesDisclaimer = REVENUE_BOUNDARY_DISCLAIMER;
  readonly paymentDisclaimer = REVENUE_PAYMENT_BOUNDARY_DISCLAIMER;
  readonly ruleEnvironment = 'NON_PRODUCTION' as const;
  readonly analyticsCannotIssueAssessment = true;
  readonly forbiddenAiActions = FORBIDDEN_AI_TAX_ACTIONS;
}
