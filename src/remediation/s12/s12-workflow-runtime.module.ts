import { forwardRef, Module } from '@nestjs/common';

import { CasesModule } from '../../application-processing/cases/cases.module';
import { RedisModule } from '../../redis/redis.module';
import { WorkflowConditionEvaluatorService } from './branching/workflow-condition-evaluator.service';
import { ServerClockService } from './clock/server-clock.service';
import { GovernmentDecisionNumberService } from './decision/government-decision-number.service';
import { WorkflowEscalationService } from './escalation/workflow-escalation.service';
import { SafeHaltWorkflowService } from './halt/safe-halt-workflow.service';
import { WorkflowDurableJobRunner } from './jobs/workflow-durable-job.runner';
import { WorkflowDurableJobService } from './jobs/workflow-durable-job.service';
import { RequestForInformationService } from './rfi/request-for-information.service';
import { SlaClockAuthorityService } from './sla/sla-clock-authority.service';
import { SlaStandardResolverService } from './sla/sla-standard-resolver.service';

@Module({
  imports: [RedisModule, forwardRef(() => CasesModule)],
  providers: [
    ServerClockService,
    WorkflowConditionEvaluatorService,
    SlaStandardResolverService,
    SlaClockAuthorityService,
    WorkflowDurableJobService,
    WorkflowDurableJobRunner,
    WorkflowEscalationService,
    RequestForInformationService,
    SafeHaltWorkflowService,
    GovernmentDecisionNumberService,
  ],
  exports: [
    ServerClockService,
    WorkflowConditionEvaluatorService,
    SlaStandardResolverService,
    SlaClockAuthorityService,
    WorkflowDurableJobService,
    WorkflowDurableJobRunner,
    WorkflowEscalationService,
    RequestForInformationService,
    SafeHaltWorkflowService,
    GovernmentDecisionNumberService,
  ],
})
export class S12WorkflowRuntimeModule {}
