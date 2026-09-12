import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { WorkflowOrchestrationService } from './workflow-orchestration.service';
import { WorkflowTransitionEvaluatorService } from './workflow-transition-evaluator.service';

@Module({
  imports: [AuthorityModule],
  providers: [WorkflowOrchestrationService, WorkflowTransitionEvaluatorService],
  exports: [WorkflowOrchestrationService, WorkflowTransitionEvaluatorService],
})
export class WorkflowModule {}
