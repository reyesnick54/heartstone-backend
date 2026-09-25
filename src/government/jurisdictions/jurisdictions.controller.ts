import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { JurisdictionStructureDto } from '../structure/dto/government-structure.dto';
import { GovernmentStructureService } from '../structure/government-structure.service';
import { CreateJurisdictionDto } from './dto/create-jurisdiction.dto';
import { JurisdictionResponseDto } from './dto/jurisdiction-response.dto';
import { QueryJurisdictionsDto } from './dto/query-jurisdictions.dto';
import { UpdateJurisdictionDto } from './dto/update-jurisdiction.dto';
import { JurisdictionsService } from './jurisdictions.service';

@ApiTags('jurisdictions')
@Controller('jurisdictions')
@DenyByDefaultAdministrative()
export class JurisdictionsController {
  constructor(
    private readonly jurisdictionsService: JurisdictionsService,
    private readonly structureService: GovernmentStructureService,
  ) {}

  @Post()
  @RequirePermissions(PermissionCodes.GOVERNMENT_JURISDICTION_CREATE)
  @ApiOperation({ summary: 'Create a jurisdiction' })
  @ApiCreatedResponse({ type: JurisdictionResponseDto })
  create(@Body() dto: CreateJurisdictionDto): Promise<JurisdictionResponseDto> {
    return this.jurisdictionsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.GOVERNMENT_JURISDICTION_READ)
  @ApiOperation({ summary: 'List jurisdictions' })
  @ApiOkResponse({ type: JurisdictionResponseDto, isArray: true })
  findAll(@Query() query: QueryJurisdictionsDto): Promise<JurisdictionResponseDto[]> {
    return this.jurisdictionsService.findAll(query);
  }

  @Get(':id/structure')
  @RequirePermissions(PermissionCodes.GOVERNMENT_JURISDICTION_READ)
  @ApiOperation({ summary: 'Get organizational structure for a jurisdiction' })
  @ApiOkResponse({ type: JurisdictionStructureDto })
  getStructure(@Param('id', ParseUUIDPipe) id: string): Promise<JurisdictionStructureDto> {
    return this.structureService.getJurisdictionStructure(id);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.GOVERNMENT_JURISDICTION_READ)
  @ApiOperation({ summary: 'Get a jurisdiction by id' })
  @ApiOkResponse({ type: JurisdictionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<JurisdictionResponseDto> {
    return this.jurisdictionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.GOVERNMENT_JURISDICTION_UPDATE, {
    scope: { jurisdictionIdParam: 'id' },
  })
  @ApiOperation({ summary: 'Update a jurisdiction' })
  @ApiOkResponse({ type: JurisdictionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJurisdictionDto,
  ): Promise<JurisdictionResponseDto> {
    return this.jurisdictionsService.update(id, dto);
  }
}
