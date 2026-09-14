import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AiGovernanceBoundaryService } from './common/ai-governance-boundary.service';
import { AiGovernanceValidationService } from './common/ai-governance-validation.service';
import {
  AiExecutionService,
  AiHumanDispositionService,
  AiSuspensionService,
} from './execution/ai-execution.service';
import { IntelligenceAnalyticsController } from './intelligence-analytics.controller';
import { AiModelDefinitionsService } from './registry/ai-model-definitions.service';
import { AiUseCasesService } from './registry/ai-use-cases.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IntelligenceAnalyticsController],
  providers: [
    AiGovernanceBoundaryService,
    AiGovernanceValidationService,
    AiModelDefinitionsService,
    AiUseCasesService,
    AiExecutionService,
    AiHumanDispositionService,
    AiSuspensionService,
  ],
  exports: [
    AiGovernanceBoundaryService,
    AiModelDefinitionsService,
    AiUseCasesService,
    AiExecutionService,
    AiHumanDispositionService,
    AiSuspensionService,
  ],
})
export class IntelligenceAnalyticsModule {}
