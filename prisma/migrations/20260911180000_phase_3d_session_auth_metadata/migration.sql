-- Phase 3D: Session authentication metadata for OIDC, MFA, and service identity

ALTER TABLE "sessions"
  ADD COLUMN "authMethod" "AuthenticationMethodType" NOT NULL DEFAULT 'PASSWORD',
  ADD COLUMN "oidcProviderCode" TEXT,
  ADD COLUMN "mfaSatisfied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "authenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
