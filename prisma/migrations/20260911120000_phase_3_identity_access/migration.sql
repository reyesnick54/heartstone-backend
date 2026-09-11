-- Phase 3: Identity & Access Foundation

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "IdentityType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'SERVICE');
CREATE TYPE "CredentialType" AS ENUM ('PASSWORD', 'OIDC', 'API_KEY', 'MFA_TOTP');
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "AuthenticationMethodType" AS ENUM ('PASSWORD', 'OIDC', 'SERVICE_API_KEY', 'MFA_TOTP');
CREATE TYPE "AssuranceLevel" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "RepresentativeAuthorityStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ENDED');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "IdentityOfficeholderLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "SecurityAuditEventType" AS ENUM (
  'PERSON_CREATED',
  'USER_ACCOUNT_CREATED',
  'USER_ACCOUNT_SUSPENDED',
  'IDENTITY_CREATED',
  'IDENTITY_ATTACHED',
  'CREDENTIAL_CREATED',
  'CREDENTIAL_REVOKED',
  'AUTHENTICATION_METHOD_CONFIGURED',
  'AUTHENTICATION_SUCCESS',
  'AUTHENTICATION_FAILURE',
  'SESSION_CREATED',
  'SESSION_REVOKED',
  'SESSION_REJECTED',
  'ORGANIZATION_CREATED',
  'MEMBERSHIP_CREATED',
  'REPRESENTATIVE_AUTHORITY_CREATED',
  'OFFICEHOLDER_LINK_CREATED',
  'OFFICEHOLDER_LINK_REVOKED',
  'OIDC_CLAIM_RECEIVED',
  'MFA_VERIFIED',
  'SERVICE_IDENTITY_AUTHENTICATED',
  'PROTECTED_ENDPOINT_ACCESS'
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL,
    "personId" UUID,
    "loginIdentifier" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identities" (
    "id" UUID NOT NULL,
    "type" "IdentityType" NOT NULL,
    "userAccountId" UUID,
    "personId" UUID,
    "organizationId" UUID,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "type" "CredentialType" NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "secretHash" TEXT,
    "oidcProvider" TEXT,
    "oidcSubject" TEXT,
    "apiKeyHash" TEXT,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "roleLabel" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representative_authorities" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "status" "RepresentativeAuthorityStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "representative_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentication_methods" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "type" "AuthenticationMethodType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "assuranceLevel" "AssuranceLevel" NOT NULL DEFAULT 'NONE',
    "oidcIssuer" TEXT,
    "oidcClientId" TEXT,
    "oidcAudience" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authentication_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "userAccountId" UUID,
    "tokenHash" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "assuranceLevel" "AssuranceLevel" NOT NULL DEFAULT 'LOW',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_officeholder_links" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "officeholderId" UUID NOT NULL,
    "status" "IdentityOfficeholderLinkStatus" NOT NULL DEFAULT 'PENDING',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedByIdentityId" UUID,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_officeholder_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_audit_events" (
    "id" UUID NOT NULL,
    "eventType" "SecurityAuditEventType" NOT NULL,
    "identityId" UUID,
    "userAccountId" UUID,
    "sessionId" UUID,
    "actorIdentityId" UUID,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_personId_key" ON "user_accounts"("personId");
CREATE UNIQUE INDEX "user_accounts_loginIdentifier_key" ON "user_accounts"("loginIdentifier");
CREATE INDEX "user_accounts_status_idx" ON "user_accounts"("status");

CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

CREATE INDEX "identities_userAccountId_idx" ON "identities"("userAccountId");
CREATE INDEX "identities_personId_idx" ON "identities"("personId");
CREATE INDEX "identities_organizationId_idx" ON "identities"("organizationId");
CREATE INDEX "identities_type_idx" ON "identities"("type");

CREATE INDEX "credentials_identityId_idx" ON "credentials"("identityId");
CREATE INDEX "credentials_status_idx" ON "credentials"("status");

CREATE UNIQUE INDEX "organization_memberships_organizationId_identityId_key" ON "organization_memberships"("organizationId", "identityId");
CREATE INDEX "organization_memberships_organizationId_idx" ON "organization_memberships"("organizationId");
CREATE INDEX "organization_memberships_identityId_idx" ON "organization_memberships"("identityId");

CREATE INDEX "representative_authorities_organizationId_idx" ON "representative_authorities"("organizationId");
CREATE INDEX "representative_authorities_identityId_idx" ON "representative_authorities"("identityId");

CREATE INDEX "authentication_methods_identityId_idx" ON "authentication_methods"("identityId");

CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_identityId_idx" ON "sessions"("identityId");
CREATE INDEX "sessions_userAccountId_idx" ON "sessions"("userAccountId");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

CREATE UNIQUE INDEX "identity_officeholder_links_identityId_officeholderId_key" ON "identity_officeholder_links"("identityId", "officeholderId");
CREATE INDEX "identity_officeholder_links_identityId_idx" ON "identity_officeholder_links"("identityId");
CREATE INDEX "identity_officeholder_links_officeholderId_idx" ON "identity_officeholder_links"("officeholderId");

CREATE INDEX "security_audit_events_eventType_idx" ON "security_audit_events"("eventType");
CREATE INDEX "security_audit_events_identityId_idx" ON "security_audit_events"("identityId");
CREATE INDEX "security_audit_events_userAccountId_idx" ON "security_audit_events"("userAccountId");
CREATE INDEX "security_audit_events_createdAt_idx" ON "security_audit_events"("createdAt");

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "identities" ADD CONSTRAINT "identities_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identities" ADD CONSTRAINT "identities_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identities" ADD CONSTRAINT "identities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "credentials" ADD CONSTRAINT "credentials_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "representative_authorities" ADD CONSTRAINT "representative_authorities_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "representative_authorities" ADD CONSTRAINT "representative_authorities_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "authentication_methods" ADD CONSTRAINT "authentication_methods_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "identity_officeholder_links" ADD CONSTRAINT "identity_officeholder_links_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_officeholder_links" ADD CONSTRAINT "identity_officeholder_links_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
