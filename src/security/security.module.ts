import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../identity/auth/auth.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { RouteAccessEnforcementGuard } from './guards/route-access-enforcement.guard';
import { ActorContextService } from './services/actor-context.service';
import { CaseAccessService } from './services/case-access.service';

@Global()
@Module({
  imports: [AuthModule, DatabaseModule],
  providers: [
    ActorContextService,
    CaseAccessService,
    RouteAccessEnforcementGuard,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RouteAccessEnforcementGuard,
    },
  ],
  exports: [ActorContextService, CaseAccessService],
})
export class SecurityModule {}
