import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { ActorContextService } from './services/actor-context.service';
import { CaseAccessService } from './services/case-access.service';

@Global()
@Module({
  imports: [SessionAuthGuardModule],
  providers: [
    CaseAccessService,
    {
      provide: APP_GUARD,
      useExisting: SessionAuthGuard,
    },
  ],
  exports: [SessionAuthGuardModule, ActorContextService, CaseAccessService],
})
export class SecurityModule {}
