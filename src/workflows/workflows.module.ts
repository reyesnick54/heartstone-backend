import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { WorkflowDefinitionValidationService } from './common/workflow-definition-validation.service';
import { WorkflowDefinitionsService } from './workflow-definitions.service';
import { WorkflowStageDefinitionsService } from './workflow-stage-definitions.service';
import { WorkflowStepDefinitionsService } from './workflow-step-definitions.service';
import { WorkflowTransitionDefinitionsService } from './workflow-transition-definitions.service';
import { WorkflowVersionsService } from './workflow-versions.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  imports: [SessionsModule],
  controllers: [WorkflowsController],
  providers: [
    WorkflowDefinitionsService,
    WorkflowVersionsService,
    WorkflowStageDefinitionsService,
    WorkflowStepDefinitionsService,
    WorkflowTransitionDefinitionsService,
    WorkflowDefinitionValidationService,
    SessionAuthGuard,
  ],
  exports: [
    WorkflowDefinitionsService,
    WorkflowVersionsService,
    WorkflowDefinitionValidationService,
  ],
})
export class WorkflowsModule {}
