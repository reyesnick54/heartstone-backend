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
import { AuthModule } from './auth/auth.module';
import { AuthenticationMethodsModule } from './authentication-methods/authentication-methods.module';
import { CredentialsModule } from './credentials/credentials.module';
import { IdentitiesModule } from './identities/identities.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OfficeholderLinksModule } from './officeholder-links/officeholder-links.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PersonsModule } from './persons/persons.module';
import { ProtectedModule } from './protected/protected.module';
import { RepresentativeAuthoritiesModule } from './representative-authorities/representative-authorities.module';
import { SessionsModule } from './sessions/sessions.module';
import { UserAccountsModule } from './user-accounts/user-accounts.module';

@Module({
  imports: [
    PersonsModule,
    UserAccountsModule,
    IdentitiesModule,
    CredentialsModule,
    AuthenticationMethodsModule,
    OrganizationsModule,
    MembershipsModule,
    RepresentativeAuthoritiesModule,
    OfficeholderLinksModule,
    SessionsModule,
    AuthModule,
    ProtectedModule,
  ],
})
/**
 * Phase 3A: Identity & Access domain boundary.
 *
 * This module establishes the canonical identity data model boundary.
 * Authentication flows, authorization, and RBAC are out of scope for this slice.
 *
 * Architectural invariant: User != Officeholder != Role != Permission != Authority
 */
@Module({})
export class IdentityModule {}
