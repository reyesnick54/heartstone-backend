import { Injectable } from '@nestjs/common';

import {
  FORBIDDEN_AI_PROPERTY_ACTIONS,
  PROPERTY_REGISTRY_BOUNDARY_DISCLAIMER,
  PROPERTY_REGISTRY_RULE_ENVIRONMENT,
} from '../property-registry.constants';

@Injectable()
export class PropertyExperienceBoundaryService {
  readonly rulesDisclaimer = PROPERTY_REGISTRY_BOUNDARY_DISCLAIMER;
  readonly ruleEnvironment = PROPERTY_REGISTRY_RULE_ENVIRONMENT;
  readonly forbiddenAiActions = FORBIDDEN_AI_PROPERTY_ACTIONS;
}
