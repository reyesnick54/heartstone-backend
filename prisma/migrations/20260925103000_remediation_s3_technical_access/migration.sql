-- Remediation S3: canonical technical roles, permissions, and access levels

CREATE TYPE "TechnicalAccessScopeType" AS ENUM (
  'PLATFORM',
  'JURISDICTION',
  'INSTITUTION',
  'GOVERNMENT_BODY',
  'DEPARTMENT',
  'OFFICE'
);

CREATE TYPE "TechnicalAccessLevel" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

CREATE TYPE "TechnicalAccessAuditResult" AS ENUM (
  'GRANTED',
  'DENIED_NO_PERMISSION',
  'DENIED_SCOPE',
  'DENIED_ADMINISTRATIVE_DEFAULT',
  'DENIED_ACCOUNT_INACTIVE'
);

ALTER TYPE "SecurityAuditEventType" ADD VALUE 'TECHNICAL_PERMISSION_GRANTED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'TECHNICAL_PERMISSION_DENIED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'TECHNICAL_ROLE_ASSIGNED';

CREATE TABLE "technical_permissions" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "domain" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "technical_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technical_permissions_code_key" ON "technical_permissions"("code");
CREATE INDEX "technical_permissions_domain_idx" ON "technical_permissions"("domain");

CREATE TABLE "technical_roles" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "accessLevel" "TechnicalAccessLevel",
  "isSystemRole" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "technical_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technical_roles_code_key" ON "technical_roles"("code");

CREATE TABLE "technical_role_permissions" (
  "id" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "permissionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technical_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technical_role_permissions_roleId_permissionId_key"
  ON "technical_role_permissions"("roleId", "permissionId");

CREATE TABLE "technical_role_assignments" (
  "id" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "scopeType" "TechnicalAccessScopeType" NOT NULL DEFAULT 'PLATFORM',
  "jurisdictionId" UUID,
  "institutionId" UUID,
  "governmentBodyId" UUID,
  "departmentId" UUID,
  "officeId" UUID,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveUntil" TIMESTAMP(3),
  "assignedByIdentityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "technical_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_role_assignments_identityId_idx" ON "technical_role_assignments"("identityId");
CREATE INDEX "technical_role_assignments_roleId_idx" ON "technical_role_assignments"("roleId");
CREATE INDEX "technical_role_assignments_scopeType_idx" ON "technical_role_assignments"("scopeType");
CREATE INDEX "technical_role_assignments_institutionId_idx" ON "technical_role_assignments"("institutionId");

CREATE TABLE "technical_access_level_permissions" (
  "id" UUID NOT NULL,
  "accessLevel" "TechnicalAccessLevel" NOT NULL,
  "permissionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technical_access_level_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technical_access_level_permissions_accessLevel_permissionId_key"
  ON "technical_access_level_permissions"("accessLevel", "permissionId");

CREATE TABLE "technical_access_audit_events" (
  "id" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "sessionId" UUID,
  "permissionCode" TEXT,
  "endpoint" TEXT NOT NULL,
  "accessResult" "TechnicalAccessAuditResult" NOT NULL,
  "scopeType" "TechnicalAccessScopeType",
  "scopeInstitutionId" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technical_access_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "technical_access_audit_events_identityId_idx" ON "technical_access_audit_events"("identityId");
CREATE INDEX "technical_access_audit_events_accessResult_idx" ON "technical_access_audit_events"("accessResult");
CREATE INDEX "technical_access_audit_events_createdAt_idx" ON "technical_access_audit_events"("createdAt");

ALTER TABLE "technical_role_permissions"
  ADD CONSTRAINT "technical_role_permissions_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "technical_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_role_permissions"
  ADD CONSTRAINT "technical_role_permissions_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "technical_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "technical_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_jurisdictionId_fkey"
  FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_institutionId_fkey"
  FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_governmentBodyId_fkey"
  FOREIGN KEY ("governmentBodyId") REFERENCES "government_bodies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_role_assignments"
  ADD CONSTRAINT "technical_role_assignments_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "technical_access_level_permissions"
  ADD CONSTRAINT "technical_access_level_permissions_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "technical_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "technical_access_audit_events"
  ADD CONSTRAINT "technical_access_audit_events_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
