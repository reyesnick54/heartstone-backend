import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { WorkflowDefinitionValidationService } from './common/workflow-definition-validation.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { CreateWorkflowStageDto } from './dto/create-workflow-stage.dto';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto';
import { CreateWorkflowTransitionDto } from './dto/create-workflow-transition.dto';
import {
  CreateWorkflowVersionDto,
  UpdateWorkflowVersionDto,
} from './dto/create-workflow-version.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowDefinitionResponseDto } from './dto/workflow-definition-response.dto';
import { WorkflowValidationResultDto } from './dto/workflow-validation-result.dto';
import { WorkflowVersionResponseDto } from './dto/workflow-version-response.dto';
import { WorkflowDefinitionsService } from './workflow-definitions.service';
import { WorkflowStageDefinitionsService } from './workflow-stage-definitions.service';
import { WorkflowStepDefinitionsService } from './workflow-step-definitions.service';
import { WorkflowTransitionDefinitionsService } from './workflow-transition-definitions.service';
import { WorkflowVersionsService } from './workflow-versions.service';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(
    private readonly definitionsService: WorkflowDefinitionsService,
    private readonly versionsService: WorkflowVersionsService,
    private readonly stagesService: WorkflowStageDefinitionsService,
    private readonly stepsService: WorkflowStepDefinitionsService,
    private readonly transitionsService: WorkflowTransitionDefinitionsService,
    private readonly validationService: WorkflowDefinitionValidationService,
  ) {}

  @Post('definitions')
  @ApiOperation({ summary: 'Create a workflow definition (stable identity)' })
  @ApiCreatedResponse({ type: WorkflowDefinitionResponseDto })
  createDefinition(@Body() dto: CreateWorkflowDefinitionDto): Promise<WorkflowDefinitionResponseDto> {
    return this.definitionsService.create(dto);
  }

  @Get('definitions')
  @ApiOperation({ summary: 'List workflow definitions' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto, isArray: true })
  listDefinitions(): Promise<WorkflowDefinitionResponseDto[]> {
    return this.definitionsService.findAll();
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get a workflow definition by id' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  getDefinition(@Param('id', ParseUUIDPipe) id: string): Promise<WorkflowDefinitionResponseDto> {
    return this.definitionsService.findOne(id);
  }

  @Patch('definitions/:id')
  @ApiOperation({ summary: 'Update workflow definition metadata' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  updateDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.definitionsService.update(id, dto);
  }

  @Post('definitions/:definitionId/versions')
  @ApiOperation({ summary: 'Create a draft workflow version' })
  @ApiCreatedResponse({ type: WorkflowVersionResponseDto })
  createVersion(
    @Param('definitionId', ParseUUIDPipe) definitionId: string,
    @Body() dto: CreateWorkflowVersionDto,
  ): Promise<WorkflowVersionResponseDto> {
    return this.versionsService.create(definitionId, dto);
  }

  @Post('definitions/:definitionId/versions/next')
  @ApiOperation({ summary: 'Create a new draft version superseding the active version' })
  @ApiCreatedResponse({ type: WorkflowVersionResponseDto })
  createNextVersion(
    @Param('definitionId', ParseUUIDPipe) definitionId: string,
    @Body() dto: CreateWorkflowVersionDto,
  ): Promise<WorkflowVersionResponseDto> {
    return this.versionsService.createNextVersion(definitionId, dto);
  }

  @Get('definitions/:definitionId/versions')
  @ApiOperation({ summary: 'List workflow versions for a definition' })
  @ApiOkResponse({ type: WorkflowVersionResponseDto, isArray: true })
  listVersions(
    @Param('definitionId', ParseUUIDPipe) definitionId: string,
  ): Promise<WorkflowVersionResponseDto[]> {
    return this.versionsService.findAllForDefinition(definitionId);
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get a workflow version by id' })
  @ApiOkResponse({ type: WorkflowVersionResponseDto })
  getVersion(@Param('id', ParseUUIDPipe) id: string): Promise<WorkflowVersionResponseDto> {
    return this.versionsService.findOne(id);
  }

  @Get('versions/:id/reconstruct')
  @ApiOperation({ summary: 'Reconstruct a workflow version with stages, steps, and transitions' })
  reconstructVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.versionsService.reconstruct(id);
  }

  @Patch('versions/:id')
  @ApiOperation({ summary: 'Update a draft workflow version' })
  @ApiOkResponse({ type: WorkflowVersionResponseDto })
  updateVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowVersionDto,
  ): Promise<WorkflowVersionResponseDto> {
    return this.versionsService.update(id, dto);
  }

  @Post('versions/:versionId/stages')
  @ApiOperation({ summary: 'Add a stage definition to a workflow version' })
  createStage(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateWorkflowStageDto,
  ) {
    return this.stagesService.create(versionId, dto);
  }

  @Get('versions/:versionId/stages')
  @ApiOperation({ summary: 'List stage definitions for a workflow version' })
  listStages(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.stagesService.findAllForVersion(versionId);
  }

  @Post('versions/:versionId/steps')
  @ApiOperation({ summary: 'Add a step definition to a workflow version' })
  createStep(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateWorkflowStepDto,
  ) {
    return this.stepsService.create(versionId, dto);
  }

  @Get('versions/:versionId/steps')
  @ApiOperation({ summary: 'List step definitions for a workflow version' })
  listSteps(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.stepsService.findAllForVersion(versionId);
  }

  @Post('versions/:versionId/transitions')
  @ApiOperation({ summary: 'Add a transition definition to a workflow version' })
  createTransition(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateWorkflowTransitionDto,
  ) {
    return this.transitionsService.create(versionId, dto);
  }

  @Get('versions/:versionId/transitions')
  @ApiOperation({ summary: 'List transition definitions for a workflow version' })
  listTransitions(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.transitionsService.findAllForVersion(versionId);
  }

  @Post('versions/:versionId/validate')
  @ApiOperation({ summary: 'Validate workflow version graph and authority crosswalk' })
  @ApiOkResponse({ type: WorkflowValidationResultDto })
  validateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ): Promise<WorkflowValidationResultDto> {
    return this.validationService.validateVersion(versionId);
  }
}
