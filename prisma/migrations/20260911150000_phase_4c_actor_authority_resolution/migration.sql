-- Phase 4C: Institutional actor authority resolution enhancements

ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'VERIFY';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'RECOMMEND';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'CONCUR';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'INSPECT';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'ENFORCE';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'SUSPEND';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'REVOKE';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'HEAR_REVIEW';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'ADMINISTER';
ALTER TYPE "AuthorityActionType" ADD VALUE IF NOT EXISTS 'AUDIT';

CREATE TABLE "delegation_structured_scopes" (
  "id" UUID NOT NULL,
  "delegationId" UUID NOT NULL,
  "functionAuthorityRecordId" UUID NOT NULL,
  "allowedActionTypes" "AuthorityActionType"[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delegation_structured_scopes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delegation_structured_scopes_delegationId_idx"
  ON "delegation_structured_scopes"("delegationId");
CREATE INDEX "delegation_structured_scopes_functionAuthorityRecordId_idx"
  ON "delegation_structured_scopes"("functionAuthorityRecordId");
CREATE UNIQUE INDEX "delegation_structured_scopes_delegationId_functionAuthorityRecordId_key"
  ON "delegation_structured_scopes"("delegationId", "functionAuthorityRecordId");

ALTER TABLE "delegation_structured_scopes"
  ADD CONSTRAINT "delegation_structured_scopes_delegationId_fkey"
  FOREIGN KEY ("delegationId") REFERENCES "delegations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delegation_structured_scopes"
  ADD CONSTRAINT "delegation_structured_scopes_functionAuthorityRecordId_fkey"
  FOREIGN KEY ("functionAuthorityRecordId") REFERENCES "function_authority_records"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
