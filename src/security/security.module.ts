import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from '../identity/auth/auth.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ActorContextService } from './services/actor-context.service';
import { CaseAccessService } from './services/case-access.service';

@Global()
@Module({
  imports: [AuthModule],
  providers: [
    ActorContextService,
    CaseAccessService,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
  ],
  exports: [ActorContextService, CaseAccessService],
})
export class SecurityModule {}
