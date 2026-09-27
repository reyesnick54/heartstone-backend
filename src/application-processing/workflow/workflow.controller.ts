import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthorityActionType,
  WorkflowStepConsequenceLevel,
  WorkflowStepType,
  WorkflowTransitionJoinType,
} from '@prisma/client';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { WorkflowDefinitionsService } from './workflow-definitions.service';

@ApiTags('application-processing-workflow')
@Controller('workflow-definitions')
@DenyByDefaultAdministrative()
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowDefinitions: WorkflowDefinitionsService) {}

  @Post()
  @RequirePermissions(PermissionCodes.WORKFLOW_DEFINITION_CREATE)
  createDefinition(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      governmentServiceId?: string;
    },
  ) {
    return this.workflowDefinitions.createDefinition(body);
  }

  @Post(':id/versions')
  @RequirePermissions(PermissionCodes.WORKFLOW_DEFINITION_CREATE)
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      version: string;
      stages: { stageKey: string; label: string; description?: string; displayOrder: number }[];
      steps: {
        stepKey: string;
        label: string;
        description?: string;
        stepType: WorkflowStepType;
        stageKey?: string;
        consequenceLevel?: WorkflowStepConsequenceLevel;
        functionAuthorityRecordId?: string;
        authorityActionType?: AuthorityActionType;
        displayOrder: number;
        isParallel?: boolean;
        parallelGroupKey?: string;
        joinType?: WorkflowTransitionJoinType;
      }[];
      transitions: {
        transitionKey: string;
        fromStepKey: string;
        toStepKey: string;
        label?: string;
        joinType?: WorkflowTransitionJoinType;
      }[];
    },
  ) {
    return this.workflowDefinitions.createVersion(id, body);
  }

  @Post('versions/:versionId/approve')
  @RequirePermissions(PermissionCodes.WORKFLOW_DEFINITION_APPROVE)
  approveVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.workflowDefinitions.approveVersion(versionId);
  }
}
