import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ClientIdentitySubstitutionGuard } from '../identity/auth/guards/client-identity-substitution.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
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
    {
      provide: APP_GUARD,
      useClass: ClientIdentitySubstitutionGuard,
    },
  ],
  exports: [SessionAuthGuardModule, CaseAccessService],
})
export class SecurityModule {}
