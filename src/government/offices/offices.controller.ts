import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CreateOfficeDto } from './dto/create-office.dto';
import { OfficeResponseDto } from './dto/office-response.dto';
import { QueryOfficesDto } from './dto/query-offices.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { OfficesService } from './offices.service';

@ApiTags('offices')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Government structure administration",
  authorityRequirement: "Institutional configuration authority (not self-granted)",
  actorSource: "Authenticated institutional administrator",
  primarySecurityInvariant: "Government structure facts remain separate from identity privilege",
})
@Controller('offices')
export class OfficesController {
  constructor(private readonly service: OfficesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a office' })
  @ApiCreatedResponse({ type: OfficeResponseDto })
  create(@Body() dto: CreateOfficeDto): Promise<OfficeResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List offices' })
  @ApiOkResponse({ type: OfficeResponseDto, isArray: true })
  findAll(@Query() query: QueryOfficesDto): Promise<OfficeResponseDto[]> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a office by id' })
  @ApiOkResponse({ type: OfficeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OfficeResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a office' })
  @ApiOkResponse({ type: OfficeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficeDto,
  ): Promise<OfficeResponseDto> {
    return this.service.update(id, dto);
  }
}
