import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from '../database/database.module';
import { ClientIdentitySubstitutionGuard } from '../identity/auth/guards/client-identity-substitution.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { RouteAccessEnforcementGuard } from './guards/route-access-enforcement.guard';
import { CaseAccessService } from './services/case-access.service';

@Global()
@Module({
  imports: [SessionAuthGuardModule, DatabaseModule],
  providers: [
    CaseAccessService,
    RouteAccessEnforcementGuard,
    {
      provide: APP_GUARD,
      useExisting: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientIdentitySubstitutionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RouteAccessEnforcementGuard,
    },
  ],
  exports: [SessionAuthGuardModule, CaseAccessService],
})
export class SecurityModule {}
