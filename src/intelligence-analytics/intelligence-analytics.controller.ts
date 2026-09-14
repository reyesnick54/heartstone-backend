import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';

import { CreateAiModelDefinitionDto } from './dto/create-ai-model-definition.dto';
import { CreateAiModelVersionDto } from './dto/create-ai-model-version.dto';
import { CreateAiUseCaseDto } from './dto/create-ai-use-case.dto';
import { CreateAiUseCaseVersionDto } from './dto/create-ai-use-case-version.dto';
import { RecordAiExecutionDto } from './dto/record-ai-execution.dto';
import { RecordAiHumanDispositionDto } from './dto/record-ai-human-disposition.dto';
import {
  AiExecutionService,
  AiHumanDispositionService,
  AiSuspensionService,
} from './execution/ai-execution.service';
import { AI_GOVERNANCE_BOUNDARY_DISCLAIMER } from './intelligence-analytics.constants';
import { AiModelDefinitionsService } from './registry/ai-model-definitions.service';
import { AiUseCasesService } from './registry/ai-use-cases.service';

@ApiTags('intelligence-analytics')
@Controller('intelligence-analytics')
export class IntelligenceAnalyticsController {
  constructor(
    private readonly modelDefinitionsService: AiModelDefinitionsService,
    private readonly useCasesService: AiUseCasesService,
    private readonly executionService: AiExecutionService,
    private readonly humanDispositionService: AiHumanDispositionService,
    private readonly suspensionService: AiSuspensionService,
  ) {}

  @Get('governance/disclaimer')
  getDisclaimer() {
    return { disclaimer: AI_GOVERNANCE_BOUNDARY_DISCLAIMER };
  }

  @Post('models')
  createModelDefinition(@Body() dto: CreateAiModelDefinitionDto) {
    return this.modelDefinitionsService.createDefinition(dto);
  }

  @Post('models/:modelDefinitionId/versions')
  createModelVersion(
    @Param('modelDefinitionId') modelDefinitionId: string,
    @Body() dto: CreateAiModelVersionDto,
  ) {
    return this.modelDefinitionsService.createVersion(modelDefinitionId, dto);
  }

  @Get('models')
  listModelDefinitions(@Query('institutionId') institutionId?: string) {
    return this.modelDefinitionsService.findAllDefinitions(institutionId);
  }

  @Post('use-cases')
  createUseCase(@Body() dto: CreateAiUseCaseDto) {
    return this.useCasesService.createUseCase(dto);
  }

  @Post('use-cases/:useCaseId/versions')
  createUseCaseVersion(
    @Param('useCaseId') useCaseId: string,
    @Body() dto: CreateAiUseCaseVersionDto,
  ) {
    return this.useCasesService.createVersion(useCaseId, dto);
  }

  @Post('executions')
  recordExecution(@Body() body: RecordAiExecutionDto & { gateContext?: never }) {
    return this.executionService.recordExecution(body, {
      actorType: IdentityType.INDIVIDUAL,
      entitledDatasets: body.retrievedRecordReferences ?? [],
      prohibitedDatasets: [],
      entitledTools: (body.toolsCalled ?? []).map((tool) => tool.toolReference),
      permittedToolActions: (body.toolsCalled ?? []).map((tool) => tool.action),
      permittedCaseReference: body.permittedCaseReference ?? body.requestedCaseReference ?? '',
      modelSuspended: false,
      useCaseSuspended: false,
      useCaseExpired: false,
      agentSuspended: false,
      evidenceGateRequired: false,
      evidenceReferences: body.inputSourceReferences ?? [],
    });
  }

  @Post('executions/:executionId/dispositions')
  recordHumanDisposition(@Body() dto: RecordAiHumanDispositionDto) {
    return this.humanDispositionService.recordDisposition(dto);
  }

  @Post('models/:modelDefinitionId/suspend')
  suspendModel(
    @Param('modelDefinitionId') modelDefinitionId: string,
    @Body() body: { issuedByIdentityId: string; reason: string },
  ) {
    return this.suspensionService.suspendModelDefinition({
      aiModelDefinitionId: modelDefinitionId,
      issuedByIdentityId: body.issuedByIdentityId,
      reason: body.reason,
    });
  }
}
