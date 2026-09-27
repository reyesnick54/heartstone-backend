import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DenyByDefaultAdministrative } from '../../technical-access/authorization/deny-by-default-administrative.decorator';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { InstitutionStructureDto } from '../structure/dto/government-structure.dto';
import { GovernmentStructureService } from '../structure/government-structure.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionResponseDto } from './dto/institution-response.dto';
import { QueryInstitutionsDto } from './dto/query-institutions.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionsService } from './institutions.service';

@ApiTags('institutions')
@Controller('institutions')
@DenyByDefaultAdministrative()
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly structureService: GovernmentStructureService,
  ) {}

  @Post()
  @RequirePermissions(PermissionCodes.GOVERNMENT_INSTITUTION_CREATE)
  @ApiOperation({ summary: 'Create an institution' })
  @ApiCreatedResponse({ type: InstitutionResponseDto })
  create(@Body() dto: CreateInstitutionDto): Promise<InstitutionResponseDto> {
    return this.institutionsService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCodes.GOVERNMENT_INSTITUTION_READ)
  @ApiOperation({ summary: 'List institutions' })
  @ApiOkResponse({ type: InstitutionResponseDto, isArray: true })
  findAll(@Query() query: QueryInstitutionsDto): Promise<InstitutionResponseDto[]> {
    return this.institutionsService.findAll(query);
  }

  @Get(':id/structure')
  @RequirePermissions(PermissionCodes.GOVERNMENT_INSTITUTION_READ, {
    scope: { institutionIdParam: 'id' },
  })
  @ApiOperation({ summary: 'Get organizational structure for an institution' })
  @ApiOkResponse({ type: InstitutionStructureDto })
  getStructure(@Param('id', ParseUUIDPipe) id: string): Promise<InstitutionStructureDto> {
    return this.structureService.getInstitutionStructure(id);
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.GOVERNMENT_INSTITUTION_READ, {
    scope: { institutionIdParam: 'id' },
  })
  @ApiOperation({ summary: 'Get an institution by id' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InstitutionResponseDto> {
    return this.institutionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.GOVERNMENT_INSTITUTION_UPDATE, {
    scope: { institutionIdParam: 'id' },
  })
  @ApiOperation({ summary: 'Update an institution' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ): Promise<InstitutionResponseDto> {
    return this.institutionsService.update(id, dto);
  }
}
