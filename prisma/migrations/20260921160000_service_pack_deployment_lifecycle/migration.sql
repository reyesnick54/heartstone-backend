-- CreateEnum
CREATE TYPE "ServicePackVersionStatus" AS ENUM ('COMPILED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ServicePackDeploymentStatus" AS ENUM ('DEPLOYMENT_READY', 'DEPLOYED', 'OPERATIONALLY_INACTIVE', 'ACTIVE', 'SUSPENDED', 'ROLLED_BACK', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ServicePackDeploymentBindingDomain" AS ENUM ('SERVICE_CATALOG', 'FORMS', 'WORKFLOWS', 'SERVICE_AUTHORITY_MAPPINGS', 'FEE_METADATA', 'EVIDENCE_REQUIREMENTS', 'OUTPUT_METADATA', 'REDRESS_ROUTES', 'COMMUNICATION_CONFIGURATION', 'INTEGRATION_REFERENCES', 'DASHBOARD_CONFIGURATION');

-- CreateEnum
CREATE TYPE "ServicePackDeploymentAuditEventType" AS ENUM ('VERSION_ACCEPTED', 'DEPLOYMENT_READY', 'DEPLOYED', 'ACTIVATION_REQUESTED', 'ACTIVATION_BLOCKED', 'ACTIVATED', 'SUSPENDED', 'ROLLBACK_INITIATED', 'ROLLBACK_COMPLETED', 'SUPERSEDED', 'FINGERPRINT_RECORDED');

-- CreateTable
CREATE TABLE "service_packs" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "institutionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pack_versions" (
    "id" UUID NOT NULL,
    "servicePackId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "ServicePackVersionStatus" NOT NULL DEFAULT 'COMPILED',
    "compilationFingerprint" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "compiledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pack_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pack_deployments" (
    "id" UUID NOT NULL,
    "servicePackVersionId" UUID NOT NULL,
    "deploymentReference" TEXT NOT NULL,
    "status" "ServicePackDeploymentStatus" NOT NULL DEFAULT 'DEPLOYMENT_READY',
    "configurationFingerprint" TEXT,
    "deployedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "supersededByDeploymentId" UUID,
    "actorIdentityId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pack_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pack_deployment_bindings" (
    "id" UUID NOT NULL,
    "servicePackDeploymentId" UUID NOT NULL,
    "domain" "ServicePackDeploymentBindingDomain" NOT NULL,
    "domainEntityId" UUID NOT NULL,
    "domainEntityVersion" TEXT,
    "bindingSnapshot" JSONB NOT NULL DEFAULT '{}',
    "isReversible" BOOLEAN NOT NULL DEFAULT true,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_pack_deployment_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_pack_deployment_audit_records" (
    "id" UUID NOT NULL,
    "servicePackDeploymentId" UUID NOT NULL,
    "eventType" "ServicePackDeploymentAuditEventType" NOT NULL,
    "priorStatus" "ServicePackDeploymentStatus",
    "newStatus" "ServicePackDeploymentStatus",
    "actorIdentityId" UUID NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_pack_deployment_audit_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_packs_code_key" ON "service_packs"("code");

-- CreateIndex
CREATE INDEX "service_packs_institutionId_idx" ON "service_packs"("institutionId");

-- CreateIndex
CREATE INDEX "service_pack_versions_servicePackId_idx" ON "service_pack_versions"("servicePackId");

-- CreateIndex
CREATE INDEX "service_pack_versions_status_idx" ON "service_pack_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_pack_versions_servicePackId_version_key" ON "service_pack_versions"("servicePackId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "service_pack_deployments_deploymentReference_key" ON "service_pack_deployments"("deploymentReference");

-- CreateIndex
CREATE INDEX "service_pack_deployments_servicePackVersionId_idx" ON "service_pack_deployments"("servicePackVersionId");

-- CreateIndex
CREATE INDEX "service_pack_deployments_status_idx" ON "service_pack_deployments"("status");

-- CreateIndex
CREATE INDEX "service_pack_deployments_actorIdentityId_idx" ON "service_pack_deployments"("actorIdentityId");

-- CreateIndex
CREATE INDEX "service_pack_deployment_bindings_servicePackDeploymentId_idx" ON "service_pack_deployment_bindings"("servicePackDeploymentId");

-- CreateIndex
CREATE INDEX "service_pack_deployment_bindings_domainEntityId_idx" ON "service_pack_deployment_bindings"("domainEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "service_pack_deployment_bindings_servicePackDeploymentId_doma_key" ON "service_pack_deployment_bindings"("servicePackDeploymentId", "domain", "domainEntityId");

-- CreateIndex
CREATE INDEX "service_pack_deployment_audit_records_servicePackDeployment_idx" ON "service_pack_deployment_audit_records"("servicePackDeploymentId");

-- CreateIndex
CREATE INDEX "service_pack_deployment_audit_records_eventType_idx" ON "service_pack_deployment_audit_records"("eventType");

-- CreateIndex
CREATE INDEX "service_pack_deployment_audit_records_createdAt_idx" ON "service_pack_deployment_audit_records"("createdAt");

-- AddForeignKey
ALTER TABLE "service_packs" ADD CONSTRAINT "service_packs_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_versions" ADD CONSTRAINT "service_pack_versions_servicePackId_fkey" FOREIGN KEY ("servicePackId") REFERENCES "service_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_deployments" ADD CONSTRAINT "service_pack_deployments_servicePackVersionId_fkey" FOREIGN KEY ("servicePackVersionId") REFERENCES "service_pack_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_deployments" ADD CONSTRAINT "service_pack_deployments_supersededByDeploymentId_fkey" FOREIGN KEY ("supersededByDeploymentId") REFERENCES "service_pack_deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_deployment_bindings" ADD CONSTRAINT "service_pack_deployment_bindings_servicePackDeploymentId_fkey" FOREIGN KEY ("servicePackDeploymentId") REFERENCES "service_pack_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_pack_deployment_audit_records" ADD CONSTRAINT "service_pack_deployment_audit_records_servicePackDeploymentI_fkey" FOREIGN KEY ("servicePackDeploymentId") REFERENCES "service_pack_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
