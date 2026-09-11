import { Module } from '@nestjs/common';

import { IdentityCommonModule } from '../common/identity-common.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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

@Module({
  imports: [IdentityCommonModule, SessionsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    ClaimMapperService,
    RemoteJwksResolverService,
    InMemoryJwksResolverService,
    CompositeJwksResolverService,
    OidcTokenValidatorService,
    OidcIdentityResolverService,
    MfaAssuranceService,
    ServiceIdentityAuthService,
  ],
  exports: [
    AuthService,
    SessionAuthGuard,
    SessionsModule,
    OidcTokenValidatorService,
    OidcIdentityResolverService,
    MfaAssuranceService,
    ServiceIdentityAuthService,
    InMemoryJwksResolverService,
  ],
})
export class AuthModule {}
