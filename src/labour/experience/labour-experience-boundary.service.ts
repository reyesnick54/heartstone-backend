import { Injectable } from '@nestjs/common';

import {
  FORBIDDEN_AI_LABOUR_ACTIONS,
  LABOUR_BOUNDARY_DISCLAIMER,
  LABOUR_EXPERIENCE_RULE_ENVIRONMENT,
  LABOUR_IMMIGRATION_COORDINATION_DISCLAIMER,
} from '../labour.constants';

@Injectable()
export class LabourExperienceBoundaryService {
  readonly rulesDisclaimer = LABOUR_BOUNDARY_DISCLAIMER;
  readonly immigrationCoordinationDisclaimer = LABOUR_IMMIGRATION_COORDINATION_DISCLAIMER;
  readonly ruleEnvironment = LABOUR_EXPERIENCE_RULE_ENVIRONMENT;
  readonly forbiddenAiActions = FORBIDDEN_AI_LABOUR_ACTIONS;
}
