import { Injectable } from '@nestjs/common';

import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { IntegrationDefinitionsService } from './integration-definitions.service';
import { IntegrationVersionsService } from './integration-versions.service';

@Injectable()
export class IntegrationExecutionService {
  constructor(
    private readonly boundary: IntegrationsBoundaryService,
    private readonly definitionsService: IntegrationDefinitionsService,
    private readonly versionsService: IntegrationVersionsService,
  ) {}

  async assertAvailableForExecution(integrationVersionId: string): Promise<void> {
    const version = await this.versionsService.findOne(integrationVersionId);
    const definition = await this.definitionsService.findOne(version.integrationDefinitionId);

    this.boundary.assertExecutionAvailable(
      definition.status,
      version.status,
      version.currentAcceptanceState,
    );
  }
}
