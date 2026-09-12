import { Module } from '@nestjs/common';

import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  exports: [WorkflowModule],
})
export class ApplicationsModule {}
