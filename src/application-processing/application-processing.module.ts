import { Module } from '@nestjs/common';

import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { ApplicationsModule } from './applications/applications.module';
import { CasesModule } from './cases/cases.module';
import { ApplicationProcessingCommonModule } from './common/application-processing-common.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ApplicationProcessingCommonModule,
    SessionAuthGuardModule,
    ApplicationsModule,
    CasesModule,
    WorkflowModule,
  ],
  exports: [ApplicationsModule, CasesModule, WorkflowModule],
})
export class ApplicationProcessingModule {}
