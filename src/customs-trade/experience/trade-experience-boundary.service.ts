import { Injectable } from '@nestjs/common';

import {
  CUSTOMS_AI_BOUNDARY_DISCLAIMER,
  CUSTOMS_BOUNDARY_DISCLAIMER,
  CUSTOMS_PAYMENT_BOUNDARY_DISCLAIMER,
  CUSTOMS_TRADE_RULE_ENVIRONMENT,
  FORBIDDEN_AI_CUSTOMS_ACTIONS,
} from '../customs-trade.constants';

@Injectable()
export class TradeExperienceBoundaryService {
  readonly rulesDisclaimer = CUSTOMS_BOUNDARY_DISCLAIMER;
  readonly paymentDisclaimer = CUSTOMS_PAYMENT_BOUNDARY_DISCLAIMER;
  readonly aiDisclaimer = CUSTOMS_AI_BOUNDARY_DISCLAIMER;
  readonly ruleEnvironment = CUSTOMS_TRADE_RULE_ENVIRONMENT;
  readonly analyticsCannotExecuteRelease = true;
  readonly forbiddenAiActions = FORBIDDEN_AI_CUSTOMS_ACTIONS;
}
