import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { UserAccountsController } from './accounts/user-accounts.controller';
import { UserAccountsService } from './accounts/user-accounts.service';
import { SecurityAuditModule } from './audit/security-audit.module';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { IdentityAdminGuard } from './auth/identity-admin.guard';
import { IdentityAuthorizationService } from './auth/identity-authorization.service';
import { CredentialsService } from './credentials/credentials.service';
import { IdentityOfficeholderLinksController } from './officeholder-links/identity-officeholder-links.controller';
import { IdentityOfficeholderLinksService } from './officeholder-links/identity-officeholder-links.service';
import { OidcAuthService } from './oidc/oidc-auth.service';
import { PersonsService } from './persons/persons.service';
import { ServiceIdentitiesService } from './service-identities/service-identities.service';
import { SessionsService } from './sessions/sessions.service';

@Module({
  imports: [DatabaseModule, SecurityAuditModule],
  controllers: [UserAccountsController, AuthController, IdentityOfficeholderLinksController],
  providers: [
    PersonsService,
    UserAccountsService,
    ServiceIdentitiesService,
    CredentialsService,
    SessionsService,
    AuthService,
    IdentityAuthorizationService,
    AuthGuard,
    IdentityAdminGuard,
    IdentityOfficeholderLinksService,
    OidcAuthService,
  ],
  exports: [
    UserAccountsService,
    ServiceIdentitiesService,
    CredentialsService,
    SessionsService,
    AuthService,
    IdentityOfficeholderLinksService,
    OidcAuthService,
    SecurityAuditModule,
  ],
})
export class IdentityModule {}
