import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActorContextModule } from './context/actor-context.module';
import { ClientIdentitySubstitutionGuard } from './guards/client-identity-substitution.guard';
import { ClaimMapperService } from './oidc/claim-mapper.service';
import {
  CompositeJwksResolverService,
  InMemoryJwksResolverService,
  RemoteJwksResolverService,
} from './oidc/jwks-resolver.service';
import { OidcIdentityResolverService } from './oidc/oidc-identity-resolver.service';
import { OidcTokenValidatorService } from './oidc/oidc-token-validator.service';
import { ServiceIdentityAuthService } from './service-identity/service-identity-auth.service';
import { SessionAuthGuardModule } from './session-auth-guard.module';

@Module({
  imports: [IdentityCommonModule, SessionsModule, ActorContextModule, SessionAuthGuardModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    ClientIdentitySubstitutionGuard,
    ClaimMapperService,
    RemoteJwksResolverService,
    InMemoryJwksResolverService,
    CompositeJwksResolverService,
    OidcTokenValidatorService,
    OidcIdentityResolverService,
    ServiceIdentityAuthService,
  ],
  exports: [
    AuthService,
    SessionAuthGuardModule,
    ClientIdentitySubstitutionGuard,
    ActorContextModule,
    SessionsModule,
    OidcTokenValidatorService,
    OidcIdentityResolverService,
  ],
})
export class AuthModule {}
