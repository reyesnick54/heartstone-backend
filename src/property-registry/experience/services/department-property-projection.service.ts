import { Injectable } from '@nestjs/common';

import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { PropertyRegistryOfficialWorkspaceService } from '../../workspace/property-registry-official-workspace.service';
import { PropertyExperienceBoundaryService } from '../property-experience-boundary.service';

@Injectable()
export class DepartmentPropertyProjectionService {
  constructor(
    private readonly workspace: PropertyRegistryOfficialWorkspaceService,
    private readonly boundary: PropertyExperienceBoundaryService,
  ) {}

  async buildDepartmentPropertyDashboard(actor: ActorContext, departmentId: string): Promise<{
    generatedAt: string;
    ruleEnvironment: string;
    disclaimer: string;
    departmentId: string;
    actorIdentityId: string;
    registryQueues: Record<string, number>;
    availableActions: readonly string[];
  }> {
    const workspace = await this.workspace.buildRegistryOfficerWorkspace();
    return {
      generatedAt: workspace.generatedAt,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      departmentId,
      actorIdentityId: actor.identityId,
      registryQueues: workspace.queues,
      availableActions: workspace.availableActions,
    };
  }
}
