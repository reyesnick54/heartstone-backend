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
  ],
})
export class IntegrationsModule {}
