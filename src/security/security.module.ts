import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from '../identity/auth/auth.module';
import { ActorContextModule } from '../identity/auth/context/actor-context.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CaseAccessService } from './services/case-access.service';

@Global()
@Module({
  imports: [AuthModule, ActorContextModule],
  providers: [
    CaseAccessService,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
  ],
  exports: [ActorContextModule, CaseAccessService],
})
export class SecurityModule {}
