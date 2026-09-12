import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ApplicationsModule } from './applications/applications.module';
import { CasesModule } from './cases/cases.module';
import { ApplicationProcessingCommonModule } from './common/application-processing-common.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ApplicationProcessingCommonModule,
    SessionsModule,
    ApplicationsModule,
    CasesModule,
    WorkflowModule,
  ],
  providers: [SessionAuthGuard],
  exports: [ApplicationsModule, CasesModule, WorkflowModule],
})
export class ApplicationProcessingModule {}
