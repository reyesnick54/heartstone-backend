import { Injectable } from '@nestjs/common';

import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { PropertyRegistryOfficialWorkspaceService } from '../../workspace/property-registry-official-workspace.service';
import { PropertyExperienceBoundaryService } from '../property-experience-boundary.service';

@Injectable()
export class OfficialPropertyProjectionService {
  constructor(
    private readonly workspace: PropertyRegistryOfficialWorkspaceService,
    private readonly boundary: PropertyExperienceBoundaryService,
  ) {}

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return {
        generatedAt: new Date().toISOString(),
        ruleEnvironment: this.boundary.ruleEnvironment,
        disclaimer: this.boundary.rulesDisclaimer,
        queues: {},
        availableActions: [],
      };
    }

    const workspace = await this.workspace.buildRegistryOfficerWorkspace();
    return {
      ...workspace,
      ruleEnvironment: this.boundary.ruleEnvironment,
    };
  }
}
