import { Module } from '@nestjs/common';

import { ServiceChecklistController } from './checklist/service-checklist.controller';
import { ServiceChecklistService } from './checklist/service-checklist.service';
import { DeclarationDefinitionsService } from './declarations/declaration-definitions.service';
import { GovernmentServicesService } from './government-services/government-services.service';
import { ServiceRequirementsService } from './requirements/service-requirements.service';
import { StructuredApplicabilityRuleEvaluator } from './rules/structured-applicability-rule-evaluator.service';
import { StructuredApplicabilityRulesService } from './rules/structured-applicability-rules.service';

@Module({
  controllers: [ServiceChecklistController],
  providers: [
    GovernmentServicesService,
    ServiceRequirementsService,
    ServiceChecklistService,
    StructuredApplicabilityRuleEvaluator,
    StructuredApplicabilityRulesService,
    DeclarationDefinitionsService,
  ],
  exports: [
    GovernmentServicesService,
    ServiceRequirementsService,
    ServiceChecklistService,
    StructuredApplicabilityRuleEvaluator,
    StructuredApplicabilityRulesService,
    DeclarationDefinitionsService,
  ],
})
export class ServicesModule {}
