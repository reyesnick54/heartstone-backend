import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IntegrationDefinitionStatus } from '@prisma/client';

import { IntegrationsBoundaryService } from './common/integrations-boundary.service';
import { AddDataExchangeFieldDto } from './dto/add-data-exchange-field.dto';
import { CreateAuthoritativeDesignationDto } from './dto/create-authoritative-designation.dto';
import { CreateCredentialReferenceDto } from './dto/create-credential-reference.dto';
import { CreateDataExchangeContractDto } from './dto/create-data-exchange-contract.dto';
import { CreateFieldAuthorityMappingDto } from './dto/create-field-authority-mapping.dto';
import { CreateIntegrationDefinitionDto } from './dto/create-integration-definition.dto';
import { CreateIntegrationVersionDto } from './dto/create-integration-version.dto';
import { CreateTechnologyDependencyDto } from './dto/create-technology-dependency.dto';
import { CredentialReferenceResponseDto } from './dto/credential-reference-response.dto';
import { ProposeAuthoritativeDesignationDto } from './dto/propose-authoritative-designation.dto';
import { RecordAcceptanceStateDto } from './dto/record-acceptance-state.dto';
import { RecordIntegrationApprovalDto } from './dto/record-integration-approval.dto';
import { UpdateIntegrationDefinitionDto } from './dto/update-integration-definition.dto';
import { UpdateIntegrationVersionDto } from './dto/update-integration-version.dto';
import { AuthoritativeSourcesService } from './registry/authoritative-sources.service';
import { DataExchangeContractsService } from './registry/data-exchange-contracts.service';
import { IntegrationAcceptanceService } from './registry/integration-acceptance.service';
import { IntegrationApprovalsService } from './registry/integration-approvals.service';
import { IntegrationCredentialsService } from './registry/integration-credentials.service';
import { IntegrationDefinitionsService } from './registry/integration-definitions.service';
import { IntegrationExecutionService } from './registry/integration-execution.service';
import { IntegrationVersionsService } from './registry/integration-versions.service';
import { TechnologyDependenciesService } from './registry/technology-dependencies.service';

@ApiTags('integrations-registry')
@Controller('integrations/registry')
export class IntegrationsController {
  constructor(
    private readonly boundary: IntegrationsBoundaryService,
    private readonly definitionsService: IntegrationDefinitionsService,
    private readonly versionsService: IntegrationVersionsService,
    private readonly acceptanceService: IntegrationAcceptanceService,
    private readonly contractsService: DataExchangeContractsService,
    private readonly authoritativeSourcesService: AuthoritativeSourcesService,
    private readonly credentialsService: IntegrationCredentialsService,
    private readonly approvalsService: IntegrationApprovalsService,
    private readonly executionService: IntegrationExecutionService,
    private readonly technologyDependenciesService: TechnologyDependenciesService,
  ) {}

  @Post('technology-dependencies')
  @ApiOperation({ summary: 'Register a technology dependency' })
  createTechnologyDependency(@Body() dto: CreateTechnologyDependencyDto) {
    return this.technologyDependenciesService.create(dto);
  }

  @Get('technology-dependencies')
  @ApiOperation({ summary: 'List technology dependencies' })
  listTechnologyDependencies() {
    return this.technologyDependenciesService.findAll();
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create integration definition (draft, non-authoritative)' })
  createDefinition(@Body() dto: CreateIntegrationDefinitionDto) {
    this.boundary.rejectForbiddenDefinitionFields(dto as unknown as Record<string, unknown>);
    return this.definitionsService.create(dto);
  }

  @Get('definitions')
  @ApiOperation({ summary: 'List integration definitions' })
  listDefinitions(
    @Query('institutionalOwnerId') institutionalOwnerId?: string,
    @Query('status') status?: IntegrationDefinitionStatus,
  ) {
    return this.definitionsService.findAll({ institutionalOwnerId, status });
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get integration definition' })
  getDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.definitionsService.findOne(id);
  }

  @Patch('definitions/:id')
  @ApiOperation({ summary: 'Update integration definition metadata' })
  updateDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationDefinitionDto,
  ) {
    this.boundary.rejectForbiddenDefinitionFields(dto as unknown as Record<string, unknown>);
    return this.definitionsService.update(id, dto);
  }

  @Patch('definitions/:id/register')
  @ApiOperation({ summary: 'Register integration definition' })
  registerDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.definitionsService.register(id);
  }

  @Patch('definitions/:id/suspend')
  @ApiOperation({ summary: 'Suspend integration definition' })
  suspendDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.definitionsService.suspend(id);
  }

  @Post('versions')
  @ApiOperation({ summary: 'Create integration version' })
  createVersion(@Body() dto: CreateIntegrationVersionDto) {
    this.boundary.rejectForbiddenVersionFields(dto as unknown as Record<string, unknown>);
    return this.versionsService.create(dto);
  }

  @Get('definitions/:definitionId/versions')
  @ApiOperation({ summary: 'List integration versions including superseded' })
  listVersions(@Param('definitionId', ParseUUIDPipe) definitionId: string) {
    return this.versionsService.listIncludingSuperseded(definitionId);
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get integration version' })
  getVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.versionsService.findOne(id);
  }

  @Patch('versions/:id')
  @ApiOperation({ summary: 'Update integration version metadata' })
  updateVersion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIntegrationVersionDto) {
    this.boundary.rejectForbiddenVersionFields(dto as unknown as Record<string, unknown>);
    return this.versionsService.update(id, dto);
  }

  @Patch('versions/:id/supersede')
  @ApiOperation({ summary: 'Supersede integration version (retains prior version)' })
  supersedeVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('supersedingVersionId', ParseUUIDPipe) supersedingVersionId: string,
  ) {
    return this.versionsService.supersede(id, supersedingVersionId);
  }

  @Post('versions/:id/acceptance')
  @ApiOperation({ summary: 'Record integration acceptance state' })
  recordAcceptance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordAcceptanceStateDto,
  ) {
    return this.acceptanceService.recordAcceptanceState(id, dto);
  }

  @Get('versions/:id/acceptance')
  @ApiOperation({ summary: 'List integration acceptance history' })
  listAcceptance(@Param('id', ParseUUIDPipe) id: string) {
    return this.acceptanceService.getAcceptanceHistory(id);
  }

  @Post('versions/:id/approvals')
  @ApiOperation({ summary: 'Record integration approval' })
  recordApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordIntegrationApprovalDto,
  ) {
    return this.approvalsService.recordApproval(id, dto);
  }

  @Get('versions/:id/approvals')
  @ApiOperation({ summary: 'List integration approvals' })
  listApprovals(@Param('id', ParseUUIDPipe) id: string) {
    return this.approvalsService.findByVersion(id);
  }

  @Post('contracts')
  @ApiOperation({ summary: 'Create data exchange contract' })
  createContract(@Body() dto: CreateDataExchangeContractDto) {
    return this.contractsService.create(dto);
  }

  @Get('versions/:id/contracts')
  @ApiOperation({ summary: 'List data exchange contracts for version' })
  listContracts(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.findByVersion(id);
  }

  @Post('contracts/:contractId/fields')
  @ApiOperation({ summary: 'Add permitted or prohibited field to contract' })
  addContractField(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: AddDataExchangeFieldDto,
  ) {
    return this.contractsService.addField(contractId, dto);
  }

  @Post('authoritative-designations')
  @ApiOperation({ summary: 'Create authoritative source designation draft' })
  createAuthoritativeDesignation(@Body() dto: CreateAuthoritativeDesignationDto) {
    this.boundary.rejectForbiddenAuthoritativeDesignationFields(
      dto as unknown as Record<string, unknown>,
    );
    this.boundary.assertNewIntegrationDefaultsNonAuthoritative(dto.sourceStatus);
    return this.authoritativeSourcesService.createDraft(dto);
  }

  @Patch('authoritative-designations/:id/propose')
  @ApiOperation({ summary: 'Propose authoritative source designation' })
  proposeAuthoritativeDesignation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeAuthoritativeDesignationDto,
  ) {
    return this.authoritativeSourcesService.proposeDesignation(id, dto);
  }

  @Patch('authoritative-designations/:id/activate')
  @ApiOperation({ summary: 'Activate proposed authoritative designation' })
  activateAuthoritativeDesignation(@Param('id', ParseUUIDPipe) id: string) {
    return this.authoritativeSourcesService.activateDesignation(id);
  }

  @Post('authoritative-designations/:id/field-authority')
  @ApiOperation({ summary: 'Add field-specific authority mapping' })
  addFieldAuthority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFieldAuthorityMappingDto,
  ) {
    return this.authoritativeSourcesService.addFieldAuthorityMapping(id, dto);
  }

  @Get('versions/:id/authoritative-designations')
  @ApiOperation({ summary: 'List authoritative source designations' })
  listAuthoritativeDesignations(@Param('id', ParseUUIDPipe) id: string) {
    return this.authoritativeSourcesService.findByVersion(id);
  }

  @Post('credentials')
  @ApiOperation({ summary: 'Create credential reference (metadata only)' })
  @ApiCreatedResponse({ type: CredentialReferenceResponseDto })
  createCredential(@Body() dto: CreateCredentialReferenceDto): Promise<CredentialReferenceResponseDto> {
    return this.credentialsService.create(dto);
  }

  @Get('versions/:id/credentials')
  @ApiOperation({ summary: 'List credential references (secrets redacted)' })
  @ApiOkResponse({ type: CredentialReferenceResponseDto, isArray: true })
  listCredentials(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialReferenceResponseDto[]> {
    return this.credentialsService.findByVersion(id);
  }

  @Get('versions/:id/credentials/expired')
  @ApiOperation({ summary: 'List expired credential references (visible, secrets redacted)' })
  @ApiOkResponse({ type: CredentialReferenceResponseDto, isArray: true })
  listExpiredCredentials(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CredentialReferenceResponseDto[]> {
    return this.credentialsService.findIncludingExpired(id);
  }

  @Get('versions/:id/execution-availability')
  @ApiOperation({ summary: 'Assert integration version is available for execution' })
  assertExecutionAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionService.assertAvailableForExecution(id);
  }
}
