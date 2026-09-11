-- CreateEnum
CREATE TYPE "IdentityAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "UserAccountKind" AS ENUM ('STANDARD', 'IDENTITY_ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('PASSWORD', 'API_KEY', 'CLIENT_SECRET');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuthSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IdentityOfficeholderLinkStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REVOKED', 'ENDED');

-- CreateEnum
CREATE TYPE "IdentityOfficeholderVerificationMethod" AS ENUM ('ADMIN_VERIFICATION', 'DOCUMENT_EVIDENCE', 'IN_PERSON_VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SecurityAuditEventType" AS ENUM ('ACCOUNT_CREATED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'IDENTITY_LINKED', 'IDENTITY_VERIFICATION_CHANGED', 'CREDENTIAL_CREATED', 'CREDENTIAL_REVOKED', 'SESSION_CREATED', 'SESSION_REVOKED', 'SERVICE_IDENTITY_AUTHENTICATED', 'OFFICEHOLDER_LINKAGE_REQUESTED', 'OFFICEHOLDER_LINKAGE_ACTIVATED', 'OFFICEHOLDER_LINKAGE_SUSPENDED', 'OFFICEHOLDER_LINKAGE_REVOKED');

-- CreateEnum
CREATE TYPE "SecurityAuditResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "PrincipalKind" AS ENUM ('USER_ACCOUNT', 'SERVICE_IDENTITY', 'SYSTEM');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "displayName" TEXT,
    "status" "IdentityAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "kind" "UserAccountKind" NOT NULL DEFAULT 'STANDARD',
    "status" "IdentityAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_identities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IdentityAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "userAccountId" UUID,
    "serviceIdentityId" UUID,
    "type" "CredentialType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "secretHash" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userAccountId" UUID,
    "serviceIdentityId" UUID,
    "tokenHash" TEXT NOT NULL,
    "status" "AuthSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identity_links" (
    "id" UUID NOT NULL,
    "userAccountId" UUID NOT NULL,
    "providerKey" TEXT NOT NULL,
    "externalSubject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_identity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_officeholder_links" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "userAccountId" UUID,
    "officeholderId" UUID NOT NULL,
    "status" "IdentityOfficeholderLinkStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "IdentityOfficeholderVerificationMethod",
    "evidenceReference" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_officeholder_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_audit_events" (
    "id" UUID NOT NULL,
    "eventType" "SecurityAuditEventType" NOT NULL,
    "actorKind" "PrincipalKind",
    "actorId" UUID,
    "subjectType" TEXT,
    "subjectId" UUID,
    "correlationId" TEXT,
    "source" TEXT,
    "result" "SecurityAuditResult" NOT NULL DEFAULT 'SUCCESS',
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_username_key" ON "user_accounts"("username");

-- CreateIndex
CREATE INDEX "user_accounts_personId_idx" ON "user_accounts"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "service_identities_code_key" ON "service_identities"("code");

-- CreateIndex
CREATE INDEX "credentials_userAccountId_idx" ON "credentials"("userAccountId");

-- CreateIndex
CREATE INDEX "credentials_serviceIdentityId_idx" ON "credentials"("serviceIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userAccountId_idx" ON "auth_sessions"("userAccountId");

-- CreateIndex
CREATE INDEX "auth_sessions_serviceIdentityId_idx" ON "auth_sessions"("serviceIdentityId");

-- CreateIndex
CREATE INDEX "external_identity_links_userAccountId_idx" ON "external_identity_links"("userAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "external_identity_links_providerKey_externalSubject_key" ON "external_identity_links"("providerKey", "externalSubject");

-- CreateIndex
CREATE INDEX "identity_officeholder_links_personId_idx" ON "identity_officeholder_links"("personId");

-- CreateIndex
CREATE INDEX "identity_officeholder_links_userAccountId_idx" ON "identity_officeholder_links"("userAccountId");

-- CreateIndex
CREATE INDEX "identity_officeholder_links_officeholderId_idx" ON "identity_officeholder_links"("officeholderId");

-- CreateIndex
CREATE INDEX "security_audit_events_eventType_idx" ON "security_audit_events"("eventType");

-- CreateIndex
CREATE INDEX "security_audit_events_actorId_idx" ON "security_audit_events"("actorId");

-- CreateIndex
CREATE INDEX "security_audit_events_subjectId_idx" ON "security_audit_events"("subjectId");

-- CreateIndex
CREATE INDEX "security_audit_events_correlationId_idx" ON "security_audit_events"("correlationId");

-- CreateIndex
CREATE INDEX "security_audit_events_createdAt_idx" ON "security_audit_events"("createdAt");

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_serviceIdentityId_fkey" FOREIGN KEY ("serviceIdentityId") REFERENCES "service_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_serviceIdentityId_fkey" FOREIGN KEY ("serviceIdentityId") REFERENCES "service_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identity_links" ADD CONSTRAINT "external_identity_links_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_officeholder_links" ADD CONSTRAINT "identity_officeholder_links_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_officeholder_links" ADD CONSTRAINT "identity_officeholder_links_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_officeholder_links" ADD CONSTRAINT "identity_officeholder_links_officeholderId_fkey" FOREIGN KEY ("officeholderId") REFERENCES "officeholders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
