import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActorContextModule } from './context/actor-context.module';
import { ClientIdentitySubstitutionGuard } from './guards/client-identity-substitution.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { MfaAssuranceService } from './mfa/mfa-assurance.service';
import { ClaimMapperService } from './oidc/claim-mapper.service';
import {
  CompositeJwksResolverService,
  InMemoryJwksResolverService,
  RemoteJwksResolverService,
} from './oidc/jwks-resolver.service';
import { OidcIdentityResolverService } from './oidc/oidc-identity-resolver.service';
import { OidcTokenValidatorService } from './oidc/oidc-token-validator.service';
import { ServiceIdentityAuthService } from './service-identity/service-identity-auth.service';
import { StepUpAuthService } from './step-up/step-up-auth.service';

@Module({
  imports: [IdentityCommonModule, SessionsModule, ActorContextModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    ClientIdentitySubstitutionGuard,
    MfaAssuranceService,
    StepUpAuthService,
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
    SessionAuthGuard,
    ClientIdentitySubstitutionGuard,
    ActorContextModule,
    SessionsModule,
    OidcTokenValidatorService,
    OidcIdentityResolverService,
    MfaAssuranceService,
    StepUpAuthService,
  ],
})
export class AuthModule {}
