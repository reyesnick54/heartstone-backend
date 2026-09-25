import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { InstitutionStructureDto } from '../structure/dto/government-structure.dto';
import { GovernmentStructureService } from '../structure/government-structure.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { InstitutionResponseDto } from './dto/institution-response.dto';
import { QueryInstitutionsDto } from './dto/query-institutions.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionsService } from './institutions.service';

@ApiTags('institutions')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Government structure administration",
  authorityRequirement: "Institutional configuration authority (not self-granted)",
  actorSource: "Authenticated institutional administrator",
  primarySecurityInvariant: "Government structure facts remain separate from identity privilege",
})
@Controller('institutions')
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly structureService: GovernmentStructureService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an institution' })
  @ApiCreatedResponse({ type: InstitutionResponseDto })
  create(@Body() dto: CreateInstitutionDto): Promise<InstitutionResponseDto> {
    return this.institutionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List institutions' })
  @ApiOkResponse({ type: InstitutionResponseDto, isArray: true })
  findAll(@Query() query: QueryInstitutionsDto): Promise<InstitutionResponseDto[]> {
    return this.institutionsService.findAll(query);
  }

  @Get(':id/structure')
  @ApiOperation({ summary: 'Get organizational structure for an institution' })
  @ApiOkResponse({ type: InstitutionStructureDto })
  getStructure(@Param('id', ParseUUIDPipe) id: string): Promise<InstitutionStructureDto> {
    return this.structureService.getInstitutionStructure(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an institution by id' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InstitutionResponseDto> {
    return this.institutionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an institution' })
  @ApiOkResponse({ type: InstitutionResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ): Promise<InstitutionResponseDto> {
    return this.institutionsService.update(id, dto);
  }
}
