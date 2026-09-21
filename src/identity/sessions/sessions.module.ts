import { Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { PasswordCredentialVerifier } from '../auth/adapters/password-credential-verifier.adapter';
import { ActorContextModule } from '../auth/context/actor-context.module';
import { CREDENTIAL_VERIFIER } from '../auth/interfaces/credential-verifier.interface';
import { IdentityResolutionService } from '../auth/services/identity-resolution.service';
import { IdentityCommonModule } from '../common/identity-common.module';
import { SessionsService } from './sessions.service';

@Module({
  imports: [IdentityCommonModule, AccountsModule, ActorContextModule],
  providers: [
    SessionsService,
    IdentityResolutionService,
    PasswordCredentialVerifier,
    {
      provide: CREDENTIAL_VERIFIER,
      useFactory: (passwordVerifier: PasswordCredentialVerifier) => [passwordVerifier],
      inject: [PasswordCredentialVerifier],
    },
  ],
  exports: [SessionsService, ActorContextModule],
})
export class SessionsModule {}
