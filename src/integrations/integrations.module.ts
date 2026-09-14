import { Module } from '@nestjs/common';

import { EvidenceRecordsModule } from '../evidence-records/evidence-records.module';
import { SandboxIntegrationAdapter } from './adapters/sandbox-integration.adapter';
import { TestIntegrationAdapter } from './adapters/test-integration.adapter';
import { IntegrationBoundaryService } from './common/integration-boundary.service';
import { IntegrationEvidenceBridgeService } from './evidence/integration-evidence-bridge.service';
import { IntegrationGatewayService } from './gateway/integration-gateway.service';
import { IntegrationIdempotencyService } from './gateway/integration-idempotency.service';
import { IntegrationTransformationService } from './gateway/integration-transformation.service';
import { IntegrationValidationService } from './gateway/integration-validation.service';
import { IntegrationWebhookService } from './gateway/integration-webhook.service';
import { IntegrationAdapterRegistryService } from './registry/integration-adapter-registry.service';

@Module({
  imports: [EvidenceRecordsModule],
  providers: [
    IntegrationBoundaryService,
    SandboxIntegrationAdapter,
    TestIntegrationAdapter,
    IntegrationAdapterRegistryService,
    IntegrationGatewayService,
    IntegrationWebhookService,
    IntegrationValidationService,
    IntegrationTransformationService,
    IntegrationIdempotencyService,
    IntegrationEvidenceBridgeService,
  ],
  exports: [
    IntegrationBoundaryService,
    IntegrationAdapterRegistryService,
    IntegrationGatewayService,
    IntegrationWebhookService,
    IntegrationValidationService,
    IntegrationTransformationService,
    IntegrationIdempotencyService,
    IntegrationEvidenceBridgeService,
import { DatabaseModule } from '../database/database.module';
import { IntegrationsBoundaryService } from './common/integrations-boundary.service';
import { IntegrationsValidationService } from './common/integrations-validation.service';
import { IntegrationsController } from './integrations.controller';
import { AuthoritativeSourcesService } from './registry/authoritative-sources.service';
import { DataExchangeContractsService } from './registry/data-exchange-contracts.service';
import { IntegrationAcceptanceService } from './registry/integration-acceptance.service';
import { IntegrationApprovalsService } from './registry/integration-approvals.service';
import { IntegrationCredentialsService } from './registry/integration-credentials.service';
import { IntegrationDefinitionsService } from './registry/integration-definitions.service';
import { IntegrationExecutionService } from './registry/integration-execution.service';
import { IntegrationVersionsService } from './registry/integration-versions.service';
import { TechnologyDependenciesService } from './registry/technology-dependencies.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsBoundaryService,
    IntegrationsValidationService,
    IntegrationDefinitionsService,
    IntegrationVersionsService,
    IntegrationAcceptanceService,
    DataExchangeContractsService,
    AuthoritativeSourcesService,
    IntegrationCredentialsService,
    IntegrationApprovalsService,
    IntegrationExecutionService,
    TechnologyDependenciesService,
  ],
  exports: [
    IntegrationsBoundaryService,
    IntegrationDefinitionsService,
    IntegrationVersionsService,
    IntegrationAcceptanceService,
    DataExchangeContractsService,
    AuthoritativeSourcesService,
    IntegrationCredentialsService,
    IntegrationApprovalsService,
    IntegrationExecutionService,
    TechnologyDependenciesService,
  ],
})
export class IntegrationsModule {}
