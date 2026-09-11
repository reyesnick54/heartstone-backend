import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateGovernmentServiceDto } from './dto/create-government-service.dto';
import { CreateGovernmentServiceVersionDto } from './dto/create-government-service-version.dto';
import { QueryGovernmentServicesDto } from './dto/query-government-services.dto';
import { UpdateGovernmentServiceDto } from './dto/update-government-service.dto';
import { GovernmentServicesService } from './government-services.service';

@ApiTags('service-catalog')
@Controller('service-catalog/services')
export class GovernmentServicesController {
  constructor(private readonly governmentServices: GovernmentServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a government service catalog entry' })
  @ApiCreatedResponse({ description: 'Created government service' })
  create(@Body() dto: CreateGovernmentServiceDto) {
    return this.governmentServices.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List government services' })
  @ApiOkResponse({ description: 'Government services' })
  findAll(@Query() query: QueryGovernmentServicesDto) {
    return this.governmentServices.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government service by id' })
  @ApiOkResponse({ description: 'Government service' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.governmentServices.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a government service' })
  @ApiOkResponse({ description: 'Updated government service' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGovernmentServiceDto) {
    return this.governmentServices.update(id, dto);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a government service version' })
  @ApiCreatedResponse({ description: 'Created service version' })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGovernmentServiceVersionDto,
  ) {
    return this.governmentServices.createVersion(id, dto);
  }

  @Post(':id/versions/:versionId/publish')
  @ApiOperation({ summary: 'Publish a government service version' })
  @ApiOkResponse({ description: 'Published service version' })
  publishVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.governmentServices.publishVersion(versionId);
  }
}
