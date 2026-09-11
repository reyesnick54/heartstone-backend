import { Module } from '@nestjs/common';

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
