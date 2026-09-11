import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateServiceVersionDto } from './dto/create-service-version.dto';
import { ServiceVersionResponseDto } from './dto/service-version-response.dto';
import { ServiceVersionsService } from './service-versions.service';

@ApiTags('service-catalog-service-versions')
@Controller('service-catalog/service-versions')
export class ServiceVersionsController {
  constructor(private readonly service: ServiceVersionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service version with security/privacy metadata' })
  @ApiCreatedResponse({ type: ServiceVersionResponseDto })
  create(@Body() dto: CreateServiceVersionDto): Promise<ServiceVersionResponseDto> {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service version by id' })
  @ApiOkResponse({ type: ServiceVersionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceVersionResponseDto> {
    return this.service.findOne(id);
  }

  @Get('by-government-service/:governmentServiceId')
  @ApiOperation({ summary: 'List versions for a government service' })
  @ApiOkResponse({ type: [ServiceVersionResponseDto] })
  findByGovernmentService(
    @Param('governmentServiceId', ParseUUIDPipe) governmentServiceId: string,
  ): Promise<ServiceVersionResponseDto[]> {
    return this.service.findByGovernmentService(governmentServiceId);
  }
}
