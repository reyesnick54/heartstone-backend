-- Governed citizen self-provisioning on first OIDC login.
-- IDENTITY_SELF_PROVISIONED: a new Person, UserAccount and INDIVIDUAL Identity were created for an
--   unlinked external subject on a provider that opted in to citizen self-service.
-- IDENTITY_POSSIBLE_DUPLICATE: a self-asserted email on that first login matches an existing
--   account. Recorded for review only; identities are never merged automatically.

-- AlterEnum
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'IDENTITY_SELF_PROVISIONED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'IDENTITY_POSSIBLE_DUPLICATE';
