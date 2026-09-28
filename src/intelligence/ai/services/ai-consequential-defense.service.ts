import { ForbiddenException, Injectable } from '@nestjs/common';

import { AI_POLICY_REASON_CODES, FORBIDDEN_AI_GOVERNMENT_ACTIONS } from '../governed-ai.constants';

@Injectable()
export class AiConsequentialDefenseService {
  assertAiCannotPerformGovernmentAction(action: string): void {
    if ((FORBIDDEN_AI_GOVERNMENT_ACTIONS as readonly string[]).includes(action.toUpperCase())) {
      throw new ForbiddenException({
        code: AI_POLICY_REASON_CODES.GOVERNANCE_CHAIN_INCOMPLETE,
        message: `AI agents cannot perform consequential government action: ${action}`,
      });
    }
  }
}
