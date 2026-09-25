import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from '../identity/auth/auth.module';
import { ClientIdentitySubstitutionGuard } from '../identity/auth/guards/client-identity-substitution.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { AdministrativeRouteGuard } from './guards/administrative-route.guard';
import { ActorContextService } from './services/actor-context.service';
import { CaseAccessService } from './services/case-access.service';
import { TechnicalPermissionModule } from './technical-permission/technical-permission.module';

@Global()
@Module({
  imports: [AuthModule, TechnicalPermissionModule],
  providers: [
    ActorContextService,
    CaseAccessService,
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientIdentitySubstitutionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AdministrativeRouteGuard,
    },
  ],
  exports: [ActorContextService, CaseAccessService],
})
export class SecurityModule {}
