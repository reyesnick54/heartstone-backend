-- AlterEnum
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'OIDC_ACCOUNT_LINKED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'STEP_UP_REQUIRED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'STEP_UP_SATISFIED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'ACCOUNT_LOCKED';
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'AUTHENTICATION_REJECTED';

-- AlterTable
ALTER TABLE "user_accounts" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_accounts" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "authMethod" "AuthenticationMethodType" NOT NULL DEFAULT 'PASSWORD';
ALTER TABLE "sessions" ADD COLUMN "oidcProviderCode" TEXT;
ALTER TABLE "sessions" ADD COLUMN "mfaSatisfied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN "authenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
