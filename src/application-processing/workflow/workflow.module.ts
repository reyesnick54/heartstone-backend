import { Module } from '@nestjs/common';

import { SessionsModule } from '../../identity/sessions/sessions.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowDefinitionsService } from './workflow-definitions.service';

@Module({
  imports: [SessionsModule],
  controllers: [WorkflowController],
  providers: [WorkflowDefinitionsService],
  exports: [WorkflowDefinitionsService],
})
export class WorkflowModule {}
