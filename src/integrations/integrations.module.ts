import { Module } from '@nestjs/common';

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
