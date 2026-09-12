import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CaseAccessService } from './case-access.service';
import { CaseStatusService } from './case-status.service';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [SessionsModule],
  controllers: [CasesController],
  providers: [CasesService, CaseAccessService, CaseStatusService, SessionAuthGuard],
  exports: [CasesService],
})
export class CasesModule {}
